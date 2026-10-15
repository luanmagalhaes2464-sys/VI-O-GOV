import {NextRequest,NextResponse} from 'next/server';
import {Pool,types} from 'pg';
export const runtime='nodejs';
export const dynamic='force-dynamic';
types.setTypeParser(1700,(value:string)=>Number(value));
types.setTypeParser(20,(value:string)=>Number(value));
const globalPool=globalThis as typeof globalThis & {__vicoGovRhPool?:Pool};
function pool(){
 if(!globalPool.__vicoGovRhPool){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL não configurada no site');
  globalPool.__vicoGovRhPool=new Pool({
   connectionString:process.env.DATABASE_URL,max:4,
   idleTimeoutMillis:25000,connectionTimeoutMillis:12000,
   ssl:{rejectUnauthorized:false}
  });
 }
 return globalPool.__vicoGovRhPool;
}
const FONTE='PDF da Folha de Pagamento, Prefeitura Municipal de Viçosa/MG';
const ENDPOINT='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml';
const faixas=[
 ['ate_2','Até R$ 2 mil',null,2000],
 ['2_4','R$ 2–4 mil',2000,4000],
 ['4_6','R$ 4–6 mil',4000,6000],
 ['6_8','R$ 6–8 mil',6000,8000],
 ['8_10','R$ 8–10 mil',8000,10000],
 ['10_12','R$ 10–12 mil',10000,12000],
 ['acima_12','Acima de R$ 12 mil',12000,null]
] as const;
type RHParam={where:string;args:(string|number)[];base:'bruto'|'liquido'};
const json=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
function validation(message:string){throw Object.assign(new Error(message),{httpStatus:422});}
function competencia(p:URLSearchParams){
 const mes=p.get('mes')||'2026-01';
 if(!/^2026-0[1-7]$/.test(mes))validation('Informe um mês entre janeiro e julho de 2026.');
 return mes;
}
function condicao(p:URLSearchParams):RHParam{
 const mes=competencia(p),args:(string|number)[]=[mes+'-01'];
 const clauses=['competencia=$1'];
 const columns={departamento:'departamento',cargo:'cargo',vinculo:'vinculo',local:'local_trabalho',jornada:'jornada'} as const;
 for(const [parameter,column] of Object.entries(columns)){
  const value=p.get(parameter)||'';
  if(value.length>180)validation('Filtro muito longo.');
  if(value){args.push(value);clauses.push(column+'=$'+args.length)}
 }
 const situacao=p.get('situacao')||'';
 const match:Record<string,string>={
  efetivo:"vinculo ILIKE '%EST. EFETIVO%'",
  comissionado:"vinculo ILIKE '%COMISSIONADO%'",
  estavel:"vinculo ILIKE '%ESTAVEL%'",
  aposentado:"(vinculo ILIKE '%APOSENTADO%' OR vinculo ILIKE '%INATIVO%')",
  estagiario:"vinculo ILIKE '%ESTAGI%'"
 };
 if(situacao){if(!(situacao in match))validation('Situação inválida.');clauses.push(match[situacao])}
 const base=(p.get('base')||'bruto');
 if(base!=='bruto'&&base!=='liquido')validation('Base salarial inválida.');
 const faixa=p.get('faixa')||'';
 if(faixa){
  const item=faixas.find(x=>x[0]===faixa);
  if(!item)validation('Faixa salarial inválida.');
  if(item[2]!=null){args.push(item[2]);clauses.push(base+'>$'+args.length)}
  if(item[3]!=null){args.push(item[3]);clauses.push(base+'<=$'+args.length)}
 }
 const busca=(p.get('busca')||'').trim();
 if(busca.length>80)validation('Pesquisa muito longa.');
 if(busca){args.push('%'+busca+'%');const n=args.length;args.push('%'+busca+'%');clauses.push('(nome ILIKE $'+n+' OR matricula ILIKE $'+(n+1)+')')}
 return {where:clauses.join(' AND '),args,base};
}
async function handle(request:NextRequest,{params}:{params:{path:string[]}}){
 const path=params.path;
 const p=request.nextUrl.searchParams;
 try{
  if(path.length===1&&path[0]==='competencias'){
   const result=await pool().query("SELECT to_char(competencia,'YYYY-MM') AS mes,registros,validada,divergencia FROM rh_cargas ORDER BY competencia");
   const available=new Map(result.rows.map((x:{mes:string})=>[x.mes,x]));
   return json({meses:Array.from({length:7},(_,index)=>{
    const mes='2026-'+String(index+1).padStart(2,'0');
    const obj=available.get(mes) as {registros?:number}|undefined;
    return {mes,disponivel:!!obj,registros:obj?.registros??null};
   }),fonte:FONTE});
  }
  const mes=competencia(p);
  if(path.length===1&&path[0]==='resumo'){
   const {rows:[data]}=await pool().query(
    "SELECT COUNT(*)::int AS matriculas,COUNT(DISTINCT nome)::int AS nomes_distintos,COALESCE(SUM(bruto),0) AS bruto,COALESCE(SUM(liquido),0) AS liquido,COALESCE(SUM(descontos),0) AS descontos,COALESCE(SUM(quinquenio),0) AS quinquenio FROM rh_folha_mensal WHERE competencia=$1::date",
    [mes+'-01']);
   const {rows:[carga]}=await pool().query(
    "SELECT paginas_pdf,bruto_portal,divergencia,validada,notas FROM rh_cargas WHERE competencia=$1::date",
    [mes+'-01']);
   if(!carga)return json({mes,disponivel:false,fonte:ENDPOINT});
   return json({mes,disponivel:true,...data,paginas:carga.paginas_pdf,
    bruto_portal:carga.bruto_portal,divergencia:carga.divergencia,conciliado:carga.validada,
    nota:carga.notas,fonte:FONTE,aviso:'Contagem de matrículas da folha; não necessariamente funcionários ativos únicos.'});
  }
  if(path.length===1&&path[0]==='filtros'){
   const cols={departamentos:'departamento',cargos:'cargo',vinculos:'vinculo',locais:'local_trabalho',jornadas:'jornada'};
   const all=await Promise.all(Object.entries(cols).map(async([label,col])=>{
    const result=await pool().query("SELECT DISTINCT "+col+" AS v FROM rh_folha_mensal WHERE competencia=$1::date AND "+col+"<>'' ORDER BY v",[mes+'-01']);
    return [label,result.rows.map((r:{v:string})=>r.v)];
   }));
   return json({mes,...Object.fromEntries(all)});
  }
  const {where,args,base}=condicao(p);
  if(path.length===1&&path[0]==='analise'){
   const query=await pool().query(
    "SELECT COUNT(*)::int AS matriculas,COUNT(DISTINCT nome)::int AS nomes_distintos,COALESCE(SUM(bruto),0) AS bruto,COALESCE(SUM(liquido),0) AS liquido,COALESCE(SUM(descontos),0) AS descontos,COALESCE(SUM(quinquenio),0) AS quinquenio,COALESCE(AVG("+base+"),0) AS media FROM rh_folha_mensal WHERE "+where,args);
   const grouped=async(col:string,limit=30)=>{
    const result=await pool().query("SELECT "+col+" AS nome, COUNT(*)::int AS quantidade,SUM(bruto) AS bruto,SUM(liquido) AS liquido FROM rh_folha_mensal WHERE "+where+" GROUP BY "+col+" ORDER BY quantidade DESC,nome LIMIT "+limit,args);
    return result.rows;
   };
   const [por_departamento,por_cargo,por_vinculo,por_local]=await Promise.all([
    grouped('departamento'),grouped('cargo'),grouped('vinculo'),grouped('local_trabalho')
   ]);
   const bins=await Promise.all(faixas.map(async([codigo,nome,low,high])=>{
    const filters=[where],values=[...args];
    if(low!=null){values.push(low);filters.push(base+'>$'+values.length)}
    if(high!=null){values.push(high);filters.push(base+'<=$'+values.length)}
    const result=await pool().query("SELECT COUNT(*)::int AS quantidade FROM rh_folha_mensal WHERE "+filters.join(' AND '),values);
    return {codigo,nome,quantidade:result.rows[0].quantidade};
   }));
   return json({mes,quantitativos:query.rows[0],faixas:bins,por_departamento,por_cargo,por_vinculo,por_local,fonte:FONTE,nota:'Rubricas e salários referem-se ao mês selecionado, por matrícula.'});
  }
  if(path.length===1&&path[0]==='pessoas'){
   const pagina=Number(p.get('pagina')||1),tamanho=Number(p.get('tamanho')||20);
   if(!Number.isInteger(pagina)||pagina<1||pagina>500||!Number.isInteger(tamanho)||tamanho<1||tamanho>50)validation('Paginação inválida.');
   const count=await pool().query("SELECT COUNT(*)::int AS total FROM rh_folha_mensal WHERE "+where,args);
   const query=await pool().query(
    "SELECT matricula,nome,to_char(admissao,'YYYY-MM-DD') AS admissao,to_char(desligamento,'YYYY-MM-DD') AS desligamento,jornada,cargo,vinculo,departamento,local_trabalho,bruto,liquido,descontos,quinquenio,pagina_pdf,(SELECT (item->>'valor')::numeric FROM jsonb_array_elements(rubricas) AS item WHERE item->>'codigo'='100' LIMIT 1) AS salario_base FROM rh_folha_mensal WHERE "+where+" ORDER BY nome,matricula LIMIT $"+(args.length+1)+" OFFSET $"+(args.length+2),
    [...args,tamanho,(pagina-1)*tamanho]);
   return json({mes,total:count.rows[0].total,pagina,tamanho,pessoas:query.rows,
    nota:'Registros de remuneração públicos por matrícula; não contagem de pessoas ativas.'});
  }
  if(path.length===2&&path[0]==='pessoas'){
   const matricula=path[1];
   if(!/^[0-9]{1,12}$/.test(matricula))validation('Matrícula inválida.');
   const result=await pool().query(
    "SELECT to_char(competencia,'YYYY-MM-DD') AS competencia,matricula,nome,to_char(admissao,'YYYY-MM-DD') AS admissao,to_char(desligamento,'YYYY-MM-DD') AS desligamento,jornada,cargo,vinculo,departamento,local_trabalho,bruto,liquido,descontos,quinquenio,rubricas,pagina_pdf,(SELECT (item->>'valor')::numeric FROM jsonb_array_elements(rubricas) AS item WHERE item->>'codigo'='100' LIMIT 1) AS salario_base FROM rh_folha_mensal WHERE competencia=$1::date AND matricula=$2",
    [mes+'-01',String(Number(matricula))]);
   if(!result.rows.length)return json({detail:'Matrícula não localizada.'},404);
   return json({registro:result.rows[0],fonte:FONTE});
  }
  return json({detail:'Rota não encontrada.'},404);
 }catch(error){
  const err=error as Error&{httpStatus?:number};
  if(err.httpStatus===422)return json({detail:err.message},422);
  console.error('Falha consulta RH /api/rh/folha',path.join('/'),err.message);
  return json({detail:'Consulta ao banco de RH temporariamente indisponível.'},503);
 }
}
export async function GET(request:NextRequest,context:{params:{path:string[]}}){
 return handle(request,context);
}
