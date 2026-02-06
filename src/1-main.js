'use strict';

/**
 * @const
 */
Wasm2Lang.Processor = {};

// /**
//  * @private
//  * @return {boolean}
//  */
// Wasm2Lang.Processor.isWorker = function () {
//   return Boolean('function' === typeof importScripts);
// };

// /**
//  * @private
//  * @return {boolean}
//  */
// Wasm2Lang.Processor.isBrowser = function () {
//   return Boolean(!Wasm2Lang.Processor.isWorker() && 'object' === typeof window && window);
// };

/**
 * @private
 * @return {boolean}
 */
Wasm2Lang.Processor.isNode = function () {
  return Boolean(
    'object' === typeof process &&
    process &&
    'object' === typeof process.versions &&
    process.versions &&
    'string' === typeof process.versions.node
  );
};

/**
 * @private
 * @type {?Binaryen}
 */
Wasm2Lang.Processor.binaryen = null;

/**
 * @private
 * @type {?BabelTypes}
 */
Wasm2Lang.Processor.babelTypes = null;

/**
 * @private
 * @type {?BabelGenerator}
 */
Wasm2Lang.Processor.babelGenerator = null;

/**
 * @private
 * @param {!Wasm2Lang.Options.Schema.NormalizedOptions} options
 * @return {void}
 */
Wasm2Lang.Processor.transpile = function (options) {
  console.log(Wasm2Lang.Processor.binaryen);
  console.log(Wasm2Lang.Processor.babelTypes);
  console.log(Wasm2Lang.Processor.babelGenerator);
  console.log(options);
};

/**
 * @private
 * @param {!Binaryen} binaryenModule
 * @param {!BabelTypes} babelTypesModule
 * @param {!BabelGenerator} babelGeneratorModule
 * @return {void}
 */
Wasm2Lang.Processor.initializeModules = function (binaryenModule, babelTypesModule, babelGeneratorModule) {
  Wasm2Lang.Processor.binaryen = binaryenModule;
  Wasm2Lang.Processor.babelTypes = babelTypesModule;
  Wasm2Lang.Processor.babelGenerator = babelGeneratorModule;
};

/**
 * @param {!Binaryen} binaryenModule
 * @param {!BabelTypes} babelTypesModule
 * @param {!BabelGenerator} babelGeneratorModule
 * @return {void}
 */
Wasm2Lang.Processor.runCliEntryPoint = function (binaryenModule, babelTypesModule, babelGeneratorModule) {
  Wasm2Lang.Processor.initializeModules(binaryenModule, babelTypesModule, babelGeneratorModule);

  var params = Wasm2Lang.CLI.CommandLineParser.parseArgv();

  if ('object' === typeof params['--help']) {
    process.stdout.write('Wasm2Lang CLI Help:');

    /** @const {!Array<!Wasm2Lang.Options.Schema.OptionKey>} */
    var props = Object.keys(Wasm2Lang.Options.Schema.optionSchema);

    for (var /** number */ i = 0, /** @const {number} */ len = props.length; i !== len; ++i) {
      var /** @const {!Wasm2Lang.Options.Schema.OptionKey} */ key = props[i];
      var entry = Wasm2Lang.Options.Schema.optionSchema[key];
      var /** @const {string} */ description = entry.optionDesc;
      process.stdout.write(['\n\n--', key.replace(/(?=[A-Z])/g, '-').toLowerCase(), ':\n', description].join(''));
    }

    process.stdout.write('\n');
    return;
  }

  var /** @const {!Wasm2Lang.Options.Schema.NormalizedOptions} */ options = Wasm2Lang.CLI.CommandLineParser.processParams(params);
  Wasm2Lang.Processor.transpile(options);
};

(function () {
  if (Wasm2Lang.Processor.isNode()) {
    if (require.main !== module) {
      module.exports['runCliEntryPoint'] = Wasm2Lang.Processor.runCliEntryPoint;
      return;
    }
  }

  /**
   * @typedef {
   *  {runCliEntryPoint: function(!Binaryen, !BabelTypes, !BabelGenerator): void}
   * }
   */
  var Wasm2LangEntryPoints;

  /**
   * @type {?Wasm2LangEntryPoints}
   */
  var entryPoints = null;

  entryPoints = /** @const {!Wasm2LangEntryPoints} */ (globalThis['Wasm2Lang']);
  
  if (entryPoints) {
    entryPoints['runCliEntryPoint'] = Wasm2Lang.Processor.runCliEntryPoint;
    return;
  }

  entryPoints = {
    'runCliEntryPoint': Wasm2Lang.Processor.runCliEntryPoint
  };

  globalThis['Wasm2Lang'] = entryPoints;
})();

/** @preserve One-line CLI invocation:
 * node -e 'require("./wasm2lang.js").runCliEntryPoint()' - --help
 */
