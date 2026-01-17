/** @externs */

/**
 * @interface
 * @const
 */
var NodeProcess = function() {};

/** @const {!Array<string>} */
NodeProcess.prototype.argv;

/**
 * @nosideeffects
 * @return {string}
 */
NodeProcess.prototype.cwd = function() {};

/** @const {!Object<string, string>} */
NodeProcess.prototype.env;

/** @type {{node: *}} */
NodeProcess.prototype.versions;

/** @const {!NodeProcess} */
var process;