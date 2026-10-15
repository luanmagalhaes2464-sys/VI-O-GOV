import {NextRequest,NextResponse} from 'next/server';
import {Pool,types} from 'pg';
export const runtime='nodejs';
export const dynamic='force-dynamic';
types.setTypeParser(1700,(n:string)=>Number(n));
types.setTypeParser(20,(n:string)=>Number(n));
const shared=globalThis as typeof globalThis & {__rhExplorePool?:Pool};
function db(){
 if(!shared.__rhExplorePool){
  if(!process.env.DATABASE_URL)throw Error('DATABASE_URL não configurada');
  shared.__rhExplorePool=new Pool({connectionString:process.env.DATABASE_URL,
   max:4,connectionTimeoutMillis:14000,idleTimeoutMillis:25000,ssl:{rejectUnauthorized:false}});
 }
 return shared.__rhExplorePool;
}
const mesesPermitidos=Array.from({length:7},(_,i)=>'2026-'+String(i+1).padStart(2,'0'));
const faixas=[
 ['ate_2',null,2000],['2_4',2000,4000],['4_6',4000,6000],['6_8',6000,8000],
 ['8_10',8000,10000],['10_12',10000,12000],['acima_12',12000,null]
] as const;
function invalid(message:string):never{throw Object.assign(new Error(message),{httpStatus:422});}
function params(q:URLSearchParams,modo:'departamento'|'cargo'){
 const months=(q.get('meses')||'2026-01').split(',').map(x=>x.trim()).sort();
 if(months.length<1||months.length>7||new Set(months).size!==months.length||months.some(x=>!mesesPermitidos.includes(x)))invalid('Competências inválidas.');
 const args:(string|string[]|number)[]=[months.map(x=>x+'-01')];
 const conditions=['competencia=ANY($1::date[])'];
 const columns={departamento:'departamento',cargo:'cargo',vinculo:'vinculo',local:'local_trabalho',jornada:'jornada'};
 const target=q.get('valor')||'';
 if(target.length<1||target.length>250)invalid('Categoria selecionada inválida.');
 for(const [key,column] of Object.entries(columns)){
  const value=key===modo?target:(q.get(key)||'');
  if(value.length>250)invalid('Filtro inválido.');
  if(value){args.push(value);conditions.push(column+'=$'+args.length)}
 }
 const situations:Record<string,string>={
  efetivo:"vinculo ILIKE '%EFETIVO%'",
  comissionado:"vinculo ILIKE '%COMISSIONADO%'",
  aposentado:"(vinculo ILIKE '%APOSENTADO%' OR vinculo ILIKE '%INATIVO%')",
  estagiario:"vinculo ILIKE '%ESTAGI%'",
  contratado:"vinculo ILIKE '%CONTRATO%'"
 };
 const situacao=q.get('situacao')||'';
 if(situacao){if(!situations[situacao])invalid('Situação funcional inválida.');conditions.push(situations[situacao]);}
 const base=q.get('base')||'bruto';
 if(base!=='bruto'&&base!=='liquido')invalid('Base salarial inválida.');
 const faixa=q.get('faixa')||'';
 if(faixa){
  const item=faixas.find(x=>x[0]===faixa);
  if(!item)invalid('Faixa salarial inválida.');
  if(item[1]!==null){args.push(item[1]);conditions.push(base+'>$'+args.length);}
  if(item[2]!==null){args.push(item[2]);conditions.push(base+'<=$'+args.length);}
 }
 const busca=(q.get('busca')||'').trim();
 if(busca.length>80)invalid('Pesquisa longa demais.');
 if(busca){args.push('%'+busca+'%');const n=args.length;args.push('%'+busca+'%');
  conditions.push('(nome ILIKE $'+n+' OR matricula ILIKE $'+(n+1)+')');
 }
 const pagina=Number(q.get('pagina')||'1');
 if(!Number.isInteger(pagina)||pagina<1||pagina>1000)invalid('Página inválida.');
 return {months,args,where:conditions.join(' AND '),pagina,target};
}
type Rubrica={codigo:string;rubrica:string;tipo?:string;valor:number};
function normalize(raw:unknown,comp:string):Rubrica[]{
 if(!Array.isArray(raw))return [];
 return raw.filter(x=>x&&typeof x==='object').map((item:Record<string,unknown>)=>{
  const code=String(item.codigo||'');
  const label=String(item.rubrica||'Não informado');
  const type=String(item.tipo||'').toUpperCase();
  const kind=type.includes('DESCONTO')||(!type&&comp==='2026-01'&&code==='400')?'DESCONTO':'PROVENTO';
  return {codigo:code,rubrica:label,tipo:kind,valor:Number(item.valor||0)};
 });
}
export async function GET(request:NextRequest){
 const q=request.nextUrl.searchParams;
 try{
  if(q.get('modo')==='pessoa'){
   const id=Number(q.get('id'));
   if(!Number.isSafeInteger(id)||id<1)invalid('Identificador de matrícula inválido.');
   const result=await db().query(
    "SELECT id,to_char(competencia,'YYYY-MM') AS mes,matricula,nome,to_char(admissao,'DD/MM/YYYY') AS admissao,cargo,vinculo,departamento,local_trabalho,jornada,bruto,descontos,liquido,quinquenio,salario_base,inclusoes_pagamento FROM rh_folha_pessoas_2026 WHERE id=$1",
    [id]);
   const pessoa=result.rows[0];
   if(!pessoa)return NextResponse.json({error:'Registro não localizado.'},{status:404});
   const other=await db().query(
    "SELECT tipo_inclusao,bruto,descontos,liquido,salario_base,quinquenio,rubricas FROM rh_folha_analitica_2026 WHERE competencia=$1::date AND matricula=$2 AND nome=$3 AND cargo=$4 ORDER BY tipo_inclusao",
    [pessoa.mes+'-01',pessoa.matricula,pessoa.nome,pessoa.cargo]);
   const inclusoes=other.rows.map((r:{tipo_inclusao:string;rubricas:unknown;bruto:number;descontos:number;liquido:number;salario_base:number;quinquenio:number})=>({
    tipo_inclusao:r.tipo_inclusao,bruto:r.bruto,descontos:r.descontos,liquido:r.liquido,
    salario_base:r.salario_base,quinquenio:r.quinquenio,
    rubricas:normalize(r.rubricas,pessoa.mes)
   }));
   return NextResponse.json({pessoa,inclusoes,fonte:pessoa.mes==='2026-01'?'PDF oficial fornecido pelo usuário':'CSV oficial fornecido pelo usuário',
     explicacao:'O detalhamento mostra rubricas registradas na folha (salário-base, adicionais, gratificações, férias, décimo terceiro, quinquênio e descontos, quando presentes). A fonte não descreve a motivação administrativa de cada lançamento. Valores por inclusão são somados no vínculo mensal.'},
    {headers:{'Cache-Control':'no-store'}});
  }
  const modo=q.get('modo');
  if(modo!=='cargo'&&modo!=='departamento')invalid('Tipo de exploração inválido.');
  const {where,args,pagina,target,months}=params(q,modo);
  const [resumo,list]=await Promise.all([
   db().query("SELECT COUNT(*)::int AS vinculos_mes,COUNT(DISTINCT (nome,matricula))::int AS vinculos_distintos,COALESCE(SUM(bruto),0) AS bruto,COALESCE(SUM(liquido),0) AS liquido,COALESCE(AVG(bruto),0) AS media_bruta,COALESCE(SUM(quinquenio),0) AS quinquenio FROM rh_folha_pessoas_2026 WHERE "+where,args),
   db().query(
    "SELECT id,to_char(competencia,'YYYY-MM') AS mes,matricula,nome,cargo,departamento,bruto,liquido,quinquenio,inclusoes_pagamento FROM rh_folha_pessoas_2026 WHERE "+where+" ORDER BY bruto DESC,competencia DESC,nome,matricula LIMIT 25 OFFSET $"+(args.length+1),
    [...args,(pagina-1)*25])
  ]);
  return NextResponse.json({modo,nome:target,meses:months,resumo:resumo.rows[0],pessoas:list.rows,pagina,tamanho:25,
   observacao:'Valores individuais são por vínculo e por competência. Ao selecionar vários meses, o total soma todos os lançamentos correspondentes e uma pessoa pode aparecer em mais de um mês.'},
   {headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const err=e as Error&{httpStatus?:number};
  if(err.httpStatus===422)return NextResponse.json({error:err.message},{status:422});
  console.error('Falha explorar RH',err.message);
  return NextResponse.json({error:'Não foi possível consultar o detalhamento de RH.'},{status:503});
 }
}
