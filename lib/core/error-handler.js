/**
 * ErrorHandler class provides centralized error handling and formatting.
 */
class ErrorHandler {
  /**
   * Creates a new ErrorHandler instance.
   * @param {Object} config - Configuration object.
   * @param {Logger} logger - Logger instance.
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Handles and formats errors.
   * @param {Error} error - The error to handle.
   * @param {Object} context - Additional context information.
   * @returns {Object} Formatted error object.
   */
  handleError(error, context = {}) {
    const formattedError = this._formatError(error, context);

    if (this.config.errorHandling.logErrors !== false) {
      this.logger.error('Error handled', formattedError);
    }

    return formattedError;
  }

  /**
   * Formats an error with context information.
   * @private
   */
  _formatError(error, context) {
    const errorObj = {
      message: error.message,
      name: error.name,
      timestamp: new Date().toISOString(),
      context: context
    };

    if (this.config.errorHandling.includeStackTrace && error.stack) {
      errorObj.stack = error.stack;
    }

    if (this.config.errorHandling.includeErrorCode && error.code) {
      errorObj.code = error.code;
    }

    return errorObj;
  }

  /**
   * Creates a custom error with additional context.
   * @param {string} message - Error message.
   * @param {string} type - Error type.
   * @param {Object} context - Additional context.
   * @returns {Error} Custom error.
   */
  createError(message, type = 'ScriptConnectorError', context = {}) {
    const error = new Error(message);
    error.name = type;
    error.context = context;
    return error;
  }

  /**
   * Handles script execution errors.
   * @param {Error} error - Execution error.
   * @param {string} scriptName - Name of the script.
   * @param {string} scriptPath - Path to the script.
   * @param {string} functionName - Name of the function (optional).
   * @returns {Error} Formatted execution error.
   */
  handleExecutionError(error, scriptName, scriptPath, functionName = null) {
    const context = {
      script: scriptName,
      path: scriptPath,
      function: functionName,
      operation: functionName ? 'function_execution' : 'script_execution'
    };

    return this.createError(
      `Execution failed: ${error.message}`,
      'ExecutionError',
      context
    );
  }

  /**
   * Handles configuration errors.
   * @param {string} message - Error message.
   * @param {Object} invalidConfig - Invalid configuration part.
   * @returns {Error} Configuration error.
   */
  handleConfigError(message, invalidConfig = {}) {
    return this.createError(
      `Configuration error: ${message}`,
      'ConfigurationError',
      { invalidConfig }
    );
  }

  /**
   * Handles resource limit errors.
   * @param {string} resource - Resource that hit the limit.
   * @param {number} current - Current usage.
   * @param {number} limit - Resource limit.
   * @returns {Error} Resource limit error.
   */
  handleResourceLimitError(resource, current, limit) {
    return this.createError(
      `${resource} limit exceeded: ${current}/${limit}`,
      'ResourceLimitError',
      { resource, current, limit }
    );
  }

  /**
   * Handles queue overflow errors.
   * @param {number} queueSize - Current queue size.
   * @param {number} maxSize - Maximum queue size.
   * @returns {Error} Queue overflow error.
   */
  handleQueueOverflowError(queueSize, maxSize) {
    return this.createError(
      `Queue overflow: ${queueSize}/${maxSize}`,
      'QueueOverflowError',
      { queueSize, maxSize }
    );
  }

  /**
   * Checks if an error is retryable.
   * @param {Error} error - Error to check.
   * @returns {boolean} True if error is retryable.
   */
  isRetryableError(error) {
    const retryableErrors = [
      'ResourceLimitError',
      'TimeoutError',
      'NetworkError',
      'TemporaryFailureError'
    ];

    return retryableErrors.includes(error.name) ||
           error.message.toLowerCase().includes('timeout') ||
           error.message.toLowerCase().includes('connection') ||
           error.code === 'ECONNRESET' ||
           error.code === 'ETIMEDOUT';
  }

  /**
   * Gets recovery strategy for an error.
   * @param {Error} error - Error to analyze.
   * @returns {Object} Recovery strategy.
   */
  getRecoveryStrategy(error) {
    if (this.isRetryableError(error)) {
      return {
        action: 'retry',
        delay: this._calculateRetryDelay(error),
        maxRetries: 3
      };
    }

    return {
      action: 'fail',
      reason: 'Non-retryable error'
    };
  }

  /**
   * Calculates retry delay based on error type.
   * @private
   */
  _calculateRetryDelay(error) {
    const baseDelay = 1000; // 1 second

    if (error.name === 'ResourceLimitError') {
      return baseDelay * 5; // 5 seconds for resource issues
    }

    if (error.code === 'ETIMEDOUT') {
      return baseDelay * 2; // 2 seconds for timeouts
    }

    return baseDelay; // Default 1 second
  }
}

module.exports = ErrorHandler;