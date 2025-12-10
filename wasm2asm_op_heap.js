'use strict';

{
  const createOffsetAst = function (walker, expr) {
    if (0 !== expr.offset) {
      $label_1: {
        const offsetExpr = binaryen.getExpressionInfo(expr.ptr);
        if (
          binaryen['BinaryId'] === offsetExpr.id &&
          binaryen['AddInt32'] === offsetExpr.op
        ) {
          const rightExpr = binaryen.getExpressionInfo(offsetExpr.right);
          const leftExpr = binaryen.getExpressionInfo(offsetExpr.left);
          assert.notStrictEqual(
            binaryen['ConstId'],
            leftExpr.id,
            'createOffsetAst: leftExpr is Const'
          );
          if (
            binaryen['ConstId'] === rightExpr.id &&
            binaryen['i32'] === rightExpr.type
          ) {
            const binaryExpr = decodedModule.i32.add(
              offsetExpr.left,
              decodedModule.i32.const(rightExpr.value + expr.offset)
            );
            expr.ptr = binaryExpr;
            break $label_1;
          }
        }
        const binaryExpr = decodedModule.i32.add(
          expr.ptr,
          decodedModule.i32.const(expr.offset)
        );
        expr.ptr = binaryExpr;
      }
    }
    return walker(expr, expr.ptr);
  };

  var visitLoadId = function (walker, funcItem, parentNodes, expr, alignType) {
    if (expr.bytes !== expr.align) throw 'LoadId: expr.bytes !== expr.align';
    if (binaryen['auto'] !== alignType && expr.type !== alignType)
      throw 'LoadId: expr.type !== alignType';
    if (binaryen['DropId'] === parentNodes[parentNodes.length - 1].id)
      return [];

    let name = '';
    if (binaryen['i32'] === expr.type) {
      const l = {};
      l[0x000 | 1] = 'i8';
      l[0x000 | 2] = 'i16';
      l[0x000 | 4] = 'i32';
      l[0x100 | 1] = 'u8';
      l[0x100 | 2] = 'u16';
      //l[0x100|4] = 'u32';
      l[0x100 | 4] = 'i32';
      // ^ Unsigned 32-bit integers are replaced by signed integers due to the particular syntax of asm.js.

      if (undefined === l[(false === expr.isSigned ? 0x100 : 0x0) | expr.bytes])
        throw 'LoadId: l[(false===expr.isSigned?0x100:0x0)|expr.bytes] not defined.';

      name = l[(false === expr.isSigned ? 0x100 : 0x0) | expr.bytes];
    } else if (binaryen['f32'] === expr.type) {
      name = 'f32';
    } else if (binaryen['f64'] === expr.type) {
      name = 'f64';
    } else {
      throw 'LoadId: expr.type not implemented.';
    }
    addAsmJsHeader(name);

    const shr = {};
    shr[2] = 1;
    shr[4] = 2;
    shr[8] = 3;

    if (1 !== expr.bytes && undefined === shr[expr.bytes])
      throw 'LoadId: shr[expr.bytes] not defined.';

    const offsetNode = createOffsetAst(walker, expr);

    const node = babelTypes.memberExpression(
      babelTypes.identifier(['$', name].join('')),
      1 === expr.bytes
        ? offsetNode
        : babelTypes.binaryExpression(
            '>>',
            offsetNode,
            babelTypes.numericLiteral(shr[expr.bytes])
          ),
      true
    );

    {
      const parentNode = parentNodes[parentNodes.length - 1];

      const checks = [
        binaryen['i32'] === expr.type &&
          binaryen['BinaryId'] === parentNode.id &&
          true !== intOperators[parentNode.op],
        binaryen['f32'] === expr.type &&
          binaryen['BinaryId'] === parentNode.id &&
          binaryen['EqFloat32'] <= parentNode.op &&
          parentNode.op <= binaryen['GeFloat32'],
        binaryen['f64'] === expr.type &&
          binaryen['BinaryId'] === parentNode.id &&
          ((binaryen['EqFloat64'] <= parentNode.op &&
            parentNode.op <= binaryen['GeFloat64']) ||
            (binaryen['AddFloat64'] <= parentNode.op &&
              parentNode.op <= binaryen['MaxFloat64'])),
        binaryen['LocalSetId'] === parentNode.id,
        binaryen['CallId'] === parentNode.id,
        //binaryen['LoadId'] === parentNode.id && expr.srcPtr === parentNode.ptr,
        binaryen['LoadId'] === expr.id,
        binaryen['UnaryId'] === parentNode.id &&
          binaryen['EqZInt32'] === parentNode.op,
        binaryen['SelectId'] === parentNode.id,
        binaryen['LoopId'] === parentNode.id,
        (binaryen['IfId'] === parentNode.id ||
          binaryen['BreakId'] === parentNode.id) &&
          expr.srcPtr === parentNode.condition,
        binaryen['ReturnId'] === parentNode.id
      ];

      if (-1 !== checks.indexOf(true)) {
        return makeAsmCoercion(
          node,
          expr.type,
          binaryen['auto'] === alignType ? expr.type : alignType
        );
      }
    }
    return node;
  };

  var visitStoreId = function (walker, funcItem, parentNodes, expr) {
    if (expr.bytes !== expr.align) throw 'StoreId: expr.bytes !== expr.align';
    if (expr.offset < 0) throw 'StoreId: expr.offset < 0';

    const valueType = binaryen.getExpressionInfo(expr.value).type;

    let name = '';
    if (binaryen['i32'] === valueType) {
      const l = {};
      l[1] = 'i8';
      l[2] = 'i16';
      l[4] = 'i32';

      if (undefined === l[expr.bytes])
        throw 'StoreId: l[expr.bytes] not defined.';

      name = l[expr.bytes];
    } else if (binaryen['f32'] === valueType) {
      name = 'f32';
    } else if (binaryen['f64'] === valueType) {
      name = 'f64';
    } else {
      throw expr.type;
      throw 'StoreId: valueType not implemented.';
    }
    addAsmJsHeader(name);

    const shr = {};
    shr[2] = 1;
    shr[4] = 2;
    shr[8] = 3;

    if (1 !== expr.bytes && undefined === shr[expr.bytes])
      throw 'StoreId: shr[expr.bytes] not defined.';

    const offsetNode = createOffsetAst(walker, expr);

    return babelTypes.expressionStatement(
      babelTypes.assignmentExpression(
        '=',
        babelTypes.memberExpression(
          babelTypes.identifier(['$', name].join('')),
          1 === expr.bytes
            ? offsetNode
            : babelTypes.binaryExpression(
                '>>',
                offsetNode,
                babelTypes.numericLiteral(shr[expr.bytes])
              ),
          true
        ),
        walker(expr, expr.value)
      )
    );
  };
}
