/**
 * constants.js
 *
 * Centralized regular expressions for parsing functions from various script languages.
 * This helps in maintaining and testing them, and avoids ESLint formatting issues.
 */
const a = {
  // Parses Python functions (e.g., "def my_func(...):")
  PYTHON_FUNC_REGEX: /def\s+(\w+)\s*\(/g,

  // Parses JavaScript functions, including function declarations, and assignments to const/let/var.
  JS_FUNC_REGEX: /function\s+(\w+)\s*\(|(?:const|let|var)\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|[^=])/g,

  // Parses Go functions (e.g., "func MyFunction(...)")
  GO_FUNC_REGEX: /func\s+(?:\([^)]+\)\s+)?(\w+)\s*\(/g,

  // Parses Bash functions (e.g., "function my_func() {" or "my_func() {")
  BASH_FUNC_REGEX: /function\s+(\w+)\s*\(\)\s*\{|(\w+)\s*\(\)\s*\{/g,

  // Parses V-lang functions (e.g., "fn my_function(...)")
  VLANG_FUNC_REGEX: /fn\s+(\w+)\s*\(/g,
};

module.exports = a;