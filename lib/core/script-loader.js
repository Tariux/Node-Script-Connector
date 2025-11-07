const path = require('path');
const Parsers = require('../parsers');
const fs = require('fs');

/**
 * ScriptLoader class handles loading and parsing of scripts.
 */
class ScriptLoader {
  /**
   * Creates a new ScriptLoader instance.
   * @param {Object} config - Configuration object.
   * @param {Logger} logger - Logger instance.
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.loadedScripts = new Map();
  }

  /**
   * Loads all scripts defined in configuration.
   * @returns {Object} API tree with loaded functions.
   */
  loadAllScripts() {
    const api = {};

    for (const [scriptName, scriptPath] of Object.entries(this.config.scripts)) {
      try {
        const scriptApi = this.loadScript(scriptName, scriptPath);
        if (scriptApi) {
          api[scriptName] = scriptApi;
        }
      } catch (error) {
        this.logger.error(`Failed to load script ${scriptName}`, { error: error.message });
      }
    }

    return api;
  }

  /**
   * Loads a single script and extracts its functions.
   * @param {string} scriptName - Name of the script.
   * @param {string} scriptPath - Path to the script file.
   * @returns {Object} API object with function wrappers.
   */
  loadScript(scriptName, scriptPath) {
    if (this.loadedScripts.has(scriptName)) {
      return this.loadedScripts.get(scriptName);
    }

    try {
      const absolutePath = path.resolve(scriptPath);
      if (!fs.existsSync(absolutePath)) {
        throw new Error(`Script file not found: ${absolutePath}`);
      }

      const content = fs.readFileSync(absolutePath, 'utf8');
      const ext = path.extname(absolutePath);
      const functions = this._parseFunctions(content, ext);

      const api = {};
      functions.forEach(funcName => {
        api[funcName] = this._createFunctionWrapper(scriptName, funcName);
      });

      this.loadedScripts.set(scriptName, api);
      this.logger.info(`Script loaded successfully`, { scriptName, functions: functions.length });

      return api;
    } catch (error) {
      this.logger.error(`Error loading script ${scriptName}`, { error: error.message });
      throw error;
    }
  }

  /**
   * Parses functions from script content based on file extension.
   * @private
   */
  _parseFunctions(content, ext) {
    switch (ext) {
      case '.py':
        return Parsers.parsePythonFunctions(content);
      case '.js':
        return Parsers.parseJSFunctions(content);
      case '.go':
        return Parsers.parseGoFunctions(content);
      case '.sh':
        return Parsers.parseBashFunctions(content);
      case '.v':
        return Parsers.parseVlangFunctions(content);
      default:
        this.logger.warn(`Unsupported script type: ${ext}`);
        return [];
    }
  }

  /**
   * Creates a function wrapper for dynamic execution.
   * @private
   */
  _createFunctionWrapper(scriptName, functionName) {
    return (...args) => {
      // Extract options from last argument if it's an object
      let options = {};
      if (args.length > 0 && typeof args[args.length - 1] === 'object' && !Array.isArray(args[args.length - 1])) {
        options = args.pop();
      }

      // Return a promise-based function that calls execFunction
      return this._executeFunctionCall(scriptName, functionName, args, options);
    };
  }

  /**
   * Executes a function call by delegating to the connector.
   * @private
   */
  _executeFunctionCall(scriptName, functionName, args, options) {
    // This needs access to the connector instance, so we'll need to modify the approach
    // For now, return a descriptor that the connector can handle
    return {
      scriptName,
      functionName,
      args,
      options,
      type: 'function_call'
    };
  }

  /**
   * Reloads a specific script.
   * @param {string} scriptName - Name of the script to reload.
   */
  reloadScript(scriptName) {
    if (this.loadedScripts.has(scriptName)) {
      this.loadedScripts.delete(scriptName);
      const scriptPath = this.config.scripts[scriptName];
      if (scriptPath) {
        this.loadScript(scriptName, scriptPath);
        this.logger.info(`Script reloaded`, { scriptName });
      }
    }
  }

  /**
   * Gets information about loaded scripts.
   * @returns {Object} Information about loaded scripts.
   */
  getLoadedScriptsInfo() {
    const info = {};
    for (const [name, api] of this.loadedScripts) {
      info[name] = {
        functions: Object.keys(api),
        path: this.config.scripts[name]
      };
    }
    return info;
  }

  /**
   * Checks if a script is loaded.
   * @param {string} scriptName - Name of the script.
   * @returns {boolean} True if loaded.
   */
  isLoaded(scriptName) {
    return this.loadedScripts.has(scriptName);
  }
}

module.exports = ScriptLoader;