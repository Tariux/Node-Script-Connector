const { ScriptConnector } = require('../index');
const path = require('path');

const connector = new ScriptConnector({
  scripts: {
    image: './examples/scripts/image.py',
  }
});

connector.api.image.compress_image_to_multiple_resolutions(path.join(__dirname, 'sample_image.jpg'), path.join(__dirname, 'out.jpg')).then(result => {
  console.log('Image result:', result);
}).catch(err => console.error('Error:', err.message));

