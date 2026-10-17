import {NextRequest,NextResponse} from 'next/server';
import {createHash,timingSafeEqual} from 'node:crypto';
import {COOKIE_SESSAO,criarSessao,DURACAO_SESSAO,segredoPronto} from '../../../../lib/auth-sessao';
import {dbAuth,emailValido,gerarSenhaHash,senhaSegura} from '../../../../lib/auth-usuarios';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const attempts=new Map<string,{count:number,at:number}>();
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return NextResponse.json({erro:'Origem inválida'},{status:403});
 const setup=process.env.VICO_SETUP_KEY||'';
 if(setup.length<20||!segredoPronto())return NextResponse.json({erro:'Configure primeiro VICO_SETUP_KEY e VICO_SESSION_SECRET no Render'},{status:503});
 const ip=(req.headers.get('x-forwarded-for')||'desconhecido').split(',')[0].trim().slice(0,80);
 const now=Date.now();const entry=attempts.get(ip);
 if(entry&&now-entry.at<3600000&&entry.count>=8)return NextResponse.json({erro:'Tente novamente mais tarde'},{status:429});
 attempts.set(ip,!entry||now-entry.at>=3600000?{count:1,at:now}:{...entry,count:entry.count+1});
 if(attempts.size>1500)attempts.clear();
 const body=await req.json().catch(()=>null);
 const nome=String(body?.nome||'').trim().slice(0,120);
 const email=String(body?.email||'').trim().toLowerCase();
 const senha=String(body?.senha||'');
 const chave=String(body?.chave||'');
 const digest=(v:string)=>createHash('sha256').update(v).digest();
 if(!chave||!timingSafeEqual(digest(chave),digest(setup)))
  return NextResponse.json({erro:'Chave de configuração inválida'},{status:403});
 if(nome.length<2||!emailValido(email)||!senhaSegura(senha))
  return NextResponse.json({erro:'Informe nome, e-mail válido e senha com 12 ou mais caracteres, contendo letras e números'},{status:422});
 const client=await dbAuth().connect();
 try{
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(24681024)');
  const existente=await client.query('SELECT id FROM vico_auth_usuarios LIMIT 1');
  if(existente.rowCount){await client.query('ROLLBACK');
   return NextResponse.json({erro:'O administrador inicial já foi registrado'},{status:409})}
  const hash=await gerarSenhaHash(senha);
  const inserido=await client.query<{id:number}>(
   "INSERT INTO vico_auth_usuarios(nome,email,senha_hash,perfil) VALUES ($1,$2,$3,'admin') RETURNING id",
   [nome,email,hash]);
  await client.query('COMMIT');
  const token=await criarSessao(inserido.rows[0].id,email);
  const res=NextResponse.json({ok:true,precisaAtivar:true},{headers:{'Cache-Control':'no-store'}});
  res.cookies.set(COOKIE_SESSAO,token,{
   httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'lax',
   path:'/',maxAge:DURACAO_SESSAO
  });
  attempts.delete(ip);
  return res;
 }catch(e){await client.query('ROLLBACK').catch(()=>undefined);
  console.error('Falha na configuração do usuário', (e as Error).name);
  return NextResponse.json({erro:'Não foi possível configurar o usuário'},{status:503});
 }finally{client.release()}
}
