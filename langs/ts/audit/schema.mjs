// Derive the finite structural obligation frame from compiler-owned declarations.
// Assignability is only a candidate predicate, never a grammar-feasibility proof.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {ts} from '../common.mjs';
export const auditDir=fileURLToPath(new URL('.',import.meta.url));
export const modes=['TS','TSX','JS','JSX'].flatMap(language=>['script','module'].map(goal=>({language,goal})));
export function buildSchema(){
 const file=auditDir+'node_modules/typescript/lib/typescript.d.ts';
 const program=ts.createProgram([file],{strict:true,skipLibCheck:true});
 const checker=program.getTypeChecker(), sf=program.getSourceFile(file);
 const ns=sf.statements.find(s=>ts.isModuleDeclaration(s)&&s.name.text==='ts');
 const decls=ns.body.statements, interfaces=decls.filter(ts.isInterfaceDeclaration);
 const byName=new Map(interfaces.map(d=>[d.name.text,d]));
 const type=name=>checker.getTypeAtLocation(byName.get(name));
 const runtime=checker.getTypeAtLocation(decls.find(d=>ts.isTypeAliasDeclaration(d)&&d.name.text==='FunctionLikeDeclaration')).types;
 const signature=checker.getTypeAtLocation(decls.find(d=>ts.isTypeAliasDeclaration(d)&&d.name.text==='SignatureDeclaration')).types;
 const all=[...new Set([...runtime,...signature,type('JSDocSignature')])];
 const syntaxNames=new Map(); for(const m of decls.find(d=>ts.isEnumDeclaration(d)&&d.name.text==='SyntaxKind').members){const name=m.name.text; if(!/^(First|Last|Count|AssertClause|AssertEntry|JSDocComment)$/.test(name)&&!name.startsWith('First')&&!name.startsWith('Last')&&!syntaxNames.has(ts.SyntaxKind[name])) syntaxNames.set(ts.SyntaxKind[name],name);}
 const kindOf=t=>{const p=t.getProperty('kind');if(!p)return null;const k=checker.getTypeOfSymbolAtLocation(p,p.valueDeclaration??sf);if(!(k.flags&ts.TypeFlags.NumberLiteral))return null;return syntaxNames.get(k.value);};
 const kinds=all.map(t=>({interface:t.symbol.name,kind:kindOf(t),typeOnly:!runtime.includes(t)}));
 const unwrap=t=>t.isUnion()?t.types.flatMap(unwrap):checker.isArrayType(t)?unwrap(checker.getTypeArguments(t)[0]):t.symbol?.name==='NodeArray'?unwrap(checker.getTypeArguments(t)[0]):[t];
 const fields=[], excluded=[];
 // Concrete, single-kind node interfaces. Merge refined interfaces by (kind, field), retaining provenance.
 const concrete=interfaces.filter(d=>kindOf(checker.getTypeAtLocation(d))&&checker.isTypeAssignableTo(checker.getTypeAtLocation(d),type('Node')));
 const byField=new Map();
 for(const d of concrete){const t=checker.getTypeAtLocation(d), parent=kindOf(t);
  for(const p of t.getProperties()){
   const pd=p.valueDeclaration??p.declarations?.[0]; if(!pd||!ts.isPropertySignature(pd))continue;
   const field=p.name, pt=checker.getTypeOfSymbolAtLocation(p,pd);
   if(field==='parent'||field.startsWith('_')||['original','emitNode'].includes(field))continue;
   const accepted=all.filter(k=>unwrap(pt).some(u=>!(u.flags&(ts.TypeFlags.Any|ts.TypeFlags.Unknown|ts.TypeFlags.Never))&&checker.isTypeAssignableTo(k,u))).map(kindOf);
   if(!accepted.length)continue;
   const id=parent+'.'+field;
   if(!byField.has(id))byField.set(id,{parent,field,accepts:[],declarations:[]});
   const row=byField.get(id);row.accepts=[...new Set([...row.accepts,...accepted])];row.declarations.push({interface:d.name.text,declaredBy:pd.parent.name?.text,type:checker.typeToString(pt),line:sf.getLineAndCharacterOfPosition(pd.getStart()).line+1});
  }
 }
 fields.push(...[...byField.values()].sort((a,b)=>(a.parent+'.'+a.field).localeCompare(b.parent+'.'+b.field)));
 const candidates=[];
 for(const f of fields)for(const k of kinds)for(const m of modes){const cell={id:[k.kind,f.parent,f.field,m.language,m.goal].join('|'),kind:k.kind,typeOnly:k.typeOnly,parent:f.parent,field:f.field,...m};if(f.accepts.includes(k.kind))candidates.push(cell);else excluded.push({...cell,feasible:false,reason:'not assignable to schema field type'});}
 return {version:ts.version,base:'fea80f8',schema:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),kinds,fields,candidates,excluded};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const s=buildSchema();fs.writeFileSync(auditDir+'schema.json',JSON.stringify(s,null,2)+'\n');console.log(JSON.stringify({version:s.version,kinds:s.kinds.length,fields:s.fields.length,candidates:s.candidates.length,structurallyInfeasible:s.excluded.length}));}
