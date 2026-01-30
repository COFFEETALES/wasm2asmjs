'use strict';

/** @const */
var Wasm2LangCLI = {};

/** @return {!Object<string, !Array<string>>} */
Wasm2LangCLI.parseArgv = function () {
  var /** number */ argvCount = process.argv.length;
  var /** !RegExp */ optionWithValuePattern = /^(--[\w-]+)(?:[=:])(.*?)$/;
  var /** string */ pendingOptionName = '';
  var /** !Object<string, !Array<string>> */ parsedParams = Object.create(null);

  for (var /** number */ argIndex = 2; argIndex !== argvCount; ++argIndex) {
    var /** string */ currentArg = process.argv[argIndex];
    if ('--' === currentArg.substring(0, 2)) {
      if (2 === currentArg.length) {
        break;
      }
      pendingOptionName = '';
      var /** ?RegExpResult */ optionMatch = currentArg.match(optionWithValuePattern);
      var /** string */ optionName = optionMatch ? optionMatch[1] : currentArg;
      if ('undefined' === typeof parsedParams[optionName]) {
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
      throw new Error(['unrecognized argument: ', currentArg].join(''));
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
  var /** !Wasm2LangSchema.NormalizedOptions */ options = /** @type {!Wasm2LangSchema.NormalizedOptions} */ (
    Object.assign({}, Wasm2LangSchema.defaultOptions)
  );

  /** @const {!Array<!Wasm2LangSchema.OptionKey>} */
  var props = Object.keys(Wasm2LangSchema.optionSchema);

  for (var /** number */ i = 0, /** number */ len = props.length; i !== len; ++i) {
    var /** !Wasm2LangSchema.OptionKey */ key = props[i];
    var /** string */ cliKey = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
    if ('object' === typeof params[cliKey]) {
      Wasm2LangSchema.optionParsers[key](options, params[cliKey]);
      console.log('Processing CLI option:', cliKey, '(', key, ') ', 'with value:', params[cliKey]);
    }
  }

  return options;
};
