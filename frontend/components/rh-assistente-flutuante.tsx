'use client';
import {useState} from 'react';
import {Bot,ChevronDown,ExternalLink,Send,X} from 'lucide-react';
import {api} from '../lib/api';
type Resposta={modo:string;resposta:string;fontes?:string[]};
type Mensagem={autor:'user'|'assistant';texto:string;fontes?:string[]};
const exemplos=['Por que a folha de julho aumentou?','Quais rubricas de férias e 13º aparecem?','A prefeitura está próxima do limite de gasto com pessoal?'];
export default function RHAssistenteFlutuante({mes}:{mes:string}){
 const [open,setOpen]=useState(false);
 const [input,setInput]=useState('');
 const [waiting,setWaiting]=useState(false);
 const [messages,setMessages]=useState<Mensagem[]>([{
  autor:'assistant',texto:'Olá! Sou a IA do RH do Viço GOV. Posso explicar a folha e seus componentes com base nos registros carregados, e indicar quando falta documentação para avaliar a legalidade de uma verba.'
 }]);
 const [modo,setModo]=useState('');
 async function enviar(q:string){
  if(waiting||q.trim().length<4)return;
  const pergunta=q.trim();setInput('');setWaiting(true);
  setMessages(v=>[...v,{autor:'user',texto:pergunta}]);
  const resposta=await api<Resposta>('/api/v1/rh/inteligencia/agente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pergunta,mes})});
  setModo(resposta.data?.modo||'');
  setMessages(v=>[...v,{autor:'assistant',texto:resposta.data?.resposta||'O agente está indisponível no momento. Não vou inventar dados.',fontes:resposta.data?.fontes}]);
  setWaiting(false);
 }
 return <div className="rh-bot-wrap">
  {open&&<section className="rh-bot-panel" aria-label="Chatbot de Recursos Humanos">
   <header className="rh-bot-head"><span className="rh-bot-avatar"><Bot size={21}/></span>
    <div><strong>Viço IA</strong><small>Recursos Humanos · referência {mes.slice(-2)}/2026</small></div>
    <button onClick={()=>setOpen(false)} aria-label="Fechar chat"><X size={18}/></button>
   </header>
   <div className="rh-bot-feed" aria-live="polite">{messages.map((m,i)=><div key={i} className={'rh-bot-msg '+m.autor}>
    <p>{m.texto}</p>{m.fontes?.length?<div className="rh-bot-sources">{m.fontes.map(s=><a href={s} key={s} target="_blank" rel="noopener noreferrer">Consultar fonte <ExternalLink size={11}/></a>)}</div>:null}
   </div>)}{waiting&&<div className="rh-bot-msg assistant"><p>Analisando dados disponíveis...</p></div>}</div>
   {messages.length<=2&&<div className="rh-bot-examples">{exemplos.map(q=><button key={q} onClick={()=>enviar(q)} disabled={waiting}>{q}</button>)}</div>}
   <form onSubmit={e=>{e.preventDefault();enviar(input)}} className="rh-bot-form"><input value={input} maxLength={600} onChange={e=>setInput(e.target.value)} placeholder="Pergunte sobre o RH..." aria-label="Sua pergunta"/><button type="submit" disabled={waiting||input.trim().length<4} aria-label="Enviar pergunta"><Send size={18}/></button></form>
   <small className="rh-bot-disclaimer">{modo==='gemini'?'Gemini com dados agregados':'Respostas baseadas nos registros disponíveis'} · Verifique as fontes</small>
  </section>}
  <button className="rh-bot-trigger" type="button" aria-expanded={open} aria-label={open?'Recolher Viço IA':'Abrir Viço IA'} onClick={()=>setOpen(v=>!v)}>
   <span className="rh-bot-trigger-avatar"><Bot size={23}/></span><strong>Viço IA</strong><span className="rh-bot-online"/>{open&&<ChevronDown size={14}/>}
  </button>
 </div>;
}
