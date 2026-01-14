'use strict';

/*
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
*/

var getLabelName = n => ['$', 'label', '_', n].join('');

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
  //const br_if = findNonLocalBreaks(expr.children);
  //process.stderr.write(JSON.stringify(br_if)+'\n');
  //if ( 0 !== br_if.length && '' === expr.name ) {
  //  throw 'BlockId: 0 !== br_if.length && \'\' === expr.name';
  //}

  const labelValue = ![null, ''].includes(expr.name)
    ? getLabelName(expr.name)
    : null;

  const header = [];
  const res = [];

  // Extract a "prologue" of leading assignments from the start of the block:
  // - While the first child is a GlobalSet/LocalSet, move it into 'header'.
  // - If the first child is a nested Block, recurse into that block first (so we can
  //   extract its own prologue), then rebuild/replace the Block expression in-place.
  //
  // Notes:
  // - This mutates the 'children' array in-place (it is 'expr.children').
  // - 'header' is appended with the JS statements produced by 'walker(...)'.
  (function extractLeadingSetStatements(children) {
    while (0 !== children.length) {
      const firstExpr = binaryen.getExpressionInfo(children[0]);
      if (
        binaryen['GlobalSetId'] === firstExpr.id ||
        binaryen['LocalSetId'] === firstExpr.id
      ) {
        header[header.length] = walker(expr, children.shift());
        continue;
      } else if (binaryen['BlockId'] === firstExpr.id) {
        extractLeadingSetStatements(firstExpr.children);
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

  Array.prototype.splice.apply(
    res,
    [0, 0].concat(
      expr.children
        .flatMap(item => walker(expr, item))
        .filter(item => void 0 !== item)
    )
  );

  return header.concat(
    ![null, ''].includes(expr.name)
      ? //output['warnings']['labeledStatement'] = true,
        babelTypes.labeledStatement(
          babelTypes.identifier(labelValue),
          babelTypes.blockStatement(res)
        )
      : res
  );
};

var visitIfId = function (walker, funcItem, parentNodes, expr) {
  var fn = function (expr, part) {
    const node = walker(expr, part);
    if (Array.isArray(node)) {
      return babelTypes.blockStatement(node);
    }
    if (babelTypes.isStatement(node)) {
      return node;
    }
    //if (babelTypes.isExpression && babelTypes.isExpression(node)) {
    //  return babelTypes.expressionStatement(node);
    //}
  };

  return babelTypes.ifStatement(
    walker(expr, expr.condition),
    fn(expr, expr.ifTrue),
    0 === expr.ifFalse ? null : fn(expr, expr.ifFalse)
  );
};

var visitLocalSetId = function (walker, funcItem, parentNodes, expr) {
  return babelTypes.expressionStatement(
    babelTypes.assignmentExpression(
      '=',
      babelTypes.identifier(
        ['$', funcItem.shortname, '_', genStrId(expr.index)].join('')
      ),
      walker(expr, expr.value, getLocalType(funcItem.info, expr.index))
    )
  );
};

var visitGlobalSetId = function (walker, funcItem, parentNodes, expr) {
  const global = prepareAsmJsGlobal(expr.name);
  const globalType = global.type;
  return babelTypes.expressionStatement(
    babelTypes.assignmentExpression(
      '=',
      babelTypes.identifier(['$', 'g', '_', global['encoded_name']].join('')),
      walker(expr, expr.value, globalType)
    )
  );
};

var visitLocalGetId = function (
  walker,
  funcItem,
  parentNodes,
  expr,
  alignType
) {
  //if ( binaryen['i32'] !== expr.type ) throw '';
  const node = babelTypes.identifier(
    ['$', funcItem.shortname, '_', genStrId(expr.index)].join('')
  );

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

  //if ( /*binaryen['CallId'] === parentNodes[parentNodes.length-1].id ||*/
  //  isAlignmentNeeded(localType, alignType, parentNodes[parentNodes.length-1]) )
  //{
  //  return makeAsmCoercion( node, localType, alignType );
  //  /*throw [
  //    'LocalGetId: getLocalType(', expr.index,
  //    ') !== alignType (', getLocalType(funcItem.info, expr.index),
  //    ' !== ',  alignType, ')'
  //  ].join('');*/
  //}
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
  const node = babelTypes.identifier(
    ['$', 'g', '_', global['encoded_name']].join('')
  );
  const globalType = global.type;
  //if ( isAlignmentNeeded(globalType, alignType, parentNodes[parentNodes.length-1]) )
  //{
  //  throw [
  //    'GlobalGetId: globalType !== alignType (',
  //    globalType, ' !== ', alignType, ')'
  //  ].join('');
  //}
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
    if (expr.value < 0) {
      return babelTypes.unaryExpression(
        '-',
        babelTypes.numericLiteral(-1 * expr.value),
        true
      );
    }
    return babelTypes.numericLiteral(expr.value);
  } else if (binaryen['f32'] === expr.type) {
    addAsmJsHeader('Math_fround');
    const num = Math.abs(expr.value);
    const node = babelTypes.numericLiteral(num);
    const raw = Math.floor(num) === num ? num.toFixed(1) : num.toString(10);
    node.extra = {
      ...(node.extra || {}),
      raw: raw,
      rawValue: num
    };
    return babelTypes.callExpression(
      babelTypes.identifier(['$', 'fround'].join('')),
      [expr.value < 0.0 ? babelTypes.unaryExpression('-', node, true) : node]
    );
  } else if (binaryen['f64'] === expr.type) {
    const num = Math.abs(expr.value);
    const node = babelTypes.numericLiteral(num);
    const raw = Math.floor(num) === num ? num.toFixed(1) : num.toString(10);
    node.extra = {
      ...(node.extra || {}),
      raw: raw,
      rawValue: num
    };
    return expr.value < 0.0
      ? babelTypes.unaryExpression('-', node, true)
      : node;
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
    const parentExpr = {'id': 'CallId', 'type': expr['type'], 'is_imul': 1};
    return babelTypes.callExpression(
      babelTypes.identifier(['$', 'imul'].join('')),
      [
        walker(parentExpr, expr.left, binaryen['i32']),
        walker(parentExpr, expr.right, binaryen['i32'])
      ]
    );
  }

  if (void 0 === op[expr.op])
    throw ['BinaryId: opcode not implemented. ', expr.op].join('');

  const prepareNode = ptr => {
    if (true === uintOperators[expr.op] && binaryen['ShrUInt32'] !== expr.op) {
      const nodeInfo = binaryen.getExpressionInfo(ptr);
      if (binaryen['ConstId'] === nodeInfo.id) {
        return walker(expr, ptr, binaryen['i32']);
      }
      return babelTypes.binaryExpression(
        '>>>',
        walker(expr, ptr, binaryen['i32']),
        babelTypes.numericLiteral(0)
      );
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
    const node = babelTypes.binaryExpression(
      op[expr.op],
      prepareNode(expr.left),
      prepareNode(expr.right)
    );

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
        binaryen['RemSInt32'] !== expr.op &&
        binaryen['RemUInt32'] !== expr.op &&
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
  //  throw 'CallId type';
  const parentExpr = parentNodes[parentNodes.length - 1];

  const callFn = prepareFunction(funcItem.idx, expr.target);

  const callFnSurname = (function () {
    if ('undefined' !== typeof callFn['std']) {
      return callFn['encoded_name'];
    }
    if (void 0 !== callFn['encoded_name']) {
      return ['' !== callFn['base'] ? 'if' : 'f', callFn['encoded_name']].join(
        '_'
      );
    }
    return callFn['name'];
  })();

  let res = babelTypes.identifier(['$', callFnSurname].join(''));
  if ('variable' !== callFn['std']) {
    res = babelTypes.callExpression(
      res,
      expr.operands.map(e => walker(expr, e))
    );
  }
  res =
    binaryen['none'] !== expr.type &&
    ('undefined' === callFn['stdtype'] || callFn['stdtype'] !== expr.type)
      ? makeAsmAnnotation(res, expr.type)
      : res;

  return binaryen['DropId'] === parentExpr.id ||
    binaryen['BlockId'] === parentExpr.id
    ? babelTypes.expressionStatement(res)
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
    if (void 0 === h[i]) {
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

  let res = babelTypes.callExpression(
    babelTypes.memberExpression(
      babelTypes.identifier(
        ['$', 'ftable', '_'].concat(funcTypeSignature).join('')
      ),
      walker(
        expr,
        decodedModule['i32'].and(
          expr.target,
          decodedModule['i32'].const(ftable['funcList'].length - 1)
        )
        //expr, expr.target
      ),
      true // computed
    ),
    expr.operands.map(e => walker(expr, e))
  );
  res =
    binaryen['none'] !== expr.type ? makeAsmAnnotation(res, expr.type) : res;

  return binaryen['DropId'] === parentExpr.id ||
    binaryen['BlockId'] === parentExpr.id
    ? babelTypes.expressionStatement(res)
    : res;
};

var visitUnaryId = function (walker, funcItem, parentNodes, expr) {
  const parentNode = parentNodes[parentNodes.length - 1];
  //+ Unary addition: type conversion to double
  //- Sign inversion: type correction required
  if (binaryen['EqZInt32'] === expr.op) {
    const node = walker(expr, expr.value);
    return babelTypes.unaryExpression('!', node, true);
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
    return babelTypes.unaryExpression('-', node, true);
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
      var res = babelTypes.callExpression(
        babelTypes.identifier(['$', desiredFunc].join('')),
        [walker(expr, expr.value)]
      );
      return binaryen['CeilFloat32'] === expr.op ||
        binaryen['FloorFloat32'] === expr.op
        ? babelTypes.callExpression(
            babelTypes.identifier(['$', 'fround'].join('')),
            [res]
          )
        : res;
    })();
  }
  if (binaryen['AbsFloat32'] === expr.op) {
    addAsmJsHeader('Math_fround');
    addAsmJsHeader('Math_abs');
    return babelTypes.callExpression(
      babelTypes.identifier(['$', 'fround'].join('')),
      [
        babelTypes.callExpression(
          babelTypes.identifier(['$', 'abs'].join('')),
          [walker(expr, expr.value)]
        )
      ]
    );
  }
  if (
    binaryen['TruncUFloat32ToInt32'] === expr.op ||
    binaryen['TruncUFloat64ToInt32'] === expr.op
  ) {
    const fromType =
      binaryen['TruncUFloat32ToInt32'] === expr.op
        ? binaryen['f32']
        : binaryen['f64'];
    const leftSide = makeAsmCoercion(
      walker(expr, expr.value),
      fromType,
      binaryen['i32']
    );
    if (binaryen['CallId'] === parentNode.id) {
      return leftSide;
    }
    return babelTypes.binaryExpression(
      '>>>',
      leftSide,
      babelTypes.numericLiteral(0)
    );
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
    return babelTypes.returnStatement(null);
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
  return babelTypes.returnStatement(
    /*
    value: true === cond ?
      makeAsmAnnotation(leftValue, funcItem.info['results']) : leftValue
    */
    leftValue
  );
};

var visitDropId = function (walker, funcItem, parentNodes, expr) {
  /*return babelTypes.numericLiteral(
    0x100
  );*/
  return walker(expr, expr.value);
};

var visitSelectId = function (walker, funcItem, parentNode, expr) {
  return makeAsmAnnotation(
    babelTypes.conditionalExpression(
      walker(expr, expr.condition),
      walker(expr, expr.ifTrue),
      walker(expr, expr.ifFalse)
    ),
    expr.type
  );
};

var visitSwitchId = function (walker, funcItem, parentNode, expr) {};
