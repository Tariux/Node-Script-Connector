const ScriptConnector = require('./lib/script-connector');
const Config = require('./lib/config');

module.exports = {
  ScriptConnector,
  Config,
  // Convenience function to create a connector with default config
  createConnector: (config) => new ScriptConnector(config)
};