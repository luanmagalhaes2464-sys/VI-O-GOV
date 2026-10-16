import {NextRequest,NextResponse} from 'next/server';
import {Pool} from 'pg';
export const dynamic='force-dynamic';
export const runtime='nodejs';
const dbGlobal=globalThis as typeof globalThis & {__rhPainelPool?:Pool};
function pool():Pool{
 if(!dbGlobal.__rhPainelPool){
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error('DATABASE_URL não configurada');
  dbGlobal.__rhPainelPool=new Pool({connectionString:url,ssl:{rejectUnauthorized:false},
    max:5,connectionTimeoutMillis:14000,idleTimeoutMillis:25000});
 }
 return dbGlobal.__rhPainelPool;
}
/**
 * Docentes segundo a FOLHA de RH, não o Censo Escolar:
 * COUNT DISTINCT nome+matrícula, apenas cargos com a palavra PROFESSOR.
 * Múltiplas inclusões no mesmo mês são contadas uma única vez.
 * Matrículas não são necessariamente pessoas únicas ou servidores ativos.
 */
export async function GET(request:NextRequest){
 const mes=request.nextUrl.searchParams.get('mes')||'2026-07';
 if(!/^2026-0[1-7]$/.test(mes))
  return NextResponse.json({error:'Competência inválida (2026-01 a 2026-07)'},{status:422});
 try{
  const rows=await pool().query<{cargo:string;vinculos:string}>({
   text:`SELECT cargo,COUNT(DISTINCT (nome,matricula))::text AS vinculos
     FROM rh_folha_pessoas_2026
     WHERE competencia=$1::date
       AND cargo ~* '(^|[^[:alpha:]])PROFESSOR(A|ES)?([^[:alpha:]]|$)'
     GROUP BY cargo ORDER BY COUNT(DISTINCT (nome,matricula)) DESC,cargo`,
   values:[mes+'-01']
  });
  const cargos=rows.rows.map(x=>({cargo:x.cargo,vinculos:Number(x.vinculos)}));
  // Soma por cargo/matrícula pode contar pessoa que mudou de cargo na competência;
  // contagem agregada independente preserva vínculo único.
  const geral=await pool().query<{total:string;linhas:string}>({
   text:`SELECT COUNT(DISTINCT (nome,matricula))::text AS total,COUNT(*)::text AS linhas
     FROM rh_folha_pessoas_2026
     WHERE competencia=$1::date
       AND cargo ~* '(^|[^[:alpha:]])PROFESSOR(A|ES)?([^[:alpha:]]|$)'`,
   values:[mes+'-01']
  });
  return NextResponse.json({
   mes,total:Number(geral.rows[0]?.total||0),linhas:Number(geral.rows[0]?.linhas||0),cargos,
   origem:'Portal da Transparência de Viçosa · Folha de pagamento importada no Neon',
   tipo:'matriculas_funcionais',filtro:'Cargos cuja descrição contém PROFESSOR ou PROFESSORA',
   ressalva:'Conta matrículas funcionais distintas com cargo de professor na folha; pode incluir vínculos não ativos ou pagamentos complementares e não corresponde a docentes únicos do Censo Escolar.',
   fonte:'https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml'
  },{headers:{'Cache-Control':'private, no-store'}});
 }catch(err){
  console.error('Erro ao consultar professores da educação',(err as Error).message);
  return NextResponse.json({error:'Não foi possível consultar a folha municipal no Neon.'},{status:503});
 }
}
