/**
 * @externs
 * @see https://nodejs.org/api/buffer.html
 */

/**
 * @interface
 * @const
 */
var Buffer = function () {};

/**
 * @nosideeffects
 * @param {(string)} init
 * @param {string=} encoding
 * @return {!Buffer}
 */
Buffer.from = function (init, encoding) {};

/**
 * @nosideeffects
 * @param {(number)} size
 * @return {!Buffer}
 */
Buffer.allocUnsafe = function (size) {};

/**
 * @suppress {checkTypes}
 * @nosideeffects
 * @param {string} enc
 * @return {string}
 * @override
 */
Buffer.prototype.toString = function (enc) {};

/**
 * @type {number}
 */
Buffer.prototype.length;
