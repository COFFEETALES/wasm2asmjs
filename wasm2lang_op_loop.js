'use strict';

{
  var visitBreakId = function (walker, funcItem, parentNodes, expr) {
    if (0 !== expr.value) throw 'BreakId: 0 !== expr.value';
    if ([null, ''].includes(expr.name)) throw "BreakId: '' === expr.name";

    if ('__WASM2LANG_INTERNAL_BREAK__' === expr.name) {
      return babelTypes.breakStatement();
    }

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
    if (
      true === output['optimizations'] &&
      1 === parentNode.children.length &&
      binaryen['BlockId'] === parentNode.id
    ) {
      expr['nameList'][expr['nameList'].length] = parentNode.name;
    }

    let blockExpr = binaryen.getExpressionInfo(expr.body);
    if (binaryen['BlockId'] !== blockExpr.id)
      blockExpr = binaryen.getExpressionInfo(
        decodedModule.block(null, [expr.body])
      );
    if (![null, ''].includes(blockExpr.name))
      expr['nameList'][expr['nameList'].length] = blockExpr.name;

    let resultLoop = null;
    $label_1: if (true === output['optimizations']) {
      const firstSrc = blockExpr.children[0];
      const firstExpr = binaryen.getExpressionInfo(firstSrc);

      const lastSrc = blockExpr.children[blockExpr.children.length - 1];
      const lastExpr = binaryen.getExpressionInfo(lastSrc);

      // JS-friendly loop normalization:
      // detect trailing 'br'/'br_if' that targets this loop and rewrite
      // 'loop { ...; br ... }' into native JS loops (for(;;), do..while, while)
      // by popping the terminal break and using its condition as the loop test.
      // 1
      {
        const item = findNonLocalBreaks(blockExpr.children).find(
          elem =>
            lastSrc === elem['srcPtr'] &&
            expr['nameList'].includes(elem['name'])
        );
        if (item) {
          if (0 === item.value) {
            if (0 === item.condition) {
              // Pattern: 'while (1) { if (cond) br L; ... }'.
              // Rewrite into 'while (!cond) { ... }' (invert the test and drop the early 'break').
              if (
                binaryen['BreakId'] === firstExpr.id &&
                0 === firstExpr.value &&
                0 !== firstExpr.condition
              ) {
                blockExpr.children = blockExpr.children.splice(
                  1,
                  blockExpr.children.length - 2
                );

                resultLoop = babelTypes.whileStatement(
                  walker([expr, blockExpr], createEqz(firstExpr.condition)),
                  babelTypes.blockStatement(
                    walker(
                      [expr, blockExpr],
                      decodedModule.block(
                        '',
                        blockExpr.children,
                        blockExpr.type
                      )
                    ).flat()
                  )
                );
                break $label_1;
              }

              resultLoop = babelTypes.forStatement(
                null,
                null,
                null,
                babelTypes.blockStatement(
                  (blockExpr.children.pop(),
                  walker(
                    [expr, blockExpr],
                    decodedModule.block('', blockExpr.children, blockExpr.type)
                  ).flat())
                )
              );
              break $label_1;
            } else {
              resultLoop = babelTypes.doWhileStatement(
                walker(
                  decodedModule.loop(expr.name, decodedModule.nop()),
                  item.condition
                ),
                babelTypes.blockStatement(
                  (blockExpr.children.pop(),
                  walker(
                    [expr, blockExpr],
                    decodedModule.block('', blockExpr.children, blockExpr.type)
                  ).flat())
                )
              );
              break $label_1;
            }
          } // ~ if ( 0 === item.value )
        } // ~ if ( item )
      }
      // Pattern: two trailing breaks to this loop: 'br_if L cond; br L'.
      // Rewrite to a single 'br_if L !cond' (invert the condition) so we can emit a simple JS 'for(;;)' loop.
      // 2
      if (false) {
        const arr = blockExpr.children
          .slice(-2)
          .map(i => binaryen.getExpressionInfo(i));
        if (
          2 === arr.length &&
          arr.every(i => binaryen['BreakId'] === i.id && 0 === i.value)
        ) {
          if (expr['nameList'].includes(arr[0]['name'])) {
            if (0 !== arr[0].condition) {
              if (0 === arr[1].condition) {
                resultLoop = babelTypes.forStatement(
                  null,
                  null,
                  null,
                  babelTypes.blockStatement(
                    (blockExpr.children.splice(
                      -2,
                      2,
                      decodedModule.br(
                        arr[1]['name'],
                        createEqz(arr[0].condition),
                        0
                      )
                    ),
                    walker(
                      [expr, blockExpr],
                      decodedModule.block(
                        '',
                        blockExpr.children,
                        blockExpr.type
                      )
                    ).flat())
                  )
                );
                break $label_1;
              }
            }
          }
        } // ~ if ( arr.every( i => binaryen['BreakId'] === i.id ) )
      }
      // Pattern: 'if (cond) { ...; br L }' as the only loop body statement.
      // Rewrite into a JS 'while (cond) { ... }' by removing the final 'br' and lifting the block body.
      // 3
      {
        if (binaryen['IfId'] === lastExpr.id && 0 === lastExpr.ifFalse) {
          const bodyExpr = binaryen.getExpressionInfo(lastExpr.ifTrue);
          if (binaryen['BlockId'] === bodyExpr.id) {
            const lastBodySrc = bodyExpr.children.pop();
            const item = findNonLocalBreaks(blockExpr.children).find(
              elem =>
                lastBodySrc === elem['srcPtr'] &&
                expr['nameList'].includes(elem['name'])
            );
            if (item && 0 === item.condition && 0 === item.value) {
              const isOnlyIfInLoopBody = 1 === blockExpr.children.length;
              const rewrittenLoopBodyExprs = isOnlyIfInLoopBody
                ? bodyExpr.children
                : [
                    decodedModule.if(
                      createEqz(lastExpr.condition),
                      decodedModule.br('__WASM2LANG_INTERNAL_BREAK__'),
                      null
                    ),
                    bodyExpr.children
                  ].flat();
              const bodyArray =
                (Array.prototype.splice.apply(
                  blockExpr.children,
                  [-1, 1].concat(rewrittenLoopBodyExprs)
                ),
                walker(
                  [expr, blockExpr],
                  decodedModule.block('', blockExpr.children, blockExpr.type)
                ).flat());

              /*
              bodyArray.splice(
                bodyExpr.children.length * -1,
                0,
                babelTypes.ifStatement(
                  walker([expr, blockExpr], createEqz(lastExpr.condition)),
                  babelTypes.breakStatement()
                )
              );

              resultLoop = babelTypes.forStatement(
                null,
                null,
                null,
                babelTypes.blockStatement(bodyArray)
              );
              */
              if (!isOnlyIfInLoopBody) {
                resultLoop = babelTypes.forStatement(
                  null,
                  null,
                  null,
                  babelTypes.blockStatement(bodyArray)
                );
                break $label_1;
              }

              resultLoop = babelTypes.whileStatement(
                walker([expr, blockExpr], lastExpr.condition),
                babelTypes.blockStatement(bodyArray)
              );
              break $label_1;
            }
          }
        }
      }
      // Pattern: a single 'if (cond) { ... } else { ...; br L }' as the whole loop body.
      // Turn it into 'for(;;) { if (cond) { ...; break; } /* else-body without the final br */ }'.
      // 4
      if (1 === blockExpr.children.length) {
        if (binaryen['IfId'] === firstExpr.id && 0 !== firstExpr.ifFalse) {
          const ifFalseExpr = binaryen.getExpressionInfo(firstExpr.ifFalse);
          if (binaryen['BlockId'] === ifFalseExpr.id) {
            const lastIfFalseSrc = ifFalseExpr.children.pop();
            const item = findNonLocalBreaks(blockExpr.children).find(
              elem =>
                lastIfFalseSrc === elem['srcPtr'] &&
                expr['nameList'].includes(elem['name'])
            );
            if (item && 0 === item.condition && 0 === item.value) {
              const bodyArray = [
                babelTypes.ifStatement(
                  walker([expr, blockExpr], firstExpr.condition),
                  babelTypes.blockStatement(
                    walker([expr, blockExpr], firstExpr.ifTrue)
                      .flat()
                      .concat(babelTypes.breakStatement())
                  )
                )
              ];
              const footerArray = walker(
                [expr, blockExpr],
                decodedModule.block(null, ifFalseExpr.children)
              ).flat();

              resultLoop = babelTypes.forStatement(
                null,
                null,
                null,
                babelTypes.blockStatement(bodyArray.concat(footerArray))
              );
              break $label_1;
            }
          }
        }
      }
    } // $label_1

    if (null === resultLoop) {
      output['warnings']['labeledStatement'] = true;
      resultLoop = babelTypes.whileStatement(
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
    }

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
