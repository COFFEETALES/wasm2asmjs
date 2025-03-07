'use strict';

{
  //
  //
  //	var decodedModule = binaryen.readBinary( dataBuffer );

  const GetFileBuffer = rel => {
    let absFilePath = path.join(process.cwd(), rel);
    assert.strictEqual(
      true,
      fs.existsSync(absFilePath),
      ['«', absFilePath, '» not found'].join('')
    );
    const buff = fs.readFileSync(absFilePath);
    return buff;
  };

  const GetFileText = rel => {
    const absFilePath = path.join(process.cwd(), rel);
    assert.strictEqual(
      true,
      fs.existsSync(absFilePath),
      ['«', absFilePath, '» not found'].join('')
    );
    return fs.readFileSync(absFilePath, { encoding: 'utf8' });
  };

  if (undefined !== defs['NDEBUG']) {
    binaryen.setOptimizeLevel(4);
    binaryen.setShrinkLevel(2);
  } else {
    binaryen.setOptimizeLevel(0);
    binaryen.setShrinkLevel(0);
  }

  var decodedModule = (function () {
    const p = argv[0];
    if ('test:' !== p.slice(0, 5)) {
      if ('wast:' === p.slice(0, 5)) {
        const textBuffer = GetFileText(p.slice(5));
        return binaryen.parseText(textBuffer);
      }
      //return binaryen.parseText(GetFileText(argv[0]));
      const dataBuffer = GetFileBuffer(argv[0]);
      return binaryen.readBinary(dataBuffer);
    }
    RunFile(path.join('tests', p.slice(5)));
    return ConstructTest();
  })();

  if (binaryen.Features.MVP !== decodedModule.getFeatures()) throw '';

  if (true === output['process']) {
    // Below based on https://github.com/WebAssembly/binaryen/blob/master/src/wasm2js.h occurrence of processWasm » runner
    const passList = [];
    {
      passList[passList.length] = 'legalize-js-interface';
      if (binaryen.getOptimizeLevel() > 0) {
        passList[passList.length] = 'optimize-for-js';
      }
      passList[passList.length] = 'remove-non-js-ops';
      passList[passList.length] = 'flatten';
      passList[passList.length] = 'i64-to-i32-lowering';
      passList[passList.length] = 'alignment-lowering';
    }

    if (binaryen.getOptimizeLevel() > 0) {
      if (binaryen.getOptimizeLevel() >= 3 || binaryen.getShrinkLevel() >= 1) {
        passList[passList.length] = 'simplify-locals-nonesting';
        passList[passList.length] = 'precompute-propagate';
        passList[passList.length] = 'avoid-reinterprets';
      }

      // addDefaultOptimizationPasses
      // https://github.com/WebAssembly/binaryen/blob/master/src/passes/pass.cpp
      //decodedModule.optimize(); // cette instruction sollicite les optimisations par défaut
      passList[passList.length] = 'default-optimization-passes';
      passList[passList.length] = 'avoid-reinterprets';
    }

    {
      passList[passList.length] = 'flatten';

      // not from official binaryen:
      //passList[passList.length] = 'optimize-instructions';
      //passList[passList.length] = 'simplify-globals-optimizing';
      //passList[passList.length] = 'local-cse';
      //passList[passList.length] = 'pick-load-signs';
      //passList[passList.length] = 'post-assemblyscript';
      //passList[passList.length] = 'post-assemblyscript-finalize';

      passList[passList.length] = 'simplify-locals-notee-nostructure';
      if (binaryen.getOptimizeLevel() > 0) {
        passList[passList.length] = 'remove-unused-names';
        passList[passList.length] = 'merge-blocks';
        passList[passList.length] = 'reorder-locals';
        passList[passList.length] = 'coalesce-locals';
      }
      passList[passList.length] = 'reorder-locals';
      passList[passList.length] = 'vacuum';
      passList[passList.length] = 'remove-unused-module-elements';
      passList[passList.length] = 'dce';
    }

    {
      const sep = passList.indexOf('default-optimization-passes');
      if (-1 === sep) {
        decodedModule.runPasses(passList);
      } else {
        decodedModule.runPasses(passList.slice(0, sep));
        decodedModule.optimize();
        decodedModule.runPasses(passList.slice(sep + 1));
      }
    }

    const arr = [...Array(decodedModule.getNumFunctions()).keys()].map(
      i => {
        const funcPtr = decodedModule.getFunctionByIndex(i);
        {
          const funcInfo = binaryen.getFunctionInfo(funcPtr);
          if ('' === funcInfo['base']) {
            decodedModule.runPassesOnFunction(funcInfo.name, [
              'flatten',
              'simplify-locals-notee-nostructure',
              'reorder-locals',
              'remove-unused-names',
              'vacuum',
              'merge-locals',
              'coalesce-locals'
            ]);
          }
        }
        //					{
        //						const funcInfo = binaryen.getFunctionInfo( funcPtr );
        //						if ( '' === funcInfo['base'] ) {
        //							/*const b = decodedModule.block(null, [
        //								decodedModule.return(
        //									decodedModule.f32.const(1.5)
        //								)
        //							])*/
        //
        //							// self['addFunction'] = function(name, params, results, varTypes, body)
        //
        //							/*
        //							decodedModule.removeFunction( funcInfo['name'] );
        //							decodedModule.addFunction(
        //								funcInfo['name'], funcInfo['params'],
        //									funcInfo['results'], funcInfo['vars'], funcInfo['body']
        //							);
        //							*/
        //						}
        //					}
      } // getNumFunctions 0..len
    ); // getNumFunctions loop
  }

  if (true === output['wast']) {
    process.stdout.write(decodedModule.emitText());
    process.stdout.write('\n');
    process.exit(0);
  }

  var finalizeJs = function (ast, mode) {
    // console.log(topLevel.print_to_string());
    // https://www.npmjs.com/package/uglify-js#minify-options
    //delete defs['NDEBUG'];
    //defs['_DEBUG'] = 1;

    //		const mangle =
    //			('asm.js' === mode ?
    //				/*{ reserved: ['stdlib', 'foreign', 'buffer'] }*/false :
    //					(undefined !== defs['NDEBUG']));

    //		ast.figure_out_scope();
    //		process.stderr.write( ''+ast.print_to_string()+'\n' )
    const res = UglifyJS.minify(ast, {
      // print_to_string is mandatory; otherwise, issues may occur randomly!
      parse: {},
      compress: false, // "false", otherwise crash //(undefined !== defs['NDEBUG']),
      mangle: false,
      output: {
        ast: false,
        code: true,
        beautify: true /*(
					'asm.js' === mode && (
						undefined !== defs['_DEBUG'] || undefined !== defs['ASMJS_BEAUTIFY']
					)
				),*/,
        semicolons: true,
        keep_quoted_props: true,
        quote_style: 3
      },
      warnings: true
    });

    {
      if (true === output['warnings']['labeledStatement']) {
        process.stderr.write(
          [
            '\u2592\u2592\u2592\n',
            '\u2592\u2592\u2592',
            ' /!\\ Warning: Labeled statement used.',
            '\n',
            '\u2592\u2592\u2592\n'
          ].join('')
        );
      }
    }

    if (res.error) throw res.error;

    //console.log(JSON.stringify(topLevel, null, 4));
    //console.log(JSON.stringify(res, null, 4));

    if ('function' === typeof CompleteTest) {
      CompleteTest(res, mode);
    } else {
      process.stdout.write(res.code);
      process.stdout.write('\n');
    }
  };

  if (false !== output['metadata']) {
    const arr = [...Array(decodedModule.getNumMemorySegments()).keys()]
      .map(i => {
        const segment = decodedModule.getMemorySegmentInfo(String(i));
        return {
          'byteOffset': segment.offset,
          'buffer': segment.data,
          'byteLength': segment.data.byteLength
        };
      })
      .sort((a, b) => a['byteOffset'] - b['byteOffset']);
    if (0 === arr.length) {
      arr[0] = {
        'byteOffset': 0x0,
        'buffer': new ArrayBuffer(4),
        'byteLength': 4
      };
    }

    const startOffset = arr[0]['byteOffset'] & ~3;
    const totalLen =
      (arr[arr.length - 1]['byteOffset'] +
        arr[arr.length - 1]['byteLength'] -
        startOffset +
        3) &
      ~3;

    //process.stderr.write('totalLen: ' + totalLen + '\n');

    const byteArray = new Uint8Array(totalLen);
    for (let i = 0; i !== arr.length; ++i) {
      byteArray.set(
        new Uint8Array(arr[i]['buffer']),
        arr[i]['byteOffset'] - startOffset
      );
    }

    var topLevel = new UglifyJS.AST_Toplevel({
      body: [
        new UglifyJS.AST_Var({
          definitions: [
            new UglifyJS.AST_VarDef({
              name: new UglifyJS.AST_SymbolVar({
                name:
                  'string' === typeof output['metadata']
                    ? output['metadata']
                    : 'asmjs_memory'
              }),
              value: new UglifyJS.AST_New({
                expression: new UglifyJS.AST_SymbolRef({ name: 'ArrayBuffer' }),
                args: [
                  new UglifyJS.AST_Number({
                    value:
                      undefined !== defs['ASMJS_HEAP_SIZE']
                        ? defs['ASMJS_HEAP_SIZE']
                        : 0x10000
                  })
                ]
              })
            })
          ]
        }),
        new UglifyJS.AST_Var({
          definitions: [
            new UglifyJS.AST_VarDef({
              name: new UglifyJS.AST_SymbolVar({
                name: 'i32_array'
              }),
              value: new UglifyJS.AST_New({
                expression: new UglifyJS.AST_SymbolRef({ name: 'Int32Array' }),
                args: [
                  new UglifyJS.AST_SymbolRef({
                    name:
                      'string' === typeof output['metadata']
                        ? output['metadata']
                        : 'asmjs_memory'
                  })
                ]
              })
            })
          ]
        })
      ].concat(
        (function () {
          /*
						return [
						new UglifyJS.AST_SimpleStatement({
							body: new UglifyJS.AST_Call({
								expression: new UglifyJS.AST_Dot({
									expression: new UglifyJS.AST_SymbolRef({ name: 'i32_array' }),
									property: 'set'
								}),
								args: [
									new UglifyJS.AST_Array({
										elements: Array.prototype.slice.call(
											new Int32Array(byteArray.buffer)
										).map(
											(i) => new UglifyJS.AST_Number({ value: i })
										)
									}),
									new UglifyJS.AST_Number({
										value: Math.trunc( arr[0]['byteOffset']/4 )
									})
								]
							})
						})
						];
*/

          var retValue = [];

          var i = 0;
          var lastIndex = 0;
          var i32 = new Int32Array(byteArray.buffer);
          var savedArray = [];
          var filler = null;

          var setData = function (endPoint) {
            if (lastIndex === endPoint) return;
            retValue[retValue.length] = new UglifyJS.AST_SimpleStatement({
              body: new UglifyJS.AST_Call({
                expression: new UglifyJS.AST_Dot({
                  expression: new UglifyJS.AST_SymbolRef({ name: 'i32_array' }),
                  property: 'set'
                }),
                args: [
                  new UglifyJS.AST_Array({
                    elements: Array.prototype.slice
                      .call(
                        new Int32Array(
                          byteArray.buffer,
                          lastIndex << 2,
                          endPoint - lastIndex
                        )
                      )
                      .map(j => new UglifyJS.AST_Number({ value: j }))
                  }),
                  new UglifyJS.AST_Number({
                    value: Math.trunc(arr[0]['byteOffset'] / 4) + lastIndex
                  })
                ]
              })
            });
          };

          var fillData = function (endPoint) {
            if (0 === filler) return;
            retValue[retValue.length] = new UglifyJS.AST_SimpleStatement({
              body: new UglifyJS.AST_Call({
                expression: new UglifyJS.AST_Dot({
                  expression: new UglifyJS.AST_SymbolRef({ name: 'i32_array' }),
                  property: 'fill'
                }),
                args: [
                  new UglifyJS.AST_Number({
                    value: filler
                  }),
                  new UglifyJS.AST_Number({
                    value: Math.trunc(arr[0]['byteOffset'] / 4) + lastIndex
                  }),
                  new UglifyJS.AST_Number({
                    value: Math.trunc(arr[0]['byteOffset'] / 4) + endPoint
                  })
                ]
              })
            });
          };

          var processData = function () {
            const l = (function () {
              var r = 0;
              for (var j = 0; j !== 16; ++j) {
                if (savedArray[j] !== (filler || i32[i])) break;
                ++r;
              }
              return r;
            })();

            if (16 === l) {
              if (null === filler) {
                setData(i - (16 - 1));
                lastIndex = i - (16 - 1);
                filler = i32[i];
              }
            } else if (null !== filler) {
              fillData(i);
              //lastIndex = i-((16-1)-l);
              lastIndex = i;
              filler = null;
            }
          };

          for (i = 0; i !== i32.length; ++i) {
            if (16 === savedArray.length) {
              savedArray.shift();
            }
            savedArray[savedArray.length] = i32[i];
            processData();
          }
          if (null === filler) {
            setData(i);
          } else {
            fillData(i);
          }

          return retValue;
        })()
      )
    });
    finalizeJs(topLevel, 'metadata');
  }
  if (false === output['js'] && 'undefined' === typeof CompleteTest) {
    process.exit(0);
  }

  var asmJsConstructVariable = {};

  asmJsConstructVariable[binaryen['i32']] = function (name, num) {
    if ('number' !== typeof num) {
      num = 0.0;
    }
    return new UglifyJS.AST_VarDef({
      name: new UglifyJS.AST_SymbolVar({
        name: name
      }),
      value: new UglifyJS.AST_Number({
        value: num,
        start: { raw: num.toString(10) }
      })
    });
  };

  asmJsConstructVariable[binaryen['f32']] = function (name, num) {
    if ('number' !== typeof num) {
      num = 0.0;
    }
    addAsmJsHeader('Math_fround');
    return new UglifyJS.AST_VarDef({
      name: new UglifyJS.AST_SymbolVar({
        name: name
      }),
      value: new UglifyJS.AST_Call({
        expression: new UglifyJS.AST_SymbolRef({
          name: ['$', 'fround'].join('')
        }),
        args: [
          new UglifyJS.AST_Number({
            value: num,
            start: {
              raw: Math.floor(num) === num ? num.toFixed(1) : num.toString(10)
            }
          })
        ]
      })
    });
  };

  asmJsConstructVariable[binaryen['f64']] = function (name, num) {
    if ('number' !== typeof num) {
      num = 0.0;
    }
    return new UglifyJS.AST_VarDef({
      name: new UglifyJS.AST_SymbolVar({
        name: name
      }),
      value: new UglifyJS.AST_Number({
        value: num,
        start: {
          raw: Math.floor(num) === num ? num.toFixed(1) : num.toString(10)
        }
      })
    });
  };

  var wasmImportedFunctions = [];
  var wasmFunctions = [...Array(decodedModule.getNumExports()).keys()]
    .map(i => {
      const ptr = decodedModule.getExportByIndex(i);
      const expInfo = binaryen.getExportInfo(ptr);
      if (binaryen['ExternalFunction'] !== expInfo.kind) return undefined;

      const funcPtr = decodedModule.getFunction(expInfo.value);
      const funcInfo = binaryen.getFunctionInfo(funcPtr);

      return Object.assign(funcInfo, { 'ast': null });
    })
    .filter(e => undefined !== e);

  var wasmGlobals = [];

  var wasmExports = Object.assign.apply(
    void 0,
    [
      {},
      [...Array(decodedModule.getNumExports()).keys()].map(i => {
        const ptr = decodedModule.getExportByIndex(i);
        const expInfo = binaryen.getExportInfo(ptr);
        if (binaryen['ExternalFunction'] !== expInfo.kind) return {};
        const res = {};
        res[expInfo.name] = expInfo.value;
        return res;
      })
    ].flat()
  );
}
