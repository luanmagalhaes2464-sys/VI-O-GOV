import {Pool} from 'pg';
import {createHash,timingSafeEqual} from 'node:crypto';
const shared=globalThis as typeof globalThis&{__vicoKnowledgePool?:Pool};
export function knowledgePool():Pool{
 if(!shared.__vicoKnowledgePool){
  if(!process.env.DATABASE_URL)throw Error('Neon não configurado');
  shared.__vicoKnowledgePool=new Pool({
   connectionString:process.env.DATABASE_URL,ssl:{rejectUnauthorized:false},
   max:4,connectionTimeoutMillis:14000,idleTimeoutMillis:25000
  });
 }
 return shared.__vicoKnowledgePool;
}
export function adminAutorizado(token:string|null|undefined):boolean{
 const secret=process.env.VICO_DOC_UPLOAD_KEY||'';
 if(!secret||!token)return false;
 const a=createHash('sha256').update(token).digest();
 const b=createHash('sha256').update(secret).digest();
 return timingSafeEqual(a,b);
}
export function dividirTexto(entrada:string):string[]{
 const limpo=entrada.replace(/\r\n?/g,'\n').replace(/[\t ]+/g,' ').replace(/\n{4,}/g,'\n\n').trim();
 if(!limpo)return [];
 const blocos:string[]=[];
 const limite=1650,overlap=200;
 for(let pos=0;pos<limpo.length;){
  let fim=Math.min(pos+limite,limpo.length);
  if(fim<limpo.length){
   const recorte=limpo.slice(pos+900,fim);
   const ultimo=Math.max(recorte.lastIndexOf('\n'),recorte.lastIndexOf('. '));
   if(ultimo>=0)fim=pos+900+ultimo+1;
  }
  blocos.push(limpo.slice(pos,fim).trim());
  if(fim>=limpo.length)break;
  pos=Math.max(pos+1,fim-overlap);
 }
 return blocos.filter(x=>x.length>10).slice(0,350);
}
export type TrechoBusca={nome_arquivo:string;categoria:string;ano_referencia:number|null;fonte:string|null;ordem:number;texto:string;documento_id:string;publico:boolean};
export async function buscarTrechos(pergunta:string,autorizado:boolean):Promise<TrechoBusca[]>{
 const termo=pergunta.slice(0,450);
 const sql=`SELECT d.id::text documento_id,d.nome_arquivo,d.categoria,d.ano_referencia,
   d.fonte,d.publico,t.ordem,t.texto
   FROM vico_ia_trechos t JOIN vico_ia_documentos d ON d.id=t.documento_id
   WHERE (d.publico=true OR $2::boolean=true)
    AND t.busca @@ websearch_to_tsquery('portuguese',$1)
   ORDER BY ts_rank_cd(t.busca,websearch_to_tsquery('portuguese',$1)) DESC,d.criado_em DESC
   LIMIT 10`;
 let docs=await knowledgePool().query<TrechoBusca>(sql,[termo,autorizado]);
 if(docs.rows.length===0){
  const terms=[...new Set(termo.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().match(/[a-z]{4,}/g)||[])].slice(0,6);
  if(terms.length){
   docs=await knowledgePool().query<TrechoBusca>(
    `SELECT d.id::text documento_id,d.nome_arquivo,d.categoria,d.ano_referencia,
      d.fonte,d.publico,t.ordem,t.texto
      FROM vico_ia_trechos t JOIN vico_ia_documentos d ON d.id=t.documento_id
      WHERE (d.publico=true OR $2::boolean=true)
      AND EXISTS (SELECT 1 FROM unnest($1::text[]) termo WHERE t.texto ILIKE '%'||termo||'%')
      ORDER BY d.criado_em DESC,t.ordem ASC LIMIT 8`,[terms,autorizado]);
  }
 }
 return docs.rows;
}
