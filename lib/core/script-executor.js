const { spawn } = require('child_process');
const path = require('path');

/**
 * ScriptExecutor class handles the execution of scripts and functions.
 */
class ScriptExecutor {
  /**
   * Creates a new ScriptExecutor instance.
   * @param {Object} config - Configuration object.
   * @param {Logger} logger - Logger instance.
   */
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Executes a script.
   * @param {string} scriptName - Name of the script.
   * @param {Array} args - Arguments for the script.
   * @param {Object} options - Execution options.
   * @returns {Promise<string>} Execution result.
   */
  async executeScript(scriptName, args = [], options = {}) {
    const scriptPath = this.config.scripts[scriptName];
    if (!scriptPath) {
      throw new Error(`Script '${scriptName}' not found in configuration`);
    }

    const ext = path.extname(scriptPath);
    const interpreter = this.config.interpreters[ext] || 'bash';

    return new Promise((resolve, reject) => {
      const fullPath = path.resolve(scriptPath);
      const child = spawn(interpreter, [fullPath, ...args], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd() // Use current working directory
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', data => output += data);
      child.stderr.on('data', data => errorOutput += data);

      child.on('close', code => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Script execution failed: ${errorOutput}`));
        }
      });

      child.on('error', err => {
        reject(new Error(`Failed to start script: ${err.message}`));
      });
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
  async executeFunction(scriptName, functionName, args = [], options = {}) {
    const scriptPath = this.config.scripts[scriptName];
    if (!scriptPath) {
      throw new Error(`Script '${scriptName}' not found in configuration`);
    }

    const ext = path.extname(scriptPath);
    let command;

    if (ext === '.py') {
      command = this._buildPythonCommand(scriptName, functionName, args);
    } else if (ext === '.js') {
      command = this._buildJSCommand(scriptName, functionName, args);
    } else {
      throw new Error(`Function execution not supported for ${ext} files`);
    }

    return new Promise((resolve, reject) => {
      const child = spawn('bash', ['-c', command], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd() // Use current working directory
      });

      let output = '';
      let errorOutput = '';

      child.stdout.on('data', data => output += data);
      child.stderr.on('data', data => errorOutput += data);

      child.on('close', code => {
        if (code === 0) {
          resolve(output);
        } else {
          reject(new Error(`Function execution failed: ${errorOutput}`));
        }
      });

      child.on('error', err => {
        reject(new Error(`Failed to execute function: ${err.message}`));
      });
    });
  }

  /**
   * Builds Python command for function execution.
   * @private
   */
  _buildPythonCommand(scriptName, functionName, args) {
    const scriptPath = this.config.scripts[scriptName];
    const fullPath = path.resolve(scriptPath);
    const dirPath = path.dirname(fullPath);
    const baseName = path.basename(scriptName, '.py');
    const argsStr = args.map(arg => this._toPythonLiteral(arg)).join(', ');

    return `cd "${dirPath}" && PYTHONPATH="${dirPath}" python3 -c "
import sys
import os
sys.path.insert(0, '${dirPath}');
__file__ = '${fullPath}';
exec(open('${baseName}.py').read());
result = ${functionName}(${argsStr});
print(result)
"`;
  }

  /**
   * Builds JavaScript command for function execution.
   * @private
   */
  _buildJSCommand(scriptName, functionName, args) {
    const scriptPath = this.config.scripts[scriptName];
    const fullPath = path.resolve(scriptPath);
    const dirPath = path.dirname(fullPath);
    const baseName = path.basename(scriptName, '.js');
    const argsStr = args.map(arg => this._toJSLiteral(arg)).join(', ');

    return `cd "${dirPath}" && node -e "
const ${baseName} = require('./${baseName}.js');
const result = ${baseName}.${functionName}(${argsStr});
console.log(result)
"`;
  }

  /**
   * Converts a JavaScript value to Python literal string.
   * @private
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
   * @private
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
}

module.exports = ScriptExecutor;