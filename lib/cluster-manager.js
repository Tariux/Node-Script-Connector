const cluster = require('cluster');
const os = require('os');
const EventEmitter = require('events');

/**
 * ClusterManager class handles multi-process scaling for high-load scenarios.
 */
class ClusterManager extends EventEmitter {
  /**
   * Creates a new ClusterManager instance.
   * @param {Object} config - Configuration object.
   * @param {Logger} logger - Logger instance.
   */
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.workers = new Map();
    this.isMaster = cluster.isMaster;
    this.scalingEnabled = config.scaling?.enabled || false;
    this.minWorkers = config.scaling?.minWorkers || 1;
    this.maxWorkers = config.scaling?.maxWorkers || os.cpus().length;
    this.scaleUpThreshold = config.scaling?.scaleUpThreshold || 0.8;
    this.scaleDownThreshold = config.scaling?.scaleDownThreshold || 0.2;

    if (this.isMaster && this.scalingEnabled) {
      this._setupMaster();
    }
  }

  /**
   * Starts the cluster with initial workers.
   */
  start() {
    if (!this.isMaster) {
      this.logger.debug('Worker process started');
      return;
    }

    this.logger.info('Starting cluster manager', {
      scalingEnabled: this.scalingEnabled,
      minWorkers: this.minWorkers,
      maxWorkers: this.maxWorkers
    });

    // Start with minimum workers
    for (let i = 0; i < this.minWorkers; i++) {
      this._forkWorker();
    }
  }

  /**
   * Stops all workers gracefully.
   */
  stop() {
    if (!this.isMaster) return;

    this.logger.info('Stopping cluster manager');

    for (const worker of this.workers.values()) {
      worker.kill('SIGTERM');
    }

    this.workers.clear();
  }

  /**
   * Gets current cluster statistics.
   * @returns {Object} Cluster statistics.
   */
  getStats() {
    if (!this.isMaster) return null;

    return {
      totalWorkers: this.workers.size,
      activeWorkers: Array.from(this.workers.values()).filter(w => w.isConnected()).length,
      scalingEnabled: this.scalingEnabled,
      minWorkers: this.minWorkers,
      maxWorkers: this.maxWorkers,
      scaleUpThreshold: this.scaleUpThreshold,
      scaleDownThreshold: this.scaleDownThreshold
    };
  }

  /**
   * Manually scales to specific number of workers.
   * @param {number} count - Number of workers to scale to.
   */
  scaleTo(count) {
    if (!this.isMaster) return;

    const targetCount = Math.max(this.minWorkers, Math.min(this.maxWorkers, count));
    const currentCount = this.workers.size;

    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        this._forkWorker();
      }
    } else if (targetCount < currentCount) {
      const workersToKill = Array.from(this.workers.values()).slice(0, currentCount - targetCount);
      workersToKill.forEach(worker => worker.kill('SIGTERM'));
    }

    this.logger.info('Manual scaling', { from: currentCount, to: targetCount });
  }

  /**
   * Handles load-based auto-scaling.
   * @param {Object} loadMetrics - Current load metrics.
   */
  handleLoadScaling(loadMetrics) {
    if (!this.isMaster || !this.scalingEnabled) return;

    const currentWorkers = this.workers.size;
    const queueUtilization = loadMetrics.queueSize / (loadMetrics.maxConcurrent * currentWorkers);

    if (queueUtilization >= this.scaleUpThreshold && currentWorkers < this.maxWorkers) {
      this._forkWorker();
      this.logger.info('Auto-scaling up due to high load', {
        queueUtilization,
        currentWorkers,
        newWorkers: currentWorkers + 1
      });
    } else if (queueUtilization <= this.scaleDownThreshold && currentWorkers > this.minWorkers) {
      // Kill the least busy worker
      const workerToKill = this._getLeastBusyWorker();
      if (workerToKill) {
        workerToKill.kill('SIGTERM');
        this.logger.info('Auto-scaling down due to low load', {
          queueUtilization,
          currentWorkers,
          newWorkers: currentWorkers - 1
        });
      }
    }
  }

  /**
   * Sets up master process event handlers.
   * @private
   */
  _setupMaster() {
    cluster.on('fork', (worker) => {
      this.workers.set(worker.id, worker);
      this.logger.info('Worker forked', { workerId: worker.id });

      worker.on('message', (message) => {
        this._handleWorkerMessage(worker, message);
      });
    });

    cluster.on('exit', (worker, code, signal) => {
      this.workers.delete(worker.id);
      this.logger.warn('Worker exited', { workerId: worker.id, code, signal });

      // Auto-restart worker if scaling is enabled
      if (this.scalingEnabled && this.workers.size < this.minWorkers) {
        this.logger.info('Restarting worker to maintain minimum count');
        this._forkWorker();
      }

      this.emit('workerExit', { workerId: worker.id, code, signal });
    });

    cluster.on('online', (worker) => {
      this.logger.info('Worker online', { workerId: worker.id });
      this.emit('workerOnline', { workerId: worker.id });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM, shutting down gracefully');
      this.stop();
    });

    process.on('SIGINT', () => {
      this.logger.info('Received SIGINT, shutting down gracefully');
      this.stop();
    });
  }

  /**
   * Forks a new worker process.
   * @private
   */
  _forkWorker() {
    const worker = cluster.fork();
    return worker;
  }

  /**
   * Handles messages from worker processes.
   * @private
   */
  _handleWorkerMessage(worker, message) {
    switch (message.type) {
      case 'loadMetrics':
        this.handleLoadScaling(message.data);
        break;
      case 'taskCompleted':
        this.emit('taskCompleted', { workerId: worker.id, ...message.data });
        break;
      case 'taskFailed':
        this.emit('taskFailed', { workerId: worker.id, ...message.data });
        break;
      default:
        this.emit('workerMessage', { workerId: worker.id, message });
    }
  }

  /**
   * Gets the least busy worker (simplified implementation).
   * @private
   */
  _getLeastBusyWorker() {
    // In a real implementation, you'd track load per worker
    // For now, just return the first worker
    return Array.from(this.workers.values())[0] || null;
  }

  /**
   * Sends message to all workers.
   * @param {Object} message - Message to send.
   */
  broadcastToWorkers(message) {
    if (!this.isMaster) return;

    for (const worker of this.workers.values()) {
      worker.send(message);
    }
  }

  /**
   * Sends message to specific worker.
   * @param {number} workerId - Worker ID.
   * @param {Object} message - Message to send.
   */
  sendToWorker(workerId, message) {
    if (!this.isMaster) return;

    const worker = this.workers.get(workerId);
    if (worker) {
      worker.send(message);
    }
  }
}

module.exports = ClusterManager;