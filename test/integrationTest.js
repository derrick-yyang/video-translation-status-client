import VideoTranslationStatusClient from '../client/videoTranslationClient.js';
const SERVER_URL = 'http://localhost:3000';

async function runTest() {
  const client = new VideoTranslationStatusClient(SERVER_URL);
  try {
    const currentStatus = await client.getCurrentStatus();
    console.log('Current status:', currentStatus);
    
    const result = await client.waitForStatus();
    console.log('Status received:', result);
    if (result.status === 'completed') {
        // Continue or handle success status
        process.exit(0);
      } else {
        // Handle translation error
        process.exit(1);
      }
  } catch (error) {
      console.error('VideoTranslationStatusClient error:', error.message);
      process.exit(1);
  }
}

// Add a timeout to ensure the test doesn't run indefinitely
setTimeout(() => {
  console.error('Test timed out after 45 seconds');
  process.exit(1);
}, 45000);

runTest();
