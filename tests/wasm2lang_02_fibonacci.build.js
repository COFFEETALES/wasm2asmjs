'use strict';

(async function () {
  const harness = await import ('../tests/wasm2lang_02_fibonacci.harness.mjs');

  const path = require('path');
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

  const module = new binaryen.Module();

  module.setMemory(
    /* initial */ harness.memoryInitialPages,
    /* maximum */ harness.memoryMaximumPages,
    /* exportName */ 'memory',
    [
      {
        passive: false,
        offset: module.i32.const(0),
        data: new Uint8Array([1,2,3])
      },
    ],
    /* shared */ false
  );

  // example of alignHeapTop function
  //module.addFunction(
  //  'alignHeapTop',
  //  /*params*/ binaryen.none,
  //  /*result*/ binaryen.none,
  //  [],
  //  module.block(null, [
  //    module.global.set(
  //      'heapTop',
  //      module.i32.and(
  //        module.i32.add(
  //          module.global.get('heapTop', binaryen.i32),
  //          module.i32.const(255)
  //        ),
  //        module.i32.const(~255)
  //      )
  //    ),
  //    module.return()
  //  ])
  //);

  // i32 fibonacci(i32 n) { return (n < 2) ? n : fibonacci(n-1) + fibonacci(n-2); }
  {
    const i32 = binaryen.i32;
    const params = binaryen.createType([i32]);

    const n = module.local.get(0, i32);

    const body = module.if(
      module.i32.lt_s(n, module.i32.const(2)),
      n,
      module.i32.add(
        module.call(
          'fibonacci',
          [module.i32.sub(n, module.i32.const(1))],
          i32
        ),
        module.call(
          'fibonacci',
          [module.i32.sub(n, module.i32.const(2))],
          i32
        )
      )
    );

    module.addFunction(
      'fibonacci',
      /* params */ params,
      /* result */ i32,
      /* locals */ [],
      body
    );

    module.addFunctionExport('fibonacci', 'fibonacci');
  }

  if (!module.validate()) throw new Error('validation error');

  process.stdout.write(module.emitText());

  return module;

})();