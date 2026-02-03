'use strict';

/** @const */
var Wasm2LangCLI = {};

/** @return {!Object<string, !Array<string>>} */
Wasm2LangCLI.parseArgv = function () {
  var /** @const {number} */ argvCount = process.argv.length;
  var /** @const {!RegExp} */ optionWithValuePattern = /^(--[\w-]+)(?:[=:])(.*?)$/;
  var /** string */ pendingOptionName = '';
  var /** @const {!Object<string, !Array<string>>} */ parsedParams = Object.create(null);

  for (var /** number */ argIndex = 2; argIndex !== argvCount; ++argIndex) {
    var /** @const {string} */ currentArg = process.argv[argIndex];
    if ('--' === currentArg.substring(0, 2)) {
      if (2 === currentArg.length) {
        break;
      }
      pendingOptionName = '';
      var /** @const {?RegExpResult} */ optionMatch = currentArg.match(optionWithValuePattern);
      var /** @const {string} */ optionName = optionMatch ? optionMatch[1] : currentArg;
      if ('object' !== typeof parsedParams[optionName]) {
        parsedParams[optionName] = [];
      }
      if (optionMatch) {
        parsedParams[optionName].push(optionMatch[2]);
        continue;
      }
      pendingOptionName = currentArg;
    } else if ('' !== pendingOptionName) {
      parsedParams[pendingOptionName].push(currentArg);
      pendingOptionName = '';
    } else {
      if ('object' !== typeof parsedParams['--input-data']) {
        parsedParams['--input-data'] = [currentArg];
        continue;
      }
      throw new Error(['Unrecognized argument: ', currentArg, '.'].join(''));
    }
  }
  return parsedParams;
};

/**
 * @param {!Object<string, !Array<string>>} params
 * @return {!Wasm2LangSchema.NormalizedOptions}
 */
Wasm2LangCLI.processParams = function (params) {
  // prettier-ignore
  var /** @const {!Wasm2LangSchema.NormalizedOptions} */ options = /** @const {!Wasm2LangSchema.NormalizedOptions} */ (
    Object.assign({}, Wasm2LangSchema.defaultOptions)
  );

  if ('object' === typeof params['--input-data']) {
    var /** @const {!Array<string>} */ inputDataParm = params['--input-data'];
    if (0 !== inputDataParm.length) {
      options.inputData = inputDataParm.join('\n');
    }
  } else if ('object' === typeof params['--input-file']) {
    var /** @const {!Array<string>} */ inputFileParm = params['--input-file'];
    if (0 !== inputFileParm.length) {
      var /** @const {!NodeFileSystem} */ fs = /** @const {!NodeFileSystem} */ (require('fs'));
      var /** @const {string} */ inputFile = inputFileParm[inputFileParm.length - 1];
      if (/\.(?:wat|wast)$/i.test(inputFile)) {
        options.inputData = fs.readFileSync(inputFile, {encoding: 'utf8'});
      } else {
        options.inputData = fs.readFileSync(inputFile);
      }
    }
  }

  if (!options.inputData) {
    throw new Error('No input data provided. Use --input-data or --input-file to specify input.');
  }

  /** @const {!Array<!Wasm2LangSchema.OptionKey>} */
  var props = Object.keys(Wasm2LangSchema.optionSchema);

  for (var /** number */ i = 0, /** @const {number} */ len = props.length; i !== len; ++i) {
    var /** @const {!Wasm2LangSchema.OptionKey} */ key = props[i];
    var /** @const {string} */ cliKey = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    if ('object' === typeof params[cliKey]) {
      Wasm2LangSchema.optionParsers[key](options, params[cliKey]);
      console.log('Processing CLI option:', cliKey, '(', key, ') ', 'with value:', params[cliKey]);
    }
  }

  return options;
};
