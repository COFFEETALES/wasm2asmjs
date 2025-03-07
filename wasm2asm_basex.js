// vim: set tabstop=4 shiftwidth=4 softtabstop=4 noexpandtab :
'use strict';

{
  const characterList = 'abcdefghijklmnopqrstuvwxyz'.split('');

  const maxLength = 2;
  const maxValue = Math.pow(characterList.length, 2);
  const numCharacters = characterList.length;

  var BaseXEncode = function (num) {
    const digits = [];

    while (0 < num) {
      let remainder = num % numCharacters;
      digits[digits.length] = remainder;
      num = (num - remainder) / numCharacters;
    }

    const res = digits.reverse().map(item => characterList[item]);

    while (res.length < maxLength) {
      res.splice(0, 0, characterList[0]);
    }

    return res.join('');
  };

  var BaseXDecode = function (str) {
    let result = 0;
    str.split('').forEach(c => {
      const idx = characterList.indexOf(c);
      result = result * numCharacters + idx;
    });
    return result;
  };
}
