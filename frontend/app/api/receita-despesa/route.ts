import {NextResponse} from 'next/server';
import {knowledgePool} from '../../../lib/ia-conhecimento';

export const runtime='nodejs';
export const dynamic='force-dynamic';

type MensalRow={mes:string;categoria:string;centavos:string};
type AnualRow={grupo:string;indicador:string;centavos:string};
type ConciliacaoRow={mes:string;ops_coincidentes:number;centavos_coincidentes:string;ops_exclusivas_ordem:number;centavos_exclusivas_ordem:string};

export async function GET(){
 try{
  const db=knowledgePool();
  const [mensal,anual,conciliacao]=await Promise.all([
   db.query<MensalRow>(`SELECT to_char(mes,'YYYY-MM') AS mes,categoria,centavos::text
      FROM vico_financas_2026_mensal
      WHERE mes >= DATE '2026-01-01' AND mes < DATE '2027-01-01'
      ORDER BY mes,categoria`),
   db.query<AnualRow>(`SELECT grupo,indicador,centavos::text
      FROM vico_financas_2026_anual ORDER BY grupo,indicador`),
   db.query<ConciliacaoRow>(`SELECT to_char(competencia,'YYYY-MM') mes,ops_coincidentes,
       centavos_coincidentes::text,ops_exclusivas_ordem,centavos_exclusivas_ordem::text
      FROM vico_conciliacao_pagamentos_2026 ORDER BY competencia`)
  ]);
  return NextResponse.json({
   ano:2026,
   mensal:mensal.rows.map(r=>({mes:r.mes,categoria:r.categoria,centavos:Number(r.centavos)})),
   anual:anual.rows.map(r=>({grupo:r.grupo,indicador:r.indicador,centavos:Number(r.centavos)})),
   conciliacao:conciliacao.rows.map(r=>({mes:r.mes,ops_coincidentes:r.ops_coincidentes,centavos_coincidentes:Number(r.centavos_coincidentes),ops_exclusivas_ordem:r.ops_exclusivas_ordem,centavos_exclusivas_ordem:Number(r.centavos_exclusivas_ordem)}))
  },{headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('Viço GOV — Receita e Despesa',(e as Error).message);
  return NextResponse.json({error:'Não foi possível carregar os valores financeiros.'},
   {status:503,headers:{'Cache-Control':'no-store'}});
 }
}
