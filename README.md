# Node Script Connector

A scalable, object-oriented script connector for Node.js that enables seamless execution of scripts and functions across multiple programming languages including Python, JavaScript, Go, and Bash. Features advanced capabilities like intelligent task queuing, caching, priority management, and concurrent execution control.

## Features

- **Multi-Language Support**: Execute scripts in Python, JavaScript, Go, Bash, and more
- **Function-Level Execution**: Call specific functions from scripts without running entire files
- **Intelligent Task Queue**: Priority-based task management with resource monitoring
- **Caching System**: Built-in result caching with configurable TTL
- **Concurrent Execution**: Configurable concurrency limits with system load monitoring
- **Comprehensive Logging**: Configurable logging levels and error handling
- **OOP Architecture**: Clean, modular design with separation of concerns
- **Developer-Friendly Config**: Extensive configuration options for customization

## Installation

```bash
npm install node-script-connector
```

## Quick Start

```javascript
const { ScriptConnector } = require('node-script-connector');

const connector = new ScriptConnector({
  scripts: {
    math: './scripts/math.py',
    utils: './scripts/utils.js'
  }
});

// Execute entire script
connector.exec('math', ['10', '5']).then(result => {
  console.log('Script result:', result);
});

// Execute specific function
connector.api.math.add([10, 5]).then(result => {
  console.log('Function result:', result);
});
```

## Architecture

The package follows a clean, modular architecture:

```
lib/
├── script-connector.js    # Main connector class
├── task-queue.js         # Task queue with priority management
├── parsers.js           # Language-specific function parsers
├── config.js            # Configuration management
└── logger.js            # Logging utility
```

## Configuration

```javascript
const connector = new ScriptConnector({
  maxConcurrent: 4,        // Maximum concurrent executions
  scripts: {
    name: 'path/to/script.ext'
  },
  interpreters: {
    '.py': 'python3',
    '.js': 'node',
    '.go': 'go run',
    '.sh': 'bash'
  },
  cache: {
    enabled: true,
    ttl: 300000           // 5 minutes
  },
  logging: {
    level: 'info',        // 'debug', 'info', 'warn', 'error'
    enabled: true
  },
  errorHandling: {
    formatErrors: true,
    includeStackTrace: false
  }
});
```

## API Reference

### ScriptConnector

#### Constructor
```javascript
new ScriptConnector(config)
```

#### Methods

##### `exec(scriptName, args, options)`
Execute an entire script.
- `scriptName`: Name of the script (as defined in config)
- `args`: Array of arguments to pass to the script
- `options`: Execution options (sync, priority, etc.)

##### `execFunction(fileName, functionName, args, options)`
Execute a specific function from a script.
- `fileName`: Script name
- `functionName`: Function name to execute
- `args`: Arguments for the function
- `options`: Execution options

##### `api.scriptName.functionName(args, options)`
Dynamic API for executing functions (auto-generated from script parsing).

## Examples

See the `examples/` directory for comprehensive usage examples:

- **Basic Usage**: Simple script execution and function calls
- **Advanced Configuration**: Caching, error handling, and custom config
- **Asynchronous Processing**: Concurrent execution and priority queues

```bash
# Run examples
npm run example:basic
npm run example:advanced
npm run example:async
```

## Testing

Run the test suite:

```bash
npm test          # Run all tests
npm run test:basic    # Run basic functionality tests
npm run test:config   # Run configuration tests
npm run test:parsers  # Run parser tests
npm run test:queue    # Run task queue tests
```

## Supported Languages

- **Python**: `.py` files with `python3` interpreter
- **JavaScript**: `.js` files with `node` interpreter
- **Go**: `.go` files with `go run` interpreter
- **Bash**: `.sh` files with `bash` interpreter

## Error Handling

The connector provides comprehensive error handling:

```javascript
try {
  const result = await connector.api.math.divide([10, 0]);
} catch (error) {
  console.log('Formatted error:', error.message);
  // Includes script name, path, function, error details, and timestamp
}
```

## Performance Considerations

- **Caching**: Results are cached by default to improve performance
- **Concurrency**: Configurable limits prevent system overload
- **Resource Monitoring**: Automatic load balancing based on CPU and memory usage
- **Priority Queues**: Important tasks get processed first

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Author

opiumdev <opiumdev@proton.me>