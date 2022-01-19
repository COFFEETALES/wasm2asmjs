
{
	const self = this;

	const expected_data = [
		"hello, world.",
		"segment data 2",
		"segment data 3",
		"X"
	];

	const offsetList = new Int32Array(4);
	{
		let i = 0;
		offsetList[0] = ( i = ((i+48) + 3) & (~3) );
		offsetList[1] = ( i = ((i+expected_data[0].length+1) + 3) & (~3) );
		offsetList[2] = ( i = ((i+expected_data[1].length+1) + 3) & (~3) );
		offsetList[3] = ( i = ((i+expected_data[2].length+1+256) + 3) & (~3) );
	}

	var ConstructTest = function() {
		const module = new binaryen.Module();

		module.setMemory( /* initial */ 1, /* maximum */ 1, /* exportName */ '', [
			{
				passive: false,
				offset: module.i32.const( 0 ),
				data: Array.prototype.slice.call(new Uint8Array(offsetList.buffer))
			},
			{
				passive: false,
				offset: module.i32.const( offsetList[0] ),
				data: expected_data[0].split('').map(function(x) { return x.charCodeAt(0) }).concat(0x0)
			},
			{
				passive: false,
				offset: module.i32.const( offsetList[1] ),
				data: expected_data[1].split('').map(function(x) { return x.charCodeAt(0) }).concat(0x0)
			},
			{
				passive: false,
				offset: module.i32.const( offsetList[2] ),
				data: expected_data[2].split('').map(function(x) { return x.charCodeAt(0) }).concat(0x0)
			},
			{
				passive: false,
				offset: module.i32.const( offsetList[3] ),
				data: expected_data[3].split('').map(function(x) { return x.charCodeAt(0) }).concat(0x0)
			}
		], /* shared */ false);

		module.addFunction("vFetchData", /*params*/ binaryen.none, /*result*/ binaryen.none, [binaryen.i32, binaryen.i32, binaryen.i32, binaryen.i32],
			module.block(null, [
				module.loop('loop1',
					module.block('block1', [
						module.local.set( 1,
							module.i32.load(0, 4,
								module.i32.mul(
									module.local.get(0, binaryen.i32), module.i32.const(4)
								)
							)
						),
						module.local.set( 0,
							module.i32.add(module.i32.const(1), module.local.get(0, binaryen.i32))
						),
						module.local.set( 2, module.i32.const(0) ),
						module.loop('loop2',
							module.block('block2', [
								module.local.set( 3,
									module.i32.load8_u(0, 1, module.local.get(1, binaryen.i32))
								),
								module.local.set( 1,
									module.i32.add(
										module.i32.const(1),
										module.local.get(1, binaryen.i32)
									)
								),
								module.i32.store8(
									0, 1,
									module.i32.add(
										module.i32.const(512), module.local.get(2, binaryen.i32)
									),
									module.local.get(3, binaryen.i32)
								),
								module.local.set( 2,
									module.i32.add(
										module.i32.const(1),
										module.local.get(2, binaryen.i32)
									)
								),
								module.if(
									module.i32.eq(
										module.local.get(3, binaryen.i32),
										module.i32.const( 'X'.charCodeAt(0) )
									),
									module.break('block1'),
									0
								),
								module.if(
									module.i32.eqz(
										module.local.get(3, binaryen.i32),
										module.i32.const( 0 )
									),
									module.block(null, [
										module.call( 'testFuncInternal', [], binaryen.none ),
										module.break('loop1'),
									])
								),
								module.break('loop2')
							])
						),

						module.break('loop1',
							module.i32.lt_s( module.local.get(0, binaryen.i32), module.i32.const(4) )
						)
					])
				),
				module.return()
			])
		);

		module.addFunctionExport("vFetchData", "export_vFetchData");
		module.addFunctionImport("testFuncInternal", "module", "testFuncExternal", /* params */ binaryen.none, binaryen.none);

		if (!module.validate())
		  throw new Error("validation error");

		process.stdout.write('emitText: ' + module.emitText());
		process.stdout.write('\n');

		return module;
	};

	var my_memory = null;

	var CompleteTest = function (res, mode) {
		if ( 'metadata' === mode ) {
			eval(res.code);

			my_memory = asmjs_memory;

			process.stdout.write(res.code);
			process.stdout.write('\n');
		}
		if ( 'asm.js' === mode ) {
			eval(res.code);

			process.stdout.write(res.code);
			process.stdout.write('\n');

			const l = asmjs_func(self, {
				'testFuncExternal': function () {
					const u8 = new Uint8Array(my_memory);
					let arr = [];
					for ( let i = 512 ; 0 !== u8[i] ; ++i ) { arr.push(u8[i]); }
					process.stdout.write(arr.map(i => String.fromCharCode(i)).join('') + '\n');
				}
			}, my_memory);
			process.stdout.write('TEST\n');
			l['export_vFetchData']();
		}
	};
}

