import {NextRequest,NextResponse} from 'next/server';
import {Pool,types} from 'pg';
export const dynamic='force-dynamic';
export const runtime='nodejs';
types.setTypeParser(1700,(s:string)=>Number(s));
types.setTypeParser(20,(s:string)=>Number(s));
const globalDb=globalThis as typeof globalThis&{__rhPainelPool?:Pool};
function db():Pool{
 if(!globalDb.__rhPainelPool){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL não configurada');
  globalDb.__rhPainelPool=new Pool({connectionString:process.env.DATABASE_URL,
   ssl:{rejectUnauthorized:false},max:5,connectionTimeoutMillis:14000,idleTimeoutMillis:25000});
 }
 return globalDb.__rhPainelPool;
}
const allowed=Array.from({length:7},(_,i)=>'2026-'+String(i+1).padStart(2,'0'));
const bands=[
 ['ate_2',null,2000],['2_4',2000,4000],['4_6',4000,6000],
 ['6_8',6000,8000],['8_10',8000,10000],['10_12',10000,12000],
 ['acima_12',12000,null]
] as const;
function invalid(msg:string):never{throw Object.assign(new Error(msg),{httpStatus:422});}
export async function GET(req:NextRequest){
 try{
  const q=req.nextUrl.searchParams;
  const selected=(q.get('meses')||'2026-01').split(',').map(x=>x.trim()).sort();
  if(!selected.length||selected.length>7||new Set(selected).size!==selected.length||selected.some(x=>!allowed.includes(x)))
   invalid('Meses inválidos: selecione de janeiro a julho de 2026.');
  const params:(string|string[]|number)[]=[selected.map(m=>m+'-01')];
  const where=['competencia=ANY($1::date[])'];
  const mapped={departamento:'departamento',cargo:'cargo',vinculo:'vinculo',local:'local_trabalho',jornada:'jornada'} as const;
  for(const [key,col] of Object.entries(mapped)){
   const value=q.get(key)||'';
   if(value.length>200)invalid('Filtro excedeu limite.');
   if(value){params.push(value);where.push(col+'=$'+params.length);}
  }
  const classifications:Record<string,string>={
   efetivo:"vinculo ILIKE '%EFETIVO%'",
   comissionado:"vinculo ILIKE '%COMISSIONADO%'",
   aposentado:"(vinculo ILIKE '%APOSENTADO%' OR vinculo ILIKE '%INATIVO%')",
   estagiario:"vinculo ILIKE '%ESTAGI%'",
   contratado:"vinculo ILIKE '%CONTRATO%'",
  };
  const status=q.get('situacao')||'';
  if(status){if(!classifications[status])invalid('Vínculo não reconhecido.');where.push(classifications[status]);}
  const base=q.get('base')||'bruto';
  if(base!=='bruto'&&base!=='liquido')invalid('Base inválida.');
  const faixa=q.get('faixa')||'';
  if(faixa){
   const band=bands.find(b=>b[0]===faixa);
   if(!band)invalid('Faixa não reconhecida.');
   if(band[1]!==null){params.push(band[1]);where.push(base+'>$'+params.length)}
   if(band[2]!==null){params.push(band[2]);where.push(base+'<=$'+params.length)}
  }
  const busca=(q.get('busca')||'').trim();
  if(busca.length>80)invalid('Pesquisa longa demais.');
  if(busca){params.push('%'+busca+'%');const i=params.length;params.push('%'+busca+'%');
   where.push('(nome ILIKE $'+i+' OR matricula ILIKE $'+(i+1)+')');}
  const clause=where.join(' AND ');
  const pool=db();
  const [statusData,totais,mensal,department,positions,pay,groupLinks,optionsRows]=await Promise.all([
   pool.query("SELECT to_char(competencia,'YYYY-MM') AS mes,fonte,fonte_conferida,registros_pagamento,pessoas_nominais,bruto,descontos,liquido,quinquenio FROM rh_analitica_cargas_2026 WHERE competencia=ANY($1::date[]) ORDER BY competencia",[selected.map(x=>x+'-01')]),
   pool.query("SELECT COUNT(*)::int AS vinculos_mes,COUNT(DISTINCT (nome,matricula))::int AS vinculos_distintos,COUNT(DISTINCT nome)::int AS nomes_distintos,COALESCE(SUM(bruto),0) AS bruto,COALESCE(SUM(liquido),0) AS liquido,COALESCE(SUM(descontos),0) AS descontos,COALESCE(SUM(quinquenio),0) AS quinquenio FROM rh_folha_pessoas_2026 WHERE "+clause,params),
   pool.query("SELECT to_char(competencia,'YYYY-MM') AS mes,COUNT(*)::int AS vinculos_mes,COUNT(DISTINCT (nome,matricula))::int AS vinculos_distintos,COALESCE(SUM(bruto),0) AS bruto,COALESCE(SUM(liquido),0) AS liquido,COALESCE(SUM(quinquenio),0) AS quinquenio FROM rh_folha_pessoas_2026 WHERE "+clause+" GROUP BY competencia ORDER BY competencia",params),
   pool.query("SELECT departamento AS nome,COUNT(*)::int AS quantidade,COALESCE(SUM(bruto),0) AS bruto FROM rh_folha_pessoas_2026 WHERE "+clause+" GROUP BY departamento ORDER BY quantidade DESC,nome LIMIT 50",params),
   pool.query("SELECT cargo AS nome,COUNT(*)::int AS quantidade,COALESCE(SUM(bruto),0) AS bruto FROM rh_folha_pessoas_2026 WHERE "+clause+" GROUP BY cargo ORDER BY quantidade DESC,nome LIMIT 16",params),
   pool.query("SELECT cargo AS nome,COUNT(*)::int AS quantidade,ROUND(AVG(bruto),2) AS media_bruta,MAX(bruto) AS maior_remuneracao FROM rh_folha_pessoas_2026 WHERE "+clause+" GROUP BY cargo HAVING COUNT(*)>=3 ORDER BY media_bruta DESC,nome LIMIT 15",params),
   pool.query("SELECT vinculo AS nome,COUNT(*)::int AS quantidade FROM rh_folha_pessoas_2026 WHERE "+clause+" GROUP BY vinculo ORDER BY quantidade DESC,nome LIMIT 30",params),
   pool.query("SELECT departamento,cargo,vinculo,local_trabalho AS local,jornada FROM rh_folha_pessoas_2026 WHERE competencia=ANY($1::date[]) GROUP BY departamento,cargo,vinculo,local_trabalho,jornada LIMIT 12000",[selected.map(x=>x+'-01')])
  ]);
  const page=Number(q.get('pagina')||'1');
  if(!Number.isInteger(page)||page<1||page>500)invalid('Página inválida.');
  const records=await pool.query(
   "SELECT id,to_char(competencia,'YYYY-MM') AS mes,matricula,nome,to_char(admissao,'DD/MM/YYYY') AS admissao,cargo,vinculo,departamento,local_trabalho AS local,jornada,bruto,liquido,quinquenio,inclusoes_pagamento FROM rh_folha_pessoas_2026 WHERE "+clause+" ORDER BY competencia DESC,nome,matricula LIMIT 20 OFFSET $"+(params.length+1),[...params,(page-1)*20]);
  const meta=new Map(statusData.rows.map(x=>[x.mes,x]));
  const byMonth=new Map(mensal.rows.map(x=>[x.mes,x]));
  const months=selected.map(m=>({
    mes:m,disponivel:meta.has(m),indicadores:meta.has(m)?(byMonth.get(m)||{vinculos_mes:0,vinculos_distintos:0,bruto:0,liquido:0,quinquenio:0}):null,
    fonte:meta.get(m)?.fonte||null
  }));
  const options:Record<string,string[]>={departamento:[],cargo:[],vinculo:[],local:[],jornada:[]};
  for(const key of Object.keys(options)){
   options[key]=Array.from(new Set(optionsRows.rows.map(r=>r[key] as string).filter(Boolean))).sort((a,b)=>a.localeCompare(b,'pt-BR'));
  }
  return NextResponse.json({
    meses:selected,competencias:months,cobertura:months.filter(x=>x.disponivel).length,
    totais:totais.rows[0],por_departamento:department.rows,por_cargo:positions.rows,
    maiores_salarios:pay.rows,por_vinculo:groupLinks.rows,
    pessoas:records.rows,opcoes:options,pagina:page,
    criterio_salario:'Média da remuneração bruta de cada vínculo por competência; cargos com ao menos três observações no período.',
    aviso:'Vínculos-mês são registros remuneratórios agrupados por matrícula, pessoa e competência. Um servidor pode ter mais de um vínculo. Janeiro tem divergência histórica entre o PDF e o total exibido no portal. Fevereiro a julho vieram de CSVs fornecidos pelo usuário, não de coletor automático.'
   },{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  const err=e as Error&{httpStatus?:number};
  if(err.httpStatus===422)return NextResponse.json({error:err.message},{status:422});
  console.error('Falha painel RH',err.message);
  return NextResponse.json({error:'Falha ao consultar a folha de RH.'},{status:503});
 }
}
