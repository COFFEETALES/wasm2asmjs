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

  let instanceMemoryBuffer = null;

  if (wasm) {
    const bin = fs.readFileSync(0);

    const instance = new WebAssembly.Instance(new WebAssembly.Module(bin), {
      'module': harness.moduleImports
    });
    harness.setInstanceMemoryBuffer(
      instanceMemoryBuffer = instance.exports.memory.buffer
    );
    harness.runTest(instance.exports);
  }
  if (asmjs) {
    const code = fs.readFileSync(0, {encoding: 'utf8'});

    const [memBuffer, module] = eval([code, '[memBuffer, module]'].join('\n'));
    harness.setInstanceMemoryBuffer(
      instanceMemoryBuffer = memBuffer
    );
    const l = module(
      global,
      harness.moduleImports,
      memBuffer
    );
    harness.runTest(l);
  }

  process.stdout.write(
    Buffer.from(
      new Uint8Array(instanceMemoryBuffer, 0, instanceMemoryBuffer.byteLength)
    )
  );
})();
