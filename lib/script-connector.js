const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const TaskQueue = require('./task-queue');
const Parsers = require('./parsers');
const Config = require('./config');
const Logger = require('./logger');

/**
 * ScriptConnector class for executing scripts and functions across different languages.
 */
class ScriptConnector {
  /**
   * Creates a new ScriptConnector instance.
   * @param {Object} userConfig - User configuration.
   */
  constructor(userConfig = {}) {
    this.config = Config.merge(userConfig);
    Config.validate(this.config);

    this.queue = new TaskQueue();
    this.logger = new Logger(this.config.logging);
    this.currentRunning = 0;
    this.api = {}; // Tree structure for functions
    this.loadedScripts = new Set(); // Cache loaded scripts

    this.queue.on('added', () => this.queue.process());
    this.loadScripts(); // Load and build API tree

    this.logger.info('ScriptConnector initialized', { config: this.config });
  }

  /**
   * Executes a script.
   * @param {string} scriptName - Name of the script.
   * @param {Array} args - Arguments for the script.
   * @param {Object} options - Execution options.
   * @returns {Promise<string>} Execution result.
   */
  async exec(scriptName, args = [], options = { sync: false }) {
    this.logger.debug('Executing script', { scriptName, args, options });
    return new Promise((resolve, reject) => {
      this.queue.add({
        exec: () => this._spawn(scriptName, args, options, resolve, reject)
      });
    });
  }

  /**
   * Executes a specific function from a script.
   * @param {string} fileName - Name of the script file.
   * @param {string} functionName - Name of the function.
   * @param {Array} args - Arguments for the function.
   * @param {Object} options - Execution options.
   * @returns {Promise<string>} Function result.
   */
  async execFunction(fileName, functionName, args = [], options = { sync: false }) {
    const cacheKey = `${fileName}.${functionName}:${JSON.stringify(args)}`;
    if (this.config.cache.enabled) {
      const cached = this.queue.getCache(cacheKey);
      if (cached && !options.force) {
        this.logger.debug('Returning cached result', { cacheKey });
        return Promise.resolve(cached);
      }
    }

    this.logger.debug('Executing function', { fileName, functionName, args, options });
    return new Promise((resolve, reject) => {
      this.queue.add({
        exec: async () => {
          const result = await this._execFunction(fileName, functionName, args, options, resolve, reject);
          if (result && this.config.cache.enabled) {
            this.queue.setCache(cacheKey, result, this.config.cache.ttl);
          }
          return result;
        }
      }, options.priority);
    });
  }

  /**
   * Loads scripts and builds the API tree.
   */
  loadScripts() {
    for (const [name, scriptPath] of Object.entries(this.config.scripts)) {
      if (!this.loadedScripts.has(name)) {
        this._loadScript(name, scriptPath);
        this.loadedScripts.add(name);
      }
    }
  }

  /**
   * Loads a single script.
   * @param {string} name - Script name.
   * @param {string} scriptPath - Path to the script.
   */
  _loadScript(name, scriptPath) {
    try {
      const ext = path.extname(scriptPath);
      const content = fs.readFileSync(scriptPath, 'utf8');
      let functions = [];

      switch (ext) {
        case '.py':
          functions = Parsers.parsePythonFunctions(content);
          break;
        case '.js':
          functions = Parsers.parseJSFunctions(content);
          break;
        case '.go':
          functions = Parsers.parseGoFunctions(content);
          break;
        case '.sh':
          functions = Parsers.parseBashFunctions(content);
          break;
        default:
          this.logger.warn('Unsupported script type', { name, scriptPath, ext });
          return;
      }

      this.api[name] = {};
      functions.forEach(func => {
        this.api[name][func] = (...args) => {
          let options = {};
          if (args.length > 0 && typeof args[args.length - 1] === 'object' && !Array.isArray(args[args.length - 1])) {
            options = args.pop();
          }
          return this.execFunction(name, func, args, options);
        };
      });

      this.logger.info('Script loaded', { name, functions: functions.length });
    } catch (error) {
      this.logger.error('Failed to load script', { name, scriptPath, error: error.message });
    }
  }

  /**
   * Spawns a script process.
   * @param {string} scriptName - Name of the script.
   * @param {Array} args - Arguments.
   * @param {Object} options - Options.
   * @param {Function} resolve - Resolve callback.
   * @param {Function} reject - Reject callback.
   */
  async _spawn(scriptName, args, options, resolve, reject) {
    if (this.currentRunning >= this.config.maxConcurrent) {
      return reject(new Error('Max concurrent reached'));
    }
    this.currentRunning++;

    const scriptPath = this.config.scripts[scriptName];
    if (!scriptPath) return reject(new Error('Script not found'));

    const ext = path.extname(scriptPath);
    const interpreter = this.config.interpreters[ext] || 'bash';
    const child = spawn(interpreter, [scriptPath, ...args]);

    let output = '';
    let errorOutput = '';
    child.stdout.on('data', data => output += data);
    child.stderr.on('data', data => errorOutput += data);

    child.on('close', code => {
      this.currentRunning--;
      if (code === 0) {
        resolve(output);
      } else {
        const formattedError = this._formatError(errorOutput, scriptName, scriptPath);
        reject(new Error(formattedError));
      }
      this.queue.process();
    });

    if (options.sync) child.unref();
  }

  /**
   * Converts a JavaScript value to Python literal string.
   * @param {*} value - The value to convert.
   * @returns {string} Python literal.
   */
  _toPythonLiteral(value) {
    if (typeof value === 'string') {
      return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (typeof value === 'boolean') {
      return value ? 'True' : 'False';
    }
    if (Array.isArray(value)) {
      return '[' + value.map(v => this._toPythonLiteral(v)).join(', ') + ']';
    }
    if (value === null) return 'None';
    return JSON.stringify(value);
  }

  /**
   * Converts a JavaScript value to JavaScript literal string.
   * @param {*} value - The value to convert.
   * @returns {string} JavaScript literal.
   */
  _toJSLiteral(value) {
    if (typeof value === 'string') {
      return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return value.toString();
    }
    if (Array.isArray(value)) {
      return '[' + value.map(v => this._toJSLiteral(v)).join(', ') + ']';
    }
    if (value === null) return 'null';
    return JSON.stringify(value);
  }

  /**
   * Executes a function from a script.
   * @param {string} fileName - Script name.
   * @param {string} functionName - Function name.
   * @param {Array} args - Arguments.
   * @param {Object} options - Options.
   * @param {Function} resolve - Resolve callback.
   * @param {Function} reject - Reject callback.
   */
  async _execFunction(fileName, functionName, args, options, resolve, reject) {
    if (this.currentRunning >= this.config.maxConcurrent) {
      return reject(new Error('Max concurrent reached'));
    }
    this.currentRunning++;

    const scriptPath = this.config.scripts[fileName];
    if (!scriptPath) {
      this.currentRunning--;
      return reject(new Error('Script not found'));
    }

    const ext = path.extname(scriptPath);
    let command;
    if (ext === '.py') {
      const argsStr = args.map(arg => this._toPythonLiteral(arg)).join(', ');
      const fullPath = path.resolve(this.config.scripts[fileName]);
      const dirPath = path.dirname(fullPath);
      const baseName = path.basename(fileName, '.py');
      command = `cd "${dirPath.replace(/\\/g, '/')}" && PYTHONPATH="${dirPath.replace(/\\/g, '/')}" python3 -c "
import sys
import os
sys.path.insert(0, '${dirPath.replace(/\\/g, '/')}');
__file__ = '${dirPath.replace(/\\/g, '/')}/${baseName}.py';
exec(open('${baseName}.py').read());
result = ${functionName}(${argsStr});
print(result)
"`;
    } else if (ext === '.js') {
      const argsStr = args.map(arg => this._toJSLiteral(arg)).join(', ');
      const fullPath = path.resolve(this.config.scripts[fileName]);
      const dirPath = path.dirname(fullPath);
      const baseName = path.basename(fileName, '.js');
      command = `cd "${dirPath.replace(/\\/g, '/')}" && node -e "const ${baseName} = require('./${baseName}.js'); const result = ${baseName}.${functionName}(${argsStr}); console.log(result)"`;
    } else {
      this.currentRunning--;
      return reject(new Error('Function execution not supported for this language'));
    }

    const child = spawn('bash', ['-c', command]);

    let output = '';
    let errorOutput = '';
    child.stdout.on('data', data => output += data);
    child.stderr.on('data', data => errorOutput += data);

    child.on('close', code => {
      this.currentRunning--;
      if (code === 0) {
        resolve(output);
      } else {
        const formattedError = this._formatError(errorOutput, fileName, scriptPath, functionName);
        reject(new Error(formattedError));
      }
      this.queue.process();
    });

    if (options.sync) child.unref();
  }

  /**
   * Formats error messages.
   * @param {string} errorOutput - Raw error output.
   * @param {string} scriptName - Script name.
   * @param {string} scriptPath - Script path.
   * @param {string} functionName - Function name (optional).
   * @returns {string} Formatted error.
   */
  _formatError(errorOutput, scriptName, scriptPath, functionName = null) {
    if (!this.config.errorHandling.formatErrors) {
      return errorOutput;
    }
    const errorObj = {
      script: scriptName,
      path: scriptPath,
      function: functionName,
      error: errorOutput.trim(),
      timestamp: new Date().toISOString()
    };
    if (this.config.errorHandling.includeStackTrace) {
      errorObj.stack = new Error().stack;
    }
    return JSON.stringify(errorObj, null, 2);
  }
}

module.exports = ScriptConnector;