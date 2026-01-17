'use strict';

{
  var visitBreakId = function (walker, funcItem, parentNodes, expr) {
    if (0 !== expr.value) throw 'BreakId: 0 !== expr.value';
    if ([null, ''].includes(expr.name)) throw "BreakId: '' === expr.name";

    //if ('__WASM2LANG_INTERNAL_BREAK__' === expr.name) {
    //  return babelTypes.breakStatement();
    //}

    const dest = (function () {
      const arr = parentNodes.slice().reverse();
      return (
        arr.find(
          i =>
            binaryen['LoopId'] === i.id &&
            -1 !== i['nameList'].indexOf(expr.name)
        ) || arr.find(i => expr.name && expr.name === i.name)
      );
    })();

    if (void 0 === dest)
      throw ['BreakId: undefined dest: ', expr.name, '.'].join('');
    if (
      binaryen['LoopId'] === dest.id &&
      dest !== parentNodes.filter(i => binaryen['LoopId'] === i.id).pop()
    )
      dest['nested'] = true;

    const AST_T =
      binaryen['LoopId'] === dest.id && expr.name === dest.name
        ? babelTypes.continueStatement
        : babelTypes.breakStatement;

    const node = (function () {
      const parentLoop = parentNodes
        .filter(i => binaryen['LoopId'] === i.id)
        .pop();

      const shouldOmitLabel =
        parentLoop &&
        parentLoop === dest &&
        -1 !== parentLoop['nameList'].indexOf(expr.name);

      if (shouldOmitLabel) {
        return AST_T();
      }

      return AST_T(babelTypes.identifier(getLabelName(dest.name)));
    })();

    if (0 !== expr.condition) {
      return [
        babelTypes.ifStatement(
          walker(expr, expr.condition),
          babelTypes.blockStatement([node])
        )
      ];
    }
    return node;
  };

  var visitLoopId = function (walker, funcItem, parentNodes, expr) {
    if ([null, ''].includes(expr.name)) throw 'LoopId: Label value undefined.';

    const labelValue = getLabelName(expr.name);
    // ^ The label is generated regardless of the situation. When JS optimizations are enabled, the name is not necessarily used but is still retained.

    const parentNode = parentNodes[parentNodes.length - 1];

    expr['nested'] = false;
    expr['nameList'] = [expr.name];

    let blockExpr = binaryen.getExpressionInfo(expr.body);
    if (binaryen['BlockId'] !== blockExpr.id)
      blockExpr = binaryen.getExpressionInfo(
        decodedModule.block(null, [expr.body])
      );
    if (![null, ''].includes(blockExpr.name))
      expr['nameList'][expr['nameList'].length] = blockExpr.name;

    output['warnings']['labeledStatement'] = true;
    const resultLoop = babelTypes.whileStatement(
      babelTypes.numericLiteral(1),
      babelTypes.blockStatement(
        walker(
          [expr, blockExpr],
          decodedModule.block('', blockExpr.children, blockExpr.type)
        )
          .flat()
          .concat(babelTypes.breakStatement())
      )
    );

    // The "nested" property is modified by feeding the "resultLoop" variable.
    if (true === expr['nested']) {
      return babelTypes.labeledStatement(
        babelTypes.identifier(labelValue),
        resultLoop
      );
    }
    return resultLoop;
  };
}
