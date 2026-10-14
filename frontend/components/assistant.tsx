'use client';
import {useEffect,useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {Bot,Send,UserRound,ExternalLink,AlertCircle} from 'lucide-react';
import {api} from '../lib/api';
type Resposta={resposta:string,tipo:string,fontes?:string[],dados?:unknown[]};
type Message={role:'user'|'assistant',text:string,fontes?:string[],error?:boolean};
const suggestions=['Quanto a Prefeitura recebeu de CIP?','Qual secretaria tem mais servidores?','Quantas fontes de dados estão previstas?','Quanto foi gasto em 2026?'];
export default function Assistant(){
 const qs=useSearchParams();const initial=qs.get('q')||'';
 const [input,setInput]=useState(initial),[year,setYear]=useState(2026),[busy,setBusy]=useState(false);
 const [messages,setMessages]=useState<Message[]>([{role:'assistant',text:'Olá! Sou o assistente de consultas do VIÇO GOV. Posso responder perguntas sobre dados já registrados e explicar quando uma fonte ainda não foi integrada. Meus resultados não substituem a conferência oficial.'}]);
 async function send(q:string){if(busy||!q.trim())return;const value=q.trim();setMessages(p=>[...p,{role:'user',text:value}]);setInput('');setBusy(true);
   const result=await api<Resposta>('/api/v1/agente/perguntas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pergunta:value,ano:year})});
   setMessages(p=>[...p,{role:'assistant',text:result.data?.resposta||result.error||'Não foi possível responder no momento.',fontes:result.data?.fontes,error:!result.data}]);setBusy(false);
 }
 return <div className="chat-layout"><div className="chat-top"><div className="chat-identity"><div className="chat-bot"><Bot size={22}/></div><div><strong>VIÇO IA</strong><small>Consulta supervisionada às bases disponíveis</small></div></div><div className="select-wrap"><select value={year} aria-label="Ano consultado" onChange={e=>setYear(Number(e.target.value))}>{[2026,2025,2024,2017,2016,2015].map(x=><option key={x}>{x}</option>)}</select></div></div>
   <div className="chat-messages">{messages.map((m,i)=><div key={i} className={'chat-message '+m.role}><span className="chat-avatar">{m.role==='assistant'?<Bot size={15}/>:<UserRound size={16}/>}</span><div className="chat-bubble"><p>{m.text}</p>{m.fontes?.length?<div className="chat-sources"><span>Fontes e referências</span>{m.fontes.map((f,j)=>(f.startsWith('http')?<a key={j} target="_blank" rel="noopener noreferrer" href={f}>{f.includes('vicosa')?'Prefeitura de Viçosa':'Referência oficial'} <ExternalLink size={12}/></a>:<small key={j}>{f}</small>))}</div>:null}</div></div>)}{busy&&<div className="chat-message assistant"><span className="chat-avatar"><Bot size={15}/></span><div className="chat-bubble">Consultando os registros disponíveis…</div></div>}</div>
   {messages.length<3&&<div className="suggestions">{suggestions.map(s=><button key={s} onClick={()=>send(s)}>{s}</button>)}</div>}
   <form className="chat-form" onSubmit={e=>{e.preventDefault();send(input)}}><input value={input} maxLength={600} onChange={e=>setInput(e.target.value)} aria-label="Pergunta para o assistente" placeholder="Pergunte sobre servidores, despesas, CIP, emendas…"/><button disabled={busy||input.trim().length<4} title="Enviar pergunta"><Send size={20}/></button></form>
   <div className="chat-disclaimer"><AlertCircle size={13}/> Versão inicial com consultas controladas; ainda não utiliza modelo generativo ou RAG.</div>
 </div>
}
