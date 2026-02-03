/** @externs */

/**
 * @nosideeffects
 * @param {string} name
 * @return {*}
 */
var require = function (name) {};

/**
 * @const
 * @interface
 */
var NodeModule = function () {};

/** @const {!Object<string, *>} */
NodeModule.prototype.exports;

/** @const {!NodeModule} */
var module;

/** @const {!NodeModule} */
require.main;
