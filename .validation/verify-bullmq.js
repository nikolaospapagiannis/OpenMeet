const { Queue } = require('bullmq');

const queue = new Queue('agent-task', {
  connection: {
    host: 'localhost',
    port: 6379
  }
});

async function checkQueue() {
  try {
    const counts = await queue.getJobCounts();
    console.log('BullMQ Queue Statistics (agent-task):');
    console.log('  Waiting:', counts.waiting);
    console.log('  Active:', counts.active);
    console.log('  Completed:', counts.completed);
    console.log('  Failed:', counts.failed);
    console.log('  Delayed:', counts.delayed || 0);

    await queue.close();
    console.log('\nBullMQ Integration: VERIFIED');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkQueue();
