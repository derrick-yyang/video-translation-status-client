# Video Translation Status Client

## Introduction

The **Video Translation Status Client** is a sophisticated client library designed to interface with a video translation server, providing real-time status updates on its operations. By utilizing WebSocket connections, this client offers significant advantages over traditional polling methods, including:

- Real-time status updates
- Reduced network traffic
- Maintenance of a single open connection, enhancing efficiency, as opposed to the HTTP connections required for polling

The library efficiently manages multiple jobs, initializing and cleaning up WebSocket connections to optimize memory usage. Each job is stored in a Map, and the library automatically falls back to polling if a WebSocket connection fails.

This client is ideal for users who require timely and reliable updates on video translation tasks, ensuring that they can make informed decisions based on the most current data.

## Usage

To get started, install the necessary Node.js libraries:

```bash
npm install
```

Start the server on `localhost:3000` by executing the following command in the root directory:

```bash
npm start
```

Run the tests with:

```bash
npm test
```

### Client Overview

This library abstracts the complexity of handling WebSocket connections, providing a simple interface to retrieve the status of video translation jobs. Users can easily obtain the current status of a job or leverage asynchronous programming to perform actions upon receiving specific job statuses. If the user prefers, they can force a simple exponential backoff polling approach by setting `{ usePolling: true }` upon initializing the client.

The interface offers three primary functions:

1. `createJob()`: Initiates a new job on the server and returns a job ID.
2. `getCurrentStatus(jobId)`: Retrieves the current status of a specified job.
3. `waitForStatus(jobId)`: Waits for a job to reach a completion status (`completed` or `error`) and returns that status.
4. `close()`: Cleanup all jobs initiated by the client.

#### Example Usage

Below is an example demonstrating how to create multiple jobs and wait for their results:

```javascript
import VideoTranslationStatusClient from './client/videoTranslationClient.js';

const client = new VideoTranslationStatusClient('http://localhost:3000', { usePolling: false });

const jobIds = await Promise.all([
    client.createJob(),
    client.createJob(),
    client.createJob()
]);

console.log('Created jobs:', jobIds);

const results = await Promise.allSettled(
    jobIds.map(jobId => client.waitForStatus(jobId))
);

console.log("Results: ", results);

// Use the results as needed...

client.close();
```

## Server Overview

The server simulates a video translation service, providing status updates based on a configurable random delay. It accepts WebSocket connections and exposes two endpoints:

- **POST `/createJob`**: Creates a new job and returns a unique job ID.
- **GET `/status/:jobId`**: Retrieves the current status of a specified job.

Upon job creation, the server sets the job's status to `pending`. After a configured delay, the status is updated to either `completed` or `error`, with a 50% probability for each. All jobs are stored in a Map on the server.

## Testing

Three tests in `integrationTest.js` demonstrate the library's usage and potential implementation scenarios. Each test will test the client functions and return upon completion.

## Future Enhancements

Potential future enhancements include:

- **Database Integration**: For a production-ready system, consider integrating a database to persistently store job information.
- **WebSocket Management Service**: Implement a dedicated service to manage WebSocket connections, improving scalability and reliability.
- **Enhanced Error Handling**: Expand error handling to cover more edge cases and provide detailed logging.
