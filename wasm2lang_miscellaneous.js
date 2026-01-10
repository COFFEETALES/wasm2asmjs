'use strict';

{
  var createEqz = function (srcPtr) {
    /*

$env:PATH = "C:\programs\python3;$env:PATH"
@'
from sympy import *
from sympy.logic.boolalg import *

x, y, z, w = symbols('x, y, z, w')

# my_op = Not(And(Or(Gt(z, 0), Eq(w, 0)), And(Gt(x, 0), Lt(y, 0))))
# my_op = Not(Xor(Lt(x, 0),1))
# my_op = Not(Or(Gt(x,6),Eq(7-y,0)))
# my_op = !(x<4 || x>10 || |x-7|<2)
my_op = Xor(Or(Or(Lt(x,4),Gt(x,10)),Lt(abs(x-7),2)), 1)
print( my_op )
# https://docs.sympy.org/latest/modules/logic.html#simplification-and-equivalence-testing
print( simplify_logic( my_op, None, True, False ) )
'@ | & python

    */

    assert.strictEqual(
      true,
      output['optimize'],
      'true === output["optimize"]'
    );
    return (
      (function x(ptr, eqz) {
        if (0 === ptr) return;
        const expr = binaryen.getExpressionInfo(ptr);

        if (
          binaryen['UnaryId'] === expr.id &&
          binaryen['EqZInt32'] === expr.op
        ) {
          return expr.value;
        } else if (
          binaryen['BinaryId'] === expr.id &&
          binaryen['XorInt32'] === expr.op
        ) {
          const right = binaryen.getExpressionInfo(expr.right);
          if (binaryen['ConstId'] === right.id && 1 === right.value) {
            return x(expr.left, eqz ^ 1);
          }
        }

        if (
          binaryen['LocalGetId'] === expr.id ||
          binaryen['GlobalGetId'] === expr.id
        ) {
          return eqz ? decodedModule['i32'].eqz(ptr) : ptr;
        }

        if (binaryen['BinaryId'] === expr.id) {
          if (eqz && binaryen['OrInt32'] === expr.op) {
            const leftOperand = x(expr.left, 1);
            const rightOperand = x(expr.right, 1);
            return (
              leftOperand &&
              rightOperand &&
              decodedModule['i32'].and(leftOperand, rightOperand)
            );
          }
          if (eqz && binaryen['AndInt32'] === expr.op) {
            const leftOperand = x(expr.left, 1);
            const rightOperand = x(expr.right, 1);
            return (
              leftOperand &&
              rightOperand &&
              decodedModule['i32'].or(leftOperand, rightOperand)
            );
          }
          const ftable = {};
          ftable[binaryen['GtSInt32']] = eqz
            ? decodedModule['i32'].le_s
            : decodedModule['i32'].gt_s;
          ftable[binaryen['GeSInt32']] = eqz
            ? decodedModule['i32'].lt_s
            : decodedModule['i32'].ge_s;
          ftable[binaryen['LtSInt32']] = eqz
            ? decodedModule['i32'].ge_s
            : decodedModule['i32'].lt_s;
          ftable[binaryen['LeSInt32']] = eqz
            ? decodedModule['i32'].gt_s
            : decodedModule['i32'].le_s;

          ftable[binaryen['GtUInt32']] = eqz
            ? decodedModule['i32'].le_u
            : decodedModule['i32'].gt_u;
          ftable[binaryen['GeUInt32']] = eqz
            ? decodedModule['i32'].lt_u
            : decodedModule['i32'].ge_u;
          ftable[binaryen['LtUInt32']] = eqz
            ? decodedModule['i32'].ge_u
            : decodedModule['i32'].lt_u;
          ftable[binaryen['LeUInt32']] = eqz
            ? decodedModule['i32'].gt_u
            : decodedModule['i32'].le_u;

          ftable[binaryen['EqInt32']] = eqz
            ? decodedModule['i32'].ne
            : decodedModule['i32'].eq;
          ftable[binaryen['NeInt32']] = eqz
            ? decodedModule['i32'].eq
            : decodedModule['i32'].ne;

          ftable[binaryen['GtFloat32']] = eqz
            ? decodedModule['f32'].le
            : decodedModule['f32'].gt;
          ftable[binaryen['GeFloat32']] = eqz
            ? decodedModule['f32'].lt
            : decodedModule['f32'].ge;
          ftable[binaryen['LtFloat32']] = eqz
            ? decodedModule['f32'].ge
            : decodedModule['f32'].lt;
          ftable[binaryen['LeFloat32']] = eqz
            ? decodedModule['f32'].gt
            : decodedModule['f32'].le;

          ftable[binaryen['EqFloat32']] = eqz
            ? decodedModule['f32'].ne
            : decodedModule['f32'].eq;
          ftable[binaryen['NeFloat32']] = eqz
            ? decodedModule['f32'].eq
            : decodedModule['f32'].ne;

          ftable[binaryen['GtFloat64']] = eqz
            ? decodedModule['f64'].le
            : decodedModule['f64'].gt;
          ftable[binaryen['GeFloat64']] = eqz
            ? decodedModule['f64'].lt
            : decodedModule['f64'].ge;
          ftable[binaryen['LtFloat64']] = eqz
            ? decodedModule['f64'].ge
            : decodedModule['f64'].lt;
          ftable[binaryen['LeFloat64']] = eqz
            ? decodedModule['f64'].gt
            : decodedModule['f64'].le;

          ftable[binaryen['EqFloat64']] = eqz
            ? decodedModule['f64'].ne
            : decodedModule['f64'].eq;
          ftable[binaryen['NeFloat64']] = eqz
            ? decodedModule['f64'].eq
            : decodedModule['f64'].ne;

          ftable[binaryen['OrInt32']] = decodedModule['i32'].or;
          ftable[binaryen['AndInt32']] = decodedModule['i32'].and;
          if (ftable[expr.op]) {
            return ftable[expr.op](expr.left, expr.right);
          }
          return eqz ? decodedModule['i32'].eqz(ptr) : ptr;
        }
      })(srcPtr, 1) || decodedModule['i32'].eqz(srcPtr)
    );
  };

  var findNonLocalBreaks = function (expressionList) {
    expressionList = [].concat(expressionList);

    const stack = [];

    return expressionList
      .map(function x(ptr) {
        if ([0, void 0].includes(ptr)) return;
        const expr = binaryen.getExpressionInfo(ptr);
        if (binaryen['LoopId'] === expr.id || binaryen['BlockId'] === expr.id) {
          let res;
          return (
            (stack[stack.length] = Object.assign(expr, {'srcPtr': ptr})),
            (res =
              binaryen['LoopId'] === expr.id
                ? x(expr.body)
                : expr.children.map(x)),
            --stack.length,
            res
          );
        }
        if (binaryen['IfId'] === expr.id) {
          let res = [];
          return (
            (stack[stack.length] = Object.assign(expr, {'srcPtr': ptr})),
            (res[res.length] = x(expr.ifTrue)),
            (res[res.length] = x(expr.ifFalse)),
            --stack.length,
            res
          );
        }
        if (binaryen['BreakId'] === expr.id) {
          if (-1 === stack.findIndex(item => expr.name === item.name)) {
            return Object.assign(expr, {
              'stack': stack.slice(),
              'srcPtr': ptr
            });
          }
        }
      })
      .flat(Infinity)
      .filter(item => void 0 !== item);
  };
}
{
  const genMathDep = str => {
    const o = {
      'Math_imul': 'imul',
      'Math_fround': 'fround',
      'Math_floor': 'floor',
      'Math_ceil': 'ceil',
      'Math_abs': 'abs',
      'Math_pow': 'pow',
      'Math_min': 'min',
      'Math_max': 'max',

      'Math_PI': 'PI'
    };

    return babelTypes.variableDeclarator(
      babelTypes.identifier(['$', o[str]].join('')),
      babelTypes.memberExpression(
        babelTypes.memberExpression(
          babelTypes.identifier('stdlib'),
          babelTypes.identifier('Math')
        ),
        babelTypes.identifier(o[str])
      )
    );
  };

  const genTypedArrayDep = str => {
    const o = {
      'i8': 'Int8Array',
      'u8': 'Uint8Array',
      'i16': 'Int16Array',
      'u16': 'Uint16Array',
      'i32': 'Int32Array',
      'u32': 'Uint32Array',
      'f32': 'Float32Array',
      'f64': 'Float64Array'
    };

    return babelTypes.variableDeclarator(
      babelTypes.identifier(['$', str].join('')),
      babelTypes.newExpression(
        babelTypes.memberExpression(
          babelTypes.identifier('stdlib'),
          babelTypes.identifier(o[str])
        ),
        [babelTypes.identifier('buffer')]
      )
    );
  };

  const headerList = [];

  var addAsmJsHeader = function (s) {
    if (-1 === headerList.indexOf(s)) headerList[headerList.length] = s;
  };

  var processAsmJsHeader = function () {
    const h = new Map();
    h.set('Math_imul', genMathDep.bind(null, 'Math_imul'));
    h.set('Math_fround', genMathDep.bind(null, 'Math_fround'));
    h.set('Math_floor', genMathDep.bind(null, 'Math_floor'));
    h.set('Math_ceil', genMathDep.bind(null, 'Math_ceil'));
    h.set('Math_abs', genMathDep.bind(null, 'Math_abs'));
    h.set('Math_pow', genMathDep.bind(null, 'Math_pow'));
    h.set('Math_min', genMathDep.bind(null, 'Math_min'));
    h.set('Math_max', genMathDep.bind(null, 'Math_max'));

    h.set('Math_PI', genMathDep.bind(null, 'Math_PI'));

    h.set('i8', genTypedArrayDep.bind(null, 'i8'));
    h.set('u8', genTypedArrayDep.bind(null, 'u8'));
    h.set('i16', genTypedArrayDep.bind(null, 'i16'));
    h.set('u16', genTypedArrayDep.bind(null, 'u16'));
    h.set('i32', genTypedArrayDep.bind(null, 'i32'));
    h.set('u32', genTypedArrayDep.bind(null, 'u32'));
    h.set('f32', genTypedArrayDep.bind(null, 'f32'));
    h.set('f64', genTypedArrayDep.bind(null, 'f64'));

    const res = Array.from(h.keys())
      .map(i => -1 !== headerList.indexOf(i) && h.get(i)())
      .filter(i => false !== i);
    //process.stderr.write("res: " + JSON.stringify(res) + '\n');
    //return headerList.map( (s) => h[s]() )
    return res;
  };
}

const genStrId = function (num) {
  const str = BaseXEncode(num);
  //if ( num !== BaseXDecode(str) ) throw ''
  return str;
};

{
  let funcCounter = 0;
  let importedFuncCounter = 0;

  var prepareFunction = function (callerIdx, name, preserveName) {
    const getItem = (list, i) => (
      (i = list.findIndex(e => e['name'] === name)), -1 !== i ? list[i] : false
    );
    return (
      getItem(wasmFunctions) ||
      getItem(wasmImportedFunctions) ||
      (function () {
        const funcPtr = decodedModule.getFunction(name);
        const funcInfo = binaryen.getFunctionInfo(funcPtr);

        if ('' !== funcInfo['base']) {
          const res = Object.assign(
            funcInfo,
            (function () {
              if ('fminf' === funcInfo['base'] || 'fmin' === funcInfo['base']) {
                addAsmJsHeader('Math_min');
                return {
                  'stdtype':
                    binaryen['fminf' === funcInfo['base'] ? 'f32' : 'f64'],
                  'std': 'function',
                  'encoded_name': 'min'
                };
              }
              if ('fmaxf' === funcInfo['base'] || 'fmax' === funcInfo['base']) {
                addAsmJsHeader('Math_max');
                return {
                  'stdtype':
                    binaryen['fmaxf' === funcInfo['base'] ? 'f32' : 'f64'],
                  'std': 'function',
                  'encoded_name': 'max'
                };
              }
              if ('Math_pow' === funcInfo['base']) {
                addAsmJsHeader('Math_pow');
                return {
                  'stdtype': binaryen['f64'],
                  'std': 'function',
                  'encoded_name': 'pow'
                };
              }
              if ('Math_PI' === funcInfo['base']) {
                addAsmJsHeader('Math_PI');
                return {
                  'stdtype': binaryen['f64'],
                  'std': 'variable',
                  'encoded_name': 'PI'
                };
              }
              return {
                'encoded_name':
                  true === preserveName ? name : genStrId(importedFuncCounter++)
              };
            })()
          );
          wasmImportedFunctions[wasmImportedFunctions.length] = res;
          return res;
        }

        const res = Object.assign(
          /*decodedModule.runPassesOnFunction( funcInfo.name, [
              'flatten',
              'simplify-locals-notee-nostructure',
              'reorder-locals',
              'remove-unused-names',
              'vacuum'
            ]),
            binaryen.getFunctionInfo( funcPtr )
          */
          funcInfo,
          {
            'ast': null,
            'encoded_name':
              true === preserveName ? name : genStrId(funcCounter++)
          }
        );
        wasmFunctions.splice(callerIdx, 0, res);
        return res;
      })()
    );
  };

  {
    const ftableInfo = (function () {
      //decodedModule.addTable('t0', 1, 0xffffffff);
      //const ftable = decodedModule.getTable('t0');

      const retValue = {'segments': []};
      assert.strictEqual(
        true,
        decodedModule.getNumTables() <= 1,
        'decodedModule.getNumTables() <= 1'
      );
      if (0 === decodedModule.getNumTables()) return retValue;

      const ftable = decodedModule.getTableByIndex(0);
      const tableInfo = binaryen.getTableInfo(ftable);
      assert.strictEqual('', tableInfo['module'], 'tableInfo["module"]');
      assert.strictEqual('', tableInfo['base'], 'tableInfo["base"]');
      const segments = decodedModule.getTableSegments(ftable);
      //process.stderr.write("segments.length: " + segments.length + "\n");
      assert.strictEqual(true, segments.length <= 1, 'segments.length');

      retValue['segments'] = Array.prototype.map.call(segments, function (i) {
        return binaryen.getElementSegmentInfo(i);
      });
      //process.stderr.write('retValue: ' + JSON.stringify(retValue.segments) + '\n');
      return retValue;
    })();

    //decodedModule.getFunctionTable();
    const ftableList = {};
    //process.stderr.write('ftableInfo: ' + JSON.stringify(ftableInfo) + '\n');
    //assert.strictEqual(false, ftableInfo['imported'], 'ftable: false === ftableInfo["imported"]');
    //assert.strictEqual(true, ftableInfo['segments'].length <= 1, 'ftable: 1 === ftableInfo["segments"].length');

    var prepareFunctionTable = function (callerIdx, results, params, keyStr) {
      return (
        ftableList[keyStr] ||
        (ftableList[keyStr] = (function () {
          const obj = {};
          const seg = ftableInfo['segments'][0];
          const offset = binaryen.getExpressionInfo(seg['offset']);
          assert.strictEqual(
            true,
            binaryen['ConstId'] === offset.id,
            "ftable: binaryen['ConstId'] === offset.id"
          );
          assert.strictEqual(
            true,
            binaryen['i32'] === offset.type,
            "ftable: binaryen['i32'] === offset.type"
          );
          obj['funcList'] = [...Array(offset.value).keys()].map(i => null);
          for (let i = 0, len = seg['data'].length; i !== len; ++i) {
            const n = seg['data'][i];
            const info = binaryen.getFunctionInfo(decodedModule.getFunction(n));
            const infoParams = binaryen.expandType(info['params']);
            if (
              info['results'] === results &&
              infoParams.length === params.length &&
              params.every((i, idx) => infoParams[idx] === i)
            ) {
              const f = (obj['funcList'][obj['funcList'].length] =
                prepareFunction(callerIdx, n));
              assert.strictEqual(
                '',
                f['base'],
                'Imported function cannot be inserted in FTable.'
              );
            } else {
              obj['funcList'][obj['funcList'].length] = null;
            }
          }
          for (let i = obj['funcList'].length - 1; i !== -1; --i) {
            if (null === obj['funcList'][i]) {
              obj['funcList'].pop();
            } else {
              break;
            }
          }
          {
            let i = obj['funcList'].length;
            const len = Math.pow(2, Math.ceil(Math.log2(i)));
            while (i !== len) {
              obj['funcList'][i++] = null;
            }
          }
          if (obj['funcList'].some(i => null === i)) {
            const fooName = [keyStr, '_', 'foo'].join('');
            //process.stderr.write('getFunc: ' + decodedModule.getFunction(fooName) + '\n');
            let returnNode = null;
            if (binaryen['none'] !== results) {
              if (binaryen['i32'] === results) {
                returnNode = decodedModule.return(decodedModule.i32.const(0));
              } else if (binaryen['f32'] === results) {
                returnNode = decodedModule.return(decodedModule.f32.const(0));
              } else if (binaryen['f64'] === results) {
                returnNode = decodedModule.return(decodedModule.f64.const(0));
              } else {
                throw 'Unsupported FTable function return type.';
              }
            }
            decodedModule.addFunction(
              fooName,
              binaryen.createType(params),
              results,
              [],
              decodedModule.block(null, returnNode ? [returnNode] : [])
            );
            prepareFunction(0, fooName, true);
          }
          return obj;
        })())
      );
    };

    // Each FTable must have its own declaration preceded by the keyword "var".
    var processAsmJsFTable = () =>
      Object.keys(ftableList).map(o =>
        babelTypes.variableDeclaration('var', [
          babelTypes.variableDeclarator(
            babelTypes.identifier(['$', 'ftable', '_', o].join('')),
            babelTypes.arrayExpression(
              ftableList[o]['funcList'].map(i =>
                babelTypes.identifier(
                  ['$']
                    .concat(
                      null === i
                        ? ['f', o, 'foo'].join('_')
                        : void 0 !== i['encoded_name']
                        ? ['f', i['encoded_name']].join('_')
                        : i['name']
                    )
                    .join('')
                )
              )
            )
          )
        ])
      );
  }
}

{
  var prepareAsmJsGlobal = function (name) {
    {
      let i;
      if (-1 !== (i = wasmGlobals.findIndex(e => e['name'] === name))) {
        return wasmGlobals[i];
      }
    }

    const res = binaryen.getGlobalInfo(decodedModule.getGlobal(name));

    res['encoded_name'] = genStrId(wasmGlobals.length);
    wasmGlobals[wasmGlobals.length] = res;

    if (name !== res['name']) throw '';

    return res;
    //throw ['ProcessGlobal: ',name].join('');
  };

  var processAsmJsImports = function () {
    return wasmImportedFunctions
      .filter(i => void 0 === i['std'])
      .map(function (item) {
        return babelTypes.variableDeclarator(
          babelTypes.identifier(
            ['$', 'if', '_', item['encoded_name']].join('')
          ),
          babelTypes.memberExpression(
            babelTypes.identifier('foreign'),
            babelTypes.identifier(item.base)
          )
        );
      });
  };

  var processAsmJsGlobals = function () {
    return wasmGlobals.map(function (item) {
      const expr = binaryen.getExpressionInfo(item.init);

      if (
        binaryen['ConstId'] !== expr.id ||
        !(binaryen['i32'] === expr.type) // || binaryen['f32'] === expr.type)
      )
        throw 'Unsupported global type.';

      return asmJsConstructVariable[item.type](
        ['$', 'g', '_', item['encoded_name']].join(''),
        expr.value
      );
    });
  };
}

const asmJsReturn = babelTypes.returnStatement(
  babelTypes.objectExpression(
    (function () {
      const keys = Object.keys(wasmExports);
      const res = [];
      for (let i = 0, len = keys.length; i !== len; ++i) {
        const n = wasmExports[keys[i]];
        res[res.length] = babelTypes.objectProperty(
          babelTypes.identifier(keys[i]),
          babelTypes.identifier(['$', n].join('')),
          /* computed */ false
        );
      }
      return res;
    })()
  )
);
