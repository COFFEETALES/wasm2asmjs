{
  const self = this;

  const expected_data = [
    'hello, world.',
    'QQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq',
    'segment data 2',
    'segment data 3',
    'X',
    'segment data 4'
  ];

  const offsetList = new Int32Array(expected_data.length);
  {
    let i = 0;
    offsetList[0] = i = (i + 48 + 127) & ~127;
    for (let j = 1; j < expected_data.length; ++j) {
      offsetList[+0 + j] = i =
        (i + expected_data[-1 + j].length + 1 + 127) & ~127;
    }
  }

  var ConstructTest = function () {
    const module = new binaryen.Module();

    module.setMemory(
      /* initial */ 1,
      /* maximum */ 1,
      /* exportName */ '',
      [
        {
          passive: false,
          offset: module.i32.const(0),
          data: Array.prototype.slice.call(new Uint8Array(offsetList.buffer))
        },
        ...expected_data.map((s, i) => ({
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

    module.addFunction(
      'vFetchData',
      /*params*/ binaryen.none,
      /*result*/ binaryen.none,
      [binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32],
      module.block(null, [
        module.loop(
          'loop1',
          module.block('block1', [
            module.local.set(
              1,
              module.i32.load(
                0,
                4,
                module.i32.mul(
                  module.local.get(0, binaryen.i32),
                  module.i32.const(4)
                )
              )
            ),
            module.local.set(
              0,
              module.i32.add(
                module.i32.const(1),
                module.local.get(0, binaryen.i32)
              )
            ),
            module.local.set(2, module.i32.const(0)),
            module.loop(
              'loop2',
              module.block('block2', [
                module.local.set(
                  3,
                  module.i32.load8_u(0, 1, module.local.get(1, binaryen.i32))
                ),
                module.local.set(
                  1,
                  module.i32.add(
                    module.i32.const(1),
                    module.local.get(1, binaryen.i32)
                  )
                ),
                module.i32.store8(
                  0,
                  1,
                  module.i32.add(
                    module.i32.const(6144),
                    module.local.get(2, binaryen.i32)
                  ),
                  module.local.get(3, binaryen.i32)
                ),
                module.local.set(
                  2,
                  module.i32.add(
                    module.i32.const(1),
                    module.local.get(2, binaryen.i32)
                  )
                ),
                module.if(
                  module.i32.eq(
                    module.local.get(3, binaryen.i32),
                    module.i32.const('X'.charCodeAt(0))
                  ),
                  module.block(null, [
                    module.i32.store8(
                      0,
                      1,
                      module.i32.add(
                        module.i32.const(6144),
                        module.local.get(2, binaryen.i32)
                      ),
                      module.i32.const(0)
                    ),
                    module.call('testFuncInternal', [], binaryen.none),
                    module.break('block1')
                  ]),
                  0
                ),
                module.if(
                  module.i32.eqz(
                    module.local.get(3, binaryen.i32),
                    module.i32.const(0)
                  ),
                  module.block(null, [
                    module.call('testFuncInternal', [], binaryen.none),
                    module.break('block2')
                  ])
                ),
                module.break('loop2')
              ])
            ),

            module.break(
              'loop1',
              module.i32.lt_s(
                module.local.get(0, binaryen.i32),
                module.i32.const(expected_data.length)
              )
            )
          ])
        ),
        module.return()
      ])
    );

    module.addFunctionExport('vFetchData', 'export_vFetchData');
    module.addFunctionImport(
      'testFuncInternal',
      'module',
      'testFuncExternal',
      /* params */ binaryen.none,
      binaryen.none
    );

    if (!module.validate()) throw new Error('validation error');

    return module;
  };

  var my_memory = null;

  var CompleteTest = function (res, mode) {
    if ('metadata' === mode) {
      eval(res.code);

      my_memory = asmjs_memory;

      process.stdout.write(res.code);
      process.stdout.write('\n');
    }
    if ('asm.js' === mode) {
      eval(res.code);

      process.stdout.write(res.code);
      process.stdout.write('\n');

      const l = asmjs_func(
        self,
        {
          'testFuncExternal': function () {
            const u8 = new Uint8Array(my_memory);
            let arr = [];
            for (let i = 6144; 0 !== u8[i]; ++i) {
              arr.push(u8[i]);
            }
            process.stdout.write(
              arr.map(i => String.fromCharCode(i)).join('') + '\n'
            );
          }
        },
        my_memory
      );
      l['export_vFetchData']();
    }
  };
}
