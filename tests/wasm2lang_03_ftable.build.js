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

  const module = new binaryen.Module();

  module.setMemory(
    /* initial */ harness.memoryInitialPages,
    /* maximum */ harness.memoryMaximumPages,
    /* exportName */ 'memory',
    [
      {
        passive: false,
        offset: module.i32.const(0),
        data: new Uint8Array([1, 2, 3])
      }
    ],
    /* shared */ false
  );

  const i32PairToI32Type = binaryen.createType([binaryen.i32, binaryen.i32]);
  const f64PairToI32Type = binaryen.createType([binaryen.f64, binaryen.f64]);
  const f64F32I32ToI32Type = binaryen.createType([binaryen.f64, binaryen.f32, binaryen.i32]);
  const i32TripleToI32Type = binaryen.createType([binaryen.i32, binaryen.i32, binaryen.i32]);

  module.addFunction('returnConst320', i32PairToI32Type, binaryen.i32, [], module.i32.const(0x140));

  module.addFunction(
    'addTwoI32',
    i32PairToI32Type,
    binaryen.i32,
    [],
    module.i32.add(module.local.get(0, binaryen.i32), module.local.get(1, binaryen.i32))
  );

  module.addFunction(
    'mulTwoF64Shift8Add2ToI32',
    f64PairToI32Type,
    binaryen.i32,
    [],
    module.i32.add(
      module.i32.shl(
        module.i32.trunc_u.f64(module.f64.mul(module.local.get(0, binaryen.f64), module.local.get(1, binaryen.f64))),
        module.i32.const(8)
      ),
      module.i32.const(2)
    )
  );

  module.addFunction(
    'divF64ByF32OrCShift8ToI32',
    f64F32I32ToI32Type,
    binaryen.i32,
    [],
    module.i32.or(
      module.i32.trunc_s.f64(
        module.f64.div(module.local.get(0, binaryen.f64), module.f64.promote(module.local.get(1, binaryen.f32)))
      ),
      module.i32.shl(module.local.get(2, binaryen.i32), module.i32.const(8))
    )
  );

  module.addFunction(
    'divU32OrCShift8ToI32',
    i32TripleToI32Type,
    binaryen.i32,
    [],
    module.i32.or(
      module.i32.div_u(module.local.get(0, binaryen.i32), module.local.get(1, binaryen.i32)),
      module.i32.shl(module.local.get(2, binaryen.i32), module.i32.const(8))
    )
  );

  module.addFunction(
    'mulTwoI32',
    i32PairToI32Type,
    binaryen.i32,
    [],
    module.i32.mul(module.local.get(0, binaryen.i32), module.local.get(1, binaryen.i32))
  );

  var tableFunctionNames = [
    'returnConst320',
    'returnConst320',
    'addTwoI32',
    'mulTwoI32',
    'returnConst320',
    'mulTwoF64Shift8Add2ToI32',
    'mulTwoF64Shift8Add2ToI32',
    'mulTwoF64Shift8Add2ToI32',
    'mulTwoF64Shift8Add2ToI32',
    'divF64ByF32OrCShift8ToI32',
    'divU32OrCShift8ToI32'
  ];
  var tableInitOffsetExpr = module.i32.const(0x0);

  module.addTable('functionTable', tableFunctionNames.length, 0xffffffff);
  var tableInitSegmentInfo = binaryen.getElementSegmentInfo(
    module.addActiveElementSegment('functionTable', 'functionTableInitSegment', tableFunctionNames, tableInitOffsetExpr)
  );
  module.addFunction(
    'callTableIndex2',
    binaryen.none,
    binaryen.i32,
    [],
    module.call_indirect(
      'functionTable',
      module.i32.add(tableInitSegmentInfo.offset, module.i32.const(2)),
      [module.i32.const(120), module.i32.const(40)],
      i32PairToI32Type,
      binaryen.i32
    )
  );
  module.addFunctionExport('callTableIndex2', 'callTableIndex2');

  module.addFunction(
    'callTableIndex5',
    binaryen.none,
    binaryen.i32,
    [],
    module.call_indirect(
      'functionTable',
      module.i32.add(tableInitSegmentInfo.offset, module.i32.const(5)),
      [module.f64.const(12.0), module.f64.const(5.0)],
      f64PairToI32Type,
      binaryen.i32
    )
  );
  module.addFunctionExport('callTableIndex5', 'callTableIndex5');

  module.addFunction(
    'callTableIndex9',
    binaryen.none,
    binaryen.i32,
    [],
    module.call_indirect(
      'functionTable',
      module.i32.add(tableInitSegmentInfo.offset, module.i32.const(9)),
      [module.f64.const(100.0), module.f32.const(4.0), module.i32.const(3)],
      f64F32I32ToI32Type,
      binaryen.i32
    )
  );
  module.addFunctionExport('callTableIndex9', 'callTableIndex9');

  module.addFunction(
    'callTableIndex10',
    binaryen.none,
    binaryen.i32,
    [],
    module.call_indirect(
      'functionTable',
      module.i32.add(tableInitSegmentInfo.offset, module.i32.const(10)),
      [module.i32.const(100), module.i32.const(4), module.i32.const(3)],
      i32TripleToI32Type,
      binaryen.i32
    )
  );
  module.addFunctionExport('callTableIndex10', 'callTableIndex10');

  if (!module.validate()) throw new Error('validation error');
  process.stdout.write(module.emitText());

  return module;
})();
