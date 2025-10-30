/**
 * Parsers module for extracting functions from different script languages.
 */
class Parsers {
  /**
   * Parses Python functions from content.
   * @param {string} content - The Python script content.
   * @returns {string[]} Array of function names.
   */
  static parsePythonFunctions(content) {
    const funcRegex = /def\s+(\w+)\s*\(/g;
    const functions = [];
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
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
    const funcRegex = /function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|[^=])/g;
    const functions = [];
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
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
    const funcRegex = /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/g;
    const functions = [];
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
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
    const funcRegex = /function\s+(\w+)\s*\(\)\s*\{|(\w+)\s*\(\)\s*\{/g;
    const functions = [];
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
      functions.push(match[1] || match[2]);
    }
    return functions;
  }
}

module.exports = Parsers;