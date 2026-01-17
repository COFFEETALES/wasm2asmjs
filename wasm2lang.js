'use strict';

// https://github.com/mozilla/gecko-dev/blob/master/js/src/wasm/AsmJS.cpp
// https://github.com/v8/v8/blob/master/src/asmjs/asm-js.cc
// Firefox 34 was the first release with full asm.js support,
// including f32 coercion and related optimizations.
// Chrome 61 was the first release to integrate the asm.js validator
// and compile validated asm.js modules to WebAssembly bytecode.

(async () => {
  const assert = require('assert');
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
  const babelGenerator = await import('@babel/generator');

  const sandbox = {
    'Buffer': Buffer,
    '__dirname': __dirname,
    '__filename': __filename,
    'assert': assert,
    'babelGenerator': babelGenerator,
    'babelTypes': babelTypes,
    'binaryen': binaryen,
    'console': console,
    'fs': fs,
    'path': path,
    'process': process
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

  RunFile('alpha/wasm2lang_header.js');
  RunFile('alpha/wasm2lang_basex.js');
  RunFile('alpha/wasm2lang_decoder.js');
  RunFile('alpha/wasm2lang_miscellaneous.js');
  RunFile('alpha/wasm2lang_op_general.js');
  RunFile('alpha/wasm2lang_op_heap.js');
  RunFile('alpha/wasm2lang_op_loop.js');
  RunFile('alpha/wasm2lang_func.js');
  RunFile('alpha/wasm2lang_link.js');
  RunFile('alpha/wasm2lang_void0.js');
})();
