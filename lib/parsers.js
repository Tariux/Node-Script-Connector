/**
 * Parsers module for extracting functions from different script languages.
 */
const a = require('./core/constants');

class Parsers {
  /**
   * Parses Python functions from content.
   * @param {string} content - The Python script content.
   * @returns {string[]} Array of function names.
   */
  static parsePythonFunctions(content) {
    const functions = [];
    let match;
    while ((match = a.PYTHON_FUNC_REGEX.exec(content)) !== null) {
      functions.push(match[1]);
    }
    return functions;
  }

  /**
   * Parses JavaScript functions from content.
   * @param {string} content - The JavaScript script content.
   * @returns {string[]} Array of function names.
   */
  static parseJSFunctions(content) {
    const functions = [];
    let match;
    while ((match = a.JS_FUNC_REGEX.exec(content)) !== null) {
      functions.push(match[1] || match[2]);
    }
    return functions;
  }

  /**
   * Parses Go functions from content.
   * @param {string} content - The Go script content.
   * @returns {string[]} Array of function names.
   */
  static parseGoFunctions(content) {
    const functions = [];
    let match;
    while ((match = a.GO_FUNC_REGEX.exec(content)) !== null) {
      functions.push(match[1]);
    }
    return functions;
  }

  /**
   * Parses Bash functions from content.
   * @param {string} content - The Bash script content.
   * @returns {string[]} Array of function names.
   */
  static parseBashFunctions(content) {
    const functions = [];
    let match;
    while ((match = a.BASH_FUNC_REGEX.exec(content)) !== null) {
      functions.push(match[1] || match[2]);
    }
    return functions;
  }

  /**
   * Parses V-lang functions from content.
   * @param {string} content - The V-lang script content.
   * @returns {string[]} Array of function names.
   */
  static parseVlangFunctions(content) {
    const functions = [];
    let match;
    while ((match = a.VLANG_FUNC_REGEX.exec(content)) !== null) {
      functions.push(match[1]);
    }
    return functions;
  }
}

module.exports = Parsers;