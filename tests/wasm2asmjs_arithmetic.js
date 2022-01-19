
{
	const self = this;

	var ConstructTest = function() {
		const module = new binaryen.Module();

		const ii = binaryen.createType([binaryen.i32, binaryen.i32]);
		const ff = binaryen.createType([binaryen.f32, binaryen.f32]);
		const fi = binaryen.createType([binaryen.f32, binaryen.i32]);

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

		module.addFunction("fffAdd", ff, binaryen.f32, [ binaryen.f32 ],
			module.block(null, [
				module.local.set(2,
					module.f32.add(
						module.local.get(0, binaryen.f32),
						module.local.get(1, binaryen.f32)
					)
				),
				module.return(
					module.local.get(2, binaryen.f32)
				)
			])
		);

		module.addFunction("FfiAdd", fi, binaryen.f64, [ binaryen.f64 ],
			module.block(null, [
				module.local.set(2,
					module.f64.add(
						module.f64.promote( module.local.get(0, binaryen.f32) ),
						module.f64.convert_s.i32( module.local.get(1, binaryen.i32) )
					)
				),
				module.return(
					module.local.get(2, binaryen.f64)
				)
			])
		);

		module.addFunction("fiAdd", binaryen.i32, binaryen.f32, [ binaryen.f32, binaryen.f32 ],
			module.block(null, [
				module.local.set(1,
					module.f32.const(1.5)
				),
				module.local.set(2,
					module.f32.add(
						module.f32.convert_s.i32( module.local.get(0, binaryen.i32) ),
						module.local.get(1, binaryen.f32)
					)
				),
				module.return(
					module.local.get(2, binaryen.f32)
				)
			])
		);

		module.addGlobal("test-global", binaryen.i32, /* mutable */ true, module.i32.const(0x1000))

		module.addFunction("vUpdateGlobal", binaryen.none, binaryen.none, [ binaryen.i32 ],
			module.block(null, [
				module.local.set(0,
					module.i32.add(
						module.global.get( "test-global", binaryen.i32),
						module.i32.const(2)
					)
				),
				module.global.set("test-global", module.local.get(0, binaryen.i32)),
				module.return()
			])
		);

		module.addFunctionExport("iiiMul", "export_iiiMul");
		module.addFunctionExport("iiiAdd", "export_iiiAdd");
		module.addFunctionExport("fffAdd", "export_fffAdd");
		module.addFunctionExport("FfiAdd", "export_FfiAdd");
		module.addFunctionExport("fiAdd", "export_fiAdd");

		module.addFunctionExport("vUpdateGlobal", "export_vUpdateGlobal");

		if (!module.validate())
		  throw new Error("validation error");

		return module;
	};

	var CompleteTest = function (res, mode) {
		if ( 'asm.js' !== mode ) return;

		eval(res.code);

		process.stdout.write(res.code);
		process.stdout.write('\n');

		const l = asmjs_func(self, void 0, new ArrayBuffer(0x10000));
		console.log(l.export_fiAdd(120));
	};
}

