// vim: set tabstop=4 shiftwidth=4 softtabstop=4 noexpandtab :
'use strict';

(async () => {
	const path = require('path');
	const fs = require('fs');
	const vm = require('vm');
	const binaryen = (
		await import(
			url.pathToFileURL(path.join(process.env['NODE_PATH'], 'binaryen', 'index.js'))['href']
		)
	).default;

	const sandbox = {
		'require': require,
		'process': process,
		'__filename': __filename,
		'__dirname': __dirname,
		'console': console,
		'binaryen': binaryen
	};

	let ctx = vm.createContext(sandbox);

	const RunFile = function(p) {
		vm.runInContext(
			fs.readFileSync( path.resolve( __dirname, p), { encoding: 'utf-8' }), ctx, p
		);
	};

	sandbox['RunFile'] = RunFile;

	RunFile('wasm2asm_header.js');
	RunFile('wasm2asm_basex.js');
	RunFile('wasm2asm_decoder.js');
	RunFile('wasm2asm_miscellaneous.js');
	RunFile('wasm2asm_op_general.js');
	RunFile('wasm2asm_op_heap.js');
	RunFile('wasm2asm_op_loop.js');
	RunFile('wasm2asm_func.js');
	RunFile('wasm2asm_link.js');
})();

