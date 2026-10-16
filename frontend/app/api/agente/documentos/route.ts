import {NextRequest,NextResponse} from 'next/server';
import {createHash} from 'node:crypto';
import {adminAutorizado,dividirTexto,knowledgePool} from '../../../../lib/ia-conhecimento';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const erro=(message:string,status:number)=>NextResponse.json({error:message},{status,headers:{'Cache-Control':'no-store'}});
const permitido=new Set(['.pdf','.docx','.txt','.md','.csv','.json']);
function extensao(n:string){return (n.toLowerCase().match(/\.[a-z0-9]+$/)||[])[0]||''}
function temCredencial(req:NextRequest){return adminAutorizado(req.headers.get('x-vico-admin-key'))}
export async function GET(req:NextRequest){
 try{
  const autorizado=temCredencial(req);
  const docs=await knowledgePool().query(
   `SELECT id::text,nome_arquivo,categoria,ano_referencia,fonte,publico,criado_em,
     tamanho_bytes,(SELECT COUNT(*)::int FROM vico_ia_trechos WHERE documento_id=id) trechos
    FROM vico_ia_documentos WHERE publico=true OR $1::boolean=true
    ORDER BY criado_em DESC LIMIT 150`,[autorizado]);
  return NextResponse.json({documentos:docs.rows,autorizado,modelo_ativo:Boolean(process.env.GEMINI_API_KEY),
   importacao_habilitada:Boolean(process.env.VICO_DOC_UPLOAD_KEY),armazenamento:'Neon PostgreSQL'},
   {headers:{'Cache-Control':'no-store'}});
 }catch(e){
  console.error('Viço IA documentos listar',(e as Error).message);
  return erro('Não foi possível consultar a biblioteca de documentos.',503);
 }
}
export async function POST(req:NextRequest){
 if(!temCredencial(req))return erro('Credencial administrativa inválida.',403);
 try{
  const data=await req.formData();
  const item=data.get('arquivo');
  if(!(item instanceof File))return erro('Selecione um arquivo.',422);
  if(item.size<1||item.size>5*1024*1024)return erro('Limite de 5 MB por arquivo.',413);
  const nome=item.name.slice(0,220).replace(/[\\/]/g,'_');
  const ext=extensao(nome);
  if(!permitido.has(ext))return erro('Aceitos: PDF, DOCX, TXT, MD, CSV e JSON.',415);
  const categoria=String(data.get('categoria')||'Geral').trim().slice(0,70)||'Geral';
  const anoTexto=String(data.get('ano')||'').trim();
  const ano=anoTexto?Number(anoTexto):null;
  if(ano!==null&&(!Number.isInteger(ano)||ano<1900||ano>2100))return erro('Ano de referência inválido.',422);
  const fonte=String(data.get('fonte')||'').trim().slice(0,350);
  const publico=data.get('publico')==='true';
  const buffer=Buffer.from(await item.arrayBuffer());
  let texto='';
  if(ext==='.pdf'){
   // Extrai texto, mas PDFs digitalizados sem camada textual exigirão OCR externo.
   const pdf=(await import('pdf-parse')).default;
   const result=await pdf(buffer,{max:100});
   texto=result.text||'';
  }else if(ext==='.docx'){
   const mammoth=await import('mammoth');
   const result=await mammoth.extractRawText({buffer});
   texto=result.value||'';
  }else{
   texto=buffer.toString('utf8');
  }
  if(texto.length>550000) return erro('Texto muito extenso. Divida o documento em partes menores.',413);
  const trechos=dividirTexto(texto);
  if(!trechos.length)return erro('Não encontrei texto pesquisável nesse documento. PDFs digitalizados precisam passar por OCR.',422);
  const hash=createHash('sha256').update(buffer).digest('hex');
  const db=await knowledgePool().connect();
  try{
   await db.query('BEGIN');
   const dup=await db.query<{id:string}>('SELECT id::text id FROM vico_ia_documentos WHERE hash_sha256=$1 LIMIT 1',[hash]);
   if(dup.rowCount){await db.query('ROLLBACK');return erro('Documento já cadastrado na biblioteca.',409)}
   const inserted=await db.query<{id:string}>(`INSERT INTO vico_ia_documentos
    (nome_arquivo,tipo_mime,categoria,ano_referencia,fonte,publico,hash_sha256,tamanho_bytes,conteudo_original,texto_extraido)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id::text`,
    [nome,item.type||'application/octet-stream',categoria,ano,fonte||null,publico,hash,item.size,buffer,texto]);
   const id=inserted.rows[0].id;
   for(let i=0;i<trechos.length;i++){
    await db.query('INSERT INTO vico_ia_trechos(documento_id,ordem,texto) VALUES ($1,$2,$3)',[id,i+1,trechos[i]]);
   }
   await db.query('COMMIT');
   return NextResponse.json({ok:true,id,arquivo:nome,trechos:trechos.length,publico}, {status:201});
  }catch(e){await db.query('ROLLBACK');throw e}
  finally{db.release()}
 }catch(e){
  console.error('Viço IA documento importar',(e as Error).name,(e as Error).message);
  return erro('Falha ao processar o arquivo. Confirme o formato e tente novamente.',500);
 }
}
