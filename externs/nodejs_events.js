/**
 * @externs
 * @see http://nodejs.org/api/events.html
 * @see https://github.com/joyent/node/blob/master/lib/events.js
 */

/**
 * @const
 */
var events = {};

/**
 * @interface
 * @const
 */
events.EventEmitter = function () {};

/**
 * @param {string} eventName
 * @param {!function(...)} listener
 * @return {!events.EventEmitter}
 */
events.EventEmitter.prototype.on = function (eventName, listener) {};
