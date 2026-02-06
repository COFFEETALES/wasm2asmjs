'use strict';

(async function () {
  var path = await import('path');
  var fs = await import('fs');

  var moduleSpecs = [
    {'sourcePath': 'src/0-header.js', 'exportName': 'Wasm2Lang'},
    {'sourcePath': 'src/cli/command_line_parser.js'},
    {'sourcePath': 'src/options/schema.js'},
    {'sourcePath': 'src/1-main.js'}
  ];
  for (var i = 0, specCount = moduleSpecs.length; i !== specCount; ++i) {
    const code = fs.readFileSync(
      path.resolve(__dirname, moduleSpecs[i]['sourcePath']),
      {
        encoding: 'utf-8'
      }
    );
    if (moduleSpecs[i]['exportName']) {
      globalThis[moduleSpecs[i]['exportName']] = eval(
        [code, moduleSpecs[i]['exportName']].join('\n')
      );
    } else {
      eval(code);
    }
  }

  var url = await import('url');

  var binaryen = (
    await import(
      url.pathToFileURL(
        path.join(
          process.env.NODE_PATH || path.join(process.cwd(), 'node_modules'),
          'binaryen',
          'index.js'
        )
      )['href']
    )
  ).default;

  var babelTypes = await import('@babel/types');
  var babelGenerator = await import('@babel/generator');

  Wasm2Lang.runCliEntryPoint(binaryen, babelTypes, babelGenerator);
})();
