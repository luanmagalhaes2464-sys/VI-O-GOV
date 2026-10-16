import {NextRequest,NextResponse} from 'next/server';
import {Pool} from 'pg';
import {secretarias} from '../../../../lib/secretarias';
export const runtime='nodejs';
export const dynamic='force-dynamic';

const globals=globalThis as typeof globalThis & {__rhPainelPool?:Pool};
function banco(){
 if(!globals.__rhPainelPool){
  if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL não configurada no frontend');
  globals.__rhPainelPool=new Pool({connectionString:process.env.DATABASE_URL,
   ssl:{rejectUnauthorized:false},max:5,connectionTimeoutMillis:14000,idleTimeoutMillis:25000});
 }
 return globals.__rhPainelPool;
}
const departamentos:Record<string,string>={
 'SEC. MUN. DE EDUCACAO E ESPORTES - SEMEE':'educacao-esportes',
 'SECRETARIA MUNICIPAL DE SAUDE - SEMSA':'saude',
 'SECRETARIA MUNICIPAL DE ADMINISTRACAO - SEMAD':'administracao',
 'SEC. MUN. DE SERVICOS INTEGRADOS - SEMSI':'servicos-integrados',
 'SECRETARIA MUNICIPAL DE ASSISTENCIA SOCIAL -SEMAS':'assistencia-social',
 'SEC. MUN. PLANEJ., MOBILIDADE E GESTAO TERRITORIAL':'planejamento-mobilidade-territorio',
 'SECRETARIA MUNICIPAL DE GESTAO FINANCEIRA - SEMGF':'gestao-financeira',
 'SECRETARIA MUNICIPAL DE GOVERNO - SEGOV':'governo',
 'SEC. MUN. DE CULTURA, EVENTOS, TURISMO E JUVENTUDE':'cultura-turismo-juventude',
 'SEC. MUN. DESENV. ECON., EMPREEND. E INOVACAO':'desenvolvimento-economico',
 'SEC. MUN. DE MEIO AMB., BIOD. E REC. HIDRICOS':'meio-ambiente',
 'SECRETARIA MUNICIPAL DE AGROPECUARIA - SEMAG':'agropecuaria'
};
type Row={departamento:string|null;vinculos:number;registros:number;bruto:string};
export async function GET(req:NextRequest){
 const mes=req.nextUrl.searchParams.get('mes')||'2026-07';
 if(!/^2026-0[1-7]$/.test(mes))
  return NextResponse.json({error:'Selecione uma competência de janeiro a julho de 2026.'},{status:422});
 try{
  const resultado=await banco().query<Row>({
   text:`SELECT departamento,
          COUNT(DISTINCT (nome,matricula))::int AS vinculos,
          COUNT(*)::int AS registros,
          COALESCE(SUM(bruto),0)::numeric AS bruto
        FROM rh_folha_pessoas_2026
        WHERE competencia=$1::date
        GROUP BY departamento ORDER BY departamento`,
   values:[mes+'-01']
  });
  if(!resultado.rows.length)
   return NextResponse.json({mes,disponivel:false,secretarias:[],outros:[],
    aviso:'Não existem lançamentos da folha para esta competência. Dados indisponíveis não equivalem a zero.'},
    {headers:{'Cache-Control':'private, no-store'}});
  const agrupados=new Map<string,{vinculos:number;registros:number;bruto:number;departamentos:string[]}>();
  const outros:{departamento:string;vinculos:number;bruto:number}[]=[];
  for(const item of resultado.rows){
   const departamento=String(item.departamento||'').trim();
   const slug=departamentos[departamento];
   const vinculos=Number(item.vinculos||0),registros=Number(item.registros||0),bruto=Number(item.bruto||0);
   if(!slug){outros.push({departamento:departamento||'Não informado',vinculos,bruto});continue;}
   const atual=agrupados.get(slug)||{vinculos:0,registros:0,bruto:0,departamentos:[]};
   atual.vinculos+=vinculos;atual.registros+=registros;atual.bruto+=bruto;atual.departamentos.push(departamento);
   agrupados.set(slug,atual);
  }
  return NextResponse.json({
   mes,disponivel:true,
   secretarias:secretarias.map(s=>{
    const item=agrupados.get(s.slug);
    return {slug:s.slug,sigla:s.sigla,nome:s.nome,curto:s.curto,
      vinculos:item?.vinculos??null,registros:item?.registros??null,
      bruto:item?Math.round(item.bruto*100)/100:null,
      departamentos:item?.departamentos||[],situacao:item?'identificado':'nao_identificado_na_folha'};
   }),
   outros,
   total_bruto_da_folha:Math.round(resultado.rows.reduce((acc,row)=>acc+Number(row.bruto||0),0)*100)/100,
   fonte:'https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml',
   metodologia:'Vínculos são nome + matrícula distintos por departamento e competência. A soma de remunerações brutas vem da folha pública importada no Neon. Pode haver múltiplos vínculos da mesma pessoa ou lançamentos pós-desligamento. Não equivale ao orçamento da secretaria nem ao quadro ativo.',
   ressalva:'Janeiro de 2026 tem ressalva histórica de conciliação do PDF com o portal; fevereiro a julho foram importados de CSVs fornecidos.'
  },{headers:{'Cache-Control':'private, no-store'}});
 }catch(err){
  console.error('Erro Visão Geral por secretarias',(err as Error).message);
  return NextResponse.json({error:'Não foi possível consultar a folha municipal no banco de dados.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
