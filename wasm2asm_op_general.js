'use strict';

{
  const labelList = [];
  var getLabelName = n => {
    let id = labelList.indexOf(n);
    if (-1 === id) {
      id = labelList.length;
      labelList[id] = n;
    }
    return ['$', 'label_', genStrId(id)].join('');
  };
}

var cmpOperators = {};
cmpOperators[binaryen['EqInt32']] = true;
cmpOperators[binaryen['NeInt32']] = true;

cmpOperators[binaryen['LtSInt32']] = true;
cmpOperators[binaryen['LeSInt32']] = true;
cmpOperators[binaryen['GtSInt32']] = true;
cmpOperators[binaryen['GeSInt32']] = true;

cmpOperators[binaryen['LtUInt32']] = true;
cmpOperators[binaryen['LeUInt32']] = true;
cmpOperators[binaryen['GtUInt32']] = true;
cmpOperators[binaryen['GeUInt32']] = true;

cmpOperators[binaryen['LtFloat32']] = true;
cmpOperators[binaryen['LeFloat32']] = true;
cmpOperators[binaryen['GtFloat32']] = true;
cmpOperators[binaryen['GeFloat32']] = true;

cmpOperators[binaryen['LtFloat64']] = true;
cmpOperators[binaryen['LeFloat64']] = true;
cmpOperators[binaryen['GtFloat64']] = true;
cmpOperators[binaryen['GeFloat64']] = true;

var intOperators = {};
intOperators[binaryen['AndInt32']] = true;
intOperators[binaryen['OrInt32']] = true;
intOperators[binaryen['XorInt32']] = true;
intOperators[binaryen['ShlInt32']] = true;
intOperators[binaryen['ShrSInt32']] = true;
intOperators[binaryen['ShrUInt32']] = true;
intOperators[binaryen['MulInt32']] = true; // imul

var uintOperators = {};
uintOperators[binaryen['DivUInt32']] = true;
uintOperators[binaryen['RemUInt32']] = true;
uintOperators[binaryen['ShrUInt32']] = true;
uintOperators[binaryen['LtUInt32']] = true;
uintOperators[binaryen['LeUInt32']] = true;
uintOperators[binaryen['GtUInt32']] = true;
uintOperators[binaryen['GeUInt32']] = true;

var visitBlockId = function (walker, funcItem, parentNodes, expr) {
  //const br_if = getUnlinkedBr(expr.children);
  //process.stderr.write(JSON.stringify(br_if)+'\n');
  //if ( 0 !== br_if.length && '' === expr.name ) {
  //	throw 'BlockId: 0 !== br_if.length && \'\' === expr.name';
  //}

  const labelValue = '' !== expr.name ? getLabelName(expr.name) : null;

  const header = [];

  if (
    true === output['optimize_for_js'] &&
    0 !== expr.children.length &&
    '' !== expr.name
  ) {
    (function x(children) {
      while (0 !== children.length) {
        const firstExpr = binaryen.getExpressionInfo(children[0]);
        if (
          binaryen['GlobalSetId'] === firstExpr.id ||
          binaryen['LocalSetId'] === firstExpr.id
        ) {
          header[header.length] = walker(expr, children.shift());
          continue;
        } else if (binaryen['BlockId'] === firstExpr.id) {
          x(firstExpr.children);
          children.splice(
            0,
            1,
            decodedModule.block(
              firstExpr.name,
              firstExpr.children,
              firstExpr.type
            )
          );
        }
        break;
      }
    })(expr.children);
    //header = header.filter( (item) => undefined !== item );

    const optimizedResult = (function blockOptimizer(
      blockType,
      blockName,
      children
    ) {
      if ('' === blockName) {
        return children;
      }
      for (let i = children.length - 1; i !== -1; --i) {
        const firstExpr = binaryen.getExpressionInfo(children[i]);
        if (binaryen['BlockId'] === firstExpr.id) {
          const retVal = blockOptimizer(
            firstExpr.type,
            firstExpr.name,
            firstExpr.children
          );
          Array.prototype.splice.apply(children, [i, 1].concat(retVal));
        }
      }
      {
        let b = getUnlinkedBr(children).filter(i => blockName === i.name);

        const isLastChild = function (item, idx, array) {
          if (0 !== idx) {
            if (binaryen['LoopId'] === array[idx - 1].id) return false;
            if (binaryen['IfId'] === array[idx - 1].id) return true;
          }
          const parentArr = 0 === idx ? children : array[idx - 1]['children'];
          return parentArr[parentArr.length - 1] === item['srcPtr']
            ? true
            : false;
        };

        const compileWasmExpressions = function (arr) {
          while (0 !== arr.length) {
            const popped = arr.pop();
            const parentInst = 0 === arr.length ? null : arr[arr.length - 1];
            const createdExpr =
              binaryen['IfId'] === popped['id']
                ? decodedModule.if(
                    popped['condition'],
                    popped['ifTrue'],
                    popped['ifFalse']
                  )
                : decodedModule.block(
                    popped['name'],
                    popped['children'],
                    popped['type']
                  );
            if (
              null === parentInst ||
              binaryen['BlockId'] === parentInst['id']
            ) {
              const parentArr =
                null === parentInst ? children : parentInst['children'];
              const id = parentArr.indexOf(popped['srcPtr']);
              assert.notStrictEqual(-1, id, 'blockOptimizer: idx error');
              parentArr.splice(id, 1, createdExpr);
            } else {
              // IfId
              if (parentInst['ifTrue'] === popped['srcPtr']) {
                parentInst['ifTrue'] = createdExpr;
              } else if (parentInst['ifFalse'] === popped['srcPtr']) {
                parentInst['ifFalse'] = createdExpr;
              } else {
                throw 'blockOptimizer: IfId error';
              }
            }
          }
        };

        for (let i = b.length - 1; i !== -1; --i) {
          const curr = b[i];
          if (curr['stack'].some(i => binaryen['LoopId'] === i['id'])) continue;

          //if (..) { .. break label; } ..
          //TO
          //if (..) {..} else {..}
          if (2 <= curr['stack'].length) {
            const j = curr['stack'].slice(-2);
            if (curr['stack'].slice(0, -2).every(isLastChild)) {
              if (
                binaryen['IfId'] === j[0].id &&
                0 === j[0].ifFalse &&
                0 !== j[0].ifTrue
              ) {
                if (
                  j[1]['srcPtr'] === j[0].ifTrue &&
                  binaryen['BlockId'] === j[1].id &&
                  curr['srcPtr'] === j[1].children[j[1].children.length - 1]
                ) {
                  const parentInst =
                    2 === curr['stack'].length
                      ? null
                      : curr['stack'].slice(-3)[0];
                  assert.strictEqual(
                    true,
                    null === parentInst ||
                      binaryen['BlockId'] === parentInst.id,
                    'blockOptimizer: incompatible parentInst'
                  );
                  const parentArr =
                    2 === curr['stack'].length
                      ? children
                      : parentInst['children'];
                  const id = parentArr.indexOf(j[0]['srcPtr']);
                  const ifFalseArr = parentArr.slice(id + 1);
                  parentArr.splice(
                    id,
                    parentArr.length - id,
                    decodedModule.if(
                      j[0].condition,
                      decodedModule.block('', j[1].children.slice(0, -1)),
                      0 !== ifFalseArr.length
                        ? decodedModule.block('', ifFalseArr)
                        : 0
                    )
                  );
                  compileWasmExpressions(curr['stack'].slice(0, -2));
                  b = getUnlinkedBr(children).filter(i => blockName === i.name);
                  continue;
                }
              }
            }
          }

          //if (..) { break label; } ..
          //TO
          //if (!..) {..}
          if (
            binaryen['BreakId'] === curr.id &&
            0 === curr.value &&
            0 !== curr.condition
          ) {
            const parentInst =
              0 === curr['stack'].length ? null : curr['stack'].slice(-1)[0];
            assert.strictEqual(
              true,
              null === parentInst || binaryen['BlockId'] === parentInst.id,
              'blockOptimizer: incompatible parentInst'
            );
            const parentArr =
              0 === curr['stack'].length ? children : parentInst['children'];
            const isAlternativePattern = (function () {
              const lastChild = binaryen.getExpressionInfo(
                parentArr[parentArr.length - 1]
              );
              return (
                binaryen['BreakId'] === lastChild.id &&
                blockName === lastChild.name &&
                0 === lastChild.value &&
                0 === lastChild.condition
              );
            })();
            if (isAlternativePattern || curr['stack'].every(isLastChild)) {
              const id = parentArr.indexOf(curr['srcPtr']);
              if (isAlternativePattern) {
                //{ .. if (..) { break label; } .. break label; }
                //TO
                //{ .. if (!..) {..} break label; }
                const afterArr = parentArr.slice(id + 1, -1);
                parentArr.splice(
                  id,
                  parentArr.length - id - 1,
                  decodedModule.if(
                    createEqz(curr.condition),
                    decodedModule.block('', afterArr),
                    0
                  )
                );
              } else {
                const afterArr = parentArr.slice(id + 1);
                if (0 === afterArr.length) {
                  parentArr.splice(id, 1);
                } // if ( 0 !== afterArr.length )
                else {
                  parentArr.splice(
                    id,
                    parentArr.length - id,
                    decodedModule.if(
                      createEqz(curr.condition),
                      decodedModule.block('', afterArr),
                      0
                    )
                  );
                }
              }
              compileWasmExpressions(curr['stack']);
              b = getUnlinkedBr(children).filter(i => blockName === i.name);
              continue;
            }
          }
        }
        if (0 === b.length) return children;
      }
      return decodedModule.block(blockName, children, blockType);
    })(expr.type, expr.name, expr.children);
    if (Array.isArray(optimizedResult)) {
      return header.concat(
        expr.children
          .flatMap(item => walker(expr, item))
          .filter(item => undefined !== item)
      );
    }
  }

  const res = expr.children
    .flatMap(item => walker(expr, item))
    .filter(item => undefined !== item);
  // ^ some children (like LoadId) can return «undef»

  return header.concat(
    '' !== expr.name
      ? //output['warnings']['labeledStatement'] = true,
        new UglifyJS.AST_LabeledStatement({
          label: new UglifyJS.AST_Label({ name: labelValue }),
          body: new UglifyJS.AST_BlockStatement({ body: res })
        })
      : res
  );
};

var visitIfId = function (walker, funcItem, parentNodes, expr) {
  return new UglifyJS.AST_If({
    condition: walker(expr, expr.condition),
    body: new UglifyJS.AST_BlockStatement({
      body: [].concat(walker(expr, expr.ifTrue)).flat()
    }),
    alternative:
      0 === expr.ifFalse
        ? null
        : new UglifyJS.AST_BlockStatement({
            body: [].concat(walker(expr, expr.ifFalse)).flat()
          })
  });
};

var visitLocalSetId = function (walker, funcItem, parentNodes, expr) {
  return new UglifyJS.AST_SimpleStatement({
    body: new UglifyJS.AST_Assign({
      left: new UglifyJS.AST_SymbolRef({
        name: ['$', funcItem.shortname, '_', genStrId(expr.index)].join('')
      }),
      operator: '=',
      right: walker(expr, expr.value, getLocalType(funcItem.info, expr.index))
    })
  });
};

var visitGlobalSetId = function (walker, funcItem, parentNodes, expr) {
  const global = prepareAsmJsGlobal(expr.name);
  const globalType = global.type;
  return new UglifyJS.AST_SimpleStatement({
    body: new UglifyJS.AST_Assign({
      left: new UglifyJS.AST_SymbolRef({
        name: ['$', 'g', '_', global['encoded_name']].join('')
      }),
      operator: '=',
      right: walker(expr, expr.value, globalType)
    })
  });
};

var visitLocalGetId = function (
  walker,
  funcItem,
  parentNodes,
  expr,
  alignType
) {
  //if ( binaryen['i32'] !== expr.type ) throw '';
  const node = new UglifyJS.AST_SymbolRef({
    name: ['$', funcItem.shortname, '_', genStrId(expr.index)].join('')
  });

  const localType = getLocalType(funcItem.info, expr.index);
  if (expr.type !== localType) throw 'LocalGetId: alignType !== localType';

  if (binaryen['CallId'] === parentNodes[parentNodes.length - 1].id) {
    const idx = wasmImportedFunctions.findIndex(
      e => e['name'] === parentNodes[parentNodes.length - 1].target
    );
    if (-1 !== idx) return makeAsmCoercion(node, localType, localType);
  }
  if (binaryen['BinaryId'] === parentNodes[parentNodes.length - 1].id) {
    const parentNode = parentNodes[parentNodes.length - 1];
    if (
      binaryen['f64'] !== expr.type &&
      true === cmpOperators[parentNode.op] &&
      true !== uintOperators[parentNode.op]
    ) {
      return makeAsmCoercion(node, localType, alignType);
    }
    if (binaryen['f64'] !== expr.type) {
      if (
        binaryen['DivFloat32'] === parentNode.op ||
        binaryen['DivSInt32'] === parentNode.op
      )
        return makeAsmCoercion(node, localType, alignType);
    }
  }
  if (binaryen['ReturnId'] === parentNodes[parentNodes.length - 1].id) {
    return makeAsmCoercion(node, localType, alignType);
  }

  //	if ( /*binaryen['CallId'] === parentNodes[parentNodes.length-1].id ||*/
  //		isAlignmentNeeded(localType, alignType, parentNodes[parentNodes.length-1]) )
  //	{
  //		return makeAsmCoercion( node, localType, alignType );
  //		/*throw [
  //			'LocalGetId: getLocalType(', expr.index,
  //			') !== alignType (', getLocalType(funcItem.info, expr.index),
  //			' !== ',  alignType, ')'
  //		].join('');*/
  //	}
  return node;
};

var visitGlobalGetId = function (
  walker,
  funcItem,
  parentNodes,
  expr,
  alignType
) {
  const global = prepareAsmJsGlobal(expr.name);
  const node = new UglifyJS.AST_SymbolRef({
    name: ['$', 'g', '_', global['encoded_name']].join('')
  });
  const globalType = global.type;
  //	if ( isAlignmentNeeded(globalType, alignType, parentNodes[parentNodes.length-1]) )
  //	{
  //		throw [
  //			'GlobalGetId: globalType !== alignType (',
  //			globalType, ' !== ', alignType, ')'
  //		].join('');
  //	}
  return node;
};

var visitConstId = function (walker, funcItem, parentNodes, expr, alignType) {
  if (binaryen['auto'] !== alignType && expr.type !== alignType)
    throw [
      'ConstId: expr.type !== alignType (',
      expr.type,
      ' !== ',
      alignType,
      ')'
    ].join('');
  /*
	The above correction follows the discovery of edge cases in WebAssembly (WAST):
	(f32.lt
	  (local.get $0)
	  (f32.const 0)
	)
	This code snippet checks whether the floating-point value stored in local variable $0 is less than 0.
*/
  if (binaryen['i32'] === expr.type) {
    return new UglifyJS.AST_Number({
      value: expr.value,
      start: { raw: expr.value.toString(10) }
    });
  } else if (binaryen['f32'] === expr.type) {
    addAsmJsHeader('Math_fround');
    return new UglifyJS.AST_Call({
      expression: new UglifyJS.AST_SymbolRef({
        name: ['$', 'fround'].join('')
      }),
      args: [
        new UglifyJS.AST_Number({
          value: expr.value,
          start: {
            //raw: expr.value.toString(10)
            //raw: expr.value.toFixed(5)
            raw:
              Math.floor(expr.value) === expr.value
                ? expr.value.toFixed(1)
                : expr.value.toString(10)
          }
        })
      ]
    });
  } else if (binaryen['f64'] === expr.type) {
    return new UglifyJS.AST_Number({
      value: expr.value,
      start: {
        raw:
          Math.floor(expr.value) === expr.value
            ? expr.value.toFixed(1)
            : expr.value.toString(10)
      }
    });
  }
  throw 'ConstId missing impl.';
};

var visitBinaryId = function (walker, funcItem, parentNodes, expr, alignType) {
  if (binaryen['auto'] !== alignType && expr.type !== alignType)
    throw [
      'BinaryId: expr.type !== alignType (',
      expr.type,
      ' !== ',
      alignType,
      ')'
    ].join('');

  const op = {};
  op[binaryen['AddFloat32']] = '+';
  op[binaryen['AddFloat64']] = '+';
  op[binaryen['AddInt32']] = '+';

  op[binaryen['SubFloat32']] = '-';
  op[binaryen['SubFloat64']] = '-';
  op[binaryen['SubInt32']] = '-';

  op[binaryen['DivFloat32']] = '/';
  op[binaryen['DivFloat64']] = '/';
  op[binaryen['DivSInt32']] = '/';
  op[binaryen['DivUInt32']] = '/';

  op[binaryen['RemSInt32']] = '%';
  op[binaryen['RemUInt32']] = '%';

  op[binaryen['MulFloat32']] = '*';
  op[binaryen['MulFloat64']] = '*';

  //op[ binaryen['RotLInt32'] ] = '';
  //op[ binaryen['RotRInt32'] ] = '';

  // ci-dessous résultat considéré comme int
  op[binaryen['AndInt32']] = '&';
  op[binaryen['OrInt32']] = '|';
  op[binaryen['XorInt32']] = '^';
  op[binaryen['ShlInt32']] = '<<';
  op[binaryen['ShrSInt32']] = '>>';
  op[binaryen['EqInt32']] = '==';
  op[binaryen['NeInt32']] = '!=';

  op[binaryen['LtSInt32']] = '<';
  op[binaryen['LeSInt32']] = '<=';
  op[binaryen['GtSInt32']] = '>';
  op[binaryen['GeSInt32']] = '>=';

  op[binaryen['ShrUInt32']] = '>>>';

  op[binaryen['LtUInt32']] = '<';
  op[binaryen['LeUInt32']] = '<=';
  op[binaryen['GtUInt32']] = '>';
  op[binaryen['GeUInt32']] = '>=';

  op[binaryen['LtFloat32']] = '<';
  op[binaryen['LeFloat32']] = '<=';
  op[binaryen['GtFloat32']] = '>';
  op[binaryen['GeFloat32']] = '>=';

  op[binaryen['LtFloat64']] = '<';
  op[binaryen['LeFloat64']] = '<=';
  op[binaryen['GtFloat64']] = '>';
  op[binaryen['GeFloat64']] = '>=';

  if (binaryen['MulInt32'] === expr.op) {
    addAsmJsHeader('Math_imul');
    const parentExpr = { 'id': 'CallId', 'type': expr['type'], 'is_imul': 1 };
    return new UglifyJS.AST_Call({
      expression: new UglifyJS.AST_SymbolRef({
        name: ['$', 'imul'].join('')
      }),
      args: [
        walker(parentExpr, expr.left, binaryen['i32']),
        walker(parentExpr, expr.right, binaryen['i32'])
      ]
    });
  }

  ////
  // OPTIMIZE FOR JS
  if (
    true === output['optimize_for_js'] &&
    (binaryen['SubInt32'] === expr.op || binaryen['AddInt32'] === expr.op)
  ) {
    const right = binaryen.getExpressionInfo(expr.right);
    if (
      binaryen['ConstId'] === right.id &&
      binaryen['i32'] === right.type &&
      right.value < 0
    ) {
      expr.op =
        binaryen['SubInt32'] === expr.op
          ? binaryen['AddInt32']
          : binaryen['SubInt32'];
      expr.right = decodedModule.i32.const(-1 * right.value);
    }
  }
  if (
    true === output['optimize_for_js'] &&
    (binaryen['XorInt32'] === expr.op || binaryen['AndInt32'] === expr.op)
  ) {
    /*
		const right = binaryen.getExpressionInfo(expr.right);
		if ( binaryen['ConstId'] === right.id &&
			binaryen['i32'] === right.type &&
			1 === right.value )
		{
			const left = binaryen.getExpressionInfo(expr.left);
			if ( binaryen['BinaryId'] === left.id && true === cmpOperators[left.op] )
			{
			}
		}
		*/
  }
  //
  ////

  if (undefined === op[expr.op])
    throw ['BinaryId: opcode not implemented. ', expr.op].join('');

  const prepareNode = ptr => {
    if (true === uintOperators[expr.op] && binaryen['ShrUInt32'] !== expr.op) {
      const nodeInfo = binaryen.getExpressionInfo(ptr);
      if (binaryen['ConstId'] === nodeInfo.id) {
        return walker(expr, ptr, binaryen['i32']);
      }
      return new UglifyJS.AST_Binary({
        left: walker(expr, ptr, binaryen['i32']),
        operator: '>>>',
        right: new UglifyJS.AST_Number({ value: 0 })
      });
    }
    //
    else if (
      binaryen['AddFloat32'] <= expr.op &&
      expr.op <= binaryen['MaxFloat32']
    ) {
      return walker(expr, ptr, binaryen['f32']);
    } else if (
      binaryen['EqFloat32'] <= expr.op &&
      expr.op <= binaryen['GeFloat32']
    ) {
      return walker(expr, ptr, binaryen['f32']);
    }
    //
    else if (
      binaryen['AddFloat64'] <= expr.op &&
      expr.op <= binaryen['MaxFloat64']
    ) {
      return walker(expr, ptr, binaryen['f64']);
    } else if (
      binaryen['EqFloat64'] <= expr.op &&
      expr.op <= binaryen['GeFloat64']
    ) {
      return walker(expr, ptr, binaryen['f64']);
    }
    //
    else if (
      binaryen['AddInt32'] <= expr.op &&
      expr.op <= binaryen['GeUInt32']
    ) {
      return walker(expr, ptr, binaryen['i32']);
    }
    throw 'BinaryId: cannot find expr.op type.';
  };

  {
    const node = new UglifyJS.AST_Binary({
      left: prepareNode(expr.left),
      operator: op[expr.op],
      right: prepareNode(expr.right)
    });

    const annotationList = {};
    annotationList[binaryen['AddFloat32']] = true;
    annotationList[binaryen['AddInt32']] = true;
    annotationList[binaryen['SubFloat32']] = true;
    annotationList[binaryen['SubInt32']] = true;
    annotationList[binaryen['DivFloat32']] = true;
    annotationList[binaryen['DivSInt32']] = true;
    annotationList[binaryen['DivUInt32']] = true;
    annotationList[binaryen['RemSInt32']] = true;
    annotationList[binaryen['RemUInt32']] = true;
    annotationList[binaryen['MulFloat32']] = true;

    const parentExpr = parentNodes[parentNodes.length - 1];

    return true !== annotationList[expr.op] ||
      /*parentExpr['is_imul'] || // ne serait pas compatible avec chrome */
      (binaryen['StoreId'] === parentExpr.id &&
        expr.srcPtr === parentExpr.value) ||
      ((binaryen['StoreId'] === parentExpr.id ||
        binaryen['LoadId'] === parentExpr.id) &&
        expr.srcPtr === parentExpr.ptr &&
        1 !== parentExpr.bytes) ||
      (binaryen['DivSInt32'] !== expr.op &&
        binaryen['DivUInt32'] !== expr.op &&
        binaryen['BinaryId'] === parentExpr.id &&
        binaryen['i32'] === expr.type &&
        !cmpOperators[parentExpr.op])
      ? node
      : makeAsmAnnotation(node, expr.type);
  }
};

var visitNopId = function (walker, funcItem, parentNodes, expr) {
  return [];
};

var visitCallId = function (walker, funcItem, parentNodes, expr, alignType) {
  //if ( binaryen['none'] !== expr.type )
  //	throw 'CallId type';
  const parentExpr = parentNodes[parentNodes.length - 1];

  const callFn = prepareFunction(funcItem.idx, expr.target);

  const callFnSurname = (function () {
    if ('undefined' !== typeof callFn['std']) {
      return callFn['encoded_name'];
    }
    if (undefined !== callFn['encoded_name']) {
      return ['' !== callFn['base'] ? 'if' : 'f', callFn['encoded_name']].join(
        '_'
      );
    }
    return callFn['name'];
  })();

  let res = new UglifyJS.AST_SymbolRef({ name: ['$', callFnSurname].join('') });
  if ('variable' !== callFn['std']) {
    res = new UglifyJS.AST_Call({
      expression: res,
      args: expr.operands.map(e => walker(expr, e))
    });
  }
  res =
    binaryen['none'] !== expr.type &&
    ('undefined' === callFn['stdtype'] || callFn['stdtype'] !== expr.type)
      ? makeAsmAnnotation(res, expr.type)
      : res;

  return binaryen['DropId'] === parentExpr.id ||
    binaryen['BlockId'] === parentExpr.id
    ? new UglifyJS.AST_SimpleStatement({ body: res })
    : res;
};

var visitCallIndirectId = function (
  walker,
  funcItem,
  parentNodes,
  expr,
  alignType
) {
  const parentExpr = parentNodes[parentNodes.length - 1];
  //process.stderr.write('binaryen: ' + expr.target + '\n');
  const funcType = [expr.type].concat(
    expr.operands.map(e => ((e = binaryen.getExpressionInfo(e)), e.type))
  );
  const funcTypeSignature = funcType.map(i => {
    const h = {};
    h[binaryen['none']] = 'v';
    h[binaryen['i32']] = 'i';
    h[binaryen['f32']] = 'f';
    h[binaryen['f64']] = 'F';
    if (undefined === h[i]) {
      throw 'visitCallIndirectId: funcTypeSignature';
    }
    return h[i];
  });

  const ftable = prepareFunctionTable(
    funcItem.idx,
    funcType[0],
    funcType.slice(1),
    funcTypeSignature.join('')
  );

  let res = new UglifyJS.AST_Call({
    expression: new UglifyJS.AST_Sub({
      expression: new UglifyJS.AST_SymbolRef({
        name: ['$', 'ftable', '_'].concat(funcTypeSignature).join('')
      }),
      property: walker(
        expr,
        decodedModule['i32'].and(
          expr.target,
          decodedModule['i32'].const(ftable['funcList'].length - 1)
        )
        //expr, expr.target
      )
    }),
    args: expr.operands.map(e => walker(expr, e))
  });
  res =
    binaryen['none'] !== expr.type ? makeAsmAnnotation(res, expr.type) : res;

  return binaryen['DropId'] === parentExpr.id ||
    binaryen['BlockId'] === parentExpr.id
    ? new UglifyJS.AST_SimpleStatement({ body: res })
    : res;
};

var visitUnaryId = function (walker, funcItem, parentNodes, expr) {
  //+	Unary addition: type conversion to double
  //-	Sign inversion: type correction required
  if (binaryen['EqZInt32'] === expr.op) {
    if (true === output['optimize_for_js']) {
      const exprSrc = createEqz(expr.value);
      const exprObj = binaryen.getExpressionInfo(exprSrc);
      if (
        !(
          binaryen['UnaryId'] === exprObj.id &&
          binaryen['EqZInt32'] === exprObj.op
        )
      ) {
        return walker(expr, exprSrc);
      }
    }
    const node = walker(expr, expr.value);
    return new UglifyJS.AST_UnaryPrefix({
      operator: '!',
      expression: node
    });
  }
  /*if ( binaryen['TruncSFloat32ToInt32'] === expr.op )
	{
		return (
			makeAsmCoercion( walker( expr, expr.value ), binaryen['f32'], binaryen['i32'] )
		);
	}*/
  if (
    binaryen['NegFloat32'] === expr.op ||
    binaryen['NegFloat64'] === expr.op
  ) {
    const node = walker(expr, expr.value);
    return new UglifyJS.AST_UnaryPrefix({
      operator: '-',
      expression: node
    });
  }
  if (
    binaryen['FloorFloat32'] === expr.op ||
    binaryen['FloorFloat64'] === expr.op ||
    binaryen['CeilFloat32'] === expr.op ||
    binaryen['CeilFloat64'] === expr.op
  ) {
    if (
      binaryen['FloorFloat32'] === expr.op ||
      binaryen['CeilFloat32'] === expr.op
    ) {
      addAsmJsHeader('Math_fround');
    }
    var desiredFunc = '';
    if (
      binaryen['FloorFloat32'] === expr.op ||
      binaryen['FloorFloat64'] === expr.op
    ) {
      addAsmJsHeader('Math_floor');
      desiredFunc = 'floor';
    } else {
      addAsmJsHeader('Math_ceil');
      desiredFunc = 'ceil';
    }

    return (function () {
      var res = new UglifyJS.AST_Call({
        expression: new UglifyJS.AST_SymbolRef({
          name: ['$', desiredFunc].join('')
        }),
        args: [walker(expr, expr.value)]
      });
      return binaryen['CeilFloat32'] === expr.op ||
        binaryen['FloorFloat32'] === expr.op
        ? new UglifyJS.AST_Call({
            expression: new UglifyJS.AST_SymbolRef({
              name: ['$', 'fround'].join('')
            }),
            args: [res]
          })
        : res;
    })();
  }
  if (binaryen['AbsFloat32'] === expr.op) {
    addAsmJsHeader('Math_fround');
    addAsmJsHeader('Math_abs');
    return new UglifyJS.AST_Call({
      expression: new UglifyJS.AST_SymbolRef({
        name: ['$', 'fround'].join('')
      }),
      args: [
        new UglifyJS.AST_Call({
          expression: new UglifyJS.AST_SymbolRef({
            name: ['$', 'abs'].join('')
          }),
          args: [walker(expr, expr.value)]
        })
      ]
    });
  }
  if (
    binaryen['TruncUFloat32ToInt32'] === expr.op ||
    binaryen['TruncUFloat64ToInt32'] === expr.op
  ) {
    const fromType =
      binaryen['TruncUFloat32ToInt32'] === expr.op
        ? binaryen['f32']
        : binaryen['f64'];
    return new UglifyJS.AST_Binary({
      left: makeAsmCoercion(
        walker(expr, expr.value),
        fromType,
        binaryen['i32']
      ),
      operator: '>>>',
      right: new UglifyJS.AST_Number({ value: 0 })
    });
  }
  if (
    binaryen['TruncSFloat32ToInt32'] === expr.op ||
    binaryen['TruncSFloat64ToInt32'] === expr.op
  ) {
    const fromType =
      binaryen['TruncSFloat32ToInt32'] === expr.op
        ? binaryen['f32']
        : binaryen['f64'];
    return makeAsmCoercion(walker(expr, expr.value), fromType, binaryen['i32']);
  }
  if (binaryen['PromoteFloat32'] === expr.op) {
    return makeAsmCoercion(
      walker(expr, expr.value),
      binaryen['f32'],
      binaryen['f64']
    );
  }
  if (binaryen['DemoteFloat64'] === expr.op) {
    return makeAsmCoercion(
      walker(expr, expr.value),
      binaryen['f64'],
      binaryen['f32']
    );
    //return makeAsmAnnotation( walker(expr, expr.value), binaryen['f32']);
  }
  if (
    binaryen['ConvertSInt32ToFloat32'] === expr.op ||
    binaryen['ConvertUInt32ToFloat32'] === expr.op ||
    binaryen['ConvertSInt32ToFloat64'] === expr.op ||
    binaryen['ConvertUInt32ToFloat64'] === expr.op
  ) {
    const fromType =
      binaryen['ConvertUInt32ToFloat32'] === expr.op ||
      binaryen['ConvertUInt32ToFloat64'] === expr.op
        ? coercionTypes['u32']
        : binaryen['i32'];
    const destType =
      binaryen['ConvertSInt32ToFloat32'] === expr.op ||
      binaryen['ConvertUInt32ToFloat32'] === expr.op
        ? binaryen['f32']
        : binaryen['f64'];
    return makeAsmCoercion(walker(expr, expr.value), fromType, destType);
  }
  throw [
    'Unary operation, opcode not implemented (',
    expr.op,
    ')',
    '\n',
    (function () {
      var r = Object.keys(binaryen['Operations']).find(
        i => binaryen['Operations'][i] === expr.op
      );
      return r;
    })()

    /*, '\n'
		, '(TruncSFloat32ToInt32: ', binaryen['TruncSFloat32ToInt32'], ')'
		, '\n'
		, '(FloorFloat32: ', binaryen['FloorFloat32'], ')'
		, '\n'
		, '(PopcntInt32: ', binaryen['PopcntInt32'], ')'
		, '\n'*/
  ].join('');
};

var visitReturnId = function (walker, funcItem, parentNodes, expr) {
  if (0 === expr.value) {
    return new UglifyJS.AST_Return({ value: null });
  }

  const leftValue = walker(expr, expr.value, funcItem.info['results']);
  /*
	const childExpr = binaryen.getExpressionInfo( expr.value );
	let cond = (function(){
		if ( binaryen['BinaryId'] === childExpr.id )
			return false;
		if ( binaryen['LoadId'] === childExpr.id )
			return false;
		return true;
	})();
*/
  return new UglifyJS.AST_Return({
    /*
		value: true === cond ?
			makeAsmAnnotation(leftValue, funcItem.info['results']) : leftValue
*/
    value: leftValue
  });
};

var visitDropId = function (walker, funcItem, parentNodes, expr) {
  /*return new UglifyJS.AST_Number({
		value: 0x100
	});*/
  return walker(expr, expr.value);
};

var visitSelectId = function (walker, funcItem, parentNode, expr) {
  return makeAsmAnnotation(
    new UglifyJS.AST_Conditional({
      condition: walker(expr, expr.condition),
      consequent: walker(expr, expr.ifTrue),
      alternative: walker(expr, expr.ifFalse)
    }),
    expr.type
  );
};

var visitSwitchId = function (walker, funcItem, parentNode, expr) {};
