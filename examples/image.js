const { randomUUID } = require('crypto');
const { ScriptConnector } = require('../index');
const path = require('path');
const fs = require('fs').promises;

const connector = new ScriptConnector({
  scripts: {
    image: './examples/scripts/image.py',
  },
  maxConcurrent: 32,
  scaling: { enabled: true, maxWorkers: 32, minWorkers: 8, ignoreProcessLimit: true },
  cache: {
    enabled: true,
    ttl: 300000
  },

});

async function runParallelTest(numRequests) {
  const tempDir = await fs.mkdtemp(path.join(__dirname, 'test-'));
  const inputPath = path.join(__dirname, 'scripts/samples', 'sample_image.jpg');

  const promises = [];
  for (let i = 1; i <= numRequests; i++) {
    const timestamp = randomUUID().replace(/[:.]/g, '-');
    const outputBase = path.join(tempDir, `out_${timestamp}.jpg`);

    promises.push(connector.api.image.compress_image_to_multiple_resolutions(inputPath, outputBase).then(() => {console.log(timestamp , 'DONE!');}));
  }

  await Promise.all(promises);
  console.log(`Parallel test with ${numRequests} requests completed. Files in:`, tempDir);

  setTimeout(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
    console.log('Temp folder deleted');
  }, 10000);
}

// For 10 requests parallel
runParallelTest(100).catch(console.error);

// For 50 requests parallel
// runParallelTest(50).catch(console.error);

async function runIntervalTest(numRequests, intervalMs = 1000) {
  const tempDir = await fs.mkdtemp(path.join(__dirname, 'test-'));
  const inputPath = path.join(__dirname, 'scripts/samples', 'sample_image.jpg');

  let i = 1;
  const interval = setInterval(async () => {
    if (i > numRequests) {
      clearInterval(interval);
      console.log(`Interval test with ${numRequests} requests completed. Files in:`, tempDir);
      setTimeout(async () => {
        await fs.rm(tempDir, { recursive: true, force: true });
        console.log('Temp folder deleted');
      }, 10000);
      return;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputBase = path.join(tempDir, `out_${timestamp}.jpg`);

    const imageResult = await connector.api.image.compress_image_to_multiple_resolutions(inputPath, outputBase);
    await fs.writeFile(path.join(tempDir, `file${i}_${timestamp}.txt`), `timestamp \n ${imageResult}`);
    i++;
  }, intervalMs);
}

// For 10 requests with interval
// runIntervalTest(10).catch(console.error);

// For 50 requests with interval
// runIntervalTest(50).catch(console.error);