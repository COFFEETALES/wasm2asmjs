#/bin/sh
# vim: set tabstop=2 shiftwidth=2 expandtab :

set -e

prefix="${0%'.sh'}"
if [ ${#0} -ne ${#prefix} ]; then
  SH_SOURCE="$(cd "$(dirname "$0")" ; pwd -P)"
  EXPECTED_CWD="$(cd "$SH_SOURCE/../artifacts_tests" && pwd -P)"
  ACTUAL_CWD="$(pwd -P)"

  fn() {
    local directory dirname dirbase filebase

    if [ "$ACTUAL_CWD" != "$EXPECTED_CWD" ]; then
      echo "Error: run from $EXPECTED_CWD (current: $ACTUAL_CWD)" >&2
      return 1
    fi

    echo "Running tests..."

    for directory in './wasm2lang_'*'/'; do
      dirname="$(basename "$directory")"
      filebase="${dirname}"'/'"${dirname}"
      echo "Running test: $dirname"

      echo "----------------------------------------"

      set +e
      echo "Running WASM test..."
      cat "${filebase}".wasm                  \
      |                                       \
      node                                    \
        "./wasm2lang_v8_wasm_asmjs_runner.js" \
        --test-name="$filebase"               \
        --wasm=1                              \
        2>&1                                  \
      |                                       \
      tee "${filebase}".v8.wasm.stdout

      echo "----------------------------------------"

      echo "Running ASMJS test..."
      cat "${filebase}".asm.js                \
      |                                       \
      node                                    \
        --trace-warnings                      \
        "./wasm2lang_v8_wasm_asmjs_runner.js" \
        --test-name="$filebase"               \
        --asmjs=1                             \
        2>&1                                  \
      |                                       \
      tee "${filebase}".v8.asmjs.stdout
      set -e

      #echo '1' 1>>"${filebase}".asmjs.out
      echo "----------------------------------------"

      diff -qs                                \
        "${filebase}".v8.wasm.stdout          \
        "${filebase}".v8.asmjs.stdout
      if [ -f "${filebase}".v8.wasm.memory ]; then
        diff -qs                              \
          "${filebase}".v8.wasm.memory        \
          "${filebase}".v8.asmjs.memory
      fi
    done

    echo "All tests completed."
    return 0
  }
  fn
fi