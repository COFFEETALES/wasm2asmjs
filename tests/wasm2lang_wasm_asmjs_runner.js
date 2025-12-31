'use strict';

(function () {
  const fs = require('fs');
  const parseArgs = require('node:util').parseArgs;

  const {'test-name': testName, asmjs, wasm} = parseArgs({
    options: {
      'test-name': {type: 'string'},
      asmjs: {type: 'boolean'},
      wasm: {type: 'boolean'}
    }
  }).values;

  const harness = require(['./', testName, '.harness.js'].join(''));

  if (wasm) {
    const bin = fs.readFileSync(0);

    const instance = new WebAssembly.Instance(new WebAssembly.Module(bin), {
      'module': harness.moduleImports
    });
    harness.setInstanceMemoryBuffer(
      instance.exports.memory.buffer
    );
    process.stderr.write("memory size: " + instance.exports.memory.buffer.byteLength + "\n");
    harness.runTest(instance.exports);
  }
  if (asmjs) {
    const code = fs.readFileSync(0, {encoding: 'utf8'});

    const [memBuffer, module] = eval([code, '[memBuffer, module]'].join('\n'));
    harness.setInstanceMemoryBuffer(
      memBuffer
    );
    const l = module(
      global,
      harness.moduleImports,
      memBuffer
    );
    harness.runTest(l);
  }
})();
