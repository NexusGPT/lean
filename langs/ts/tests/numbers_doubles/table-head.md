| case | parent | candidate | expected | Z3 verdict | counterexample (replayed in Node) | seconds |
|---|---|---|---|---|---|---|
| seams | `%, Math.round, Math.min/max, ToInt32, ToUint32` | `Node, 6486 edge evaluations` | agree | agree |  | 0.13 |
| literals | `to_fp RNE of the exact decimal` | `Node's parse, 24 literals` | agree | agree |  | 0.07 |
| assoc_drift | `a + b - b + 0.5` | `a + 0.5` | differs | differs | a=6.078730555309705e+177, b=NaN | 0.10 |
| assoc_add | `(a + b) + c` | `a + (b + c)` | differs | differs | a=8.759598625105e-311, b=-1.0368932107018163e-296, c=1.0368932104147818e-296 | 0.28 |
| twice | `x + x` | `x * 2` | equal | equal |  | 0.28 |
| half | `x / 2` | `x * 0.5` | equal | equal |  | 1.06 |
| times_one | `x * 1` | `x` | equal | equal |  | 0.14 |
| round_floor | `Math.round(x)` | `Math.floor(x + 0.5)` | differs | differs | x=-1.1143831691930885e-219 | 0.59 |
| rem_trunc | `x % 2` | `x - 2 * Math.trunc(x / 2)` | differs | differs | x=-245908117877343680000 | 0.92 |
| rem_sign | `x % y` | `x % -y` | unknown | unknown | the solver answered unknown within 60 s | 60.06 |
| int32_trunc | `x | 0` | `Math.trunc(x)` | differs | differs | x=4029172353 | 0.07 |
| int32_twice | `x | 0` | `~~x` | equal | equal |  | 3.29 |
| neg_sub | `-x` | `0 - x` | differs | differs | x=0 | 0.01 |
| big_int | `x + 1 - 1` | `x` | differs | differs | x=18014398509481982 | 2.06 |
| big_literal | `x === 9007199254740993` | `x === 9007199254740992` | equal | equal |  | 0.03 |
| nan_self | `x !== x` | `Number.isNaN(x)` | equal | equal |  | 0.03 |
| nan_guard | `x === x ? x : 0` | `x` | differs | differs | x=NaN | 0.03 |
| neg_zero | `x === 0 ? 0 : x` | `x` | differs | differs | x=-0 | 0.02 |
| max_ternary | `Math.max(a, b)` | `a > b ? a : b` | differs | differs | a=NaN, b=-0.508981933770325 | 0.03 |
| abs_ternary | `Math.abs(x)` | `x < 0 ? -x : x` | differs | differs | x=-0 | 0.02 |
| sin_times_one | `Math.sin(x) * 1` | `Math.sin(x)` | equal | equal |  | 4.04 |
| sin_plus_zero | `Math.sin(x + 0)` | `Math.sin(x)` | differs | differs | x=-0 | 0.02 |
| mul_assoc | `(a * b) * c` | `a * (b * c)` | differs,unknown | unknown | the solver answered unknown within 60 s | 60.02 |
| sqrt_square | `Math.sqrt(x * x)` | `Math.abs(x)` | differs | differs | x=6.827094999413439e-164 | 1.88 |
| locals_if | `(() => { let r = x * 2; if (r > 10) { r = r - 10; } return r; })()` | `(() => { const y = x + x; return y > 10 ? y - 10 : y; })()` | equal | equal |  | 4.87 |
| record_sum | `p.a + p.b` | `p.b + p.a` | equal | equal |  | 0.02 |
| record_drift | `p.a + p.b - p.b` | `p.a` | differs | differs | p={"a":1.7766958756337948e+308,"b":2.0997259228521052e+306} | 0.15 |
| shift_double | `x << 1` | `x * 2` | differs | differs | x=Infinity | 0.07 |
| template_string | ``${x}`` | `String(x)` | equal | equal |  | 0.04 |
| object_is_neg_zero | `Object.is(x, -0)` | `x === 0 && 1 / x < 0` | equal | equal |  | 0.79 |
| inlined_call | `sq(x) + 1` | `x * x + 1` | equal | equal |  | 0.03 |

Z3: Z3 version 5.3.2 - 64 bit; timeout 60 s per query; 30 case queries: median 0.12 s, p90 4.87 s, max 60.06 s; differ-cases timed out: 1 of 16.
Stop rule (brief step 0): median over 10 s or most differ-cases timing out. Not met: continue.
31 of 31 rows as expected.
