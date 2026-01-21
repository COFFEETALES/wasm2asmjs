/**
 * @externs
 * @see http://nodejs.org/api/stream.html
 * @see https://github.com/joyent/node/blob/master/lib/stream.js
 */

/**
 *  @interface
 *  @const
 *  @param {!Object=} options
 *  @extends {events.EventEmitter}
 */
var Stream = function (options) {};

/**
 * @param {!WritableStream} dest
 * @param {!{end: boolean}=} pipeOpts
 * @return {!WritableStream}
 */
Stream.prototype.pipe = function (dest, pipeOpts) {};

/**
 * @interface
 * @const
 * @extends {Stream}
 */
var NodeReadableStream = function () {};

/**
 * @interface
 * @const
 * @extends {Stream}
 */
var NodeWritableStream = function () {};

/**
 * @param {string|!Buffer} chunk
 * @param {string=} encoding
 * @param {!function(*=)=} cb
 * @return {!boolean}
 */
NodeWritableStream.prototype.write = function (chunk, encoding, cb) {};

/**
 * @param {string|!Buffer=} buffer
 * @param {string=} encoding
 * @param {!function(*=)=} cb
 * @return {void}
 */
NodeWritableStream.prototype.end = function (buffer, encoding, cb) {};
