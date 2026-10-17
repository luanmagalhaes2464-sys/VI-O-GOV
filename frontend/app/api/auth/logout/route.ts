import {NextRequest,NextResponse} from 'next/server';
import {COOKIE_SESSAO} from '../../../../lib/auth-sessao';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 const origin=req.headers.get('origin');
 if(origin&&origin!==new URL(req.url).origin)return NextResponse.json({erro:'Origem inválida'},{status:403});
 const res=NextResponse.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 res.cookies.set(COOKIE_SESSAO,'',{httpOnly:true,secure:req.nextUrl.protocol==='https:',path:'/',sameSite:'lax',maxAge:0});
 return res;
}
