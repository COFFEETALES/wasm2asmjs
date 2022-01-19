
{
	const self = this;

	var ConstructTest = function() {
		const module = new binaryen.Module();

		const ii = binaryen.createType([binaryen.i32, binaryen.i32]);

		module.addFunction("iiiCst", ii, binaryen.i32, [],
			module.block(null, [
				module.return(
					module.i32.const(0x140)
				)
			])
		);

		module.addFunction("iiiAdd", ii, binaryen.i32, [ binaryen.i32 ],
			module.block(null, [
				module.local.set(2,
					module.i32.add(
						module.local.get(0, binaryen.i32),
						module.local.get(1, binaryen.i32)
					)
				),
				module.return(
					module.local.get(2, binaryen.i32)
				)
			])
		);

		module.addFunction("iiiMul", ii, binaryen.i32, [ binaryen.i32 ],
			module.block(null, [
				module.local.set(2,
					module.i32.mul(
						module.local.get(0, binaryen.i32),
						module.local.get(1, binaryen.i32)
					)
				),
				module.return(
					module.local.get(2, binaryen.i32)
				)
			])
		);

		var funcNames = [ "iiiCst", "iiiCst", "iiiAdd", "iiiMul", "iiiCst" ];
		var constExprRef = module.i32.const(0x0);

		module.addTable("t0", 1, 0xffffffff);
		var segment =
			binaryen.getElementSegmentInfo(
				module.addActiveElementSegment("t0", "e0", funcNames, constExprRef)
			)
		;

		module.addFunction("testFunc", binaryen.none, binaryen.i32, [],
			module.block(null, [
				module.return(
					module.call_indirect( "t0",
						module.i32.add(
							segment.offset, module.i32.const(2)
						),
						[module.i32.const(120), module.i32.const(40)],
						ii,
						binaryen.i32
					),
				)
			])
		);
		module.addFunctionExport("testFunc", "export_test") 

		return module;
	};

	var CompleteTest = function (res, mode) {
		if ( 'asm.js' !== mode ) return;

		eval(res.code);

		process.stdout.write(res.code);
		process.stdout.write('\n');

		const l = asmjs_func(self, void 0, new ArrayBuffer(0x10000));
		console.log(l.export_test());
	};
}

