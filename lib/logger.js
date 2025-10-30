/**
 * Simple logger class for the ScriptConnector.
 */
class Logger {
  /**
   * Creates a logger instance.
   * @param {Object} config - Logging configuration.
   */
  constructor(config = {}) {
    this.level = config.level || 'info';
    this.enabled = config.enabled !== false;
    this.levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
  }

  /**
   * Logs a debug message.
   * @param {string} message - Message to log.
   * @param {*} data - Additional data.
   */
  debug(message, data = null) {
    this.log('debug', message, data);
  }

  /**
   * Logs an info message.
   * @param {string} message - Message to log.
   * @param {*} data - Additional data.
   */
  info(message, data = null) {
    this.log('info', message, data);
  }

  /**
   * Logs a warning message.
   * @param {string} message - Message to log.
   * @param {*} data - Additional data.
   */
  warn(message, data = null) {
    this.log('warn', message, data);
  }

  /**
   * Logs an error message.
   * @param {string} message - Message to log.
   * @param {*} data - Additional data.
   */
  error(message, data = null) {
    this.log('error', message, data);
  }

  /**
   * Internal logging method.
   * @param {string} level - Log level.
   * @param {string} message - Message to log.
   * @param {*} data - Additional data.
   */
  log(level, message, data = null) {
    if (!this.enabled || this.levels[level] < this.levels[this.level]) {
      return;
    }
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    if (data) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }
}

module.exports = Logger;