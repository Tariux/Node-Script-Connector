# Node Script Connector

A scalable script connector for Node.js that executes scripts and functions across multiple languages (Python, JavaScript, Go, Bash). Features intelligent queuing, caching, and resource management for heavy workloads like ML and data processing.

## Installation

```bash
npm install script-connector
```

## Quick Start

### Basic Usage
```javascript
const { ScriptConnector } = require('script-connector');

const connector = new ScriptConnector({
  scripts: {
    math: './scripts/math.py',
    utils: './scripts/utils.js'
  }
});

// Execute script
connector.exec('math', ['10', '5']).then(console.log);

// Execute function
connector.api.math.add(10, 5).then(console.log);
```

### Advanced Usage
```javascript
const { AdvancedScriptConnector } = require('script-connector');

const connector = new AdvancedScriptConnector({
  maxConcurrent: 8,
  scripts: {
    ml_model: './scripts/ml_model.py',
    data_processor: './scripts/data_processor.py'
  },
  scaling: { enabled: true, maxWorkers: 16 }
});

// High-priority ML training
connector.api.ml_pipeline.trainModel(data, { priority: 'high' });

// Get stats
const stats = connector.getAdvancedStats();
console.log(`Active tasks: ${stats.scheduler.activeTasks}`);
```

## Configuration

The package uses a comprehensive configuration system managed by the `ConfigManager` class. Configuration can be loaded from files, environment variables, or set programmatically.

### Configuration Options

```javascript
const config = {
  // Core Settings
  maxConcurrent: 4,        // Maximum concurrent script executions (default: CPU count)

  // Script Definitions
  scripts: {
    math: './scripts/math.py',
    utils: './scripts/utils.js'
  },                      // Script name to file path mapping

  // Interpreter Mapping
  interpreters: {
    '.py': 'python3',     // Python scripts
    '.js': 'node',        // JavaScript files
    '.go': 'go run',      // Go programs
    '.sh': 'bash'         // Shell scripts
    '.v': 'v run'         // V-Lang scripts
  },

  // Caching Configuration
  cache: {
    enabled: true,        // Enable result caching (default: true)
    ttl: 300000,          // Cache time-to-live in ms (default: 300000)
    maxSize: 1000         // Maximum cache entries (default: 1000)
  },

  // Logging Configuration
  logging: {
    level: 'info',        // Log level: debug, info, warn, error (default: info)
    enabled: true,        // Enable logging (default: true)
    file: null,           // Log file path (default: null for console)
    maxFileSize: 10485760 // Maximum log file size in bytes (default: 10MB)
  },

  // Error Handling
  errorHandling: {
    formatErrors: true,      // Format error messages (default: true)
    includeStackTrace: false, // Include stack traces in errors (default: false)
    includeErrorCode: true,   // Include error codes (default: true)
    logErrors: true          // Log errors automatically (default: true)
  },

  // Queue Management
  queue: {
    maxRetries: 3,           // Maximum retry attempts (default: 3)
    retryDelay: 1000,        // Delay between retries in ms (default: 1000)
    monitoringInterval: 5000, // Queue monitoring interval in ms (default: 5000)
    memoryThreshold: 209715200, // Memory threshold in bytes (default: 200MB)
    cpuThreshold: 3.2        // CPU load threshold (default: CPU count * 0.8)
  },

  // Metrics Collection
  metrics: {
    enabled: true,           // Enable metrics collection (default: true)
    collectionInterval: 60000, // Metrics collection interval in ms (default: 60000)
    retentionPeriod: 86400000  // Metrics retention period in ms (default: 24 hours)
  },

  // Auto-scaling Configuration
  scaling: {
    enabled: false,          // Enable cluster scaling (default: false)
    minWorkers: 1,           // Minimum worker processes (default: 1)
    maxWorkers: 8,           // Maximum worker processes (default: CPU count)
    scaleUpThreshold: 0.8,   // CPU/memory threshold to scale up (default: 0.8)
    scaleDownThreshold: 0.2, // CPU/memory threshold to scale down (default: 0.2)
    ignoreProcessLimit: false // Ignore OS process limits (default: false)
  }
};
```

### Configuration Methods

- **File-based**: Save configuration to `script-connector.config.js` in your project root
- **Environment Variables**: Override settings using `SCRIPT_CONNECTOR_*` prefixed variables
- **Programmatic**: Use `ConfigManager` methods to modify configuration at runtime

### Environment Variables

```bash
# Core settings
SCRIPT_CONNECTOR_MAX_CONCURRENT=8
SCRIPT_CONNECTOR_LOG_LEVEL=debug
SCRIPT_CONNECTOR_CACHE_ENABLED=false
SCRIPT_CONNECTOR_METRICS_ENABLED=true
```

### Configuration File Template

Generate a configuration template:

```javascript
const { ConfigManager } = require('script-connector');
const manager = new ConfigManager();
console.log(manager.generateTemplate());
```

## API

### ScriptConnector
- `exec(scriptName, args, options)` - Execute script
- `execFunction(scriptName, funcName, args, options)` - Execute function
- `api.scriptName.functionName(args, options)` - Dynamic API
- `getStats()` - Get statistics

### AdvancedScriptConnector
- Extends ScriptConnector with enterprise features
- `getAdvancedStats()` - Detailed stats
- `reloadConfig(config)` - Dynamic config reload
- `scaleTo(count)` - Scale workers

### ConfigManager

Advanced configuration management with file, environment variable, and programmatic support.

#### Constructor
```javascript
const manager = new ConfigManager(configPath); // Optional config file path
```

#### Methods
- `loadConfig()` - Load configuration from file and environment variables, returns merged config
- `saveConfig(config)` - Save configuration object to file
- `updateConfig(key, value)` - Update specific configuration value (supports dot notation)
- `getConfig(key, defaultValue)` - Get configuration value by key
- `resetToDefaults()` - Reset configuration to defaults (deletes config file)
- `getSchema()` - Get configuration schema for validation
- `generateTemplate()` - Generate configuration template as JavaScript code

#### Configuration Sources (in priority order)
1. **Environment Variables** - Override specific settings
2. **Configuration File** - `script-connector.config.js` in project root
3. **Defaults** - Built-in default values

## Examples

See `examples/` directory for usage examples including ML workloads and data processing.

## License

MIT