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
        ttl: 300000 // 5 minutes
      },
      logging: {
        level: 'info', // 'debug', 'info', 'warn', 'error'
        enabled: true
      },
      errorHandling: {
        formatErrors: true,
        includeStackTrace: false
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