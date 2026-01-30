'use strict';

/** @const */
var Wasm2Lang = {};

/** @return {boolean} */
Wasm2Lang.isWorker = function () {
  return Boolean('function' === typeof importScripts);
};

/** @return {boolean} */
Wasm2Lang.isBrowser = function () {
  return Boolean(!Wasm2Lang.isWorker() && 'object' === typeof window && window);
};

/** @return {boolean} */
Wasm2Lang.isNode = function () {
  return Boolean(
    'object' === typeof process &&
    process &&
    'object' === typeof process.versions &&
    process.versions &&
    'string' === typeof process.versions.node
  );
};

/** @return {void} */
Wasm2Lang.runCliEntryPoint = function () {
  var params = Wasm2LangCLI.parseArgv();

  if ('string' === typeof params['--help']) {
    process.stdout.write('Wasm2Lang CLI Help:');

    /** @const {!Array<!Wasm2LangSchema.OptionKey>} */
    var props = Object.keys(Wasm2LangSchema.optionSchema);

    for (var /** number */ i = 0, /** number */ len = props.length; i < len; ++i) {
      var /** !Wasm2LangSchema.OptionKey */ key = props[i];
      var entry = Wasm2LangSchema.optionSchema[key];
      var /** string */ description = '';
      if ('string' === typeof entry.optionDesc) {
        description = /** @type {string} */ (entry.optionDesc);
      }
      process.stdout.write(['\n\n--', key.replace(/(?=[A-Z])/g, '-').toLowerCase(), ':\n', description].join(''));
    }

    process.stdout.write('\n');
    return;
  }

  var /** !Wasm2LangSchema.NormalizedOptions */ options = Wasm2LangCLI.processParams(params);
  console.log('Wasm2Lang options:', options);
};

main: {
  if (Wasm2Lang.isNode()) {
    if (require.main !== module) {
      module.exports['runCliEntryPoint'] = Wasm2Lang.runCliEntryPoint;
      break main;
    }
  }

  /**
   * @const {
   *  {"runCliEntryPoint": function():void}
   * }
   */
  var entryPoints = {
    'runCliEntryPoint': Wasm2Lang.runCliEntryPoint
  };

  globalThis['Wasm2Lang'] = entryPoints;
}

/** @preserve One-line CLI invocation:
 * node -e 'require("./wasm2lang.js").runCliEntryPoint()' - --help
 */
