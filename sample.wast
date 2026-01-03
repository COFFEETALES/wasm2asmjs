(module
  (export "fib" (func $fib))

  ;; Semantics: if n < 2 then 1 else iterate up to n (inclusive)
  (func $fib (param $n i32) (result i32)
    (local $a i32)
    (local $b i32)
    (local $i i32)

    (if
      (i32.lt_s (local.get $n) (i32.const 2))
      (then
        (return (i32.const 1))
      )
    )

    (local.set $a (i32.const 1))
    (local.set $b (i32.const 1))
    (local.set $i (i32.const 2))

    (block $exit
      (loop $loop
        (br_if $exit
          (i32.gt_s (local.get $i) (local.get $n))
        )

        ;; b = a + b; a = old b
        (local.set $b (i32.add (local.get $a) (local.get $b)))
        (local.set $a (i32.sub (local.get $b) (local.get $a)))

        (local.set $i (i32.add (local.get $i) (i32.const 1)))
        (br $loop)
      )
    )

    (local.get $b)
  )
)