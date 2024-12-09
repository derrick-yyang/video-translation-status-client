import io from 'socket.io-client';

class VideoTranslationStatusClient {
    constructor(serverUrl, timeout = 30000, maxRetries = 3, retryDelay = 1000, useWebSockets = true) {
        this.serverUrl = serverUrl;
        this.timeout = timeout;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        this.retryCount = 0;
        this.connected = false;
        this.mode = useWebSockets ? 'websocket' : 'polling';
        this.pollInterval = 1000;
        this.maxPollInterval = 5000;
    }

    async connect() {
        if (this.mode === 'polling') {
            return; // Skip WebSocket connection if polling is preferred
        }

        try {
            this.socket = io(this.serverUrl, {
                reconnection: true,
                reconnectionAttempts: this.maxRetries,
                reconnectionDelay: this.retryDelay
            });
            this.setupSocketListeners();
        } catch (error) {
            console.log('WebSocket connection failed, falling back to polling');
            this.mode = 'polling';
        }
    }

    setupSocketListeners() {
        this.socket.on('connect', () => {
            console.log('Connection to server successful');
            this.connected = true;
            this.retryCount = 0;
        });
        
        this.socket.on('connect_error', async (error) => {
            this.connected = false;
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            } else {
                console.log('WebSocket retries exhausted, falling back to polling');
                this.mode = 'polling';
            }
        });
    }

    async pollStatus() {
        let elapsedTime = 0;
        let currentInterval = this.pollInterval;

        while (elapsedTime < this.timeout) {
            const status = await this.getCurrentStatus();
            
            if (status === 'completed' || status === 'error') {
                return { status };
            }

            // Exponential backoff with max limit
            currentInterval = Math.min(currentInterval * 1.5, this.maxPollInterval);
            await new Promise(resolve => setTimeout(resolve, currentInterval));
            elapsedTime += currentInterval;
        }

        throw new Error(`Operation timed out after ${this.timeout}ms`);
    }

    async waitForStatus() {
        if (this.mode === 'websocket') {
            try {
                if (!this.connected) {
                    await this.connect();
                }
                
                if (this.mode === 'websocket' && this.socket) {
                    return await this.waitForWebSocketStatus();
                }
            } catch (error) {
                console.log('WebSocket approach failed, falling back to polling');
                this.mode = 'polling';
            }
        }

        // Fallback to polling if WebSocket fails or is not preferred
        return await this.pollStatus();
    }

    async waitForWebSocketStatus() {
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                reject(new Error(`Operation timed out after ${this.timeout}ms`));
                this.close();
            }, this.timeout);

            const handleStatus = (result) => {
                if (result.status === 'completed' || result.status === 'error') {
                    clearTimeout(timeoutId);

                    // Remove event listeners after operation is complete
                    this.socket.off('statusUpdate', handleStatus);
                    this.socket.off('error', handleError);
                    
                    if (result.status === 'error') {
                        reject(new Error('Translation failed'));
                    } else {
                        resolve(result);
                    }
                    this.close();
                }
            };

            const handleError = (error) => {
                clearTimeout(timeoutId);
                this.socket.off('statusUpdate', handleStatus);
                this.socket.off('error', handleError);
                reject(new Error('Server error: ' + error.message));
                this.close();
            };

            this.socket.on('statusUpdate', handleStatus);
            this.socket.on('error', handleError);
        });
    }

    async getCurrentStatus() {
        try {
            const response = await fetch(`${this.serverUrl}/status`);
            const data = await response.json();
            return data.status;
        } catch (error) {
            throw new Error(`Failed to fetch current status: ${error.message}`);
        }
    }

    close() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            this.connected = false;
        }
    }
}

export default VideoTranslationStatusClient;