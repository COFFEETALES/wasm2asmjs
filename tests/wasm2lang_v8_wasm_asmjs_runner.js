'use strict';

(async function () {
  const fs = require('fs');

  /*
  const {'test-name': testName, asmjs, wasm} = parseArgs({
    options: {
      'test-name': {type: 'string'},
      asmjs: {type: 'boolean'},
      wasm: {type: 'boolean'}
    }
  }).values;
  */

  const obj = {src: '', 'test-name': '', asmjs: false, wasm: false};

  const argv = process.argv.slice(2).filter(str => {
    let i = 0;
    const list = ['asmjs', 'test-name', 'wasm'];
    do {
      const paramName = list[i];
      if (undefined === paramName) {
        process.stderr.write(['unrecognized parameter: ', str, '\n'].join(''));
        continue;
      }
      if (
        str.slice(0, 2 + paramName.length).toLowerCase() ===
        ['--', paramName].join('')
      ) {
        if (
          '=' === str.charAt(2 + paramName.length) ||
          ':' === str.charAt(2 + paramName.length)
        ) {
          const res = str.slice(paramName.length + 3);
          obj[paramName] = res;
          return false;
        }
      }
    } while (++i !== list.length);
    return true;
  });

  const asmjs = !!obj['asmjs'];
  const testName = obj['test-name'];
  const wasm = !!obj['wasm'];

  //const harness = require(['./', testName, '.harness.js'].join(''));
  const harness = await import (['./', testName, '.harness.mjs'].join(''));

  let instanceMemoryBuffer = null;

  if (wasm) {
    const bin = fs.readFileSync(0);

    const instance = new WebAssembly.Instance(new WebAssembly.Module(bin), {
      'module': harness.moduleImports
    });
    harness.setInstanceMemoryBuffer(
      (instanceMemoryBuffer = instance.exports.memory.buffer)
    );
    harness.runTest(instance.exports);
  }
  if (asmjs) {
    const code = fs.readFileSync(0, {encoding: 'utf8'});

    const [memBuffer, module] = eval([code, '[memBuffer, module]'].join('\n'));
    harness.setInstanceMemoryBuffer((instanceMemoryBuffer = memBuffer));
    const l = module(global, harness.moduleImports, memBuffer);
    harness.runTest(l);
  }

  if (harness.dumpMemory) {
    const outBytes = new Uint8Array(instanceMemoryBuffer);
    fs.writeFileSync(
      ['./', testName, '.v8.', asmjs ? 'asmjs' : 'wasm', '.memory'].join(''),
      outBytes
    );
  }
})();
