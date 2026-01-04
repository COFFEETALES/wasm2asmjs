'use strict';

const isNode =
  'object' === typeof process &&
  'object' === typeof process.versions &&
  'string' === typeof process.versions.node;

const isSpiderMonkey =
  'function' === typeof print && 'function' === typeof readline;

const stdoutWrite = isNode ? process.stdout.write.bind(process.stdout) : putstr;

if (!isNode && !isSpiderMonkey) {
  throw new Error('Unsupported runtime environment.');
}

const obj = {'test-name': '', asmjs: false, wasm: false};

const argv = (isNode ? process.argv.slice(2) : scriptArgs).filter(str => {
  let i = 0;
  const list = ['asmjs', 'test-name', 'wasm'];
  do {
    const paramName = list[i];
    if (undefined === paramName) {
      console.error(['unrecognized parameter: ', str].join(''));
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

(async function () {
  const harness = await import(['./', testName, '.harness.mjs'].join(''));

  let instanceMemoryBuffer = null;

  //process.on('uncaughtException', err => {
  //  console.error(['uncaughtException: ', err && err.stack ? err.stack : err].join(''));
  //  process.exitCode = 1;
  //});
  //process.on('unhandledRejection', reason => {
  //  console.error(['unhandledRejection: ', reason].join(''));
  //  process.exitCode = 1;
  //});

  if (wasm) {
    let bin = null;
    if (isNode) {
      const fs = require('fs');
      bin = fs.readFileSync(0);
    } else {
      throw new Error(
        'WASM input via stdin not supported in this environment.'
      );
    }

    const instance = new WebAssembly.Instance(new WebAssembly.Module(bin), {
      'module': harness.moduleImports
    });
    instanceMemoryBuffer = instance.exports.memory.buffer;
    harness.runTest(instanceMemoryBuffer, stdoutWrite, instance.exports);
  }
  if (asmjs) {
    let code = '';
    if (isNode) {
      const fs = require('fs');
      code = fs.readFileSync(0, {encoding: 'utf8'});
    } else {
      let line;
      while (null !== (line = readline())) {
        code += line + '\n';
      }
    }

    const [memBuffer, module] = eval([code, '[memBuffer, module]'].join('\n'));

    if (isSpiderMonkey) {
      if (
        [isAsmJSCompilationAvailable(), isAsmJSModule(module)].includes(false)
      ) {
        throw new Error('ASM.js module validation failed.');
      }
    }

    const l = module(
      isNode ? global : globalThis,
      harness.moduleImports,
      memBuffer
    );
    harness.runTest((instanceMemoryBuffer = memBuffer), stdoutWrite, l);
  }

  if (harness.dumpMemory) {
    const lookupTable = (function buildCRC32LookupTable(polynomial) {
      const table = [];
      for (let n = 0; n != 256; ++n) {
        let reminder = n;
        for (let i = 0; i != 8; ++i) {
          if (reminder & 1) {
            reminder = (reminder >>> 1) ^ polynomial;
          } else {
            reminder = reminder >>> 1;
          }
        }
        table[table.length] = reminder >>> 0;
      }
      return table;
    })(0xedb88320);

    // $ echo "import binascii; print(hex(binascii.crc32(b'HELLO WORLD')));" | python
    //const bytes = (new TextEncoder()).encode('HELLO WORLD');

    const bytes = new Uint8Array(instanceMemoryBuffer);
    let crc = 0xffffffff;
    for (const byte of bytes) {
      const tableIndex = (crc ^ byte) & 0xff;
      const tableVal = lookupTable[tableIndex];
      if (tableVal === undefined)
        throw new Error('tableIndex out of range 0-255');
      crc = (crc >>> 8) ^ tableVal;
    }

    stdoutWrite(
      'Memory CRC32: 0x' +
        ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0') +
        '\n'
    );
  }
})();
