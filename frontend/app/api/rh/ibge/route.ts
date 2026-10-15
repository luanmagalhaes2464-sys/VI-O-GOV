import {NextResponse} from 'next/server';
import {API_SIDRA_RH,IBGE_RH_VALIDADO,normalizarIBGE} from '../../../../lib/ibge-rh';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const result=await fetch(API_SIDRA_RH,{next:{revalidate:21600},headers:{'Accept':'application/json'}});
  if(!result.ok)throw new Error('IBGE indisponível: '+result.status);
  const data=normalizarIBGE(await result.json());
  return NextResponse.json(data,{headers:{'Cache-Control':'public, s-maxage=3600, stale-while-revalidate=86400'}});
 }catch{
  return NextResponse.json(IBGE_RH_VALIDADO,{
   headers:{'Cache-Control':'public, max-age=1800','X-Dados-Referencia':'copia-validada-2026-10-15'}
  });
 }
}
