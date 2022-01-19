(module
 (type $none_=>_none (func))
 (import "module" "testFuncExternal" (func $testFuncInternal))
 (memory $0 1 1)
 (data (i32.const 0) "0\00\00\00@\00\00\00P\00\00\00`\01\00\00")
 (data (i32.const 48) "hello, world.\00")
 (data (i32.const 64) "segment data 2\00")
 (data (i32.const 80) "segment data 3\00")
 (data (i32.const 352) "X\00")
 (export "export_vFetchData" (func $vFetchData))
 (func $vFetchData
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (loop $loop1
   (block $block1
    (local.set $1
     (i32.load
      (i32.mul
       (local.get $0)
       (i32.const 4)
      )
     )
    )
    (local.set $0
     (i32.add
      (i32.const 1)
      (local.get $0)
     )
    )
    (local.set $2
     (i32.const 0)
    )
    (loop $loop2
     (block $block2
      (local.set $3
       (i32.load8_u
        (local.get $1)
       )
      )
      (local.set $1
       (i32.add
        (i32.const 1)
        (local.get $1)
       )
      )
      (i32.store8
       (i32.add
        (i32.const 512)
        (local.get $2)
       )
       (local.get $3)
      )
      (local.set $2
       (i32.add
        (i32.const 1)
        (local.get $2)
       )
      )
      (if
       (i32.eq
        (local.get $3)
        (i32.const 88)
       )
       (br $block1)
      )
      (if
       (i32.eqz
        (local.get $3)
       )
       (block
        (call $testFuncInternal)
        (br $loop1)
       )
      )
      (br $loop2)
     )
    )
    (br_if $loop1
     (i32.lt_s
      (local.get $0)
      (i32.const 4)
     )
    )
   )
  )
  (return)
 )
)
