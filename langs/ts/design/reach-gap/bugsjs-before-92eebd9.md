## TypeScript files (the census walk)

| repository | files | listed | unlisted | objlit-exported | objlit-module-const | objlit-other | exports-assign | prop-assign | class-field | class-other | callback | iife | nested | top-other | other | objlit static key |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bugsjs-karma | 1 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| TOTAL | 1 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## JavaScript files (the same walk, .js/.jsx/.mjs/.cjs)

| repository | files | listed | unlisted | objlit-exported | objlit-module-const | objlit-other | exports-assign | prop-assign | class-field | class-other | callback | iife | nested | top-other | other | objlit static key |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| bugsjs-bower | 94 | 167 | 821 | 0 | 0 | 8 | 10 | 222 | 0 | 0 | 523 | 0 | 19 | 4 | 35 | 0 |
| bugsjs-eslint | 368 | 679 | 2447 | 307 | 16 | 632 | 27 | 40 | 0 | 76 | 516 | 6 | 783 | 0 | 44 | 323 |
| bugsjs-express | 57 | 42 | 283 | 0 | 0 | 20 | 32 | 71 | 0 | 0 | 136 | 0 | 14 | 0 | 10 | 0 |
| bugsjs-hessian.js | 17 | 9 | 165 | 0 | 0 | 0 | 8 | 76 | 0 | 0 | 81 | 0 | 0 | 0 | 0 | 0 |
| bugsjs-hexo | 136 | 144 | 531 | 0 | 0 | 4 | 53 | 137 | 0 | 0 | 291 | 0 | 30 | 0 | 16 | 0 |
| bugsjs-karma | 70 | 198 | 430 | 3 | 15 | 9 | 34 | 89 | 0 | 1 | 219 | 2 | 28 | 0 | 30 | 18 |
| bugsjs-mongoose | 269 | 268 | 3323 | 0 | 0 | 446 | 120 | 852 | 0 | 0 | 1314 | 69 | 446 | 1 | 75 | 0 |
| bugsjs-node_redis | 30 | 38 | 195 | 0 | 0 | 14 | 2 | 66 | 0 | 0 | 82 | 1 | 17 | 3 | 10 | 0 |
| bugsjs-pencilblue | 327 | 37 | 4536 | 0 | 0 | 264 | 277 | 1922 | 0 | 60 | 1315 | 22 | 455 | 1 | 220 | 0 |
| bugsjs-shields | 400 | 456 | 1262 | 6 | 0 | 28 | 4 | 5 | 0 | 361 | 802 | 3 | 17 | 2 | 34 | 6 |
| TOTAL | 1768 | 2038 | 13993 | 316 | 31 | 1425 | 567 | 3480 | 0 | 498 | 5279 | 103 | 1809 | 11 | 474 | 347 |

## Kinds

- `objlit-exported`: a direct method or function-valued property of an object literal that is exported (export const X = {...}, export default {...}, module.exports = {...}, exports.x = {...}).
- `objlit-module-const`: the same, of an object literal bound to a module-level const that is not exported.
- `objlit-other`: a method or function-valued property of any other object literal (nested literal, local literal, argument, let).
- `exports-assign`: the right side of module.exports = f, exports.x = f, module.exports.x = f.
- `prop-assign`: the right side of any other property assignment a.b = f, a[k] = f.
- `class-field`: a class field initialised with a function or arrow.
- `class-other`: a class member not listed (a class expression, a nested or unnamed class, a computed or private name).
- `callback`: an argument of a call or new.
- `iife`: the callee of a call (an immediately invoked function).
- `nested`: a function declaration or a variable initialiser inside another function.
- `top-other`: a module-level declaration not listed (let or var, several declarators, an anonymous default export).
- `other`: anything else (a return value, an array element, a JSX attribute, a default parameter, a conditional).
- `objlit static key`: of `objlit-exported` and `objlit-module-const`, the methods and function-valued properties whose key is a static name (an identifier, or a string that is one; getters and setters excluded): what the exported-units reading lists.
