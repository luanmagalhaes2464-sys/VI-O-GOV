import {NextRequest,NextResponse} from 'next/server';
import {COOKIE_SESSAO,criarSessao,DURACAO_SESSAO,segredoPronto} from '../../../../lib/auth-sessao';
import {conferirSenha,dbAuth} from '../../../../lib/auth-usuarios';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const limite=new Map<string,{vezes:number;inicio:number}>();
type Usuario={id:number;email:string;senha_hash:string;ativo:boolean};
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return NextResponse.json({erro:'Origem inválida'},{status:403});
 if(!segredoPronto())return NextResponse.json({erro:'Acesso ainda não configurado'},{status:503});
 const ip=(req.headers.get('x-forwarded-for')||'desconhecido').split(',')[0].trim().slice(0,80);
 const now=Date.now();const state=limite.get(ip);
 if(state&&now-state.inicio<600000&&state.vezes>=8)return NextResponse.json({erro:'Aguarde alguns minutos e tente novamente'},{status:429});
 limite.set(ip,!state||now-state.inicio>=600000?{vezes:1,inicio:now}:{...state,vezes:state.vezes+1});
 if(limite.size>1500)limite.clear();
 const data=await req.json().catch(()=>null);
 const email=String(data?.email||'').trim().toLowerCase().slice(0,254);
 const senha=String(data?.senha||'').slice(0,128);
 if(!email||!senha)return NextResponse.json({erro:'Informe e-mail e senha'},{status:400});
 try{
  const user=await dbAuth().query<Usuario>(
   'SELECT id,email,senha_hash,ativo FROM vico_auth_usuarios WHERE email=$1 LIMIT 1',[email]);
  const conta=user.rows[0];
  const autorizado=Boolean(conta?.ativo&&await conferirSenha(senha,conta.senha_hash));
  if(!autorizado)return NextResponse.json({erro:'E-mail ou senha inválidos'},{status:401});
  const token=await criarSessao(conta.id,conta.email);
  await dbAuth().query('UPDATE vico_auth_usuarios SET ultimo_login_em=now() WHERE id=$1',[conta.id]);
  const res=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
  res.cookies.set(COOKIE_SESSAO,token,{
   httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'lax',
   path:'/',maxAge:DURACAO_SESSAO
  });
  limite.delete(ip);
  return res;
 }catch(e){console.error('Erro login Viço GOV',(e as Error).name);
  return NextResponse.json({erro:'Acesso temporariamente indisponível'},{status:503})}
}
