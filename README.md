coffeetales.net/WASM2ASMJS
==========================

Tool used internally. Right now, the README doesn't mean to be full of detailed explanations. Feel free to submit a Pull Request for any additions you want to share.

### Browsers compatibility in order to achieve best performances

- `EdgeHTML` : since version 13
- `Chromium` : full-featured ASM.JS validator shipped in version 61
- `Firefox` : 32 bits float support added in version 34

Usage
-----

``` bash
$> npm install binaryen
# ^ wasm parser and optimizer
$> npm install uglify-js
# ^ used for javascript generation
```

### Sample wasm input

``` wast
(module
 (type $none_=>_none (func))
 (import "module" "testFuncExternal" (func $testFuncInternal))
 (memory $0 1 1)
 (data (i32.const 0) "0\00\00\00@\00\00\00P\00\00\00`\01\00\00")
 (data (i32.const 48) "hello, world.\00")
 (data (i32.const 64) "segment data 2\00")
 (data (i32.const 80) "segment data 3\00")
 (data (i32.const 352) "X\00")
 (export "export_vFetchData" (func $vFetchData))
 (func $vFetchData
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (loop $loop1
   (block $block1
    (local.set $1
     (i32.load
      (i32.mul
       (local.get $0)
       (i32.const 4)
      )
     )
    )
    (local.set $0
     (i32.add
      (i32.const 1)
      (local.get $0)
     )
    )
    (local.set $2
     (i32.const 0)
    )
    (loop $loop2
     (block $block2
      (local.set $3
       (i32.load8_u
        (local.get $1)
       )
      )
      (local.set $1
       (i32.add
        (i32.const 1)
        (local.get $1)
       )
      )
      (i32.store8
       (i32.add
        (i32.const 512)
        (local.get $2)
       )
       (local.get $3)
      )
      (local.set $2
       (i32.add
        (i32.const 1)
        (local.get $2)
       )
      )
      (if
       (i32.eq
        (local.get $3)
        (i32.const 88)
       )
       (br $block1)
      )
      (if
       (i32.eqz
        (local.get $3)
       )
       (block
        (call $testFuncInternal)
        (br $loop1)
       )
      )
      (br $loop2)
     )
    )
    (br_if $loop1
     (i32.lt_s
      (local.get $0)
      (i32.const 4)
     )
    )
   )
  )
  (return)
 )
)
```

``` bash
$> node wasm2asm.js --emit-metadata --emit-js -DASMJS_BEAUTIFY -DNDEBUG wast:sample.wast
```

### Generated javascript

``` javascript
var asmjs_memory = new ArrayBuffer(65536);

var i32_array = new Int32Array(asmjs_memory);

i32_array.set([ 48, 64, 80, 352, 0, 0, 0, 0, 0, 0, 0, 0, 1819043176, 1998597231, 1684828783, 46, 1835492723, 544501349, 1635017060, 12832, 1835492723, 544501349, 1635017060, 13088 ], 0);

i32_array.set([ 88 ], 88);
var asmjs_func = function(stdlib, foreign, buffer) {
    'use asm';
    var $imul = stdlib.Math.imul, $i8 = new stdlib.Int8Array(buffer), $u8 = new stdlib.Uint8Array(buffer), $i32 = new stdlib.Int32Array(buffer), $if_aa = foreign.testFuncExternal;
    function $vFetchData() {
        var $vFetchData_aa = 0, $vFetchData_ab = 0, $vFetchData_ac = 0, $vFetchData_ad = 0;
        $label_aa: do {
            $vFetchData_ab = $i32[$imul($vFetchData_aa, 4) >> 2] | 0;
            $vFetchData_aa = 1 + $vFetchData_aa | 0;
            $vFetchData_ac = 0;
            for (;;) {
                $vFetchData_ad = $u8[$vFetchData_ab] | 0;
                $vFetchData_ab = 1 + $vFetchData_ab | 0;
                $i8[512 + $vFetchData_ac | 0] = $vFetchData_ad;
                $vFetchData_ac = 1 + $vFetchData_ac | 0;
                if (($vFetchData_ad | 0) == 88) {
                    break $label_aa;
                }
                if (!$vFetchData_ad) {
                    $if_aa();
                    continue $label_aa;
                }
            }
        } while (($vFetchData_aa | 0) < 4);
    }
    return {
        export_vFetchData: $vFetchData
    };
};
```

Credits
-------

[Binaryen](https://github.com/WebAssembly/binaryen)
[UglifyJS](https://github.com/mishoo/UglifyJS)
[Coffeetales](https://coffeetales.net)

