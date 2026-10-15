import {NextRequest,NextResponse} from 'next/server';
import {Pool,types} from 'pg';
export const runtime='nodejs';
export const dynamic='force-dynamic';
types.setTypeParser(1700,(value:string)=>Number(value));
types.setTypeParser(20,(value:string)=>Number(value));
const g=globalThis as typeof globalThis & {__vicoRhMultiPool?:Pool};
function db():Pool{
 if(!g.__vicoRhMultiPool){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL do RH não configurada');
  g.__vicoRhMultiPool=new Pool({connectionString:process.env.DATABASE_URL,max:4,
    connectionTimeoutMillis:12000,idleTimeoutMillis:25000,ssl:{rejectUnauthorized:false}});
 }
 return g.__vicoRhMultiPool;
}
const ALL=Array.from({length:7},(_,i)=>'2026-'+String(i+1).padStart(2,'0'));
const BINS=[
 ['ate_2','Até R$ 2 mil',null,2000],['2_4','R$ 2 a 4 mil',2000,4000],
 ['4_6','R$ 4 a 6 mil',4000,6000],['6_8','R$ 6 a 8 mil',6000,8000],
 ['8_10','R$ 8 a 10 mil',8000,10000],['10_12','R$ 10 a 12 mil',10000,12000],
 ['acima_12','Acima de R$ 12 mil',12000,null]
] as const;
const fail=(message:string)=>{throw Object.assign(new Error(message),{httpStatus:422});};
export async function GET(request:NextRequest){
 try{
  const p=request.nextUrl.searchParams;
  const chosen=(p.get('meses')||'2026-01').split(',').map(s=>s.trim());
  if(chosen.length<1||chosen.length>7||new Set(chosen).size!==chosen.length||
    chosen.some(x=>!ALL.includes(x)))fail('Selecione de um a sete meses distintos entre janeiro e julho de 2026.');
  chosen.sort();
  const params:(string[]|string|number)[]=[chosen.map(x=>x+'-01')];
  const conditions=['competencia=ANY($1::date[])'];
  const mapping={departamento:'departamento',cargo:'cargo',vinculo:'vinculo',
    local:'local_trabalho',jornada:'jornada'} as const;
  for(const [param,col] of Object.entries(mapping)){
   const value=p.get(param)?.trim()||'';
   if(value.length>180)fail('Um dos filtros é muito longo.');
   if(value){params.push(value);conditions.push(col+'=$'+params.length)}
  }
  const statuses:Record<string,string>={
   efetivo:"vinculo ILIKE '%EST. EFETIVO%'",
   comissionado:"vinculo ILIKE '%COMISSIONADO%'",
   estavel:"vinculo ILIKE '%ESTAVEL%'",
   aposentado:"(vinculo ILIKE '%APOSENTADO%' OR vinculo ILIKE '%INATIVO%')",
   estagiario:"vinculo ILIKE '%ESTAGI%'"
  };
  const tipo=p.get('situacao')||'';
  if(tipo){if(!statuses[tipo])fail('Situação inválida.');conditions.push(statuses[tipo])}
  const base=p.get('base')||'bruto';
  if(base!=='bruto'&&base!=='liquido')fail('Base salarial inválida.');
  const bin=p.get('faixa')||'';
  if(bin){
   const band=BINS.find(x=>x[0]===bin);
   if(!band)fail('Faixa salarial inválida.');
   if(band[2]!==null){params.push(band[2]);conditions.push(base+'>$'+params.length)}
   if(band[3]!==null){params.push(band[3]);conditions.push(base+'<=$'+params.length)}
  }
  const busca=p.get('busca')?.trim()||'';
  if(busca.length>80)fail('Pesquisa muito longa.');
  if(busca){params.push('%'+busca+'%');let i=params.length;params.push('%'+busca+'%');
   conditions.push('(nome ILIKE $'+i+' OR matricula ILIKE $'+(i+1)+')')}
  const where=conditions.join(' AND ');
  const group=async(field:string,limit=24)=>{
   const r=await db().query('SELECT '+field+' AS nome,COUNT(*)::int AS registros_mes,COUNT(DISTINCT matricula)::int AS matriculas_distintas,COALESCE(SUM(bruto),0) AS bruto FROM rh_folha_mensal WHERE '+where+' GROUP BY '+field+' ORDER BY registros_mes DESC,nome LIMIT '+limit,params);
   return r.rows;
  };
  const [available,monthly,aggregates,departamentos,cargos,vinculos,locations]=await Promise.all([
   db().query("SELECT to_char(competencia,'YYYY-MM') AS mes, registros, validada, divergencia FROM rh_cargas WHERE competencia=ANY($1::date[]) ORDER BY competencia",[chosen.map(x=>x+'-01')]),
   db().query("SELECT to_char(competencia,'YYYY-MM') AS mes,COUNT(*)::int AS registros_mes,COUNT(DISTINCT matricula)::int AS matriculas_distintas,COUNT(DISTINCT nome)::int AS nomes_distintos,COALESCE(SUM(bruto),0) AS bruto,COALESCE(SUM(liquido),0) AS liquido,COALESCE(SUM(descontos),0) AS descontos,COALESCE(SUM(quinquenio),0) AS quinquenio FROM rh_folha_mensal WHERE "+where+" GROUP BY competencia ORDER BY competencia",params),
   db().query("SELECT COUNT(*)::int AS registros_mes,COUNT(DISTINCT matricula)::int AS matriculas_distintas,COUNT(DISTINCT nome)::int AS nomes_distintos,COALESCE(SUM(bruto),0) AS bruto,COALESCE(SUM(liquido),0) AS liquido,COALESCE(SUM(descontos),0) AS descontos,COALESCE(SUM(quinquenio),0) AS quinquenio FROM rh_folha_mensal WHERE "+where,params),
   group('departamento'),group('cargo'),group('vinculo'),group('local_trabalho')
  ]);
  const ready=new Map(available.rows.map(x=>[x.mes,x]));
  const byMonth=new Map(monthly.rows.map(x=>[x.mes,x]));
  const mensal=chosen.map(m=>{
   const provenance=ready.get(m),data=byMonth.get(m);
   if(!provenance)return {mes:m,disponivel:false,indicadores:null};
   return {mes:m,disponivel:true,conciliado:provenance.validada===true,
      divergencia:provenance.divergencia??null,
      indicadores:data||{registros_mes:0,matriculas_distintas:0,nomes_distintos:0,bruto:0,liquido:0,descontos:0,quinquenio:0}};
  });
  const pendentes=chosen.filter(m=>!ready.has(m));
  const arr:string[]=[];
  const faixas=await Promise.all(BINS.map(async([codigo,nome,low,high])=>{
   const parts=[where],values=[...params];
   if(low!==null){values.push(low);parts.push(base+'>$'+values.length)}
   if(high!==null){values.push(high);parts.push(base+'<=$'+values.length)}
   const res=await db().query('SELECT COUNT(*)::int AS registros_mes,COUNT(DISTINCT matricula)::int AS matriculas_distintas FROM rh_folha_mensal WHERE '+parts.join(' AND '),values);
   return {codigo,nome,...res.rows[0]};
  }));
  const page=Number(p.get('pagina')||1),size=20;
  if(!Number.isInteger(page)||page<1||page>500)fail('Página inválida.');
  const list=await db().query(
   "SELECT to_char(competencia,'YYYY-MM') AS mes,matricula,nome,to_char(admissao,'YYYY-MM-DD') AS admissao,jornada,cargo,vinculo,departamento,local_trabalho,bruto,liquido,quinquenio FROM rh_folha_mensal WHERE "+where+" ORDER BY competencia DESC,nome,matricula LIMIT $"+(params.length+1)+" OFFSET $"+(params.length+2),
   [...params,size,(page-1)*size]);
  const options:Record<string,string[]>={};
  for(const [key,col] of Object.entries(mapping)){
   const opts=await db().query("SELECT DISTINCT "+col+" AS valor FROM rh_folha_mensal WHERE competencia=ANY($1::date[]) AND "+col+"<>'' ORDER BY valor",[chosen.map(x=>x+'-01')]);
   options[key]=opts.rows.map(x=>x.valor);
  }
  return NextResponse.json({
   meses_solicitados:chosen,meses_disponiveis:chosen.filter(x=>ready.has(x)),meses_pendentes:pendentes,
   periodo_completo:pendentes.length===0,
   por_mes:mensal,totais_disponiveis:ready.size>0?aggregates.rows[0]:null,
   faixas:ready.size>0?faixas:[],por_departamento:departamentos,por_cargo:cargos,por_vinculo:vinculos,
   por_local:locations,registros:list.rows,pagina:page,tamanho:size,
   opcoes:options,
   fonte:'Folha de Pagamento da Prefeitura de Viçosa/MG; bases mensais disponíveis no Neon.',
   observacao:'Valores financeiros acumulados somam competências carregadas. Registros-mês repetem uma mesma matrícula em meses diferentes; matrículas distintas contam o identificador apenas uma vez no período. Não são contagem comprovada de pessoas físicas únicas. Meses pendentes nunca são tratados como zero.'
  },{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const error=e as Error&{httpStatus?:number};
  if(error.httpStatus===422)return NextResponse.json({error:error.message},{status:422});
  console.error('RH multiperiodo',error.message);
  return NextResponse.json({error:'Não foi possível consultar os períodos no banco.'},{status:503});
 }
}
