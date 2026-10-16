'use client';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,ChevronDown,ExternalLink,FilePlus2,LockKeyhole,Send,Upload,X} from 'lucide-react';
import {usePathname} from 'next/navigation';
type Documento={id:string;nome_arquivo:string;categoria:string;ano_referencia:number|null;fonte:string|null;publico:boolean;trechos:number};
type Estado={documentos:Documento[];autorizado:boolean;modelo_ativo:boolean;importacao_habilitada:boolean};
type Resposta={modo:string;resposta:string;fontes?:string[];documentos?:{nome:string;categoria:string;ano:number|null;fonte:string|null}[]};
type Mensagem={autor:'user'|'assistant';texto:string;fontes?:string[];documentos?:Resposta['documentos']};
const boasVindas='Olá! Sou o Viço IA. Escreva sua pergunta livremente — posso consultar os indicadores do Viço Gov e os documentos cadastrados na biblioteca. Também podemos continuar uma análise com novas perguntas.';
export default function RHAssistenteFlutuante(){
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 const [input,setInput]=useState('');
 const [waiting,setWaiting]=useState(false);
 const [mes,setMes]=useState('2026-07');
 const [departamento,setDepartamento]=useState('');
 const [messages,setMessages]=useState<Mensagem[]>([{autor:'assistant',texto:boasVindas}]);
 const [modo,setModo]=useState('');
 const [biblioteca,setBiblioteca]=useState(false);
 const [token,setToken]=useState('');
 const [estado,setEstado]=useState<Estado|null>(null);
 const [arquivo,setArquivo]=useState<File|null>(null);
 const [categoria,setCategoria]=useState('Geral');
 const [ano,setAno]=useState('2026');
 const [fonte,setFonte]=useState('');
 const [publico,setPublico]=useState(false);
 const [enviandoArquivo,setEnviandoArquivo]=useState(false);
 const [aviso,setAviso]=useState('');
 const feedRef=useRef<HTMLDivElement|null>(null);
 const caixaRef=useRef<HTMLTextAreaElement|null>(null);
 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const m=params.get('mes');if(m&&/^2026-0[1-7]$/.test(m))setMes(m);
  const d=params.get('departamento');setDepartamento(d&&d.length<=160?d:'');
 },[pathname]);
 useEffect(()=>{if(open)feedRef.current?.scrollTo({top:feedRef.current.scrollHeight,behavior:'smooth'})},[messages,waiting,open]);
 async function atualizarBiblioteca(credencial=token){
  try{
   const result=await fetch('/api/agente/documentos',{cache:'no-store',
    headers:credencial?{'x-vico-admin-key':credencial}:{}
   });
   const data=await result.json();
   if(!result.ok)throw new Error(data.error||'Consulta indisponível');
   setEstado(data as Estado);
  }catch(e){setAviso(e instanceof Error?e.message:'Biblioteca indisponível')}
 }
 useEffect(()=>{if(open)atualizarBiblioteca()},[open]); // credencial consultada novamente no botão de acesso
 async function enviar(q:string){
  const pergunta=q.trim();
  if(waiting||!pergunta)return;
  const historico=messages.slice(-10).map(m=>({autor:m.autor,texto:m.texto}));
  setMessages(v=>[...v,{autor:'user',texto:pergunta}]);
  setInput('');setWaiting(true);
  try{
   const response=await fetch('/api/agente/consulta',{method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json',...(token?{'x-vico-admin-key':token}:{})},
    body:JSON.stringify({pergunta,mes,departamento,historico})});
   const obj=await response.json();
   if(!response.ok)throw new Error(obj.error||'Falha ao consultar as bases.');
   const data=obj as Resposta;
   setModo(data.modo);
   setMessages(v=>[...v,{autor:'assistant',
    texto:data.resposta||'Não encontrei informação suficiente nos dados disponíveis.',
    fontes:data.fontes,documentos:data.documentos}]);
  }catch(e){
   setMessages(v=>[...v,{autor:'assistant',texto:e instanceof Error?e.message:'Não foi possível consultar os dados agora.'}]);
  }finally{setWaiting(false);caixaRef.current?.focus()}
 }
 async function importar(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault();
  if(!arquivo||!token.trim()){setAviso('Selecione o arquivo e informe o código de administração.');return}
  setEnviandoArquivo(true);setAviso('');
  try{
   const body=new FormData();body.append('arquivo',arquivo);body.append('categoria',categoria);
   body.append('ano',ano);body.append('fonte',fonte);body.append('publico',String(publico));
   const response=await fetch('/api/agente/documentos',{method:'POST',
    headers:{'x-vico-admin-key':token.trim()},body});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Falha ao importar');
   setAviso('Documento armazenado no Neon: '+data.trechos+' trechos disponíveis para consulta.');
   setArquivo(null);
   await atualizarBiblioteca(token.trim());
  }catch(err){setAviso(err instanceof Error?err.message:'Falha na importação.')}
  finally{setEnviandoArquivo(false)}
 }
 return <div className="rh-bot-wrap">
  {open&&<section className="rh-bot-panel" aria-label="Viço IA — assistente e documentos">
   <header className="rh-bot-head">
    <span className="rh-bot-avatar rh-bot-logo">V</span>
    <div><strong>Viço IA</strong><small>Converse e analise os dados do Viço Gov</small></div>
    <button type="button" onClick={()=>setOpen(false)} aria-label="Fechar chat"><X size={18}/></button>
   </header>
   <div className="vico-ia-tabs">
    <button type="button" className={!biblioteca?'active':''} onClick={()=>setBiblioteca(false)}> <Send size={13}/> Conversar</button>
    <button type="button" className={biblioteca?'active':''} onClick={()=>{setBiblioteca(true);atualizarBiblioteca()}}><BookOpen size={14}/> Documentos {estado?.documentos?.length? '('+estado.documentos.length+')':''}</button>
   </div>
   {!biblioteca?<>
    <div className="rh-bot-feed" ref={feedRef} aria-live="polite">
     {messages.map((m,i)=><div key={i} className={'rh-bot-msg '+m.autor}>
      <p>{m.texto}</p>
      {m.documentos?.length?<div className="vico-ia-doc-refs">{m.documentos.map((d,n)=>
       <span key={n}><BookOpen size={11}/> {d.nome}{d.ano?' · '+d.ano:''}</span>)}</div>:null}
      {m.fontes?.length?<div className="rh-bot-sources">{[...new Set(m.fontes)].filter(s=>/^https?:\/\//.test(s)).slice(0,5).map(s=>
       <a href={s} key={s} target="_blank" rel="noopener noreferrer">Consultar fonte <ExternalLink size={11}/></a>)}</div>:null}
     </div>)}
     {waiting&&<div className="rh-bot-msg assistant"><p>Analisando os dados e documentos...</p></div>}
    </div>
    <div className="rh-bot-context"><label>Folha de referência <select value={mes} onChange={e=>setMes(e.target.value)}>
     {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho'].map((m,i)=><option key={m} value={'2026-'+String(i+1).padStart(2,'0')}>{m}/2026</option>)}
    </select></label></div>
    <form className="rh-bot-form vico-ia-input" onSubmit={e=>{e.preventDefault();enviar(input)}}>
     <textarea ref={caixaRef} rows={2} maxLength={1500} value={input} onChange={e=>setInput(e.target.value)}
      onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar(input)}}}
      placeholder="Pergunte qualquer coisa sobre os dados ou documentos..." aria-label="Pergunta livre para o Viço IA"/>
     <button type="submit" disabled={waiting||!input.trim()} aria-label="Enviar pergunta"><Send size={18}/></button>
    </form>
    <small className="rh-bot-disclaimer">{estado?.modelo_ativo?'Modelo generativo conectado': 'Consultas estruturadas · IA generativa ainda não configurada'} · Enter envia, Shift+Enter quebra linha</small>
   </>:<>
    <div className="vico-ia-doc-section">
     <p>Cadastre documentos de referência. Textos e arquivos são armazenados no Neon e consultados junto aos indicadores.</p>
     <label className="vico-ia-field"><LockKeyhole size={13}/> Código de administração
      <input type="password" autoComplete="off" value={token} onChange={e=>setToken(e.target.value)}
       placeholder="Código reservado ao administrador"/></label>
     <button type="button" className="vico-ia-refresh" onClick={()=>atualizarBiblioteca(token.trim())}>Consultar biblioteca</button>
     <div className="vico-ia-doc-list"><strong>{estado?.documentos?.length||0} documentos disponíveis nesta sessão</strong>
      {estado?.documentos?.map(d=><div key={d.id}><FilePlus2 size={14}/><span><b>{d.nome_arquivo}</b><small>{d.categoria} · {d.ano_referencia||'sem ano'} · {d.publico?'Público':'Restrito'}</small></span></div>)}
     </div>
     <form onSubmit={importar} className="vico-ia-upload">
      <strong>Adicionar à base de conhecimento</strong>
      <input type="file" accept=".pdf,.docx,.txt,.md,.csv,.json" onChange={e=>setArquivo(e.target.files?.[0]||null)} aria-label="Arquivo para importar"/>
      <div className="vico-ia-doc-two">
       <label>Categoria <input value={categoria} maxLength={70} onChange={e=>setCategoria(e.target.value)} placeholder="Educação, RH, Legislação..."/></label>
       <label>Ano <input value={ano} inputMode="numeric" onChange={e=>setAno(e.target.value)} placeholder="2026"/></label>
      </div>
      <label>Fonte / endereço (opcional)<input value={fonte} onChange={e=>setFonte(e.target.value)} placeholder="Link ou órgão de origem"/></label>
      <label className="vico-ia-check"><input type="checkbox" checked={publico} onChange={e=>setPublico(e.target.checked)}/> Permitir consulta pública deste documento</label>
      <button type="submit" className="vico-ia-upload-button" disabled={enviandoArquivo||!arquivo||!token.trim()}><Upload size={14}/>{enviandoArquivo?'Importando...':'Importar documento'}</button>
      <small>PDF, DOCX, TXT, MD, CSV ou JSON · até 5 MB. Arquivos privados exigem o código de administração nas consultas.</small>
      {aviso&&<p role="status" className="vico-ia-feedback">{aviso}</p>}
     </form>
    </div>
   </>}
  </section>}
  <button className="rh-bot-trigger" type="button" aria-expanded={open} aria-label={open?'Recolher Viço IA':'Abrir Viço IA'} onClick={()=>setOpen(v=>!v)}>
   <span className="rh-bot-trigger-avatar rh-bot-logo">V</span><strong>Viço IA</strong><span className="rh-bot-online"/>{open&&<ChevronDown size={14}/>}
  </button>
 </div>;
}
