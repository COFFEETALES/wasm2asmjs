'use strict';

{
  var visitBreakId = function (walker, funcItem, parentNodes, expr) {
    if (0 !== expr.value) throw 'BreakId: 0 !== expr.value';
    if ('' === expr.name) throw "BreakId: '' === expr.name";

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

    if (undefined === dest)
      throw ['BreakId: undefined dest: ', expr.name, '.'].join('');
    if (
      binaryen['LoopId'] === dest.id &&
      dest !== parentNodes.filter(i => binaryen['LoopId'] === i.id).pop()
    )
      dest['nested'] = true;

    const AST_T =
      binaryen['LoopId'] === dest.id && expr.name === dest.name
        ? UglifyJS.AST_Continue
        : UglifyJS.AST_Break;

    const node = new AST_T({
      label: (function () {
        const parentLoop = parentNodes
          .filter(i => binaryen['LoopId'] === i.id)
          .pop();
        if (parentLoop && -1 !== parentLoop['nameList'].indexOf(expr.name)) {
          return null;
        }

        return new UglifyJS.AST_LabelRef({ name: getLabelName(dest.name) });
      })()
    });

    if (0 !== expr.condition) {
      return [
        new UglifyJS.AST_If({
          condition: walker(expr, expr.condition),
          body: node
        })
      ];
    }
    return node;
  };

  var visitLoopId = function (walker, funcItem, parentNodes, expr) {
    if ('' === expr.name) throw 'LoopId: Label value undefined.';

    const labelValue = getLabelName(expr.name);
    // ^ The label is generated regardless of the situation. When JS optimizations are enabled, the name is not necessarily used but is still retained.

    expr['nested'] = false;
    expr['nameList'] = [expr.name];

    const blockExpr = binaryen.getExpressionInfo(expr.body);
    if (binaryen['BlockId'] !== blockExpr.id)
      throw 'LoopId: BlockId is not used as child.';
    if ('' !== blockExpr.name)
      expr['nameList'][expr['nameList'].length] = blockExpr.name;

    let resultLoop = null;
    $label_1: if (true === output['optimize_for_js']) {
      {
        const lastSrc = blockExpr.children[blockExpr.children.length - 1];
        const item = getUnlinkedBr(blockExpr.children).find(
          elem => lastSrc === elem['srcPtr'] && expr.name === elem['name']
        );
        if (item) {
          if (0 === item.value) {
            if (0 === item.condition) {
              resultLoop = new UglifyJS.AST_For({
                body: new UglifyJS.AST_BlockStatement({
                  body:
                    (blockExpr.children.pop(),
                    walker(
                      [expr, blockExpr],
                      decodedModule.block(
                        '',
                        blockExpr.children,
                        blockExpr.type
                      )
                    ).flat())
                })
              });
              break $label_1;
            } else {
              resultLoop = new UglifyJS.AST_Do({
                condition: walker(
                  { id: binaryen['LoopId'], name: expr.name },
                  item.condition
                ),
                body: new UglifyJS.AST_BlockStatement({
                  body:
                    (blockExpr.children.pop(),
                    walker(
                      [expr, blockExpr],
                      decodedModule.block(
                        '',
                        blockExpr.children,
                        blockExpr.type
                      )
                    ).flat())
                })
              });
              break $label_1;
            }
          } // ~ if ( 0 === item.value )
        } // ~ if ( item )
      }
      {
        const arr = blockExpr.children
          .slice(-2)
          .map(i => binaryen.getExpressionInfo(i));
        if (
          2 === arr.length &&
          arr.every(i => binaryen['BreakId'] === i.id && 0 === i.value)
        ) {
          if (expr.name === arr[0]['name']) {
            if (0 !== arr[0].condition) {
              if (0 === arr[1].condition) {
                resultLoop = new UglifyJS.AST_For({
                  body: new UglifyJS.AST_BlockStatement({
                    body:
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
                  })
                });
                break $label_1;
              }
            }
          }
        } // ~ if ( arr.every( i => binaryen['BreakId'] === i.id ) ) {
      }
      {
        const lastSrc = blockExpr.children[blockExpr.children.length - 1];
        const lastExpr = binaryen.getExpressionInfo(lastSrc);
        if (binaryen['IfId'] === lastExpr.id && 0 === lastExpr.ifFalse) {
          const bodyExpr = binaryen.getExpressionInfo(lastExpr.ifTrue);
          if (binaryen['BlockId'] === bodyExpr.id) {
            const item = getUnlinkedBr(blockExpr.children).find(
              elem =>
                bodyExpr.children.pop() === elem['srcPtr'] &&
                expr.name === elem['name']
            );
            if (item && 0 === item.condition && 0 === item.value) {
              const bodyArray =
                (Array.prototype.splice.apply(
                  blockExpr.children,
                  [-1, 1].concat(bodyExpr.children)
                ),
                walker(
                  [expr, blockExpr],
                  decodedModule.block('', blockExpr.children, blockExpr.type)
                ).flat());

              bodyArray.splice(
                bodyExpr.children.length * -1,
                0,
                new UglifyJS.AST_If({
                  condition: walker(
                    [expr, blockExpr],
                    createEqz(lastExpr.condition)
                  ),
                  body: new UglifyJS.AST_Break({})
                })
              );

              resultLoop = new UglifyJS.AST_For({
                body: new UglifyJS.AST_BlockStatement({ body: bodyArray })
              });
              break $label_1;
            }
          }
        }
      }
    } // $label_1

    if (null === resultLoop) {
      output['warnings']['labeledStatement'] = true;
      resultLoop = new UglifyJS.AST_While({
        condition: new UglifyJS.AST_Number({ value: 1 }),
        body: new UglifyJS.AST_BlockStatement({
          body: walker(
            [expr, blockExpr],
            decodedModule.block('', blockExpr.children, blockExpr.type)
          )
            .flat()
            .concat(new UglifyJS.AST_Break({}))
        })
      });
    }

    // The "nested" property is modified by feeding the "resultLoop" variable.
    if (true === expr['nested']) {
      return new UglifyJS.AST_LabeledStatement({
        label: new UglifyJS.AST_Label({ name: labelValue }),
        body: resultLoop
      });
    }
    return resultLoop;
  };
}
