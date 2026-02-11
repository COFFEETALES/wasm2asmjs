'use strict';

(async function () {
  const harness = await import('../tests/wasm2lang_01_loops.harness.mjs');

  const path = require('path');
  const url = require('url');
  const binaryen = (
    await import(
      url.pathToFileURL(path.join(process.env.NODE_PATH || path.join(process.cwd(), 'node_modules'), 'binaryen', 'index.js'))[
        'href'
      ]
    )
  ).default;

  const expectedData = harness.expectedData;
  const offsetList = harness.offsetList;

  const module = new binaryen.Module();

  module.setMemory(
    /* initial */ harness.memoryInitialPages,
    /* maximum */ harness.memoryMaximumPages,
    /* exportName */ 'memory',
    [
      {
        passive: false,
        offset: module.i32.const(0),
        data: Array.prototype.slice.call(new Uint8Array(offsetList.buffer))
      },
      ...expectedData.map((s, i) => ({
        passive: false,
        offset: module.i32.const(offsetList[i]),
        data: s
          .split('')
          .map(x => x.charCodeAt(0))
          .concat(0x0)
      }))
    ],
    /* shared */ false
  );

  module.addGlobal('heapTop', binaryen.i32, /* mutable */ true, module.i32.const(harness.heapBase));

  module.addFunction(
    'alignHeapTop',
    /*params*/ binaryen.none,
    /*result*/ binaryen.none,
    [],
    module.block(null, [
      module.global.set(
        'heapTop',
        module.i32.and(
          module.i32.add(module.global.get('heapTop', binaryen.i32), module.i32.const(255)),
          module.i32.const(~255)
        )
      ),
      module.return()
    ])
  );

  module.addFunction(
    'emitSegmentsToHost',
    /*params*/ binaryen.none,
    /*result*/ binaryen.none,
    [binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32],
    module.block(null, [
      module.loop(
        'segment_loop',
        module.block('segment_block', [
          module.local.set(1, module.i32.load(0, 4, module.i32.mul(module.local.get(0, binaryen.i32), module.i32.const(4)))),
          module.local.set(0, module.i32.add(module.i32.const(1), module.local.get(0, binaryen.i32))),
          module.local.set(2, module.i32.const(0)),
          module.loop(
            'byte_loop',
            module.block('byte_block', [
              module.local.set(3, module.i32.load8_u(0, 1, module.local.get(1, binaryen.i32))),
              module.local.set(1, module.i32.add(module.i32.const(1), module.local.get(1, binaryen.i32))),
              module.i32.store8(
                0,
                1,
                // get heap top
                module.global.get('heapTop', binaryen.i32),
                module.local.get(3, binaryen.i32)
              ),
              module.global.set('heapTop', module.i32.add(module.global.get('heapTop', binaryen.i32), module.i32.const(1))),
              module.i32.store8(
                0,
                1,
                module.i32.add(module.i32.const(128), module.local.get(2, binaryen.i32)),
                module.local.get(3, binaryen.i32)
              ),
              module.local.set(2, module.i32.add(module.i32.const(1), module.local.get(2, binaryen.i32))),
              module.if(
                module.i32.eq(module.local.get(3, binaryen.i32), module.i32.const('X'.charCodeAt(0))),
                module.block(null, [
                  module.i32.store8(
                    0,
                    1,
                    module.i32.add(module.i32.const(128), module.local.get(2, binaryen.i32)),
                    module.i32.const(0xa)
                  ),
                  module.i32.store8(
                    0,
                    1,
                    module.i32.add(
                      module.i32.const(1),
                      module.i32.add(module.i32.const(128), module.local.get(2, binaryen.i32))
                    ),
                    module.i32.const(0)
                  ),
                  module.i32.store8(0, 1, module.global.get('heapTop', binaryen.i32), module.i32.const(0xa)),
                  module.call('alignHeapTop', [], binaryen.none),
                  module.call('hostOnBufferReady', [], binaryen.none),
                  module.break('segment_block')
                ]),
                0
              ),
              module.if(
                module.i32.eqz(module.local.get(3, binaryen.i32), module.i32.const(0)),
                module.block(null, [
                  module.call('alignHeapTop', [], binaryen.none),
                  module.call('hostOnBufferReady', [], binaryen.none),
                  module.break('byte_block')
                ])
              ),
              module.break('byte_loop')
            ])
          ),

          module.break(
            'segment_loop',
            module.i32.lt_s(module.local.get(0, binaryen.i32), module.i32.const(expectedData.length))
          )
        ])
      ),
      module.return()
    ])
  );

  module.addFunctionExport('emitSegmentsToHost', 'emitSegmentsToHost');
  module.addFunctionImport('hostOnBufferReady', 'module', 'hostOnBufferReady', /* params */ binaryen.none, binaryen.none);

  if (!module.validate()) throw new Error('validation error');

  process.stdout.write(module.emitText());

  return module;
})();
