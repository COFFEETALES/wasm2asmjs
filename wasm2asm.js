'use strict';

// https://github.com/mozilla/gecko-dev/blob/master/js/src/wasm/AsmJS.cpp
// https://github.com/v8/v8/blob/master/src/asmjs/asm-js.cc
// Firefox 34 is the first version to fully support asm.js (f32 coercion/optimizations).
// Chrome 61 is the first version to integrate the asm.js validator.
// Firefox 34: Full asm.js support was shipped.
// Chrome 61: Asm.js converted to Wasm bytecode.

(async () => {
  const path = require('path');
  const fs = require('fs');
  const vm = require('vm');
  const url = require('url');
  const binaryen = (
    await import(
      url.pathToFileURL(
        path.join(
          process.env.NODE_PATH || path.join(process.cwd(), 'node_modules'),
          'binaryen',
          'index.js'
        )
      )['href']
    )
  ).default;

  const babelTypes = await import('@babel/types');
  const babelGenerate = await import('@babel/generator');

  const sandbox = {
    '__dirname': __dirname,
    '__filename': __filename,
    'babelGenerate': babelGenerate,
    'babelTypes': babelTypes,
    'binaryen': binaryen,
    'console': console,
    'process': process,
    'require': require
  };

  let ctx = vm.createContext(sandbox);

  const RunFile = function (p) {
    vm.runInContext(
      fs.readFileSync(path.resolve(__dirname, p), {encoding: 'utf-8'}),
      ctx,
      p
    );
  };

  sandbox['RunFile'] = RunFile;

  RunFile('wasm2asm_header.js');
  RunFile('wasm2asm_basex.js');
  RunFile('wasm2asm_decoder.js');
  RunFile('wasm2asm_miscellaneous.js');
  RunFile('wasm2asm_op_general.js');
  RunFile('wasm2asm_op_heap.js');
  RunFile('wasm2asm_op_loop.js');
  RunFile('wasm2asm_func.js');
  RunFile('wasm2asm_link.js');
  RunFile('wasm2asm_void0.js');
})();
