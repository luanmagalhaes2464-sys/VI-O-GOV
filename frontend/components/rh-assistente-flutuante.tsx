'use client';
import {useEffect,useRef,useState} from 'react';
import {BookOpen,ChevronDown,ExternalLink,Send,X} from 'lucide-react';
import {usePathname} from 'next/navigation';

type Resposta={
 modo:string;
 resposta:string;
 fontes?:string[];
 documentos?:{nome:string;categoria:string;ano:number|null;fonte:string|null}[];
};
type Mensagem={
 autor:'user'|'assistant';
 texto:string;
 fontes?:string[];
 documentos?:Resposta['documentos'];
};
const saudacao='Olá! Sou o Viço IA. Pergunte livremente sobre as informações do Viço Gov. Posso relacionar indicadores, analisar os documentos cadastrados e continuar a conversa a partir das suas perguntas.';

export default function RHAssistenteFlutuante(){
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 const [input,setInput]=useState('');
 const [waiting,setWaiting]=useState(false);
 // Referência interna para consultas gerais. Um mês mencionado na pergunta
 // tem prioridade no backend; não é necessário escolher a folha manualmente.
 const [mes,setMes]=useState('2026-07');
 const [departamento,setDepartamento]=useState('');
 const [messages,setMessages]=useState<Mensagem[]>([{autor:'assistant',texto:saudacao}]);
 const feedRef=useRef<HTMLDivElement|null>(null);
 const caixaRef=useRef<HTMLTextAreaElement|null>(null);

 useEffect(()=>{
  const params=new URLSearchParams(window.location.search);
  const month=params.get('mes');
  setMes(month&&/^2026-0[1-7]$/.test(month)?month:'2026-07');
  const dept=params.get('departamento');
  setDepartamento(dept&&dept.length<=160?dept:'');
 },[pathname]);

 useEffect(()=>{
  if(open)feedRef.current?.scrollTo({top:feedRef.current.scrollHeight,behavior:'smooth'});
 },[messages,waiting,open]);

 async function enviar(q:string){
  const pergunta=q.trim();
  if(waiting||!pergunta)return;
  const historico=messages.slice(-10).map(m=>({autor:m.autor,texto:m.texto}));
  setMessages(v=>[...v,{autor:'user',texto:pergunta}]);
  setInput('');
  setWaiting(true);
  try{
   const response=await fetch('/api/agente/consulta',{
    method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({pergunta,mes,departamento,historico})
   });
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Falha ao consultar as bases.');
   const resultado=data as Resposta;
   setMessages(v=>[...v,{
    autor:'assistant',
    texto:resultado.resposta||'Não encontrei informação suficiente nos dados disponíveis.',
    fontes:resultado.fontes,
    documentos:resultado.documentos
   }]);
  }catch(err){
   setMessages(v=>[...v,{autor:'assistant',
    texto:err instanceof Error?err.message:'Não foi possível consultar os dados agora.'}]);
  }finally{
   setWaiting(false);
   caixaRef.current?.focus();
  }
 }

 return <div className="rh-bot-wrap">
  {open&&<section className="rh-bot-panel" aria-label="Viço IA — conversa">
   <header className="rh-bot-head">
    <span className="rh-bot-avatar rh-bot-logo">V</span>
    <div><strong>Viço IA</strong><small>Converse e analise os dados do Viço Gov</small></div>
    <button type="button" onClick={()=>setOpen(false)} aria-label="Fechar chat"><X size={18}/></button>
   </header>
   <div className="rh-bot-feed" ref={feedRef} aria-live="polite">
    {messages.map((m,i)=><div key={i} className={'rh-bot-msg '+m.autor}>
     <p>{m.texto}</p>
     {m.documentos?.length?<div className="vico-ia-doc-refs">{m.documentos.map((d,j)=>
      <span key={j}><BookOpen size={11}/> {d.nome}{d.ano?' · '+d.ano:''}</span>)}</div>:null}
     {m.fontes?.length?<div className="rh-bot-sources">
      {[...new Set(m.fontes)].filter(url=>/^https?:\/\//.test(url)).slice(0,5).map(url=>
       <a href={url} key={url} target="_blank" rel="noopener noreferrer">
        Consultar fonte <ExternalLink size={11}/>
       </a>)}
     </div>:null}
    </div>)}
    {waiting&&<div className="rh-bot-msg assistant"><p>Analisando os dados...</p></div>}
   </div>
   <form className="rh-bot-form vico-ia-input" onSubmit={e=>{e.preventDefault();enviar(input)}}>
    <textarea
     ref={caixaRef} rows={2} maxLength={1500} value={input}
     onChange={e=>setInput(e.target.value)}
     onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();enviar(input)}}}
     placeholder="Digite sua pergunta..."
     aria-label="Pergunta livre para o Viço IA"/>
    <button type="submit" disabled={waiting||!input.trim()} aria-label="Enviar pergunta"><Send size={18}/></button>
   </form>
   <small className="rh-bot-disclaimer">Enter para enviar · Shift+Enter para nova linha</small>
  </section>}
  <button className="rh-bot-trigger" type="button" aria-expanded={open}
   aria-label={open?'Recolher Viço IA':'Abrir Viço IA'} onClick={()=>setOpen(v=>!v)}>
   <span className="rh-bot-trigger-avatar rh-bot-logo">V</span>
   <strong>Viço IA</strong><span className="rh-bot-online"/>
   {open&&<ChevronDown size={14}/>}
  </button>
 </div>;
}
