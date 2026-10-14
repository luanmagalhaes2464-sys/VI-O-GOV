const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
export type ApiResponse<T> = {data: T | null, error: string | null};
export async function api<T>(path:string,init?:RequestInit):Promise<ApiResponse<T>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(()=>controller.abort(),11000);
    const response = await fetch(`${BASE}${path}`, {cache:'no-store',...init,signal:controller.signal});
    clearTimeout(timeout);
    if(!response.ok) return {data:null,error:`Erro ${response.status}: o servidor não conseguiu atender a consulta.`};
    return {data: await response.json() as T,error:null};
  }catch{
    return {data:null,error:'Não foi possível consultar a API. Os indicadores reais permanecerão indisponíveis até a conexão ser restabelecida.'};
  }
}
export const brl=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value);
export const num=(value:number|null|undefined)=>value==null?'—':new Intl.NumberFormat('pt-BR').format(value);
export const apiBase=BASE;
