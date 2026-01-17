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
  return (
    'object' === typeof process &&
    'object' === typeof process.versions &&
    'string' === typeof process.versions.node
  );
};

/**
 * @return {void}
 */
Wasm2Lang.runCliEntryPoint = function () {
  CLI.parseArgv();
  console.log(CLI.parsedOptions);
};


(function () {
  if (Wasm2Lang.isNode()) {
    if (require.main !== module) {
      console.log('AAA');
      module.exports['runCliEntryPoint'] =
        Wasm2Lang.runCliEntryPoint;
      return;
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
})();