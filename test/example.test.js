const assert = require('assert');

describe('Example Test Suite', () => {
    it('should return true for valid input', () => {
        const input = true;
        assert.strictEqual(input, true);
    });

    it('should add two numbers correctly', () => {
        const sum = (a, b) => a + b;
        assert.strictEqual(sum(1, 2), 3);
    });

    it('should concatenate two strings', () => {
        const concat = (a, b) => a + b;
        assert.strictEqual(concat('Hello, ', 'World!'), 'Hello, World!');
    });
});