'use strict';

const assert = require('assert');
const path = require('path');
const fs = require('fs');

//const binaryen = require('binaryen');//require(path.join(__dirname, 'binaryen.js'));
const UglifyJS = require('uglify-js'); //require(path.join(path.dirname(process.execPath), 'node_modules', 'uglify-js'));

const defs = {};

const output = {
  'process': false,
  'wast': false,
  'js': false,
  'metadata': false,
  'optimize_for_js':
    //undefined !== process.env['optimize_for_js'] ? Boolean(process.env['optimize_for_js']) : true
    '1' === process.env['ASMJS_OPTIMIZE_FOR_JS'],
  'warnings': {
    'labeledStatement': false
  }
};

const argv = process.argv.slice(2).filter(str => {
  if ('--' === str.slice(0, 2)) {
    if ('--process-wasm' === str.toLowerCase()) output['process'] = true;
    if ('--emit-wast' === str.toLowerCase()) output['wast'] = true;

    const ProcessParameter = function (paramName) {
      if (str.slice(0, paramName.length).toLowerCase() === paramName) {
        if (
          '=' === str.charAt(paramName.length) ||
          ':' === str.charAt(paramName.length)
        ) {
          const res = str.slice(paramName.length + 1);
          assert.strictEqual(
            false,
            /[^a-zA-Z0-9\.\_]/.test(res),
            [paramName, ' invalid parameter.'].join('')
          );
          return res;
        }
        return true;
      }
      return false;
    };

    output['js'] = output['js'] || ProcessParameter('--emit-js');
    output['metadata'] =
      output['metadata'] || ProcessParameter('--emit-metadata');
    return false;
  }
  if ('-D' === str.slice(0, 2)) {
    const arr = str.slice(2).split('=', 2);
    const name = arr[0];
    const value = arr.length === 2 ? arr[1] : null;
    defs[name] = value;
    return false;
  }
  return true;
});

if (
  true === output['wast'] &&
  (false !== output['js'] || false !== output['metadata'])
)
  throw '';

const expressionList = {};
{
  const b = binaryen;
  expressionList[b['BlockId']] = {keyName: 'BlockId'};
  expressionList[b['IfId']] = {keyName: 'IfId'};
  expressionList[b['LocalSetId']] = {keyName: 'LocalSetId'};
  expressionList[b['GlobalSetId']] = {keyName: 'GlobalSetId'};
  expressionList[b['LocalGetId']] = {keyName: 'LocalGetId'};
  expressionList[b['GlobalGetId']] = {keyName: 'GlobalGetId'};
  expressionList[b['ConstId']] = {keyName: 'ConstId'};
  expressionList[b['BinaryId']] = {keyName: 'BinaryId'};
  expressionList[b['NopId']] = {keyName: 'NopId'};
  expressionList[b['CallId']] = {keyName: 'CallId'};
  expressionList[b['CallIndirectId']] = {keyName: 'CallIndirectId'};
  expressionList[b['LoadId']] = {keyName: 'LoadId'};
  expressionList[b['StoreId']] = {keyName: 'StoreId'};
  expressionList[b['UnaryId']] = {keyName: 'UnaryId'};
  expressionList[b['ReturnId']] = {keyName: 'ReturnId'};
  expressionList[b['DropId']] = {keyName: 'DropId'};
  expressionList[b['LoopId']] = {keyName: 'LoopId'};
  expressionList[b['BreakId']] = {keyName: 'BreakId'};
  expressionList[b['SelectId']] = {keyName: 'SelectId'};
  expressionList[b['SwitchId']] = {keyName: 'SwitchId'};
}
