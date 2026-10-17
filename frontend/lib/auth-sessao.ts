// Compatível com middleware Edge e rotas Node. Nunca armazena senha no cookie.
export const COOKIE_SESSAO='vico_gov_sessao';
export const DURACAO_SESSAO=60*60*12;
export const authAtiva=()=>process.env.VICO_AUTH_ENABLED==='true';
export const segredoPronto=()=>Boolean(process.env.VICO_SESSION_SECRET&&process.env.VICO_SESSION_SECRET.length>=32);

type Sessao={uid:number;email:string;exp:number};
function encode(b:Uint8Array):string{
 return btoa(Array.from(b,byte=>String.fromCharCode(byte)).join(''))
  .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function decode(s:string):Uint8Array{
 const raw=atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));
 return Uint8Array.from(raw,ch=>ch.charCodeAt(0));
}
async function chaveHmac(){
 const secret=process.env.VICO_SESSION_SECRET||'';
 if(secret.length<32)throw Error('Configuração de sessão ausente');
 return crypto.subtle.importKey('raw',new TextEncoder().encode(secret),
  {name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
}
export async function criarSessao(uid:number,email:string):Promise<string>{
 const payload=encode(new TextEncoder().encode(JSON.stringify({
  uid,email,exp:Math.floor(Date.now()/1000)+DURACAO_SESSAO
 } satisfies Sessao)));
 const sig=await crypto.subtle.sign('HMAC',await chaveHmac(),new TextEncoder().encode(payload));
 return payload+'.'+encode(new Uint8Array(sig));
}
export async function verificarSessao(token?:string|null):Promise<Sessao|null>{
 if(!token||!segredoPronto())return null;
 const [payload,sig,...extras]=token.split('.');
 if(!payload||!sig||extras.length)return null;
 try{
  const valido=await crypto.subtle.verify('HMAC',await chaveHmac(),decode(sig),
   new TextEncoder().encode(payload));
  if(!valido)return null;
  const d=JSON.parse(new TextDecoder().decode(decode(payload))) as Sessao;
  if(!Number.isInteger(d.uid)||d.uid<=0||typeof d.email!=='string'||d.email.length>250||
    !Number.isFinite(d.exp)||d.exp<Math.floor(Date.now()/1000))return null;
  return d;
 }catch{return null}
}
