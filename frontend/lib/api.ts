// Consulta pelo próprio domínio web: evita falhas de CORS e mantém a API pública no servidor.
const BASE = '/api/municipal';
export type ApiResponse<T> = {data:T|null,error:string|null};
export async function api<T>(path:string,init?:RequestInit):Promise<ApiResponse<T>> {
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),33000);
 try{
   const response=await fetch(BASE+path,{cache:'no-store',...init,signal:controller.signal});
   if(!response.ok)return {data:null,error:'Erro '+response.status+': a API de dados não conseguiu atender a consulta.'};
   return {data:await response.json() as T,error:null};
 }catch{
   return {data:null,error:'Os dados integrados estão temporariamente indisponíveis. Indicadores sem validação não serão estimados.'};
 }finally{clearTimeout(timeout)}
}
export const brl=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export const num=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('pt-BR').format(value);
export const apiBase=BASE;
