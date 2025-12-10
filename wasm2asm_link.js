'use strict';

{
  const resFunc = babelTypes.functionExpression(
    null,
    [
      babelTypes.identifier('stdlib'),
      babelTypes.identifier('foreign'),
      babelTypes.identifier('buffer')
    ],
    babelTypes.blockStatement(
      [babelTypes.expressionStatement(babelTypes.stringLiteral('use asm'))]
        .concat(
          (function () {
            var declarations = [].concat(
              processAsmJsHeader(),
              processAsmJsImports(),
              processAsmJsGlobals()
            );

            if (0 !== declarations.length) {
              return babelTypes.variableDeclaration('var', declarations);
            }
          })(),
          asmJsFuncList,
          processAsmJsFTable(),
          asmJsReturn
        )
        .filter(i => i !== undefined)
    )
  );

  var topLevel = babelTypes.file(
    babelTypes.program([
      babelTypes.variableDeclaration('var', [
        babelTypes.variableDeclarator(
          babelTypes.identifier(
            typeof output['js'] === 'string' ? output['js'] : 'asmjs_func'
          ),
          resFunc
        )
      ])
    ])
  );
}

finalizeJs(topLevel, 'asm.js');
