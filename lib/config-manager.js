const fs = require('fs');
const path = require('path');
const Config = require('./config');

/**
 * ConfigManager class provides advanced configuration management for developers.
 */
class ConfigManager {
  /**
   * Creates a new ConfigManager instance.
   * @param {string} configPath - Path to configuration file.
   */
  constructor(configPath = null) {
    this.configPath = configPath || path.join(process.cwd(), 'script-connector.config.js');
    this.userConfig = {};
    this.environmentOverrides = {};
    this.schema = this._getConfigSchema();
  }

  /**
   * Loads configuration from file and environment.
   * @returns {Object} Merged configuration.
   */
  loadConfig() {
    this._loadFromFile();
    this._loadEnvironmentOverrides();
    this._validateConfig();

    return Config.merge(this.userConfig);
  }

  /**
   * Saves current configuration to file.
   * @param {Object} config - Configuration to save.
   */
  saveConfig(config) {
    this.userConfig = config;
    this._validateConfig();

    const configContent = `module.exports = ${JSON.stringify(config, null, 2)};`;
    fs.writeFileSync(this.configPath, configContent, 'utf8');
  }

  /**
   * Updates specific configuration values.
   * @param {string} key - Configuration key (dot notation supported).
   * @param {*} value - New value.
   */
  updateConfig(key, value) {
    this._setNestedProperty(this.userConfig, key, value);
    this._validateConfig();
  }

  /**
   * Gets configuration value by key.
   * @param {string} key - Configuration key (dot notation supported).
   * @param {*} defaultValue - Default value if key not found.
   * @returns {*} Configuration value.
   */
  getConfig(key, defaultValue = undefined) {
    return this._getNestedProperty(this.userConfig, key) || defaultValue;
  }

  /**
   * Resets configuration to defaults.
   */
  resetToDefaults() {
    this.userConfig = {};
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
  }

  /**
   * Gets configuration schema for validation and documentation.
   * @returns {Object} Configuration schema.
   */
  getSchema() {
    return this.schema;
  }

  /**
   * Generates configuration template.
   * @returns {string} Configuration template as JavaScript code.
   */
  generateTemplate() {
    const defaultConfig = Config.getDefault();
    return `// ScriptConnector Configuration Template
module.exports = ${JSON.stringify(defaultConfig, null, 2)};

// Configuration Options:
// - maxConcurrent: Maximum concurrent script executions
// - scripts: Object mapping script names to file paths
// - interpreters: File extension to interpreter mapping
// - cache: Caching configuration (enabled, ttl, maxSize)
// - logging: Logging configuration (level, enabled, file, maxFileSize)
// - errorHandling: Error handling options (formatErrors, includeStackTrace, etc.)
// - queue: Queue management settings (maxRetries, retryDelay, monitoringInterval)
// - metrics: Metrics collection configuration
// - scaling: Auto-scaling configuration for high-load scenarios
`;
  }

  /**
   * Validates configuration against schema.
   * @private
   */
  _validateConfig() {
    const mergedConfig = Config.merge(this.userConfig);

    // Validate required fields
    if (typeof mergedConfig.maxConcurrent !== 'number' || mergedConfig.maxConcurrent < 1) {
      throw new Error('maxConcurrent must be a positive number');
    }

    if (typeof mergedConfig.scripts !== 'object') {
      throw new Error('scripts must be an object');
    }

    // Validate script paths exist
    for (const [name, scriptPath] of Object.entries(mergedConfig.scripts)) {
      if (!fs.existsSync(scriptPath)) {
        console.warn(`Warning: Script '${name}' path '${scriptPath}' does not exist`);
      }
    }

    // Validate interpreters
    if (typeof mergedConfig.interpreters !== 'object') {
      throw new Error('interpreters must be an object');
    }
  }

  /**
   * Loads configuration from file.
   * @private
   */
  _loadFromFile() {
    if (fs.existsSync(this.configPath)) {
      try {
        this.userConfig = require(this.configPath);
        if (typeof this.userConfig === 'function') {
          this.userConfig = this.userConfig();
        }
      } catch (error) {
        throw new Error(`Failed to load config from ${this.configPath}: ${error.message}`);
      }
    }
  }

  /**
   * Loads environment variable overrides.
   * @private
   */
  _loadEnvironmentOverrides() {
    // Environment variable mapping
    const envMappings = {
      'SCRIPT_CONNECTOR_MAX_CONCURRENT': 'maxConcurrent',
      'SCRIPT_CONNECTOR_LOG_LEVEL': 'logging.level',
      'SCRIPT_CONNECTOR_CACHE_ENABLED': 'cache.enabled',
      'SCRIPT_CONNECTOR_METRICS_ENABLED': 'metrics.enabled'
    };

    for (const [envVar, configKey] of Object.entries(envMappings)) {
      if (process.env[envVar]) {
        const value = this._parseEnvValue(process.env[envVar]);
        this._setNestedProperty(this.environmentOverrides, configKey, value);
      }
    }

    // Merge environment overrides
    if (Object.keys(this.environmentOverrides).length > 0) {
      this.userConfig = Config.deepMerge(this.userConfig, this.environmentOverrides);
    }
  }

  /**
   * Parses environment variable value.
   * @private
   */
  _parseEnvValue(value) {
    // Try to parse as JSON first
    try {
      return JSON.parse(value);
    } catch {
      // Try to parse as boolean
      if (value.toLowerCase() === 'true') return true;
      if (value.toLowerCase() === 'false') return false;

      // Try to parse as number
      const num = parseFloat(value);
      if (!isNaN(num)) return num;

      // Return as string
      return value;
    }
  }

  /**
   * Gets nested property value.
   * @private
   */
  _getNestedProperty(obj, key) {
    return key.split('.').reduce((current, k) => current && current[k], obj);
  }

  /**
   * Sets nested property value.
   * @private
   */
  _setNestedProperty(obj, key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((current, k) => {
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      return current[k];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Gets configuration schema.
   * @private
   */
  _getConfigSchema() {
    return {
      maxConcurrent: {
        type: 'number',
        default: require('os').cpus().length,
        description: 'Maximum concurrent script executions'
      },
      scripts: {
        type: 'object',
        default: {},
        description: 'Script name to file path mapping'
      },
      interpreters: {
        type: 'object',
        default: { '.py': 'python3', '.js': 'node', '.go': 'go run', '.sh': 'bash' },
        description: 'File extension to interpreter mapping'
      },
      cache: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          ttl: { type: 'number', default: 300000 },
          maxSize: { type: 'number', default: 1000 }
        }
      },
      logging: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['debug', 'info', 'warn', 'error'], default: 'info' },
          enabled: { type: 'boolean', default: true },
          file: { type: 'string', default: null },
          maxFileSize: { type: 'number', default: 10485760 }
        }
      },
      errorHandling: {
        type: 'object',
        properties: {
          formatErrors: { type: 'boolean', default: true },
          includeStackTrace: { type: 'boolean', default: false },
          includeErrorCode: { type: 'boolean', default: true },
          logErrors: { type: 'boolean', default: true }
        }
      },
      queue: {
        type: 'object',
        properties: {
          maxRetries: { type: 'number', default: 3 },
          retryDelay: { type: 'number', default: 1000 },
          monitoringInterval: { type: 'number', default: 5000 },
          memoryThreshold: { type: 'number', default: 209715200 },
          cpuThreshold: { type: 'number', default: require('os').cpus().length * 0.8 }
        }
      },
      metrics: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: true },
          collectionInterval: { type: 'number', default: 60000 },
          retentionPeriod: { type: 'number', default: 86400000 }
        }
      },
      scaling: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean', default: false },
          minWorkers: { type: 'number', default: 1 },
          maxWorkers: { type: 'number', default: require('os').cpus().length },
          scaleUpThreshold: { type: 'number', default: 0.8 },
          scaleDownThreshold: { type: 'number', default: 0.2 },
          ignoreProcessLimit: { type: 'boolean', default: false },
        }
      }
    };
  }
}

module.exports = ConfigManager;