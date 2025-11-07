const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');

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
        cwd: process.cwd()
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
    let wrapperPath = null;

    try {
      if (ext === '.py') {
        command = this._buildPythonCommand(scriptName, functionName, args);
      } else if (ext === '.js') {
        command = this._buildJSCommand(scriptName, functionName, args);
      } else if (ext === '.v') {
        const vlangExecution = this._buildVlangCommand(scriptName, functionName, args);
        command = vlangExecution.command;
        wrapperPath = vlangExecution.wrapperPath;
      } else {
        throw new Error(`Function execution not supported for ${ext} files`);
      }

      const result = await new Promise((resolve, reject) => {
        const child = spawn('bash', ['-c', command], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        let errorOutput = '';

        child.stdout.on('data', (data) => (output += data));
        child.stderr.on('data', (data) => (errorOutput += data));

        child.on('error', (err) => {
          reject(new Error(`Failed to start script: ${err.message}`));
        });
        
        child.on('close', (code) => {
          if (code === 0) {
            resolve(output);
          } else {
            reject(new Error(`Execution failed: ${errorOutput}`));
          }
        });
      });

      return result;

    } finally {
      if (wrapperPath && fs.existsSync(wrapperPath)) {
        fs.unlinkSync(wrapperPath);
      }
    }
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
   * Builds V-lang command by creating a self-contained, temporary wrapper file.
   * @private
   */
  _buildVlangCommand(scriptName, functionName, args) {
    const scriptPath = this.config.scripts[scriptName];
    const fullPath = path.resolve(scriptPath);
    
    let scriptContent = fs.readFileSync(fullPath, 'utf8');
    
    scriptContent = scriptContent.replace(/^\s*module\s+[^\s]+/m, '');

    const argsStr = args.map(arg => this._toVlangLiteral(arg)).join(', ');

    const wrapperName = `_v_wrapper_${crypto.randomBytes(8).toString('hex')}.v`;
    const wrapperPath = path.join(os.tmpdir(), wrapperName);

    const wrapperContent = `
// --- Start of User Script Content (module declaration removed) ---
${scriptContent}
// ---  End of User Script Content  ---

fn main() {
    result := ${functionName}(${argsStr})
    println(result)
}
`;

    fs.writeFileSync(wrapperPath, wrapperContent);

    const commandSafeWrapperPath = wrapperPath.replace(/\\/g, '/');

    return {
        command: `v run "${commandSafeWrapperPath}"`,
        wrapperPath: wrapperPath
    };
  }

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
   * Converts a JavaScript value to a V-lang STRING literal.
   * This is the most robust way to pass data to a generic V function.
   * @private
   */
  _toVlangLiteral(value) {
    // Convert any value (number, boolean, etc.) to its string representation.
    const stringValue = String(value);
    
    // Escape backslashes and double-quotes, then wrap in double-quotes for V source code.
    return `"${stringValue.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
}

module.exports = ScriptExecutor;