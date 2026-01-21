'use strict';

/** @const */
var CLI = {};

/** @const {!Object<string, boolean|string>} */
CLI.parsedOptions = {};

/** @return {!Object<string, boolean|string>} */
CLI.parseArgv = function () {
  var /** number */ argvCount = process.argv.length;
  var /** !RegExp */ optionWithValuePattern = /^(--[\w-]+)(?:[=:])(.*?)$/;
  var /** string */ pendingOptionName = '';
  for (var /** number */ argIndex = 2; argIndex !== argvCount; ++argIndex) {
    var /** string */ currentArg = process.argv[argIndex];
    if ('--' === currentArg.substring(0, 2)) {
      if (2 === currentArg.length) {
        break;
      }
      pendingOptionName = '';
      var /** ?RegExpResult */ optionMatch = currentArg.match(
          optionWithValuePattern
        );
      if (optionMatch) {
        CLI.parsedOptions[optionMatch[1]] = optionMatch[2];
        continue;
      }
      CLI.parsedOptions[currentArg] = true;
      pendingOptionName = currentArg;
    } else if ('' !== pendingOptionName) {
      CLI.parsedOptions[pendingOptionName] = currentArg;
      pendingOptionName = '';
    } else {
      throw new Error(['unrecognized argument: ', currentArg].join(''));
    }
  }
  return CLI.parsedOptions;
};
