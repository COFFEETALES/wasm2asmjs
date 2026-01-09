'use strict';

const {table} = require('console');

(async function () {
  const harness = await import('../tests/wasm2lang_01_loops.harness.mjs');

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
        data: new Uint8Array([1,2,3])
      },
    ],
    /* shared */ false
  );

  const i32PairToI32Type = binaryen.createType([binaryen.i32, binaryen.i32]);

  module.addFunction(
    'returnConst320',
    i32PairToI32Type,
    binaryen.i32,
    [],
    module.block(null, [module.return(module.i32.const(0x140))])
  );

  module.addFunction(
    'addTwoI32',
    i32PairToI32Type,
    binaryen.i32,
    [binaryen.i32],
    module.block(null, [
      module.local.set(
        2,
        module.i32.add(
          module.local.get(0, binaryen.i32),
          module.local.get(1, binaryen.i32)
        )
      ),
      module.return(module.local.get(2, binaryen.i32))
    ])
  );

  module.addFunction(
    'mulTwoI32',
    i32PairToI32Type,
    binaryen.i32,
    [binaryen.i32],
    module.block(null, [
      module.local.set(
        2,
        module.i32.mul(
          module.local.get(0, binaryen.i32),
          module.local.get(1, binaryen.i32)
        )
      ),
      module.return(module.local.get(2, binaryen.i32))
    ])
  );

  var tableFunctionNames = [
    'returnConst320',
    'returnConst320',
    'addTwoI32',
    'mulTwoI32',
    'returnConst320'
  ];
  var tableInitOffsetExpr = module.i32.const(0x0);

  module.addTable('functionTable', tableFunctionNames.length, 0xffffffff);
  var tableInitSegmentInfo = binaryen.getElementSegmentInfo(
    module.addActiveElementSegment(
      'functionTable',
      'functionTableInitSegment',
      tableFunctionNames,
      tableInitOffsetExpr
    )
  );
  module.addFunction(
    'callTableIndex2',
    binaryen.none,
    binaryen.i32,
    [],
    module.block(null, [
      module.return(
        module.call_indirect(
          'functionTable',
          module.i32.add(tableInitSegmentInfo.offset, module.i32.const(2)),
          [module.i32.const(120), module.i32.const(40)],
          i32PairToI32Type,
          binaryen.i32
        )
      )
    ])
  );
  module.addFunctionExport('callTableIndex2', 'callTableIndex2');

  if (!module.validate()) throw new Error('validation error');
  process.stdout.write(module.emitText());

  return module;
})();
