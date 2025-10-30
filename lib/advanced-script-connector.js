const ScriptConnector = require('./script-connector');
const ConfigManager = require('./config-manager');
const ClusterManager = require('./cluster-manager');
const Logger = require('./logger');

/**
 * AdvancedScriptConnector class provides enterprise-grade script execution capabilities.
 * Extends basic ScriptConnector with advanced features for large-scale deployments.
 */
class AdvancedScriptConnector extends ScriptConnector {
  /**
   * Creates a new AdvancedScriptConnector instance.
   * @param {Object|string} config - Configuration object or path to config file.
   */
  constructor(config = {}) {
    // Handle config file path
    let configPath = null;
    if (typeof config === 'string') {
      configPath = config;
      config = {};
    }

    // Initialize config manager
    const configManager = new ConfigManager(configPath);
    const finalConfig = configManager.loadConfig();

    // Merge with provided config
    const mergedConfig = require('./config').deepMerge(finalConfig, config);

    // Initialize logger
    const logger = new Logger(mergedConfig.logging);

    // Initialize cluster manager if scaling is enabled
    const clusterManager = new ClusterManager(mergedConfig, logger);

    // Call parent constructor
    super(mergedConfig);

    // Add advanced components
    this.configManager = configManager;
    this.clusterManager = clusterManager;
    this.logger = logger;

    // Setup advanced features
    this._setupAdvancedFeatures();

    this.logger.info('AdvancedScriptConnector initialized', {
      scalingEnabled: mergedConfig.scaling?.enabled,
      clusterMode: clusterManager.isMaster ? 'master' : 'worker',
      configPath: configPath
    });
  }

  /**
   * Sets up advanced features.
   * @private
   */
  _setupAdvancedFeatures() {
    // Setup cluster communication if in cluster mode
    if (this.clusterManager.scalingEnabled) {
      this._setupClusterCommunication();
    }

    // Setup periodic health checks
    this._setupHealthChecks();

    // Setup graceful shutdown
    this._setupGracefulShutdown();
  }

  /**
   * Sets up cluster communication.
   * @private
   */
  _setupClusterCommunication() {
    if (this.clusterManager.isMaster) {
      // Master process: coordinate workers
      this.clusterManager.on('taskCompleted', (data) => {
        this.logger.debug('Task completed in worker', data);
      });

      this.clusterManager.on('taskFailed', (data) => {
        this.logger.warn('Task failed in worker', data);
      });

      this.clusterManager.on('workerExit', (data) => {
        this.logger.warn('Worker exited', data);
      });

      this.clusterManager.on('workerOnline', (data) => {
        this.logger.info('Worker came online', data);
      });
    } else {
      // Worker process: report metrics to master
      setInterval(() => {
        const stats = this.getStats();
        process.send({
          type: 'loadMetrics',
          data: {
            queueSize: stats.scheduler.queuedTasks,
            maxConcurrent: stats.config.maxConcurrent
          }
        });
      }, this.config.queue.monitoringInterval);
    }
  }

  /**
   * Sets up periodic health checks.
   * @private
   */
  _setupHealthChecks() {
    setInterval(() => {
      const health = this._performHealthCheck();
      this.logger.debug('Health check', health);

      if (!health.healthy) {
        this.logger.warn('Health check failed', health);
        // Could emit event or take corrective action
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Sets up graceful shutdown handlers.
   * @private
   */
  _setupGracefulShutdown() {
    const shutdown = async (signal) => {
      this.logger.info(`Received ${signal}, initiating graceful shutdown`);

      try {
        // Stop accepting new tasks
        this.taskScheduler.processing = false;

        // Wait for active tasks to complete (with timeout)
        const shutdownTimeout = setTimeout(() => {
          this.logger.warn('Shutdown timeout reached, forcing exit');
          process.exit(1);
        }, 30000); // 30 second timeout

        // Wait for queue to drain
        while (this.taskScheduler.activeTasks > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        clearTimeout(shutdownTimeout);
        this.clusterManager.stop();
        this.logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during shutdown', error);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  /**
   * Performs a health check.
   * @private
   */
  _performHealthCheck() {
    const stats = this.getStats();
    const now = Date.now();

    return {
      healthy: true, // Could implement more sophisticated checks
      timestamp: now,
      uptime: now - (stats.performance?.uptime || 0),
      activeTasks: stats.scheduler?.activeTasks || 0,
      queuedTasks: stats.scheduler?.queuedTasks || 0,
      loadedScripts: stats.scripts ? Object.keys(stats.scripts).length : 0,
      cacheSize: stats.scheduler?.cacheSize || 0
    };
  }

  /**
   * Gets advanced statistics.
   * @returns {Object} Advanced statistics.
   */
  getAdvancedStats() {
    const baseStats = this.getStats();

    return {
      ...baseStats,
      cluster: this.clusterManager.getStats(),
      health: this._performHealthCheck(),
      config: {
        ...baseStats.config,
        configPath: this.configManager.configPath,
        environmentOverrides: Object.keys(this.configManager.environmentOverrides)
      }
    };
  }

  /**
   * Reloads configuration dynamically.
   * @param {Object} newConfig - New configuration.
   */
  reloadConfig(newConfig = {}) {
    try {
      const updatedConfig = this.configManager.loadConfig();
      const mergedConfig = require('./config').deepMerge(updatedConfig, newConfig);

      // Update components with new config
      this.config = mergedConfig;
      this.logger = new Logger(mergedConfig.logging);

      this.logger.info('Configuration reloaded successfully');
    } catch (error) {
      this.logger.error('Failed to reload configuration', error);
      throw error;
    }
  }

  /**
   * Exports current configuration.
   * @returns {Object} Current configuration.
   */
  exportConfig() {
    return { ...this.config };
  }

  /**
   * Generates configuration template.
   * @returns {string} Configuration template.
   */
  generateConfigTemplate() {
    return this.configManager.generateTemplate();
  }

  /**
   * Scales the cluster to specified number of workers.
   * @param {number} count - Number of workers.
   */
  scaleTo(count) {
    if (this.clusterManager.scalingEnabled) {
      this.clusterManager.scaleTo(count);
    } else {
      this.logger.warn('Scaling is not enabled in configuration');
    }
  }

  /**
   * Gets cluster statistics.
   * @returns {Object} Cluster statistics.
   */
  getClusterStats() {
    return this.clusterManager.getStats();
  }

  /**
   * Broadcasts message to all workers.
   * @param {Object} message - Message to broadcast.
   */
  broadcastToWorkers(message) {
    this.clusterManager.broadcastToWorkers(message);
  }

  /**
   * Sends message to specific worker.
   * @param {number} workerId - Worker ID.
   * @param {Object} message - Message to send.
   */
  sendToWorker(workerId, message) {
    this.clusterManager.sendToWorker(workerId, message);
  }
}

module.exports = AdvancedScriptConnector;