const path = require('path');
const Config = require('./config');
const Logger = require('./logger');
const ScriptLoader = require('./core/script-loader');
const ScriptExecutor = require('./core/script-executor');
const TaskScheduler = require('./core/task-scheduler');
const ErrorHandler = require('./core/error-handler');
const MetricsCollector = require('./core/metrics-collector');

/**
 * ScriptConnector class for executing scripts and functions across different languages.
 * Refactored with modular architecture for better maintainability and scalability.
 */
class ScriptConnector {
  /**
   * Creates a new ScriptConnector instance.
   * @param {Object} userConfig - User configuration.
   */
  constructor(userConfig = {}) {
    this.config = Config.merge(userConfig);
    Config.validate(this.config);

    // Initialize core components
    this.logger = new Logger(this.config.logging);
    this.errorHandler = new ErrorHandler(this.config, this.logger);
    this.metrics = new MetricsCollector(this.config, this.logger);
    this.scriptLoader = new ScriptLoader(this.config, this.logger);
    this.scriptExecutor = new ScriptExecutor(this.config, this.logger);
    this.taskScheduler = new TaskScheduler(this.config, this.logger);

    // Load scripts and build API
    this.api = this.scriptLoader.loadAllScripts();

    // Bind function wrappers to actual execution methods
    this._bindApiFunctions();

    // Set up event handlers
    this._setupEventHandlers();

    this.logger.info('ScriptConnector initialized with modular architecture', {
      config: this.config,
      loadedScripts: Object.keys(this.api).length
    });
  }

  /**
   * Executes a script.
   * @param {string} scriptName - Name of the script.
   * @param {Array} args - Arguments for the script.
   * @param {Object} options - Execution options.
   * @returns {Promise<string>} Execution result.
   */
  async exec(scriptName, args = [], options = {}) {
    const startTime = Date.now();
    this.logger.debug('Executing script', { scriptName, args, options });

    return new Promise((resolve, reject) => {
      const task = {
        exec: async () => {
          try {
            const result = await this.scriptExecutor.executeScript(scriptName, args, options);
            const executionTime = Date.now() - startTime;
            this.metrics.recordTaskExecution({ scriptName }, executionTime, true);
            resolve(result);
          } catch (error) {
            const executionTime = Date.now() - startTime;
            this.metrics.recordTaskExecution({ scriptName }, executionTime, false);
            const handledError = this.errorHandler.handleExecutionError(error, scriptName, this.config.scripts[scriptName]);
            reject(handledError);
          }
        }
      };

      const priority = options.priority || 'normal';
      this.taskScheduler.addTask(task, priority, options);
    });
  }

  /**
   * Executes a specific function from a script.
   * @param {string} scriptName - Name of the script.
   * @param {string} functionName - Name of the function.
   * @param {Array} args - Arguments for the function.
   * @param {Object} options - Execution options.
   * @returns {Promise<string>} Function result.
   */
  async execFunction(scriptName, functionName, args = [], options = {}) {
    const cacheKey = `${scriptName}.${functionName}:${JSON.stringify(args)}`;
    if (this.config.cache.enabled) {
      const cached = this.taskScheduler.getCache(cacheKey);
      if (cached && !options.force) {
        this.logger.debug('Returning cached result', { cacheKey });
        return Promise.resolve(cached);
      }
    }

    const startTime = Date.now();
    this.logger.debug('Executing function', { scriptName, functionName, args, options });

    return new Promise((resolve, reject) => {
      const task = {
        exec: async () => {
          try {
            const result = await this.scriptExecutor.executeFunction(scriptName, functionName, args, options);
            const executionTime = Date.now() - startTime;
            this.metrics.recordTaskExecution({ scriptName, functionName }, executionTime, true);

            if (result && this.config.cache.enabled) {
              this.taskScheduler.setCache(cacheKey, result, this.config.cache.ttl);
            }

            resolve(result);
          } catch (error) {
            const executionTime = Date.now() - startTime;
            this.metrics.recordTaskExecution({ scriptName, functionName }, executionTime, false);
            const handledError = this.errorHandler.handleExecutionError(error, scriptName, this.config.scripts[scriptName], functionName);
            reject(handledError);
          }
        }
      };

      const priority = options.priority || 'normal';
      this.taskScheduler.addTask(task, priority, options);
    });
  }

  /**
   * Sets up event handlers for the scheduler and metrics.
   * @private
   */
  _setupEventHandlers() {
    // Handle task scheduler events
    this.taskScheduler.on('taskAdded', (task) => {
      this.logger.debug('Task added to scheduler', { taskId: task.id, priority: task.priority });
    });

    this.taskScheduler.on('taskStarted', (task) => {
      this.logger.debug('Task started', { taskId: task.id });
    });

    this.taskScheduler.on('taskCompleted', ({ task, result }) => {
      this.logger.debug('Task completed', { taskId: task.id });
    });

    this.taskScheduler.on('taskFailed', ({ task, error }) => {
      this.logger.warn('Task failed', { taskId: task.id, error: error.message });
    });

    this.taskScheduler.on('resourceUpdate', (resources) => {
      this.metrics.updatePerformanceMetrics(resources);
      this.metrics.updateQueueMetrics(this.taskScheduler.getStats());
    });
  }

  /**
   * Binds API functions to actual execution methods.
   * @private
   */
  _bindApiFunctions() {
    for (const [scriptName, functions] of Object.entries(this.api)) {
      for (const [functionName, funcDescriptor] of Object.entries(functions)) {
        this.api[scriptName][functionName] = (...args) => {
          return this.execFunction(scriptName, functionName, args);
        };
      }
    }
  }

  /**
   * Reloads a specific script.
   * @param {string} scriptName - Name of the script to reload.
   */
  reloadScript(scriptName) {
    try {
      this.scriptLoader.reloadScript(scriptName);
      const newApi = this.scriptLoader.loadScript(scriptName, this.config.scripts[scriptName]);

      // Re-bind functions for the reloaded script
      if (newApi) {
        for (const [functionName] of Object.entries(newApi)) {
          newApi[functionName] = (...args) => {
            return this.execFunction(scriptName, functionName, args);
          };
        }
        this.api[scriptName] = newApi;
      }

      this.logger.info('Script reloaded successfully', { scriptName });
    } catch (error) {
      this.logger.error('Failed to reload script', { scriptName, error: error.message });
      throw this.errorHandler.handleExecutionError(error, scriptName, this.config.scripts[scriptName]);
    }
  }

  /**
   * Gets current system statistics.
   * @returns {Object} System statistics.
   */
  getStats() {
    return {
      scheduler: this.taskScheduler.getStats(),
      metrics: this.metrics.getSummary(),
      scripts: this.scriptLoader.getLoadedScriptsInfo(),
      config: {
        maxConcurrent: this.config.maxConcurrent,
        cacheEnabled: this.config.cache.enabled,
        loadedScripts: Object.keys(this.api).length
      }
    };
  }

  /**
   * Gets detailed metrics.
   * @returns {Object} Detailed metrics.
   */
  getMetrics() {
    return this.metrics.getMetrics();
  }

  /**
   * Forces processing of pending tasks.
   */
  processQueue() {
    // The scheduler handles this automatically, but this method allows manual triggering
    this.logger.debug('Manual queue processing triggered');
  }

  /**
   * Shuts down the connector gracefully.
   */
  shutdown() {
    this.logger.info('Shutting down ScriptConnector');
    this.taskScheduler.stop();
    this.logger.info('ScriptConnector shutdown complete');
  }
}

module.exports = ScriptConnector;