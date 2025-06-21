'use strict';

{
  var getLocalType = function (funcInfo, id) {
    const params = binaryen['expandType'](funcInfo['params']);
    if (id < params.length) return params[id];
    id -= params.length;

    if (id < funcInfo.vars.length) return funcInfo.vars[id];
    throw 'getLocalType!';
  };

  var makeAsmAnnotation = function (node, resultType) {
    if (binaryen['i32'] === resultType) {
      return new UglifyJS.AST_Binary({
        left: node,
        operator: '|',
        right: new UglifyJS.AST_Number({
          value: 0,
          start: {raw: '0'}
        })
      });
    } else if (binaryen['f32'] === resultType) {
      addAsmJsHeader('Math_fround');
      return new UglifyJS.AST_Call({
        expression: new UglifyJS.AST_SymbolRef({
          name: ['$', 'fround'].join('')
        }),
        args: [node]
      });
    } else if (binaryen['f64'] === resultType) {
      return new UglifyJS.AST_UnaryPrefix({
        operator: '+',
        expression: node
      });
    } else {
      throw [
        'makeAsmAnnotation: argument type not implemented: ',
        resultType
      ].join('');
    }
  };

  var coercionTypes = {};
  coercionTypes['i32'] = binaryen['i32'];
  coercionTypes['f32'] = binaryen['f32'];
  coercionTypes['f64'] = binaryen['f64'];
  coercionTypes['u32'] = 'u32';

  var makeAsmCoercion = function (node, sourceType, resultType) {
    if (coercionTypes['u32'] === sourceType) {
      if (coercionTypes['f32'] === resultType) {
        addAsmJsHeader('Math_fround');
        return new UglifyJS.AST_Call({
          expression: new UglifyJS.AST_SymbolRef({
            name: ['$', 'fround'].join('')
          }),
          args: [
            new UglifyJS.AST_Binary({
              left: node,
              operator: '>>>',
              right: new UglifyJS.AST_Number({
                value: 0,
                start: {raw: '0'}
              })
            })
          ]
        });
      }
    }
    if (coercionTypes['i32'] === sourceType) {
      if (coercionTypes['i32'] === resultType) {
        return makeAsmAnnotation(node, coercionTypes['i32']);
      }
      if (coercionTypes['f32'] === resultType) {
        addAsmJsHeader('Math_fround');
        return new UglifyJS.AST_Call({
          expression: new UglifyJS.AST_SymbolRef({
            name: ['$', 'fround'].join('')
          }),
          args: [
            new UglifyJS.AST_Binary({
              left: node,
              operator: '|',
              right: new UglifyJS.AST_Number({
                value: 0,
                start: {raw: '0'}
              })
            })
          ]
        });
      }
      if (coercionTypes['f64'] === resultType) {
        return new UglifyJS.AST_UnaryPrefix({
          operator: '+',
          expression: new UglifyJS.AST_Binary({
            left: node,
            operator: '|',
            right: new UglifyJS.AST_Number({
              value: 0,
              start: {raw: '0'}
            })
          })
        });
      }
    }
    if (coercionTypes['f32'] === sourceType) {
      if (coercionTypes['i32'] === resultType) {
        addAsmJsHeader('Math_floor');
        /*return new UglifyJS.AST_Call({
          expression: new UglifyJS.AST_SymbolRef({
            name: ['$', 'floor'].join('')
          }),
          args: [
            new UglifyJS.AST_Binary({
              left: node,
              operator: '|',
              right: new UglifyJS.AST_Number({
                value: 0, start: { raw: '0' }
              })
            })
          ]
        });*/
        return new UglifyJS.AST_UnaryPrefix({
          operator: '~~',
          expression: new UglifyJS.AST_Call({
            expression: new UglifyJS.AST_SymbolRef({
              name: ['$', 'floor'].join('')
            }),
            args: [
              new UglifyJS.AST_UnaryPrefix({operator: '+', expression: node})
            ]
          })
        });
      }
      if (coercionTypes['f64'] === resultType) {
        return new UglifyJS.AST_UnaryPrefix({
          operator: '+',
          expression: node
        });
      }
      if (coercionTypes['f32'] === resultType) {
        return makeAsmAnnotation(node, coercionTypes['f32']);
      }
    }
    if (coercionTypes['f64'] === sourceType) {
      if (coercionTypes['i32'] === resultType) {
        addAsmJsHeader('Math_floor');
        return new UglifyJS.AST_UnaryPrefix({
          operator: '~~',
          expression: new UglifyJS.AST_Call({
            expression: new UglifyJS.AST_SymbolRef({
              name: ['$', 'floor'].join('')
            }),
            args: [node]
          })
        });
      }
      if (coercionTypes['f64'] === resultType) {
        return makeAsmAnnotation(node, coercionTypes['f64']);
      }
      if (coercionTypes['f32'] === resultType) {
        return makeAsmAnnotation(node, coercionTypes['f32']);
      }
    }
    throw [
      'makeAsmCoercion: argument type not implemented: ',
      sourceType,
      ' -> ',
      resultType
    ].join('');
  };

  var asmJsFuncList = (function () {
    for (
      let funcIdx = 0;
      -1 !== (funcIdx = wasmFunctions.findIndex(el => null === el['ast']));

    ) {
      const funcInfo = wasmFunctions[funcIdx];

      const funcShortname =
        undefined !== funcInfo['encoded_name']
          ? ['f', funcInfo['encoded_name']].join('_')
          : funcInfo['name'];

      //const funcTypeInfo = binaryen.getFunctionTypeInfo( funcInfo['type'] );

      const argnames = [];
      let body = [];

      {
        var numParams = 0;
        // « func arguments »
        const arr = binaryen['expandType'](funcInfo['params']);
        for (let i = 0, len = arr.length; i !== len; ++i) {
          const paramName = ['$', funcShortname, '_', genStrId(i)].join('');
          argnames[argnames.length] = new UglifyJS.AST_SymbolFunarg({
            name: paramName
          });

          //process.stderr.write('TYPE: ' + JSON.stringify(funcInfo) + '\n');
          body[body.length] = new UglifyJS.AST_SimpleStatement({
            body: new UglifyJS.AST_Assign({
              left: new UglifyJS.AST_SymbolRef({name: paramName}),
              operator: '=',
              right: makeAsmAnnotation(
                new UglifyJS.AST_SymbolRef({name: paramName}),
                arr[i]
              )
            })
          });
        }
        numParams = arr.length;
      }
      {
        const funcBody = binaryen.getExpressionInfo(funcInfo['body']);
        let c = [];
        if (binaryen['BlockId'] === funcBody.id && '' === funcBody.name) {
          //if ( '' !== funcBody['name'] )
          //{ throw 'binaryen[\'BlockId\'] === funcBody.id && \'\' !== funcBody.name'; }

          c = funcBody['children'];

          // We check for the presence of a return opcode at the end of the block.
          if (
            0 !== c.length &&
            binaryen['ReturnId'] ===
              binaryen.getExpressionInfo(c[c.length - 1]).id
          ) {
            if (binaryen['none'] === funcInfo['results']) {
              c.pop();
            }
          } else {
            if (binaryen['none'] !== funcInfo['results']) {
              const d = {};
              d[binaryen['i32']] = decodedModule.i32;
              d[binaryen['f32']] = decodedModule.f32;
              if (undefined === d[funcInfo['results']]) {
                throw "undefined === d[funcInfo['results']]";
              }
              c[c.length] = decodedModule.return(
                d[funcInfo['results']].const(0)
              );
            }
          }
        }

        const arr = funcInfo['vars'];
        if (0 !== arr.length) {
          body[body.length] = new UglifyJS.AST_Var({
            definitions: arr.map((i, idx) => {
              if (undefined === asmJsConstructVariable[i])
                throw 'Function: local type not implemented.';

              const localIdx = idx + numParams;
              var walker = function x(ptr) {
                // Returns undefined on success.
                if (0 === ptr) return;
                const expr = binaryen.getExpressionInfo(ptr);
                if (binaryen['BlockId'] === expr['id']) {
                  return expr.children
                    .map(ptr => x(ptr))
                    .flat(Infinity)
                    .filter(item => undefined !== item)
                    .pop();
                } else if (binaryen['BreakId'] === expr['id']) {
                  return [x(expr['value']), x(expr['condition'])]
                    .flat(Infinity)
                    .filter(item => undefined !== item)
                    .pop();
                } else if (binaryen['BinaryId'] === expr['id']) {
                  return [x(expr['left']), x(expr['right'])]
                    .flat(Infinity)
                    .filter(item => undefined !== item)
                    .pop();
                } else if (binaryen['UnaryId'] === expr['id']) {
                  return x(expr['value']);
                } else if (binaryen['LocalGetId'] === expr['id']) {
                  return localIdx === expr['index'] ? 0 : void 0;
                } else if (
                  binaryen['GlobalGetId'] === expr['id'] ||
                  binaryen['ConstId'] === expr['id']
                ) {
                  return;
                } else if (binaryen['LocalSetId'] === expr['id']) {
                  return localIdx === expr['index'] ? 0 : x(expr['value']);
                } else if (binaryen['GlobalSetId'] === expr['id']) {
                  return x(expr['value']);
                } else if (binaryen['LoadId'] === expr['id']) {
                  return x(expr['ptr']);
                } else if (binaryen['CallId'] === expr['id']) {
                  return expr['operands']
                    .map(i => x(i))
                    .flat(Infinity)
                    .filter(item => undefined !== item)
                    .pop();
                }
                return 0;
              };

              return asmJsConstructVariable[i](
                ['$', funcShortname, '_', genStrId(localIdx)].join(''),
                (true === output['optimize_for_js'] &&
                  (function () {
                    for (let j = 0; j !== c.length; ++j) {
                      const expr = binaryen.getExpressionInfo(c[j]);
                      if (binaryen['LocalSetId'] === expr['id']) {
                        if (localIdx === expr['index']) {
                          const v = binaryen.getExpressionInfo(expr['value']);
                          if (binaryen['ConstId'] === v['id']) {
                            c.splice(j, 1);
                            /*
                            if ( binaryen['i32'] !== i ) {
                              return (
                                Math.floor(v['value']) === v['value'] ?
                                  v['value'].toFixed(1) : v['value'].toString(10)
                              );
                            }
                            */
                            return v['value'];
                          }
                          return;
                        }
                      }
                      if (
                        binaryen['LocalSetId'] === expr['id'] ||
                        binaryen['GlobalSetId'] === expr['id']
                      ) {
                        if (0 !== walker(expr['value'])) continue;
                      } else if (binaryen['LoopId'] === expr['id']) {
                        if (0 !== walker(expr['body'])) continue;
                      }
                      return;
                    }
                  })()) ||
                  void 0
              );
            })
          });
        }

        if (binaryen['BlockId'] === funcBody.id) {
          /*funcInfo['body'] = (
            '' !== funcBody.name ?
              decodedModule.block('', [funcInfo['body']], funcBody.type) :
              decodedModule.block('', funcBody.children, funcBody.type)
          );*/
          funcInfo['body'] = decodedModule.block(
            funcBody.name,
            funcBody.children,
            funcBody.type
          );
        }
      }
      {
        const f = {};
        f[binaryen['BlockId']] = visitBlockId;
        f[binaryen['IfId']] = visitIfId;
        f[binaryen['LocalSetId']] = visitLocalSetId;
        f[binaryen['GlobalSetId']] = visitGlobalSetId;
        f[binaryen['LocalGetId']] = visitLocalGetId;
        f[binaryen['GlobalGetId']] = visitGlobalGetId;
        f[binaryen['ConstId']] = visitConstId;
        f[binaryen['UnaryId']] = visitUnaryId;
        f[binaryen['BinaryId']] = visitBinaryId;
        f[binaryen['NopId']] = visitNopId;
        f[binaryen['CallId']] = visitCallId;
        f[binaryen['LoadId']] = visitLoadId;
        f[binaryen['StoreId']] = visitStoreId;
        f[binaryen['ReturnId']] = visitReturnId;
        f[binaryen['DropId']] = visitDropId;
        f[binaryen['LoopId']] = visitLoopId;
        f[binaryen['BreakId']] = visitBreakId;
        f[binaryen['CallIndirectId']] = visitCallIndirectId;
        f[binaryen['SelectId']] = visitSelectId;
        //f[binaryen['SwitchId']] = visitSwitchId;

        const parentNodes = [];

        body = body.concat(
          (function x(parentExpr, exprPtr) {
            const expr = Object.assign(binaryen.getExpressionInfo(exprPtr), {
              'srcPtr': exprPtr
            });
            if (undefined === expressionList[expr.id])
              throw ['Missing ', expr.id, ' data.'].join('');
            if (undefined === f[expr.id])
              throw ['Operation not implemented.', JSON.stringify(expr)].join(
                '\n'
              );
            const args = [
              x,
              {info: funcInfo, idx: funcIdx, shortname: funcShortname},
              parentNodes,
              expr,
              undefined !== arguments[2] ? arguments[2] : binaryen['auto']
            ];
            parentExpr = [].concat(parentExpr);
            if (
              parentExpr.length <= parentNodes.length &&
              parentExpr.every(
                (i, idx) =>
                  i ===
                  parentNodes[parentNodes.length - parentExpr.length + idx]
              )
            ) {
              return f[expr.id].apply(null, args);
            } else {
              Array.prototype.splice.apply(
                parentNodes,
                [parentNodes.length, 0].concat(parentExpr)
              );
              const resVal = f[expr.id].apply(null, args);
              parentNodes.length -= parentExpr.length;
              return resVal;
            }
          })({id: binaryen['BlockId']}, funcInfo['body'])
        );
      }

      funcInfo['ast'] = new UglifyJS.AST_Defun({
        name: new UglifyJS.AST_SymbolDefun({
          name: ['$', funcShortname].join('')
        }),
        argnames: argnames,
        body: body
      });
    }
    return wasmFunctions.map(el => el['ast']);
  })();
}
