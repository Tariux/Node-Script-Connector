/**
 * MetricsCollector class handles collection and reporting of performance metrics.
 */
class MetricsCollector {
  /**
   * Creates a new MetricsCollector instance.
   * @param {Object} config - Configuration object.
   * @param {Logger} logger - Logger instance.
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.metrics = {
      tasks: {
        total: 0,
        completed: 0,
        failed: 0,
        retried: 0,
        averageExecutionTime: 0
      },
      scripts: {
        loaded: 0,
        executions: {},
        errors: {}
      },
      performance: {
        peakMemoryUsage: 0,
        averageCpuLoad: 0,
        uptime: 0
      },
      queue: {
        size: 0,
        processedPerMinute: 0,
        averageWaitTime: 0
      }
    };

    this.startTime = Date.now();
    this.executionTimes = [];
    this.waitTimes = [];
  }

  /**
   * Records task execution metrics.
   * @param {Object} task - Task information.
   * @param {number} executionTime - Execution time in milliseconds.
   * @param {boolean} success - Whether task succeeded.
   */
  recordTaskExecution(task, executionTime, success) {
    this.metrics.tasks.total++;

    if (success) {
      this.metrics.tasks.completed++;
    } else {
      this.metrics.tasks.failed++;
    }

    this.executionTimes.push(executionTime);
    this._updateAverageExecutionTime();

    // Track script-specific metrics
    const scriptName = task.scriptName || 'unknown';
    if (!this.metrics.scripts.executions[scriptName]) {
      this.metrics.scripts.executions[scriptName] = 0;
      this.metrics.scripts.errors[scriptName] = 0;
    }

    this.metrics.scripts.executions[scriptName]++;
    if (!success) {
      this.metrics.scripts.errors[scriptName]++;
    }

    this.logger.debug('Task execution recorded', {
      scriptName,
      executionTime,
      success
    });
  }

  /**
   * Records task retry.
   * @param {Object} task - Task information.
   */
  recordTaskRetry(task) {
    this.metrics.tasks.retried++;
    this.logger.debug('Task retry recorded', { taskId: task.id });
  }

  /**
   * Records queue wait time.
   * @param {number} waitTime - Wait time in milliseconds.
   */
  recordQueueWaitTime(waitTime) {
    this.waitTimes.push(waitTime);
    this._updateAverageWaitTime();
  }

  /**
   * Records script loading.
   * @param {string} scriptName - Name of loaded script.
   * @param {number} functionCount - Number of functions loaded.
   */
  recordScriptLoaded(scriptName, functionCount) {
    this.metrics.scripts.loaded++;
    this.logger.info('Script loading recorded', { scriptName, functionCount });
  }

  /**
   * Updates performance metrics.
   * @param {Object} resources - Current resource usage.
   */
  updatePerformanceMetrics(resources) {
    const memoryUsage = resources.memory.used;
    if (memoryUsage > this.metrics.performance.peakMemoryUsage) {
      this.metrics.performance.peakMemoryUsage = memoryUsage;
    }

    // Calculate rolling average CPU load
    const currentLoad = resources.cpu.load;
    this.metrics.performance.averageCpuLoad =
      (this.metrics.performance.averageCpuLoad + currentLoad) / 2;

    this.metrics.performance.uptime = Date.now() - this.startTime;
  }

  /**
   * Updates queue metrics.
   * @param {Object} queueStats - Current queue statistics.
   */
  updateQueueMetrics(queueStats) {
    this.metrics.queue.size = queueStats.queues.high +
                             queueStats.queues.normal +
                             queueStats.queues.low;

    // Calculate processed per minute (rough estimate)
    const uptimeMinutes = (Date.now() - this.startTime) / 60000;
    if (uptimeMinutes > 0) {
      this.metrics.queue.processedPerMinute =
        this.metrics.tasks.completed / uptimeMinutes;
    }
  }

  /**
   * Updates average execution time.
   * @private
   */
  _updateAverageExecutionTime() {
    if (this.executionTimes.length > 0) {
      this.metrics.tasks.averageExecutionTime =
        this.executionTimes.reduce((sum, time) => sum + time, 0) / this.executionTimes.length;
    }
  }

  /**
   * Updates average wait time.
   * @private
   */
  _updateAverageWaitTime() {
    if (this.waitTimes.length > 100) {
      // Keep only last 100 measurements
      this.waitTimes = this.waitTimes.slice(-100);
    }

    if (this.waitTimes.length > 0) {
      this.metrics.queue.averageWaitTime =
        this.waitTimes.reduce((sum, time) => sum + time, 0) / this.waitTimes.length;
    }
  }

  /**
   * Gets current metrics.
   * @returns {Object} Current metrics.
   */
  getMetrics() {
    return {
      ...this.metrics,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    };
  }

  /**
   * Gets summary statistics.
   * @returns {Object} Summary statistics.
   */
  getSummary() {
    const totalTasks = this.metrics.tasks.total;
    const successRate = totalTasks > 0 ? (this.metrics.tasks.completed / totalTasks) * 100 : 0;

    return {
      totalTasks,
      successRate: Math.round(successRate * 100) / 100,
      averageExecutionTime: Math.round(this.metrics.tasks.averageExecutionTime),
      averageWaitTime: Math.round(this.metrics.queue.averageWaitTime),
      loadedScripts: this.metrics.scripts.loaded,
      peakMemoryUsage: this._formatBytes(this.metrics.performance.peakMemoryUsage),
      uptime: this._formatUptime(this.metrics.performance.uptime)
    };
  }

  /**
   * Resets metrics (useful for testing or periodic resets).
   */
  reset() {
    this.metrics = {
      tasks: {
        total: 0,
        completed: 0,
        failed: 0,
        retried: 0,
        averageExecutionTime: 0
      },
      scripts: {
        loaded: 0,
        executions: {},
        errors: {}
      },
      performance: {
        peakMemoryUsage: 0,
        averageCpuLoad: 0,
        uptime: 0
      },
      queue: {
        size: 0,
        processedPerMinute: 0,
        averageWaitTime: 0
      }
    };

    this.executionTimes = [];
    this.waitTimes = [];
    this.startTime = Date.now();

    this.logger.info('Metrics reset');
  }

  /**
   * Formats bytes to human readable format.
   * @private
   */
  _formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Formats uptime to human readable format.
   * @private
   */
  _formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }
}

module.exports = MetricsCollector;