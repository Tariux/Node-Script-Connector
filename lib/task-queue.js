const os = require('os');
const EventEmitter = require('events');

/**
 * TaskQueue class for managing asynchronous tasks with priority and caching.
 * Extends EventEmitter to provide event-driven task processing.
 */
class TaskQueue extends EventEmitter {
  /**
   * Creates a new TaskQueue instance.
   */
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
    this.priorityQueue = []; // Priority queue for important requests
    this.cache = new Map(); // Cache for results
  }

  /**
   * Adds a task to the queue.
   * @param {Object} task - The task object with an exec method.
   * @param {boolean} priority - Whether to add to priority queue.
   */
  add(task, priority = false) {
    if (priority) {
      this.priorityQueue.push(task);
    } else {
      this.queue.push(task);
    }
    this.emit('added');
    if (!this.processing) this.process();
  }

  /**
   * Processes the tasks in the queue.
   * @returns {Promise<void>}
   */
  async process() {
    this.processing = true;
    while (this.priorityQueue.length > 0 || this.queue.length > 0) {
      const task = this.priorityQueue.shift() || this.queue.shift();
      if (this.canProcess()) {
        try {
          const result = await task.exec();
          this.emit('done', result);
        } catch (err) {
          this.emit('error', err);
        }
      } else {
        // If under high pressure, return task to front of queue
        this.priorityQueue.unshift(task);
        await new Promise(r => setTimeout(r, 500)); // Check resources faster
      }
    }
    this.processing = false;
  }

  /**
   * Checks if the system can process more tasks based on memory and CPU load.
   * @returns {boolean} True if can process, false otherwise.
   */
  canProcess() {
    const memThreshold = 200 * 1024 * 1024; // Memory threshold
    const loadThreshold = os.cpus().length * 0.8; // CPU load threshold
    return os.freemem() > memThreshold && os.loadavg()[0] < loadThreshold;
  }

  /**
   * Gets a cached value by key.
   * @param {string} key - The cache key.
   * @returns {*} The cached value or undefined.
   */
  getCache(key) {
    return this.cache.get(key);
  }

  /**
   * Sets a value in the cache with optional TTL.
   * @param {string} key - The cache key.
   * @param {*} value - The value to cache.
   * @param {number} ttl - Time to live in milliseconds (default: 5 minutes).
   */
  setCache(key, value, ttl = 300000) {
    this.cache.set(key, value);
    setTimeout(() => this.cache.delete(key), ttl);
  }
}

module.exports = TaskQueue;