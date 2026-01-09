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
  stdoutWrite(exports['callTableIndex2']() + '\n');
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