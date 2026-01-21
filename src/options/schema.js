'use strict';

/** @const */
var Options = {};

/** @const */
Options.Schema = {};

/**
 * @enum {string}
 */
Options.Schema.OptionKeys = {
  LANGUAGE_OUT: 'languageOut',
  NORMALIZE_WASM: 'normalizeWasm',
  SIMPLIFY_OUTPUT: 'simplifyOutput',
  DEFINE: 'define',
  EMIT_METADATA: 'emitMetadata',
  EMIT_CODE: 'emitCode'
};

/**
 * @typedef {{
 *   "languageOut": string,
 *   "normalizeWasm": !Array<string>,
 *   "simplifyOutput": boolean,
 *   "define": !Object<string, (string|number|boolean)>,
 *   "emitMetadata": (string|null),
 *   "emitCode": (string|null)
 * }}
 */
Options.Schema.NormalizedOptions;

/**
 * @const {!Array<string>}
 */
Options.Schema.LANGUAGES = ['ASMJS', 'php64', 'java'];

/**
 * @typedef {{
 *   infoDescription: string,
 *   infoPhase: string
 * }}
 */
Options.Schema.NormalizeBundleInfo;

/**
 * @const {!Object<string, !Options.Schema.NormalizeBundleInfo>}
 */
Options.Schema.NORMALIZE_BUNDLES = {
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
 * @const {!Options.Schema.NormalizedOptions}
 */
Options.Schema.DEFAULT_OPTIONS = {
  'languageOut': 'ASMJS',
  'normalizeWasm': [],
  'simplifyOutput': false,
  'define': {},
  'emitMetadata': null,
  'emitCode': null
};

/**
 * @const {
 *  !Object<
 *    !Options.Schema.OptionKeys, {
 *      optionType: string,
 *      optionValues: ?Array<string>,
 *      bundles: ?Object<
 *        string,
 *        !Options.Schema.NormalizeBundleInfo
 *      >,
 *      optionDesc: string
 *    }
 *  >
 * }
 */
Options.Schema.OPTION_SCHEMA = {
  'languageOut': {
    optionType: 'enum',
    optionValues: Options.Schema.LANGUAGES,
    optionDesc: 'Selects the output backend language to generate'
  },
  'normalizeWasm': {
    optionType: 'bundle-list',
    bundles: Options.Schema.NORMALIZE_BUNDLES,
    optionDesc:
      'Comma-separated list of normalization bundles to apply before code generation (e.g. "binaryen:min,wasm2lang:codegen")'
  },
  'simplifyOutput': {
    optionType: 'boolean',
    optionDesc: 'Enables backend-specific output simplifications (may change formatting/structure but preserves semantics)'
  },
  'define': {
    optionType: 'string|null',
    optionDesc: 'Defines a compile-time constant (repeatable), e.g. -DNAME=VALUE (VALUE may be string/number/boolean)'
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
  }
};
