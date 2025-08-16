coffeetales.net/WASM2ASMJS
==========================

This tool is primarily intended for internal use. At the moment, the README is not designed to provide extensive explanations. However, we welcome contributions, so please feel free to submit a Pull Request if you have any additions or improvements you would like to share.

Roadmap
-------

**The journey isn't over — wasm2asmjs still has a bright future ahead!**

Planned improvements (revised):

1. 🔄 **Swap UglifyJS for `@babel/generator`**
   * Use modern Babel-based code generation for asm.js output.
2. 🧠 **Shift optimization passes to the Babel AST**
   * Port current Binaryen-side optimizations into Babel transforms so we can optimize directly on the asm.js AST.
3. 🧹 **Integrate Google Closure Compiler**
   * Use Closure for advanced compilation, linting, and minification of the generated asm.js.
4. 🌐 **Backends**
   * **PHP backend** for experimental wasm→PHP transpilation.
   * **Java backend** added alongside PHP for future multi-target experiments.
5. ⚙️ **GitHub Actions CI**
   * Run tests on push/PR.
   * Enforce linting and build checks.
   * Produce artifacts for inspection (e.g., generated asm.js, heap dumps).
6. 📦 **Publish CLI to npm**
   * Provide an installable CLI (`wasm2asmjs`) with clear command usage.
7. 🧪 **Deterministic test harness (wasm vs asm.js)**
   * Execute identical workloads via the true WebAssembly binary and the produced asm.js.
   * Compare **HEAP array** contents (and/or slices) to assert bit-for-bit equivalence, enabling near-ISO validation.
   * Include fixtures and golden outputs for regression testing.
8. 🛠 **C→asm.js examples with Makefile builds**
   * Provide concrete C examples compiled to wasm then to asm.js, with reproducible Makefile targets.
   * Include small, focused programs (math kernels, string ops, memory ops) to exercise HEAP behavior.
9. 🧰 **Examples: `.wasm → .asm.js` demos**
   * Curated examples (no browser demo) showcasing CLI usage and the Makefile-based C build pipeline.

Browser Compatibility for Optimal Performance
---------------------------------------------

- **Edge (EdgeHTML ≥13)**: Early Microsoft Edge versions (pre-Chromium) could validate asm.js modules, ensuring basic compatibility.
- **Chromium (≥61)**: The Chromium engine (including Chrome) added an asm.js validator starting at version 61, which allows correct execution of generated asm.js.
- **Firefox (≥34)**: Mozilla Firefox introduced full asm.js support earlier, including 32-bit floating-point operations from version 34 onward.

⚠️ Note: asm.js is primarily of historical/legacy interest today. This project focuses on toolchains and transpilation pipelines, not on end-user browser performance.

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
Run tests
---------

```
cd /coffee/dev/wasm2asm
for file in 'tests/wasm2asmjs_'*'.js'; do
  filename="$(basename "$file")"
  NODE_PATH='/coffeetales.net/node_modules' node \
    './wasm2asm.js'                              \
    --validate-asm                               \
    --trace-asm-parser                           \
    --emit-metadata                              \
    --emit-js                                    \
    -DASMJS_BEAUTIFY                             \
    -DNDEBUG                                     \
    "test:$filename"
done
```

Credits
-------

[Binaryen](https://github.com/WebAssembly/binaryen)
[UglifyJS](https://github.com/mishoo/UglifyJS)
[Coffeetales](https://coffeetales.net)
