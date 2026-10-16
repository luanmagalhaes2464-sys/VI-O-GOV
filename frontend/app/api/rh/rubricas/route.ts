import {NextRequest,NextResponse} from 'next/server';
import {Pool} from 'pg';
import {categoriaRubrica} from '../../../../lib/rh-auditoria-engine';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const glob=globalThis as typeof globalThis&{__rhPainelPool?:Pool};
function pool(){
 if(!glob.__rhPainelPool){
  const url=process.env.DATABASE_URL;if(!url)throw new Error('DATABASE_URL ausente');
  glob.__rhPainelPool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},max:5,connectionTimeoutMillis:14000,idleTimeoutMillis:25000});
 }
 return glob.__rhPainelPool;
}
type Item={tipo?:string;codigo?:string;rubrica?:string;valor?:number|string};
type Linha={matricula:string;nome:string;cargo:string;departamento:string;rubricas:Item[]|null};
type Registro={matricula:string;nome:string;cargo:string;departamento:string;centavos:number;rubricas:Set<string>};
type NomeRubrica={codigo:string;nome:string;centavos:number;ocorrencias:number};
const categorias=['13º salário','Férias e adicionais','Indenizações','Retroativos','Demais rubricas'];
const cents=(x:unknown)=>{const n=Number(x??0);return Number.isFinite(n)?Math.round(n*100):0};
const reais=(x:number)=>Math.round(x)/100;
export async function GET(req:NextRequest){
 const q=req.nextUrl.searchParams;
 const mes=q.get('mes')||'2026-07';
 const categoria=q.get('categoria')||'Demais rubricas';
 const rubrica=q.get('rubrica')||'';
 const busca=(q.get('busca')||'').trim().toLocaleLowerCase('pt-BR');
 const pagina=Number(q.get('pagina')||1);
 if(!/^2026-0[1-7]$/.test(mes)||!categorias.includes(categoria)||rubrica.length>200||busca.length>100||!Number.isSafeInteger(pagina)||pagina<1||pagina>1000)
  return NextResponse.json({error:'Parâmetros inválidos.'},{status:422});
 try{
  const rows=await pool().query<Linha>({
   text:`SELECT matricula,nome,cargo,departamento,rubricas FROM rh_folha_analitica_2026 WHERE competencia=$1::date ORDER BY nome,matricula`,
   values:[mes+'-01']
  });
  const breakdown=new Map<string,NomeRubrica>();
  const pessoas=new Map<string,Registro>();
  let totalCategoria=0,valorFiltrado=0,ocorrencias=0;
  for(const r of rows.rows){
   const itens=Array.isArray(r.rubricas)?r.rubricas:[];
   for(const item of itens){
    const codigo=String(item.codigo||'').padStart(4,'0');
    const nome=String(item.rubrica||'Sem descrição').trim();
    const tipo=String(item.tipo||(codigo==='0400'||nome.toUpperCase()==='DESCONTOS'?'DESCONTO':'PROVENTO')).toUpperCase();
    if(tipo!=='PROVENTO')continue;
    if(categoriaRubrica(codigo,nome.toUpperCase())!==categoria)continue;
    const valor=cents(item.valor);
    const k=JSON.stringify([codigo,nome]);
    totalCategoria+=valor;
    const b=breakdown.get(k)||{codigo,nome,centavos:0,ocorrencias:0};
    b.centavos+=valor;b.ocorrencias++;breakdown.set(k,b);
    if(rubrica&&k!==rubrica)continue;
    valorFiltrado+=valor;ocorrencias++;
    const pKey=JSON.stringify([r.matricula,r.nome]);
    const p=pessoas.get(pKey)||{matricula:String(r.matricula),nome:r.nome,cargo:r.cargo,departamento:r.departamento,centavos:0,rubricas:new Set<string>()};
    p.centavos+=valor;p.rubricas.add(nome);pessoas.set(pKey,p);
   }
  }
  const rubricas=[...breakdown.entries()].map(([chave,v])=>({
   chave,codigo:v.codigo,nome:v.nome,valor:reais(v.centavos),ocorrencias:v.ocorrencias
  })).sort((a,b)=>b.valor-a.valor||a.nome.localeCompare(b.nome,'pt-BR'));
  const pessoasFiltradas=[...pessoas.values()].filter(p=>!busca||[p.nome,p.matricula,p.cargo,p.departamento].some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(busca)))
   .sort((a,b)=>b.centavos-a.centavos||a.nome.localeCompare(b.nome,'pt-BR'));
  const tamanho=35;
  const paginadas=pessoasFiltradas.slice((pagina-1)*tamanho,pagina*tamanho).map(p=>({
   nome:p.nome,matricula:p.matricula,cargo:p.cargo,departamento:p.departamento,valor:reais(p.centavos),rubricas:[...p.rubricas]
  }));
  return NextResponse.json({
   mes,categoria,rubrica,total_categoria:reais(totalCategoria),valor_selecionado:reais(valorFiltrado),
   total_rubricas:rubricas.length,rubricas,pessoas:paginadas,total_pessoas:pessoasFiltradas.length,
   pagina,tamanho,ocorrencias,
   fonte:'https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml',
   nota:'Valores de rubricas de PROVENTOS nas inclusões da folha. Pessoas agrupadas por nome e matrícula; uma matrícula pode ter várias inclusões e rubricas. Não confundir total de rubricas com remuneração completa ou pagamentos bancários.'
  },{headers:{'Cache-Control':'private, no-store'}});
 }catch(err){
  console.error('Detalhamento de rubricas RH',(err as Error).message);
  return NextResponse.json({error:'Não foi possível obter as rubricas da competência no Neon.'},{status:503});
 }
}
