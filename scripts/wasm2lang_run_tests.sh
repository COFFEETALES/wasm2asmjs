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

    echo "Running tests..."

    for file in './wasm2lang_'*'.wasm'; do
      filename="$(basename "$file")"
      filebase="${filename%'.wasm'}"
      echo "Running test: $filebase"

      echo "----------------------------------------"

      echo "Running WASM test..."
      cat "${filebase}".wasm                  \
      |                                       \
      node                                    \
        --es-module-specifier-resolution=node \
        "./wasm2lang_wasm_asmjs_runner.js"    \
        --test-name "$filebase"               \
        --wasm                                \
        1>"${filebase}".wasm.out
      echo '' 1>&2

      echo "----------------------------------------"

      echo "Running ASMJS test..."
      cat "${filebase}".asm.js                \
      |                                       \
      node                                    \
        --es-module-specifier-resolution=node \
        "./wasm2lang_wasm_asmjs_runner.js"    \
        --test-name "$filebase"               \
        --asmjs                               \
        1>"${filebase}".asmjs.out
      echo '' 1>&2

      #echo '1' 1>>"${filebase}".asmjs.out

      diff -s                                 \
        "${filebase}".wasm.out                \
        "${filebase}".asmjs.out
    done

    echo "All tests completed."
    return 0
  }
  fn
fi