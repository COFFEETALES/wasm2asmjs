/**
 * @externs
 */

/**
 * @interface
 * @const
 */
var Binaryen = function () {};

/**
 * @param {string} text
 * @return {!BinaryenModule}
 */
Binaryen.prototype.parseText = function (text) {};

/**
 * @param {!Uint8Array} data
 * @return {!BinaryenModule}
 */
Binaryen.prototype.readBinary = function (data) {};

/**
 * @param {number} level
 * @return {void}
 */
Binaryen.prototype.setOptimizeLevel = function (level) {};

/**
 * @param {number} level
 * @return {void}
 */
Binaryen.prototype.setShrinkLevel = function (level) {};

/**
 * @return {number}
 */
Binaryen.prototype.getOptimizeLevel = function () {};

/**
 * @return {number}
 */
Binaryen.prototype.getShrinkLevel = function () {};

/**
 * @param {number} funcPtr
 * @return {!BinaryenFunctionInfo}
 */
Binaryen.prototype.getFunctionInfo = function (funcPtr) {};

/**
 * @interface
 * @const
 */
var BinaryenModule = function () {};

/**
 * @param {!Array<string>} passList
 * @return {void}
 */
BinaryenModule.prototype.runPasses = function (passList) {};

/**
 * @param {string} name
 * @param {!Array<string>} passList
 * @return {void}
 */
BinaryenModule.prototype.runPassesOnFunction = function (name, passList) {};

/**
 * @return {void}
 */
BinaryenModule.prototype.optimize = function () {};

/**
 * @return {number}
 */
BinaryenModule.prototype.getNumFunctions = function () {};

/**
 * @param {number} index
 * @return {number}
 */
BinaryenModule.prototype.getFunctionByIndex = function (index) {};

/**
 * @return {string}
 */
BinaryenModule.prototype.emitText = function () {};

/**
 * @return {!BinaryenBinary}
 */
BinaryenModule.prototype.emitBinary = function () {};

/**
 * @typedef {{buffer: !ArrayBuffer}}
 */
var BinaryenBinary;

/**
 * @typedef {{name: string, base: string}}
 */
var BinaryenFunctionInfo;
