| case | parent | candidate | expected | Z3 verdict | counterexample (replayed in Node) | seconds |
|---|---|---|---|---|---|---|
| seams | `%, Math.round, Math.min/max, ToInt32, ToUint32` | `Node, 6486 edge evaluations` | agree | agree |  | 0.25 |
| assoc_drift | `a + b - b + 0.5` | `a + 0.5` | differs | differs | a=6.078730555309705e+177, b=NaN -> NaN vs 6.078730555309705e+177 | 0.22 |
| assoc_add | `(a + b) + c` | `a + (b + c)` | differs | differs | a=2.8947318569793107e-216, b=8.656467710840804e-219, c=5.4145673326440416e-219 -> 2.908802892022795e-216 vs 2.908802892022796e-216 | 18.08 |
| twice | `x + x` | `x * 2` | equal | equal |  | 0.54 |
| half | `x / 2` | `x * 0.5` | equal | equal |  | 2.88 |
| times_one | `x * 1` | `x` | equal | equal |  | 0.65 |
| round_floor | `Math.round(x)` | `Math.floor(x + 0.5)` | differs | differs | x=-2.2250738585072014e-308 -> -0 vs 0 | 0.76 |
| rem_trunc | `x % 2` | `x - 2 * Math.trunc(x / 2)` | differs | differs | x=-245908117877343680000 -> -0 vs 0 | 1.52 |
| rem_sign | `x % y` | `x % -y` | unknown | unknown |  | 60.07 |
| int32_trunc | `x | 0` | `Math.trunc(x)` | differs | differs | x=4029172353 -> -265794943 vs 4029172353 | 0.08 |
| int32_twice | `x | 0` | `~~x` | equal | equal |  | 5.17 |
| neg_sub | `-x` | `0 - x` | differs | differs | x=0 -> -0 vs 0 | 0.02 |
| big_int | `x + 1 - 1` | `x` | differs | differs | x=18014398509481982 -> 18014398509481984 vs 18014398509481982 | 3.29 |
| big_literal | `x === 9007199254740993` | `x === 9007199254740992` | equal | equal |  | 0.02 |
| nan_self | `x !== x` | `Number.isNaN(x)` | equal | equal |  | 0.03 |
| nan_guard | `x === x ? x : 0` | `x` | differs | differs | x=NaN -> 0 vs NaN | 0.02 |
| neg_zero | `x === 0 ? 0 : x` | `x` | differs | differs | x=-0 -> 0 vs -0 | 0.02 |
| max_ternary | `Math.max(a, b)` | `a > b ? a : b` | differs | differs | a=0, b=-0 -> 0 vs -0 | 0.03 |
| abs_ternary | `Math.abs(x)` | `x < 0 ? -x : x` | differs | differs | x=-0 -> 0 vs -0 | 0.02 |
| sin_times_one | `Math.sin(x) * 1` | `Math.sin(x)` | equal | equal |  | 7.53 |
| sin_plus_zero | `Math.sin(x + 0)` | `Math.sin(x)` | differs | differs | x=-0 -> 0 vs -0 | 0.01 |
| mul_assoc | `(a * b) * c` | `a * (b * c)` | differs | differs | a=1.8586787987900805e+301, b=6.45204802877e-313, c=1.482502976438e-310 -> 1.78e-321 vs 0 | 55.63 |
| sqrt_square | `Math.sqrt(x * x)` | `Math.abs(x)` | differs | differs | x=1.0768681672571366e-308 -> 0 vs 1.0768681672571366e-308 | 2.86 |

Z3: Z3 version 5.3.2 - 64 bit; timeout 60 s per query; 22 case queries: median 0.59 s, p90 18.08 s, max 60.07 s; differ-cases timed out: 0 of 14.
Stop rule (brief step 0): median over 10 s or most differ-cases timing out. Not met: continue.
23 of 23 rows as expected.
