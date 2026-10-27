// Globals the default lib (es2022) does not declare and a checkout without a project cannot resolve: declared here
// for the no-project program only; a project brings its own (lib.dom, @types/node).
declare function structuredClone<T>(value: T): T;
