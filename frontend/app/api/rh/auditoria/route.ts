import {NextRequest,NextResponse} from 'next/server';
import {Pool} from 'pg';
import {auditarFolha,type Linha} from '../../../../lib/rh-auditoria-engine';

export const dynamic='force-dynamic';
export const runtime='nodejs';
// Usa a MESMA pool do painel principal, sem depender da segunda aplicação no Render.
const globalDB=globalThis as typeof globalThis&{__rhPainelPool?:Pool};
function pool():Pool{
 if(!globalDB.__rhPainelPool){
  const url=process.env.DATABASE_URL;
  if(!url)throw new Error('DATABASE_URL não configurada no frontend');
  globalDB.__rhPainelPool=new Pool({
   connectionString:url,ssl:{rejectUnauthorized:false},
   max:5,connectionTimeoutMillis:14000,idleTimeoutMillis:25000
  });
 }
 return globalDB.__rhPainelPool;
}
export async function GET(request:NextRequest){
 const mes=request.nextUrl.searchParams.get('mes')||'2026-07';
 if(!/^2026-0[1-7]$/.test(mes))
  return NextResponse.json({error:'Competência inválida: escolha janeiro a julho/2026.'},{status:422});
 const numero=Number(mes.slice(-2));
 const meses=[mes+'-01'];
 if(numero>1)meses.push('2026-'+String(numero-1).padStart(2,'0')+'-01');
 try{
  const results=await pool().query<Linha>({
   text:`SELECT id,to_char(competencia,'YYYY-MM') AS mes,matricula,nome,cargo,jornada,
                 departamento,tipo_inclusao,salario_base,bruto,descontos,liquido,
                 rubricas,vinculo,to_char(desligamento,'YYYY-MM-DD') AS desligamento
          FROM rh_folha_analitica_2026
          WHERE competencia=ANY($1::date[])
          ORDER BY competencia,matricula,id`,
   values:[meses],query_timeout:26000
  });
  const resultado=auditarFolha(results.rows,mes);
  return NextResponse.json(resultado,{headers:{'Cache-Control':'private, no-store'}});
 }catch(err){
  console.error('Falha auditoria RH Neon',(err as Error).name,(err as Error).message);
  return NextResponse.json({error:'Não foi possível concluir a consulta documental do RH no Neon.'},{
   status:503,headers:{'Cache-Control':'no-store'}
  });
 }
}
