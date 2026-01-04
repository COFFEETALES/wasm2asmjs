'use strict';

const memoryPageSize = 65536;
const memoryInitialPages = 8;
const memoryMaximumPages = 8;

let instanceMemoryBuffer = null;
let stdoutWrite = null;

const moduleImports = {};

const runTest = function (buff, out, exports) {
  instanceMemoryBuffer = buff;
  stdoutWrite = out;
  for (let i = 2; i !== 38; ++i) {
    stdoutWrite(exports['fibonacci'](i) + '\n');
  }
  // exports['fibonacci'](46) -> i32 limit
};

const heapBase = 128;

export {
  heapBase,
  memoryInitialPages,
  memoryMaximumPages,
  memoryPageSize,
  moduleImports,
  runTest
};
