import {NextResponse} from 'next/server';
import {authAtiva,segredoPronto} from '../../../../lib/auth-sessao';
import {dbAuth} from '../../../../lib/auth-usuarios';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(){
 try{
  const row=await dbAuth().query<{quantidade:string}>('SELECT COUNT(*)::text quantidade FROM vico_auth_usuarios');
  return NextResponse.json({
   ativo:authAtiva(),configurado:segredoPronto(),cadastrado:Number(row.rows[0]?.quantidade||0)>0,
   cadastroDisponivel:Boolean(process.env.VICO_SETUP_KEY&&process.env.VICO_SETUP_KEY.length>=20),
  },{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({ativo:authAtiva(),configurado:false,cadastrado:false},{status:503})}
}
