import {NextRequest,NextResponse} from 'next/server';
export const dynamic='force-dynamic';
const BACKEND='https://vico-gov-api-vicosa.onrender.com';
function pathAllowed(path:string,method:string){
 if(!/^api\/v1\/[a-z0-9/._-]+$/i.test(path)||path.includes('..')||path.includes('//'))return false;
 if(path.startsWith('api/v1/admin/'))return false;
 if(method==='POST')return path==='api/v1/agente/perguntas'||path==='api/v1/rh/inteligencia/agente';
 return method==='GET';
}
async function relay(request:NextRequest,{params}:{params:{path:string[]}},method:'GET'|'POST'){
 const path=params.path.join('/');
 if(!pathAllowed(path,method))return NextResponse.json({detail:'Rota não autorizada no proxy público'},{status:403});
 const target=new URL('/'+path,BACKEND);
 if(method==='GET')target.search=request.nextUrl.search;
 let body:string|undefined;
 if(method==='POST'){
   body=await request.text();
   if(body.length>2400)return NextResponse.json({detail:'Mensagem excede o tamanho permitido'},{status:413});
 }
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),29000);
 try{
   const result=await fetch(target,{method,body,headers:method==='POST'?{'Content-Type':'application/json'}:undefined,signal:controller.signal,cache:'no-store',redirect:'error'});
   const payload=await result.text();
   return new Response(payload,{status:result.status,headers:{'Content-Type':result.headers.get('content-type')||'application/json','Cache-Control':'no-store'}});
 }catch{
   return NextResponse.json({detail:'API de dados temporariamente indisponível'},{status:503,headers:{'Cache-Control':'no-store'}});
 }finally{clearTimeout(timeout)}
}
export async function GET(request:NextRequest,context:{params:{path:string[]}}){return relay(request,context,'GET')}
export async function POST(request:NextRequest,context:{params:{path:string[]}}){return relay(request,context,'POST')}
