coffeetales.net/WASM2LANG
=========================

**Note:** This project was originally named **wasm2asm**, but has been renamed to **wasm2lang** to reflect its updated goal: evolving from a WebAssembly → asm.js converter into a broader WebAssembly → *language* transpilation toolkit (with asm.js as one backend among others).

This tool is primarily intended for internal use. At the moment, the README is not designed to provide extensive explanations. However, we welcome contributions, so please feel free to submit a Pull Request if you have any additions or improvements you would like to share.

Roadmap
-------

**The journey isn't over — wasm2lang still has a bright future ahead!**

Planned improvements (revised):

1. 🔄 **Swap UglifyJS for `@babel/generator`** ✅
   * Use modern Babel-based code generation for asm.js output. ✅
2. 🧹 **Integrate Google Closure Compiler** ⏳
   * Use Closure for advanced compilation, linting, and minification.
   * Modularize the codebase (clear passes: parse → transform → generate) and remove legacy utilities.
   * Add type discipline: JSDoc typedefs compatible with Closure.
3. 🌐 **Backends** ⏳
   * **PHP backend** for experimental wasm→PHP transpilation.
   * **Java backend** added alongside PHP for future multi-target experiments.
4. ⚙️ **GitHub Actions CI** ⏳
   * Run tests on push/PR. ✅
   * Enforce linting and build checks.
   * Produce artifacts for inspection (e.g., generated asm.js, heap dumps). ✅
5. 📦 **Publish CLI to npm** ⏳
   * Provide an installable CLI (`wasm2lang`) with clear command usage.
6. 🧪 **Deterministic test harness (wasm vs asm.js)** ⏳
   * Execute identical workloads via the true WebAssembly binary and the produced asm.js. ✅
   * Compare **HEAP array** contents (and/or slices) to assert bit-for-bit equivalence, enabling near-ISO validation. ✅
   * Include fixtures and golden outputs for regression testing.
7. 🛠 **C → asm.js examples with Makefile builds** ⏳
   * Provide concrete C examples compiled to wasm then to asm.js, with reproducible Makefile targets.
   * Curated examples showcasing CLI usage and the Makefile-based C build pipeline.
   * Include small, focused programs (math kernels, string ops, memory ops) to exercise HEAP behavior.

Browser Compatibility for Optimal Performance
---------------------------------------------

- **Edge (EdgeHTML ≥13)**: Early Microsoft Edge versions (pre-Chromium) could validate asm.js modules, ensuring basic compatibility.
- **Chromium (≥61)**: The Chromium engine (including Chrome) added an asm.js validator starting at version 61, which allows correct execution of generated asm.js.
- **Firefox (≥34)**: Mozilla Firefox introduced full asm.js support earlier, including 32-bit floating-point operations from version 34 onward.

⚠️ Note: asm.js is primarily of historical/legacy interest today. This project focuses on toolchains and transpilation pipelines, not on end-user browser performance.

Usage
-----

``` bash
$> npm install
```

### Sample wasm input

``` wat
(module
  (export "fib" (func $fib))

  ;; Semantics: if n < 2 then 1 else iterate up to n (inclusive)
  (func $fib (param $n i32) (result i32)
    (local $a i32)
    (local $b i32)
    (local $i i32)

    (if
      (i32.lt_s (local.get $n) (i32.const 2))
      (then
        (return (i32.const 1))
      )
    )

    (local.set $a (i32.const 1))
    (local.set $b (i32.const 1))
    (local.set $i (i32.const 2))

    (block $exit
      (loop $loop
        (br_if $exit
          (i32.gt_s (local.get $i) (local.get $n))
        )

        ;; b = a + b; a = old b
        (local.set $b (i32.add (local.get $a) (local.get $b)))
        (local.set $a (i32.sub (local.get $b) (local.get $a)))

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $loop)
      )
    )

    (local.get $b)
  )
)
```

``` bash
$> node wasm2lang.js              \
 --optimize                       \
 --process-wasm                   \
 --language_out=ASMJS             \
 -DASMJS_HEAP_SIZE=$((65536 * 8)) \
 --emit-metadata=memBuf           \
 --emit-code=asmjsModule          \
 wast:sample.wast
```

### Generated javascript

``` javascript
var memBuf = new ArrayBuffer(524288);
var i32_array = new Int32Array(memBuf);
i32_array.set([0], 0);

var asmjsModule = function (stdlib, foreign, buffer) {
  "use asm";
  function $fib($fib_aa) {
    $fib_aa = $fib_aa | 0;
    var $fib_ab = 0,
      $fib_ac = 0,
      $fib_ad = 0;
    if (($fib_aa | 0) < 2) {
      return 1;
    }
    $fib_ac = 1;
    $fib_ab = 1;
    $fib_ad = 2;
    while (($fib_aa | 0) >= ($fib_ad | 0)) {
      $fib_ab = $fib_ac + $fib_ab | 0;
      $fib_ac = $fib_ab - $fib_ac | 0;
      $fib_ad = $fib_ad + 1 | 0;
    }
    return $fib_ab | 0;
  }
  return {
    fib: $fib
  };
};
```

Credits
-------

[Babel](https://babeljs.io)
[Binaryen](https://github.com/WebAssembly/binaryen)
[UglifyJS](https://github.com/mishoo/UglifyJS)
[Coffeetales](https://coffeetales.net)
