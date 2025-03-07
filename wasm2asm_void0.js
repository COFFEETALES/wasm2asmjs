//{
//	/*var herschel = (function(stdlib, foreign, buffer)
//	{"use asm";
//	var Math_imul = stdlib.Math.imul});*/
//	let ast = UglifyJS.minify(`
//        $label_aa: {
//            if ($fround($1_aa) < $fround(0) ^ 1) {
//                $1_ae = 13;
//                break $label_aa;
//            }
//            $1_ae = 14;
//        }
//	`, {
//		parse:         {},
//		compress:      false,
//		mangle:        false,
//		output: {
//			ast:        true,
//			code:       false
//		}
//	}).ast;
//
//	let walker =
//		new UglifyJS.TreeWalker(
//			(node, descend) => {
//				if ( node instanceof UglifyJS.AST_Break )
//				{
//					process.stderr.write(''+JSON.stringify(node)+'\n');
//				}
//				process.stderr.write(''+node.print_to_string()+'\n');
//				//if ( node instanceof UglifyJS.AST_ObjectKeyVal )
//				{
//				process.stderr.write(''+node.TYPE+'\n');
//				//console.log(node);
//				}
//			}
//		)
//	ast.walk(walker);
//}

//
//console.log('--')
//
//{
//let topLevel =
//	new UglifyJS.AST_Toplevel({
//		body: [
//			new UglifyJS.AST_Directive({ value: 'use asm', quote: '"' }),
//			new UglifyJS.AST_Var({
//				definitions: [
//					new UglifyJS.AST_VarDef({
//						name: new UglifyJS.AST_SymbolVar({ name: 'my_float' }),
//						value: new UglifyJS.AST_Number({ value: 0, start: {raw: '0.0'} })
//					})
//				]
//			})
//		]
//	});
//let res = UglifyJS.minify(topLevel, {
//	parse:                 {},
//	compress:              false,
//	mangle:                false,
//	output: {
//		ast:                false,
//		code:               true,
//		beautify:           true,
//		semicolons:         true,
//		keep_quoted_props:  true,
//		quote_style:        3
//	}
//});
//console.log(res.code);
//}
