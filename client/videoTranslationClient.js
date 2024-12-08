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
                    this.close();
                    if (result.status === 'error') {
                        reject(new Error('Translation failed'));
                    } else {
                        resolve(result);
                    }
                }
            });

            this.socket.on('error', (error) => {
                this.close();
                reject(new Error('Server error: ' + error.message));
            });

            this.socket.on('connect_error', (error) => {
                this.close();
                reject(new Error('Connection failed: ' + error.message));
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
