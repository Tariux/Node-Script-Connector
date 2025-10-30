const os = require('os');

/**
 * Configuration class for ScriptConnector.
 */
class Config {
  /**
   * Creates a default configuration.
   * @returns {Object} Default configuration object.
   */
  static getDefault() {
    return {
      maxConcurrent: os.cpus().length,
      scripts: {},
      interpreters: {
        '.py': 'python3',
        '.js': 'node',
        '.go': 'go run',
        '.sh': 'bash'
      },
      cache: {
        enabled: true,
        ttl: 300000, // 5 minutes
        maxSize: 1000
      },
      logging: {
        level: 'info', // 'debug', 'info', 'warn', 'error'
        enabled: true,
        file: null, // Optional log file path
        maxFileSize: 10 * 1024 * 1024 // 10MB
      },
      errorHandling: {
        formatErrors: true,
        includeStackTrace: false,
        includeErrorCode: true,
        logErrors: true
      },
      queue: {
        maxRetries: 3,
        retryDelay: 1000, // Base retry delay in ms
        monitoringInterval: 5000, // Resource monitoring interval
        memoryThreshold: 200 * 1024 * 1024, // 200MB
        cpuThreshold: os.cpus().length * 0.8
      },
      metrics: {
        enabled: true,
        collectionInterval: 60000, // 1 minute
        retentionPeriod: 24 * 60 * 60 * 1000 // 24 hours
      },
      scaling: {
        enabled: false,
        minWorkers: 1,
        maxWorkers: os.cpus().length,
        scaleUpThreshold: 0.8, // Scale up when queue > 80%
        scaleDownThreshold: 0.2 // Scale down when queue < 20%
      }
    };
  }

  /**
   * Merges user config with defaults.
   * @param {Object} userConfig - User provided configuration.
   * @returns {Object} Merged configuration.
   */
  static merge(userConfig = {}) {
    const defaultConfig = this.getDefault();
    return this.deepMerge(defaultConfig, userConfig);
  }

  /**
   * Deep merges two objects.
   * @param {Object} target - Target object.
   * @param {Object} source - Source object.
   * @returns {Object} Merged object.
   */
  static deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }

  /**
   * Validates the configuration.
   * @param {Object} config - Configuration to validate.
   * @throws {Error} If configuration is invalid.
   */
  static validate(config) {
    if (typeof config.maxConcurrent !== 'number' || config.maxConcurrent < 1) {
      throw new Error('maxConcurrent must be a positive number');
    }
    if (typeof config.scripts !== 'object') {
      throw new Error('scripts must be an object');
    }
    if (typeof config.interpreters !== 'object') {
      throw new Error('interpreters must be an object');
    }
  }
}

module.exports = Config;