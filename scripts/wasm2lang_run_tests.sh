#/bin/sh
# vim: set tabstop=2 shiftwidth=2 expandtab :

set +e

prefix="${0%'.sh'}"
if [ ${#0} -ne ${#prefix} ]; then
  SH_SOURCE="$(cd "$(dirname "$0")" ; pwd -P)"
  EXPECTED_CWD="$(cd "$SH_SOURCE/../artifacts_tests" && pwd -P)"
  ACTUAL_CWD="$(pwd -P)"

  fn() {
    local dirbase directory dirname filebase retcode tmpretcode

    retcode=0

    if [ "$ACTUAL_CWD" != "$EXPECTED_CWD" ]; then
      echo "Error: run from $EXPECTED_CWD (current: $ACTUAL_CWD)" >&2
      return 1
    fi

    echo "Running tests..."

    for directory in './wasm2lang_'*'/'; do
      tmpretcode=0
      dirname="$(basename "$directory")"
      filebase="${dirname}"'/'"${dirname}"
      echo "----------------------------------------"
      echo -e "\033[0;33mRunning test: $dirname\033[0m"
      #
      echo "Running V8 WASM test..."
      cat "${filebase}".wasm                  \
      |                                       \
      node                                    \
        "./wasm2lang_wasm_asmjs_runner.js"    \
        --test-name="$filebase"               \
        --wasm=1                              \
      |                                       \
      tee "${filebase}".v8.wasm.out
      #
      echo "Running V8 ASMJS test..."
      cat "${filebase}".asm.js                \
      |                                       \
      node                                    \
        --trace-warnings                      \
        "./wasm2lang_wasm_asmjs_runner.js"    \
        --test-name="$filebase"               \
        --asmjs=1                             \
        2>&1                                  \
      |                                       \
      tee "${filebase}".v8.asmjs.out
      #
      if [ -x "${SPIDERMONKEY_JS}" ]; then
        echo "Running SpiderMonkey ASMJS test..."
        cat "${filebase}".asm.js                \
        |                                       \
        "${SPIDERMONKEY_JS}"                    \
          --warnings                            \
          "./wasm2lang_wasm_asmjs_runner.js"    \
          --test-name="$filebase"               \
          --asmjs=1                             \
        |                                       \
        tee "${filebase}".sm.asmjs.out
        [ $? -eq 0 ] || tmpretcode=1
        echo $tmpretcode
        dos2unix "${filebase}".sm.asmjs.out
      fi
      #
      diff -qs                                \
        "${filebase}".v8.wasm.out             \
        "${filebase}".v8.asmjs.out
      [ $? -eq 0 ] || tmpretcode=1
      if [ -s "${filebase}".v8.asmjs.stderr ]; then
        tmpretcode=1
      fi
      if [ -x "${SPIDERMONKEY_JS}" ]; then
        diff -qs                                \
          "${filebase}".v8.wasm.out             \
          "${filebase}".sm.asmjs.out
        [ $? -eq 0 ] || tmpretcode=1
      fi
      if [ 1 -eq $tmpretcode ]; then
        echo -e "Test $dirname: \033[0;31mFAILED\033[0m"
      else
        echo -e "Test $dirname: \033[0;32mPASSED\033[0m"
      fi
      retcode=$((retcode | tmpretcode))
      #
    done

    echo "----------------------------------------"
    if [ $retcode -ne 0 ]; then
      echo -e "Some tests: \033[0;31mFAILED\033[0m"
    else
      echo -e "All tests: \033[0;32mPASSED\033[0m"
    fi
    return $retcode
  }
  fn
  exit $?
fi