const { ScriptConnector } = require('../index');

console.log('=== Example 2: Python Script Execution ===');

const connector = new ScriptConnector({
  scripts: {
    math: './examples/scripts/math.py',
    utils: './examples/scripts/utils.js'
  }
});

function testThree() {
  connector.exec('math', ['10', '5']).then(result => {
    console.log('Script result:', result.trim());
  }).catch(err => console.error('Error:', err.message));

  connector.api.math.add(10, 5).then(result => {
    console.log('Add result:', result.trim());
  }).catch(err => console.error('Error:', err.message));

  connector.api.math.multiply(10, 5).then(result => {
    console.log('Multiply result:', result.trim());
  }).catch(err => console.error('Error:', err.message));

  connector.api.math.divide(10, 5).then(result => {
    console.log('Divide result:', result.trim());
  }).catch(err => console.error('Error:', err.message));

}

testThree();

setInterval(() => {
    testThree();
}, 500);

setInterval(() => {
    testThree();
}, 100);