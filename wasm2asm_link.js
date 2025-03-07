// vim: set tabstop=4 shiftwidth=4 softtabstop=4 noexpandtab :
'use strict';

{
	// http://lisperator.net/uglifyjs/transform
	let resFunc =
		new UglifyJS.AST_Function({
			argnames: [
				new UglifyJS.AST_SymbolFunarg({ name: 'stdlib' }),
				new UglifyJS.AST_SymbolFunarg({ name: 'foreign' }),
				new UglifyJS.AST_SymbolFunarg({ name: 'buffer' })
			], body: [
				new UglifyJS.AST_Directive({ value: 'use asm', quote: '\'' })
			].concat(
				(function () {
					const r = (
						new UglifyJS.AST_Var({
							definitions: [].concat(
								processAsmJsHeader(), processAsmJsImports(), processAsmJsGlobals()
							)
						})
					);
					//assert.strictEqual(true, 0 !== r['definitions'].length);
					//return r;
					if (0 !== r['definitions'].length) { return r; }
				})(),
				asmJsFuncList,
				processAsmJsFTable(),
				asmJsReturn
			).filter(i => undefined !== i)
		})

	var topLevel =
		new UglifyJS.AST_Toplevel({
			body: [
				new UglifyJS.AST_Var({
					definitions: [
						new UglifyJS.AST_VarDef({
							name: new UglifyJS.AST_SymbolVar({
								name: 'string' === typeof output['js'] ? output['js'] : 'asmjs_func'
							}),
							value: resFunc
						})
					]
				})
			]
		});
}

finalizeJs(topLevel, 'asm.js');

