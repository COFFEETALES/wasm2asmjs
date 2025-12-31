#/bin/sh
# vim: set tabstop=2 shiftwidth=2 expandtab :

set -e

prefix="${0%'.sh'}"
if [ ${#0} -ne ${#prefix} ]; then
  SH_SOURCE="$(cd "$(dirname "$0")" ; pwd -P)"
  EXPECTED_CWD="$(cd "$SH_SOURCE/../artifacts_tests" && pwd -P)"
  ACTUAL_CWD="$(pwd -P)"

  fn() {
    local file filename filebase

    if [ "$ACTUAL_CWD" != "$EXPECTED_CWD" ]; then
      echo "Error: run from $EXPECTED_CWD (current: $ACTUAL_CWD)" >&2
      return 1
    fi

    echo "Building tests..."
    export NODE_PATH="${SH_SOURCE}/../node_modules"

    rm -f                     \
     ./wasm2lang_*.asm.js     \
     ./wasm2lang_*.harness.js \
     ./wasm2lang_*.wasm       \
     ./wasm2lang_*_runner.js  \
     ./wasm2lang_run_tests.sh

    cp '../tests/wasm2lang_'*'.harness.js' .
    cp '../tests/wasm2lang_wasm_asmjs_runner.js' .
    cp '../scripts/wasm2lang_run_tests.sh' .

    for file in '../tests/wasm2lang_'*'.build.js'; do
      filename="$(basename "$file")"
      filebase="${filename%'.build.js'}"
      #
      # Generate WASM
      node                                        \
        --es-module-specifier-resolution=node     \
        "../tests/$filename"                      \
      |                                           \
      node                                        \
        --es-module-specifier-resolution=node     \
        "../wasm2lang.js"                         \
        --optimize                                \
        --process-wasm                            \
        --emit-wasm                               \
        wast:-                                    \
        1>"${filebase}".wasm
      #
      # Generate WAST
      node                                        \
        --es-module-specifier-resolution=node     \
        "../tests/$filename"                      \
      |                                           \
      node                                        \
        --es-module-specifier-resolution=node     \
        "../wasm2lang.js"                         \
        --optimize                                \
        --process-wasm                            \
        --emit-wast                               \
        wast:-                                    \
        1>"${filebase}".wast
      #
      # Generate ASMJS
      # 65536 * 8 = 524288
      node                                        \
        --es-module-specifier-resolution=node     \
        "../wasm2lang.js"                         \
        --optimize                                \
        --language_out=ASMJS                      \
        -DASMJS_HEAP_SIZE=524288                  \
        --emit-metadata=memBuffer                 \
        --emit-code=module                        \
        "${filebase}".wasm                        \
        1>"${filebase}".asm.js
    done

    echo "Build complete."
    return 0
  }
  fn
fi