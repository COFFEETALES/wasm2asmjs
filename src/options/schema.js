'use strict';

/** @const */
var Wasm2LangSchema = {};

/**
 * @enum {string}
 */
Wasm2LangSchema.OptionKey = {
  LANGUAGE_OUT: 'languageOut',
  NORMALIZE_WASM: 'normalizeWasm',
  SIMPLIFY_OUTPUT: 'simplifyOutput',
  DEFINE: 'define',
  INPUT_DATA: 'inputData',
  INPUT_FILE: 'inputFile',
  EMIT_METADATA: 'emitMetadata',
  EMIT_CODE: 'emitCode',
  EMIT_WEBASSEMBLY: 'emitWebAssembly'
};

/**
 * @typedef {{
 *   languageOut: string,
 *   normalizeWasm: !Array<string>,
 *   simplifyOutput: boolean,
 *   definitions: !Object<string, string>,
 *   inputData: (string|!Uint8Array|null),
 *   inputFile: (string|null),
 *   emitMetadata: (string|null),
 *   emitCode: (string|null),
 *   emitWebAssembly: (string|null)
 * }}
 */
Wasm2LangSchema.NormalizedOptions;

/**
 * @const {!Array<string>}
 */
Wasm2LangSchema.languages = ['asmjs', 'php64', 'java'];

/**
 * @typedef {{
 *   infoDescription: string,
 *   infoPhase: string
 * }}
 */
Wasm2LangSchema.NormalizeBundleInfo;

/**
 * @const {!Object<string, !Wasm2LangSchema.NormalizeBundleInfo>}
 */
Wasm2LangSchema.normalizeBundles = {
  'binaryen:min': {
    infoDescription: 'Minimal, safe Binaryen normalization passes',
    infoPhase: 'binaryen'
  },
  'binaryen:max': {
    infoDescription: 'Aggressive Binaryen normalization for code generation',
    infoPhase: 'binaryen'
  },
  'wasm2lang:codegen': {
    infoDescription: 'Internal wasm2lang transformations for easier backend emission',
    infoPhase: 'wasm2lang'
  }
};

/**
 * @const {!Wasm2LangSchema.NormalizedOptions}
 */
Wasm2LangSchema.defaultOptions = {
  languageOut: 'asmjs',
  normalizeWasm: ['binaryen:min'],
  simplifyOutput: false,
  definitions: Object.create(null),
  inputData: null,
  inputFile: null,
  emitMetadata: null,
  emitCode: null,
  emitWebAssembly: null,
};

/**
 * @const {
 *  !Object<
 *    !Wasm2LangSchema.OptionKey,
 *    function(!Wasm2LangSchema.NormalizedOptions, !Array<string>): void
 *  >
 * }
 */
Wasm2LangSchema.optionParsers = {};

/**
 * @param {!Wasm2LangSchema.NormalizedOptions} options
 * @param {!Array<string>} strs
 */
Wasm2LangSchema.optionParsers[Wasm2LangSchema.OptionKey.LANGUAGE_OUT] = function (options, strs) {
  options.languageOut = strs[strs.length - 1].toLowerCase();
};

/**
 * @param {!Wasm2LangSchema.NormalizedOptions} options
 * @param {!Array<string>} strs
 */
Wasm2LangSchema.optionParsers[Wasm2LangSchema.OptionKey.NORMALIZE_WASM] = function (options, strs) {
  options.normalizeWasm = strs[strs.length - 1].toLowerCase().split(',');
};

/**
 * @param {!Wasm2LangSchema.NormalizedOptions} options
 * @param {!Array<string>} strs
 */
Wasm2LangSchema.optionParsers[Wasm2LangSchema.OptionKey.SIMPLIFY_OUTPUT] = function (options, strs) {
  if (0 === strs.length) {
    options.simplifyOutput = true;
    return;
  }
  options.simplifyOutput = ['1', 'on', 'true', 'yes', ''].includes(strs[strs.length - 1].toLowerCase());
};

/**
 * @param {!Wasm2LangSchema.NormalizedOptions} options
 * @param {!Array<string>} strs
 */
Wasm2LangSchema.optionParsers[Wasm2LangSchema.OptionKey.DEFINE] = function (options, strs) {
  for (var /** number */ i = 0, /** @const {number} */ len = strs.length; i !== len; ++i) {
    var /** @const {!Array<string>} */ parts = strs[i].split('=', 2);
    options.definitions[parts[0]] = 1 !== parts.length ? parts[1] : '';
  }
};

/**
 * @param {!Wasm2LangSchema.NormalizedOptions} options
 * @param {!Array<string>} strs
 */
Wasm2LangSchema.optionParsers[Wasm2LangSchema.OptionKey.INPUT_DATA] = function (options, strs) {
  if (0 !== strs.length) {
    options.inputData = strs[strs.length - 1];
  }
};

/**
 * @param {!Wasm2LangSchema.NormalizedOptions} options
 * @param {!Array<string>} strs
 */
Wasm2LangSchema.optionParsers[Wasm2LangSchema.OptionKey.INPUT_FILE] = function (options, strs) {
  if (0 !== strs.length) {
    options.inputFile = strs[strs.length - 1];
  }
};

/**
 * @param {!Wasm2LangSchema.NormalizedOptions} options
 * @param {!Array<string>} strs
 */
Wasm2LangSchema.optionParsers[Wasm2LangSchema.OptionKey.EMIT_METADATA] = function (options, strs) {
  if (0 === strs.length) {
    options.emitMetadata = 'metadata';
    return;
  }
  options.emitMetadata = strs[strs.length - 1];
};

/**
 * @param {!Wasm2LangSchema.NormalizedOptions} options
 * @param {!Array<string>} strs
 */
Wasm2LangSchema.optionParsers[Wasm2LangSchema.OptionKey.EMIT_CODE] = function (options, strs) {
  if (0 === strs.length) {
    options.emitCode = 'code';
    return;
  }
  options.emitCode = strs[strs.length - 1];
};

/**
 * @param {!Wasm2LangSchema.NormalizedOptions} options
 * @param {!Array<string>} strs
 */
Wasm2LangSchema.optionParsers[Wasm2LangSchema.OptionKey.EMIT_WEBASSEMBLY] = function (options, strs) {
  if (0 === strs.length) {
    options.emitWebAssembly = '';
    return;
  }
  options.emitWebAssembly = strs[strs.length - 1];
};


/**
 * @const {
 *  !Object<
 *    !Wasm2LangSchema.OptionKey, {
 *      optionType: string,
 *      optionValues: ?Array<string>,
 *      bundles: ?Object<
 *        string,
 *        !Wasm2LangSchema.NormalizeBundleInfo
 *      >,
 *      optionDesc: string
 *    }
 *  >
 * }
 */
Wasm2LangSchema.optionSchema = {
  'languageOut': {
    optionType: 'enum',
    optionValues: Wasm2LangSchema.languages,
    optionDesc: 'Selects the output backend language to generate.'
  },
  'normalizeWasm': {
    optionType: 'bundle-list',
    bundles: Wasm2LangSchema.normalizeBundles,
    optionDesc:
      'Comma-separated list of normalization bundles to apply before code generation (e.g. "binaryen:min,wasm2lang:codegen").'
  },
  'simplifyOutput': {
    optionType: 'boolean',
    optionDesc: 'Enables backend-specific output simplifications (may change formatting/structure but preserves semantics).'
  },
  'define': {
    optionType: 'string|null',
    optionDesc: 'Defines a compile-time constant (repeatable), e.g. -DNAME=VALUE (VALUE may be string/number/boolean).'
  },
  'inputData': {
    optionType: 'string|Uint8Array',
    optionDesc: 'Input WebAssembly contents to compile (binary buffer or text string).'
  },
  'inputFile': {
    optionType: 'string|null',
    optionDesc: 'CLI-only: path to a WebAssembly file to load into inputData (\".wat\"/\".wast\" read as text).'
  },
  'emitMetadata': {
    optionType: 'string|null',
    optionDesc:
      'When set, emits the memory buffer as a named field/variable (e.g. --emit-metadata mybuffer => var mybuffer = metadata). Can be used together with --emit-code.'
  },
  'emitCode': {
    optionType: 'string|null',
    optionDesc:
      'When set, emits the generated code as a named field/variable (e.g. --emit-code asmjs => var asmjs = code). Can be used together with --emit-metadata.'
  },
  'emitWebAssembly': {
    optionType: 'string|null',
    optionDesc:
      'Emits the (normalized) WebAssembly module to stdout. Defaults to binary; use "text" to emit the text format instead.'
  }
};
