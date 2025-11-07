const { ScriptConnector } = require('../index');

async function test() {
    const connector = new ScriptConnector({
        scripts: {
            utils: './examples/scripts/utils.v'
        },
        maxConcurrent: 16,
    });

    const num1 = Math.floor(Math.random() * 1000);
    const num2 = Math.floor(Math.random() * 1000);

    try {
        const result = await connector.api.utils.add(num1, num2);
        console.log(`V-lang Result: ${num1} + ${num2} = ${result.trim()}`);
    } catch (err) {
        console.error(`Error:`, err.message);
    }
}

test();