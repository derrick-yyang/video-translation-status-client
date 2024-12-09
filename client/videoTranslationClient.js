import io from 'socket.io-client';

class VideoTranslationStatusClient {
  constructor(serverUrl, {
    timeout = 30000,
    maxRetries = 3,
    retryDelay = 1000,
    usePolling = false
  } = {}) {
    this.serverUrl = serverUrl;
    this.timeout = timeout;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.pollInterval = 1000;
    this.maxPollInterval = 5000;
    this.usePolling = usePolling;
    this.jobs = new Map();
  }

  async createJob() {
    try {
      const response = await fetch(`${this.serverUrl}/createJob`, {
        method: 'POST'
      });
      const data = await response.json();
      this.jobs.set(data.jobId, { mode: this.usePolling ? 'polling' : 'websocket' });
      return data.jobId;
    } catch (error) {
      throw new Error(`Failed to create job: ${error.message}`);
    }
  }

  async connectForJob(jobId) {
    if (this.usePolling) {
      this.jobs.set(jobId, { mode: 'polling' });
      return;
    }

    try {
      const socket = io(this.serverUrl, {
        reconnection: true,
        reconnectionAttempts: this.maxRetries,
        reconnectionDelay: this.retryDelay
      });

      this.jobs.set(jobId, {
        socket,
        connected: false,
        retryCount: 0,
        mode: 'websocket'
      });

      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, this.timeout);

        socket.on('connect', () => {
          clearTimeout(timeoutId);
          const job = this.jobs.get(jobId);
          if (job) {
            job.connected = true;
            job.retryCount = 0;
          }
          resolve(socket);
        });

        socket.on('connect_error', (error) => {
          const job = this.jobs.get(jobId);
          if (job) {
            job.connected = false;
            if (job.retryCount < this.maxRetries) {
              job.retryCount++;
            } else {
              job.mode = 'polling';
              reject(new Error('Connection failed, switching to polling'));
            }
          }
        });
      });
    } catch (error) {
      const job = this.jobs.get(jobId);
      if (job) {
        job.mode = 'polling';
      }
      throw error;
    }
  }

  async waitForStatus(jobId) {
    if (!jobId) {
      throw new Error('Job ID is required');
    }

    let job = this.jobs.get(jobId);
    if (!job) {
      try {
        await this.connectForJob(jobId);
        job = this.jobs.get(jobId);
      } catch (error) {
        job = { mode: 'polling' };
        this.jobs.set(jobId, job);
      }
    }

    if (job.mode === 'websocket' && !this.usePolling) {
      try {
        const result = await this.waitForWebSocketStatus(jobId);
        return result;
      } catch (error) {
        job.mode = 'polling';
        return this.pollStatus(jobId);
      }
    }

    // Use polling
    const result = await this.pollStatus(jobId);
    return result;
  }

  async waitForWebSocketStatus(jobId) {
    const job = this.jobs.get(jobId);
    if (!job || !job.socket) {
      throw new Error('No socket connection for job');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${this.timeout}ms`));
        this.closeJob(jobId);
      }, this.timeout);

      const handleStatus = (result) => {
        if (result.jobId === jobId && (result.status === 'completed' || result.status === 'error')) {
          clearTimeout(timeoutId);
          job.socket.off('statusUpdate', handleStatus);
          job.socket.off('error', handleError);
          resolve(result);
          this.closeJob(jobId);
        }
      };

      const handleError = (error) => {
        clearTimeout(timeoutId);
        job.socket.off('statusUpdate', handleStatus);
        job.socket.off('error', handleError);
        reject(new Error('Socket connection error: ' + error.message));
        this.closeJob(jobId);
      };

      job.socket.on('statusUpdate', handleStatus);
      job.socket.on('error', handleError);
    });
  }

  async pollStatus(jobId) {
    let elapsedTime = 0;
    let currentInterval = this.pollInterval;

    while (elapsedTime < this.timeout) {
      const status = await this.getCurrentStatus(jobId);

      if (status === 'completed' || status === 'error') {
        return { jobId, status };
      }

      currentInterval = Math.min(currentInterval * 1.5, this.maxPollInterval);
      await new Promise(resolve => setTimeout(resolve, currentInterval));
      elapsedTime += currentInterval;
    }

    throw new Error(`Operation timed out after ${this.timeout}ms`);
  }

  async getCurrentStatus(jobId) {
    try {
      const response = await fetch(`${this.serverUrl}/status/${jobId}`);
      if (response.status === 404) {
        throw new Error('Job not found');
      }
      const data = await response.json();
      return data.status;
    } catch (error) {
      throw new Error(`Failed to fetch current status: ${error.message}`);
    }
  }

  closeJob(jobId) {
    const job = this.jobs.get(jobId);
    if (job && job.socket) {
      job.socket.disconnect();
      this.jobs.delete(jobId);
    }
  }

  close() {
    for (const jobId of this.jobs.keys()) {
      this.closeJob(jobId);
    }
  }
}

export default VideoTranslationStatusClient;
