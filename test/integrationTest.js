import VideoTranslationStatusClient from '../client/videoTranslationClient.js';

const SERVER_URL = 'http://localhost:3000';

// Test 1: Single job with current status check
async function testSingleJob() {
    console.log('\n=== Test 1: Single Job Processing ===');
    const client = new VideoTranslationStatusClient(SERVER_URL);
    try {
        const jobId = await client.createJob();
        console.log(`Created job: ${jobId}`);
        
        const currentStatus = await client.getCurrentStatus(jobId);
        console.log(`Initial status for job ${jobId}: ${currentStatus}`);

        const result = await client.waitForStatus(jobId);
        console.log(`Final status for job ${jobId}: ${result.status}`);
        return true;
    } catch (error) {
        console.error('Test failed:', error.message);
        return false;
    }
}

// Test 2: Multiple concurrent jobs
async function testMultipleJobs() {
    console.log('\n=== Test 2: Multiple Concurrent Jobs ===');
    const client = new VideoTranslationStatusClient(SERVER_URL);
    const successfulJobs = [];
    const failedJobs = [];
    
    try {
        const jobIds = await Promise.all([
            client.createJob(),
            client.createJob(),
            client.createJob()
        ]);
        
        console.log('Created jobs:', jobIds);

        const results = await Promise.allSettled(
            jobIds.map(jobId => client.waitForStatus(jobId))
        );
        console.log("results: ", results)
        results.forEach((result, index) => {
            const jobId = jobIds[index];
            if (result.status === 'fulfilled' && result.value.status === 'completed') {
                successfulJobs.push(jobId);
            } else {
                failedJobs.push(jobId);
            }
        });

        console.log('\nSuccessful jobs:', successfulJobs);
        console.log('Failed jobs:', failedJobs);
        return true;
    } catch (error) {
        console.error('Test failed:', error.message);
        return false;
    }
}

// Test 3: Fallback to polling
async function testPolling() {
  console.log('\n=== Test 3: WebSocket to Polling Fallback ===');
  const client = new VideoTranslationStatusClient(SERVER_URL,{ usePolling: true });
  
  try {
      const jobId = await client.createJob();
      console.log(`Created job: ${jobId}`);
      const result = await client.waitForStatus(jobId);
      console.log(`Successfully got result via polling: ${result.status}`);
      return true;
  } catch (error) {
      console.error('Test failed:', error.message);
      return false;
  }
}

// Run all tests
async function runAllTests() {
  try {
      const tests = [testSingleJob, testMultipleJobs, testPolling];
      const results = [];

      for (const test of tests) {
          const result = await test();
          results.push(result);
      }

      console.log('\n=== Test Results Summary ===');
      const allPassed = results.every(result => result);
      console.log(`${allPassed ? 'All tests passed!' : 'Some tests failed.'}`);
      
      process.exit(allPassed ? 0 : 1);
  } catch (error) {
      console.error('Test suite failed:', error);
      process.exit(1);
  }
}

runAllTests();