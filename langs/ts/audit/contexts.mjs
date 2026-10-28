// Handwritten source grammar contexts; obligations are independently schema-derived.
export const expr={
 'ArrayLiteralExpression.elements':'const x = [$];', 'ArrowFunction.body':'const x = () => $;',
 'AsExpression.expression':'const x = $ as unknown;', 'AwaitExpression.expression':'async function outer(){ await $; }',
 'BinaryExpression.left':'const x = ($, 0);','BinaryExpression.right':'const x = (0, $);',
 'BindingElement.initializer':'const {x = $} = {};','CallExpression.arguments':'f($);','CallExpression.expression':'const x = $();',
 'CaseClause.expression':'switch(0){case $: break;}','ComputedPropertyName.expression':'const x = {[$]: 0};',
 'ConditionalExpression.condition':'const x = $ ? 0 : 1;','ConditionalExpression.whenTrue':'const x = true ? $ : 1;','ConditionalExpression.whenFalse':'const x = true ? 0 : $;',
 'Decorator.expression':'@$ class C {}','DeleteExpression.expression':'const x = delete $;','DoStatement.expression':'do {} while($);',
 'ElementAccessExpression.argumentExpression':'x[$];','ElementAccessExpression.expression':'const x = $[0];',
 'EnumMember.initializer':'enum E { x = $ }','ExportAssignment.expression':'export default $;',
 'ExpressionStatement.expression':'$;','ExpressionWithTypeArguments.expression':'class C extends $ {}',
 'ForInStatement.expression':'for(const x in $){}','ForInStatement.initializer':'for($ in {}){}',
 'ForOfStatement.expression':'for(const x of $){}','ForOfStatement.initializer':'for($ of []){}',
 'ForStatement.condition':'for(; $ ;){}','ForStatement.initializer':'for($; false;){}','ForStatement.incrementor':'for(;false;$){}',
 'IfStatement.expression':'if($){}','JsxExpression.expression':'const x = <C>{$}</C>;','JsxSpreadAttribute.expression':'const x = <C {...$}/>;',
 'NewExpression.arguments':'new C($);','NewExpression.expression':'const x = new $();','NonNullExpression.expression':'const x = $!;',
 'Parameter.initializer':'function outer(x = $) {}','ParenthesizedExpression.expression':'const x = ($);',
 'PostfixUnaryExpression.operand':'const x = $++;','PrefixUnaryExpression.operand':'const x = !$;',
 'PropertyAccessExpression.expression':'const x = $.p;','PropertyAssignment.initializer':'const x = {p:$};',
 'PropertyDeclaration.initializer':'class C { p = $; }','ReturnStatement.expression':'function outer(){return $;}',
 'SatisfiesExpression.expression':'const x = $ satisfies unknown;',
 'ShorthandPropertyAssignment.objectAssignmentInitializer':'({x = $} = {});',
 'SpreadAssignment.expression':'const x = {...$};','SpreadElement.expression':'const x = [...$];',
 'SwitchStatement.expression':'switch($){}','TaggedTemplateExpression.tag':'const x = $`a`;',
 'TemplateSpan.expression':'const x = `a${$}`;','ThrowStatement.expression':'function outer(){throw $;}',
 'TypeAssertionExpression.expression':'const x = <unknown>$;','TypeOfExpression.expression':'const x = typeof $;',
 'VariableDeclaration.initializer':'const x = $;','VoidExpression.expression':'const x = void $;',
 'WhileStatement.expression':'while($){}','WithStatement.expression':'with($){}','YieldExpression.expression':'function* outer(){yield $;}'
};
export const types={
 'ArrayType.elementType':'type X = $[];','ArrowFunction.type':'const x = (): $ => null;','AsExpression.type':'const x = 0 as $;',
 'CallExpression.typeArguments':'f<$>();','CallSignature.type':'interface X {(): $}',
 'ConditionalType.checkType':'type X = $ extends unknown ? 0 : 1;','ConditionalType.extendsType':'type X = unknown extends $ ? 0 : 1;',
 'ConditionalType.trueType':'type X = unknown extends unknown ? $ : 1;','ConditionalType.falseType':'type X = unknown extends unknown ? 0 : $;',
 'ConstructorType.type':'type X = new () => $;','ConstructSignature.type':'interface X {new (): $}',
 'ExpressionWithTypeArguments.typeArguments':'class C extends B<$>{}','FunctionDeclaration.type':'function f(): $ {throw 0;}',
 'FunctionExpression.type':'const f = function(): $ {throw 0;};','FunctionType.type':'type X = () => $;',
 'GetAccessor.type':'class C {get x(): $ {throw 0;}}','IndexedAccessType.indexType':'type X = A[$];',
 'IndexedAccessType.objectType':'type X = $[0];','IndexSignature.type':'interface X {[x:string]: $}',
 'IntersectionType.types':'type X = unknown & $;','JSDocTypeExpression.type':'/** @type {$} */ const x = 0;',
 'JSDocFunctionType.type':'/** @type {function(): $} */ const x = 0;',
 'JSDocNamepathType.type':'/** @type {module:$} */ const x = 0;',
 'JSDocNonNullableType.type':'/** @type {!$} */ const x = 0;','JSDocNullableType.type':'/** @type {?$} */ const x = 0;',
 'JSDocOptionalType.type':'/** @type {$=} */ const x = 0;','JSDocVariadicType.type':'/** @param {...$} x */ function outer(x){}',
 'JsxOpeningElement.typeArguments':'const x = <C<$>></C>;','JsxSelfClosingElement.typeArguments':'const x = <C<$>/>;',
 'ImportType.argument':'type X = import($);','ImportType.typeArguments':'type X = import("x").C<$>;',
 'MappedType.nameType':'type X = {[K in string as $]: 0};','MappedType.type':'type X = {[K in string]: $};',
 'MethodDeclaration.type':'class C {m(): $ {throw 0;}}','MethodSignature.type':'interface X {m(): $}',
 'NamedTupleMember.type':'type X = [x: $];','NewExpression.typeArguments':'new C<$>();',
 'OptionalType.type':'type X = [$?];','Parameter.type':'function outer(x:$){}','ParenthesizedType.type':'type X = ($);',
 'PropertyDeclaration.type':'class C {x: $;}','PropertySignature.type':'interface X {x:$}','RestType.type':'type X = [...$];',
 'SatisfiesExpression.type':'const x = 0 satisfies $;','TaggedTemplateExpression.typeArguments':'f<$>`a`;',
 'TemplateLiteralTypeSpan.type':'type X = `a${$}`;','TupleType.elements':'type X = [$];',
 'TypeAliasDeclaration.type':'type X = $;','TypeAssertionExpression.type':'const x = <$>0;',
 'TypeOperator.type':'type X = keyof $;','TypeParameter.constraint':'type X<T extends $> = T;',
 'TypeParameter.default':'type X<T = $> = T;','TypePredicate.type':'function f(x:unknown): x is $ {return true;}',
 'TypeQuery.typeArguments':'type X = typeof f<$>;','TypeReference.typeArguments':'type X = C<$>;',
 'UnionType.types':'type X = unknown | $;','VariableDeclaration.type':'const x: $ = null;'
};
export const statements={
 'SourceFile.statements':'$','Block.statements':'{$}','CaseClause.statements':'switch(0){case 0: $ break;}',
 'DefaultClause.statements':'switch(0){default: $}','ModuleBlock.statements':'namespace N {$}',
 'IfStatement.thenStatement':'if(true) $','IfStatement.elseStatement':'if(true); else $',
 'LabeledStatement.statement':'label: $','DoStatement.statement':'do $ while(false);',
 'WhileStatement.statement':'while(false) $','ForStatement.statement':'for(;;) $',
 'ForInStatement.statement':'for(const x in {}) $','ForOfStatement.statement':'for(const x of []) $','WithStatement.statement':'with({}) $'
};
export const members={'ClassDeclaration.members':'class C {$}','ClassExpression.members':'const C = class {$};','ObjectLiteralExpression.properties':'const o = {$};','InterfaceDeclaration.members':'interface I {$}','TypeLiteral.members':'type I = {$};'};
export const seeds={FunctionDeclaration:'function target(){}',FunctionExpression:'function target(){}',ArrowFunction:'() => 0',MethodDeclaration:'m(){}',Constructor:'constructor(){}',GetAccessor:'get x(){return 0;}',SetAccessor:'set x(v){}',CallSignature:'(): void;',ConstructSignature:'new (): object;',IndexSignature:'[x:string]: unknown;',MethodSignature:'m(): void;',FunctionType:'() => void',ConstructorType:'new () => object',JSDocFunctionType:'function(): void'};
export function sources(c){
 const key=c.parent+'.'+c.field;
 if(c.kind==='JSDocSignature')return c.parent==='JSDocCallbackTag'?['/** @callback X\n * @param {number} x\n * @returns {number}\n */ const x=0;']:c.parent==='JSDocOverloadTag'?['/** @overload\n * @param {number} x\n * @returns {number}\n */ function f(x){return x;}']:[];
 let seed=seeds[c.kind], tmpl=c.kind==='FunctionDeclaration'?statements[key]:['FunctionExpression','ArrowFunction'].includes(c.kind)?expr[key]:['FunctionType','ConstructorType','JSDocFunctionType'].includes(c.kind)?types[key]:members[key];
 if(key==='ExportAssignment.expression'&&c.kind==='FunctionExpression')tmpl='export = $;';
 if(!tmpl)return [];
 if(['InterfaceDeclaration','TypeLiteral'].includes(c.parent))seed=({GetAccessor:'get x():number;',SetAccessor:'set x(v:number);'})[c.kind]??seed;
 const variants=[tmpl.replace(/\$(?!\{)/g,()=>seed)];
 // Function expressions used as an ExpressionStatement need a unary prefix elsewhere; parentheses change the cell.
 if(key==='ExpressionStatement.expression'&&c.kind==='FunctionExpression')return [];
 if(c.kind==='FunctionType'||c.kind==='ConstructorType') variants.push(tmpl.replace(/\$(?!\{)/g,()=>'('+seed+')'));
 return variants;
}
// Explicit syntactic impossibility constraints. Missing rules remain unresolved, never silently infeasible.
export function exclusion(c){
 const key=c.parent+'.'+c.field, js=['JS','JSX'].includes(c.language), jsx=['TSX','JSX'].includes(c.language);
 if(c.kind==='FunctionExpression'&&key==='ExportAssignment.expression'&&js)return 'JavaScript export default function parses as declaration; export equals is TypeScript-only';
 if(c.kind==='ArrowFunction'&&['AsExpression.expression','NonNullExpression.expression','SatisfiesExpression.expression','ConditionalExpression.condition'].includes(key))return 'arrow precedence requires parentheses here; immediate parent becomes ParenthesizedExpression';
 if(['FunctionType','ConstructorType'].includes(c.kind)&&['ArrayType.elementType','ConditionalType.checkType','IndexedAccessType.objectType','IntersectionType.types','JSDocNonNullableType.type','OptionalType.type','TypeOperator.type','UnionType.types'].includes(key))return 'function-type precedence requires parentheses here; immediate parent becomes ParenthesizedType';
 if(['CommaListExpression','PartiallyEmittedExpression'].includes(c.parent))return 'transform-only parent; not source-parser output';
 if(c.kind==='JSDocSignature'&&!['JSDocCallbackTag','JSDocOverloadTag'].includes(c.parent))return 'JSDocSignature is produced only by callback/overload tags, despite TypeNode assignability';
 if(c.kind==='JSDocFunctionType'&&!c.parent.startsWith('JSDoc'))return 'Closure function type syntax is restricted to JSDoc type parser';
 if(key==='ImportType.argument')return 'import type argument grammar requires a string literal (independently challenged by Babel)';
 if(c.parent==='JSDocNamepathType')return 'JSDoc namepath parser consumes a name, not a function type';
 if(c.parent==='MappedType'&&c.field==='members')return 'schema declares members only for grammar-error recovery';
 if(['ImportDeclaration.moduleSpecifier','ExportDeclaration.moduleSpecifier','ExternalModuleReference.expression','ImportAttribute.value','JSDocImportTag.moduleSpecifier'].includes(key))return 'module/attribute grammar requires a string literal; broader field is error recovery';
 if(key==='TypeParameter.expression')return 'type-parameter expression exists for invalid constraint recovery';
 if(['Constructor.type','SetAccessor.type'].includes(key))return 'constructor/setter cannot declare a return type';
 if(c.goal==='script'&&['ExportAssignment','ImportType'].includes(c.parent)&&c.parent==='ExportAssignment')return 'export syntax necessarily changes source file to module';
 if(c.parent.startsWith('Jsx')&&!jsx)return 'JSX parent requires JSX/TSX parse mode';
 if(c.parent==='TypeAssertionExpression'&&jsx)return 'angle-bracket assertion is unavailable in JSX parse mode';
 const typedParent=['AsExpression','SatisfiesExpression','NonNullExpression','EnumMember','ModuleBlock','InterfaceDeclaration','TypeLiteral','TypeAssertionExpression'].includes(c.parent);
 if(js&&!c.parent.startsWith('JSDoc')&&(typedParent||c.typeOnly||c.field==='type'||c.field==='typeArguments'))return 'TypeScript-only syntax outside JSDoc is not valid JavaScript';
 if(key==='ExpressionStatement.expression'&&c.kind==='FunctionExpression')return 'statement-leading function is parsed as a declaration; parentheses introduce a parent node';
 if(['ForInStatement.initializer','ForOfStatement.initializer','PostfixUnaryExpression.operand'].includes(key))return 'function value is not an assignment target (early error)';
 if(c.kind==='FunctionDeclaration'&&['DoStatement','WhileStatement','ForStatement','ForInStatement','ForOfStatement','WithStatement'].includes(c.parent))return 'function declaration is not a loop/with Statement production (early error)';
 if(c.goal==='module'&&(c.parent==='WithStatement'||c.kind==='FunctionDeclaration'&&['IfStatement','LabeledStatement'].includes(c.parent)))return 'strict module disallows with and Annex-B function statements';
 return null;
}
