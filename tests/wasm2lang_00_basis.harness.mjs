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
  stdoutWrite((exports['basis0'](0) >>> 0) + '\n');
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
