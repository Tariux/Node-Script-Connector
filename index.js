const ScriptConnector = require('./lib/script-connector');
const AdvancedScriptConnector = require('./lib/advanced-script-connector');
const Config = require('./lib/config');
const ConfigManager = require('./lib/config-manager');

module.exports = {
  // Basic connector for simple use cases
  ScriptConnector,
  // Advanced connector with enterprise features
  AdvancedScriptConnector,
  // Configuration utilities
  Config,
  ConfigManager,

  // Convenience functions
  createConnector: (config) => new ScriptConnector(config),
  createAdvancedConnector: (config) => new AdvancedScriptConnector(config),

  // Version info
  version: require('./package.json').version
};