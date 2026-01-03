'use strict';

const memoryPageSize = 65536;
const memoryInitialPages = 8;
const memoryMaximumPages = 8;

if (typeof require === 'function' && typeof module !== 'undefined') {
  const assert = require('assert');
  assert.strictEqual(
    memoryInitialPages === 8,
    true,
    'memoryInitialPages must be 16 for this test harness.'
  );

  assert.strictEqual(
    memoryInitialPages === memoryMaximumPages,
    true,
    'memoryInitialPages must equal memoryMaximumPages for this test harness.'
  );
}

let instanceMemoryBuffer = null;

const setInstanceMemoryBuffer = function (typedArray) {
  instanceMemoryBuffer = typedArray;
};

const moduleImports = {};

const runTest = function (exports) {
  for (let i = 2; i !== 38; ++i) {
    process.stderr.write(exports['fibonacci'](i) + '\n');
  }
  //process.stderr.write(exports['fibonacci'](46) + '\n'); i32 limit
};

const heapBase = 128;

export {
  heapBase,
  memoryInitialPages,
  memoryMaximumPages,
  memoryPageSize,
  moduleImports,
  runTest,
  setInstanceMemoryBuffer
};
