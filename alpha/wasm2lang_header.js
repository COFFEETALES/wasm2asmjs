'use strict';

const defs = {};

const output = {
  'code': false,
  'metadata': false,
  'simplify': ['1', 'on', 'true'].includes(
    (process.env['WASM2LANG_SIMPLIFY_OUTPUT'] || '').toLowerCase()
  ),
  'normalize': (
    (process.env['WASM2LANG_NORMALIZE_WASM'] || 0)
  ),
  'warnings': {
    'labeledStatement': false
  },
  'wasm': false,
  'wast': false
};

const argv = process.argv.slice(2).filter(str => {
  if ('--' === str.slice(0, 2)) {
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

    output['code'] = output['code'] || ProcessParameter('--emit-code');
    output['metadata'] =
      output['metadata'] || ProcessParameter('--emit-metadata');
    output['simplify'] =
      output['simplify'] || ProcessParameter('--simplify-output');
    output['normalize'] = Number(
      output['normalize'] || ProcessParameter('--normalize-wasm')
    );
    output['wasm'] = Boolean(output['wasm'] || ProcessParameter('--emit-wasm'));
    output['wast'] = Boolean(output['wast'] || ProcessParameter('--emit-wast'));

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
  [output['wast'], output['wasm']].includes(true) &&
  (false !== !!output['code'] || false !== !!output['metadata'])
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
