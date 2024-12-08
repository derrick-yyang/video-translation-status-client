import VideoTranslationStatusClient from '../client/videoTranslationClient.js';
const SERVER_URL = 'http://localhost:3000';

async function runTest() {
  const client = new VideoTranslationStatusClient(SERVER_URL);
  try {
      const status = await client.waitForStatus();
      console.log('Translation completed:', status);
      process.exit(0);
  } catch (error) {
      console.error('VideoTranslationStatusClient error:', error.message);
      process.exit(1);
  }
}

// Add a timeout to ensure the test doesn't run indefinitely
setTimeout(() => {
  console.error('Test timed out after 30 seconds');
  process.exit(1);
}, 30000);

runTest();
