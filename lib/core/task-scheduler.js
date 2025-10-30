const EventEmitter = require('events');
const os = require('os');

/**
 * TaskScheduler class manages task queuing, prioritization, and resource monitoring.
 */
class TaskScheduler extends EventEmitter {
  /**
   * Creates a new TaskScheduler instance.
   * @param {Object} config - Configuration object.
   * @param {Logger} logger - Logger instance.
   */
  constructor(config, logger) {
    super();
    this.config = config;
    this.logger = logger;
    this.queues = {
      high: [],
      normal: [],
      low: []
    };
    this.processing = false;
    this.activeTasks = 0;
    this.maxConcurrent = config.maxConcurrent || os.cpus().length;
    this.cache = new Map();
    this.resourceMonitor = this._createResourceMonitor();
  }

  /**
   * Adds a task to the appropriate queue.
   * @param {Object} task - Task object with exec method.
   * @param {string} priority - Priority level ('high', 'normal', 'low').
   * @param {Object} options - Task options.
   */
  addTask(task, priority = 'normal', options = {}) {
    const queue = this.queues[priority] || this.queues.normal;
    const taskWrapper = {
      ...task,
      priority,
      options,
      id: this._generateTaskId(),
      addedAt: Date.now(),
      retries: 0
    };

    queue.push(taskWrapper);
    this.logger.debug(`Task added to ${priority} queue`, { taskId: taskWrapper.id });
    this.emit('taskAdded', taskWrapper);

    if (!this.processing) {
      this._startProcessing();
    }
  }

  /**
   * Starts processing tasks from queues.
   * @private
   */
  async _startProcessing() {
    this.processing = true;

    while (this._hasTasks() && this._canProcessMore()) {
      const task = this._getNextTask();

      if (task) {
        await this._executeTask(task);
      } else {
        // Wait a bit before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    this.processing = false;
  }

  /**
   * Executes a single task.
   * @private
   */
  async _executeTask(task) {
    this.activeTasks++;
    this.emit('taskStarted', task);

    try {
      const result = await task.exec();
      this.emit('taskCompleted', { task, result });
      this.logger.debug('Task completed successfully', { taskId: task.id });
    } catch (error) {
      this._handleTaskError(task, error);
    } finally {
      this.activeTasks--;
      this._startProcessing(); // Continue processing next tasks
    }
  }

  /**
   * Handles task execution errors.
   * @private
   */
  _handleTaskError(task, error) {
    task.retries = (task.retries || 0) + 1;
    const maxRetries = task.options.maxRetries || this.config.maxRetries || 3;

    if (task.retries < maxRetries) {
      // Retry with exponential backoff
      const delay = Math.pow(2, task.retries) * 1000;
      setTimeout(() => {
        this.addTask(task, task.priority, task.options);
      }, delay);
      this.logger.warn('Task retry scheduled', { taskId: task.id, retry: task.retries, delay });
    } else {
      this.emit('taskFailed', { task, error });
      this.logger.error('Task failed permanently', { taskId: task.id, error: error.message });
    }
  }

  /**
   * Checks if there are tasks in any queue.
   * @private
   */
  _hasTasks() {
    return Object.values(this.queues).some(queue => queue.length > 0);
  }

  /**
   * Checks if more tasks can be processed based on resources.
   * @private
   */
  _canProcessMore() {
    return this.activeTasks < this.maxConcurrent && this._checkSystemResources();
  }

  /**
   * Gets the next task to process based on priority.
   * @private
   */
  _getNextTask() {
    // Process high priority first, then normal, then low
    for (const priority of ['high', 'normal', 'low']) {
      if (this.queues[priority].length > 0) {
        return this.queues[priority].shift();
      }
    }
    return null;
  }

  /**
   * Checks system resources to determine if processing should continue.
   * @private
   */
  _checkSystemResources() {
    const memUsage = process.memoryUsage();
    const memThreshold = this.config.memoryThreshold || 200 * 1024 * 1024; // 200MB
    const cpuLoad = os.loadavg()[0];
    const cpuThreshold = this.config.cpuThreshold || os.cpus().length * 0.8;

    const memOk = os.freemem() > memThreshold;
    const cpuOk = cpuLoad < cpuThreshold;

    if (!memOk || !cpuOk) {
      this.logger.warn('System resources low, pausing task processing', {
        memory: { free: os.freemem(), threshold: memThreshold },
        cpu: { load: cpuLoad, threshold: cpuThreshold }
      });
    }

    return memOk && cpuOk;
  }

  /**
   * Creates a resource monitoring interval.
   * @private
   */
  _createResourceMonitor() {
    return setInterval(() => {
      const resources = {
        memory: {
          used: process.memoryUsage().heapUsed,
          total: os.totalmem(),
          free: os.freemem()
        },
        cpu: {
          load: os.loadavg()[0],
          cores: os.cpus().length
        },
        activeTasks: this.activeTasks,
        queuedTasks: this._getTotalQueuedTasks()
      };

      this.emit('resourceUpdate', resources);
    }, this.config.monitoringInterval || 5000);
  }

  /**
   * Gets total number of queued tasks.
   * @private
   */
  _getTotalQueuedTasks() {
    return Object.values(this.queues).reduce((total, queue) => total + queue.length, 0);
  }

  /**
   * Generates a unique task ID.
   * @private
   */
  _generateTaskId() {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Gets a cached value.
   * @param {string} key - Cache key.
   * @returns {*} Cached value or undefined.
   */
  getCache(key) {
    return this.cache.get(key);
  }

  /**
   * Sets a value in cache with TTL.
   * @param {string} key - Cache key.
   * @param {*} value - Value to cache.
   * @param {number} ttl - Time to live in milliseconds.
   */
  setCache(key, value, ttl = 300000) {
    this.cache.set(key, value);
    setTimeout(() => this.cache.delete(key), ttl);
  }

  /**
   * Gets current queue statistics.
   * @returns {Object} Queue statistics.
   */
  getStats() {
    return {
      activeTasks: this.activeTasks,
      maxConcurrent: this.maxConcurrent,
      queues: {
        high: this.queues.high.length,
        normal: this.queues.normal.length,
        low: this.queues.low.length
      },
      cacheSize: this.cache.size
    };
  }

  /**
   * Stops the scheduler and cleans up resources.
   */
  stop() {
    if (this.resourceMonitor) {
      clearInterval(this.resourceMonitor);
    }
    this.processing = false;
    this.logger.info('TaskScheduler stopped');
  }
}

module.exports = TaskScheduler;