import io from 'socket.io-client';

class VideoTranslationStatusClient {
    constructor(serverUrl) {
        this.serverUrl = serverUrl;
    }

    async waitForStatus() {
        return new Promise((resolve, reject) => {
            this.socket = io(this.serverUrl);

            this.socket.on('statusUpdate', (result) => {
                if (result.status === 'completed' || result.status === 'error') {
                    if (result.status === 'error') {
                        reject(new Error('Translation failed'));
                    } else {
                        resolve(result);
                    }
                    this.close();
                }
            });

            this.socket.on('error', (error) => {
                reject(new Error('Server error: ' + error.message));
                this.close();
            });

            this.socket.on('connect_error', (error) => {
                reject(new Error('Connection failed: ' + error.message));
                this.close();
            });
        });
    }

    close() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export default VideoTranslationStatusClient;
