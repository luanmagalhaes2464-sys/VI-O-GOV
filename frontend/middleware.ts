import {NextRequest,NextResponse} from 'next/server';
import {authAtiva,COOKIE_SESSAO,segredoPronto,verificarSessao} from './lib/auth-sessao';

// Ativado somente após criar o primeiro administrador e configurar as variáveis no Render.
export async function middleware(req:NextRequest){
 if(!authAtiva())return NextResponse.next();
 const path=req.nextUrl.pathname;
 const liberado=path==='/login'||path==='/configurar-acesso'||path.startsWith('/api/auth/');
 if(liberado)return NextResponse.next();
 if(!segredoPronto()){
  if(path.startsWith('/api/'))return NextResponse.json({error:'Acesso em configuração'},{status:503});
  return NextResponse.redirect(new URL('/login',req.url));
 }
 if(await verificarSessao(req.cookies.get(COOKIE_SESSAO)?.value))return NextResponse.next();
 if(path.startsWith('/api/'))return NextResponse.json({error:'Sessão necessária'},{status:401});
 const url=new URL('/login',req.url);
 url.searchParams.set('proximo',path+req.nextUrl.search);
 return NextResponse.redirect(url);
}
export const config={matcher:['/((?!_next/static|_next/image|favicon.ico|icon.png|brasao-prefeitura-vicosa.svg|robots.txt|sitemap.xml).*)']};
