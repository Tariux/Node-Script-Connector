# Node Script Connector

A scalable script connector for Node.js that executes scripts and functions across multiple languages (Python, JavaScript, Go, Bash). Features intelligent queuing, caching, and resource management for heavy workloads like ML and data processing.

## Installation

```bash
npm install node-script-connector
```

## Quick Start

### Basic Usage
```javascript
const { ScriptConnector } = require('node-script-connector');

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
const { AdvancedScriptConnector } = require('node-script-connector');

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

```javascript
const config = {
  maxConcurrent: 4,        // Concurrent executions
  scripts: {
    name: 'path/to/script.ext'
  },


  scaling: {
    enabled: false,        // Enable cluster scaling
    maxWorkers: 8
  }
};
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
- `loadConfig()` - Load from file/env
- `saveConfig(config)` - Save config
- `updateConfig(key, value)` - Update setting

## Examples

See `examples/` directory for usage examples including ML workloads and data processing.

## License

MIT