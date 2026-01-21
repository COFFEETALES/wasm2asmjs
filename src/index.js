'use strict';

/**
 * @namespace
 */
var Wasm2Lang = {};

/** @return {boolean} */
Wasm2Lang.isWorker = function () {
  return 'function' === typeof importScripts;
};

/** @return {boolean} */
Wasm2Lang.isBrowser = function () {
  return !Wasm2Lang.isWorker() && 'object' === typeof window;
};

/** @return {boolean} */
Wasm2Lang.isNode = function () {
  return 'object' === typeof process && 'object' === typeof process.versions && 'string' === typeof process.versions.node;
};

/**
 * @return {void}
 */
Wasm2Lang.runCliEntryPoint = function () {
  var params = CLI.parseArgv();

  if (params['--help']) {
    process.stdout.write('Wasm2Lang CLI Help:');

    /** @const {!Array<string>} */
    var props = Object.getOwnPropertyNames(Options.Schema.OPTION_SCHEMA);

    for (var /** number */ i = 0, /** number */ len = props.length; i < len; ++i) {
      var /** !Options.Schema.OptionKeys */ key = /** @type {!Options.Schema.OptionKeys} */ (props[i]);
      var entry = Options.Schema.OPTION_SCHEMA[key];
      var /** string */ description = '';
      if ('string' === typeof entry.optionDesc) {
        description = /** @type {string} */ (entry.optionDesc);
      }
      process.stdout.write(['\n\n--', key.replace(/([A-Z])/g, '-$1').toLowerCase(), ':\n', description].join(''));
    }
    process.stdout.write('\n');
    return;
  }
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
