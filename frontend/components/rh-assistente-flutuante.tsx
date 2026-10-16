'use client';
import {useEffect,useRef,useState} from 'react';
import {ChevronDown,ExternalLink,Send,X} from 'lucide-react';
import {usePathname} from 'next/navigation';
type Resposta={modo:string;resposta:string;fontes?:string[];escopo?:string};
type Mensagem={autor:'user'|'assistant';texto:string;fontes?:string[]};
const exemplos=['Qual secretaria tem mais funcionários em julho?','Quantos alunos existem nas escolas municipais?','Quanto foi gasto com a folha da Educação?','Quais são as maiores rubricas da folha?'];
export default function RHAssistenteFlutuante(){
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 const [input,setInput]=useState('');
 const [waiting,setWaiting]=useState(false);
 const [mes,setMes]=useState('2026-07');
 const [departamento,setDepartamento]=useState('');
 const [messages,setMessages]=useState<Mensagem[]>([{autor:'assistant',texto:'Olá! Sou o Viço IA. Posso consultar as informações que já existem no sistema, como escolas, matrículas, servidores, secretarias, folha de pagamento, cargos e rubricas. Pergunte o que deseja analisar.'}]);
 const [modo,setModo]=useState('');
 const finalRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{
  // Os links dos cards passam mês/departamento; a seleção do chat pode ser alterada na própria conversa.
  const params=new URLSearchParams(window.location.search);
  const m=params.get('mes');if(m&&/^2026-0[1-7]$/.test(m))setMes(m);
  const d=params.get('departamento');setDepartamento(d&&d.length<161?d:'');
 },[pathname]);
 useEffect(()=>{if(open)finalRef.current?.scrollIntoView({block:'nearest',behavior:'smooth'})},[open,messages,waiting]);
 async function enviar(q:string){
  if(waiting||q.trim().length<4)return;
  const pergunta=q.trim();setInput('');setWaiting(true);
  setMessages(v=>[...v,{autor:'user',texto:pergunta}]);
  try{
   const response=await fetch('/api/agente/consulta',{method:'POST',cache:'no-store',
    headers:{'Content-Type':'application/json'},body:JSON.stringify({pergunta,mes,departamento})});
   const resultado=await response.json();
   if(!response.ok)throw new Error(resultado.error||'Falha ao consultar as bases.');
   const data=resultado as Resposta;
   setModo(data.modo);
   setMessages(v=>[...v,{autor:'assistant',texto:data.resposta||'Não encontrei uma resposta comprovável nos dados disponíveis.',fontes:data.fontes}]);
  }catch(err){setMessages(v=>[...v,{autor:'assistant',texto:err instanceof Error?err.message:'Não foi possível consultar os dados no momento.'}]);}
  finally{setWaiting(false);}
 }
 return <div className="rh-bot-wrap">
  {open&&<section className="rh-bot-panel" aria-label="Viço IA — agente de dados municipais">
   <header className="rh-bot-head">
    <span className="rh-bot-avatar rh-bot-logo">V</span>
    <div><strong>Viço IA</strong><small>Assistente de dados do Viço Gov</small></div>
    <button type="button" onClick={()=>setOpen(false)} aria-label="Fechar chat"><X size={18}/></button>
   </header>
   <div className="rh-bot-feed" aria-live="polite">
    {messages.map((m,i)=><div key={i} className={'rh-bot-msg '+m.autor}><p>{m.texto}</p>{m.fontes?.length?<div className="rh-bot-sources">
     {m.fontes.map(s=><a href={s} key={s} target="_blank" rel="noopener noreferrer">Consultar fonte <ExternalLink size={11}/></a>)}</div>:null}</div>)}
    {waiting&&<div className="rh-bot-msg"><p>Consultando o sistema...</p></div>}<div ref={finalRef}/>
   </div>
   <div className="rh-bot-context"><label>Folha de referência <select value={mes} onChange={e=>setMes(e.target.value)}>{['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho'].map((x,i)=><option key={x} value={'2026-'+String(i+1).padStart(2,'0')}>{x}/2026</option>)}</select></label></div>
   {messages.length<=2&&<div className="rh-bot-examples">{exemplos.map(q=><button type="button" key={q} onClick={()=>enviar(q)} disabled={waiting}>{q}</button>)}</div>}
   <form onSubmit={e=>{e.preventDefault();enviar(input)}} className="rh-bot-form"><input value={input} maxLength={600} onChange={e=>setInput(e.target.value)} placeholder="Pergunte sobre os dados..." aria-label="Sua pergunta para Viço IA"/><button type="submit" disabled={waiting||input.trim().length<4} aria-label="Enviar pergunta"><Send size={18}/></button></form>
   <small className="rh-bot-disclaimer">{modo==='gemini'?'Respostas geradas a partir dos dados consultados':modo==='consulta_local'?'Consultas automáticas às bases existentes':'Informações limitadas às bases integradas'} · Confira os dados de origem</small>
  </section>}
  <button className="rh-bot-trigger" type="button" aria-expanded={open} aria-label={open?'Recolher Viço IA':'Abrir Viço IA'} onClick={()=>setOpen(v=>!v)}>
   <span className="rh-bot-trigger-avatar rh-bot-logo">V</span><strong>Viço IA</strong><span className="rh-bot-online"/>{open&&<ChevronDown size={14}/>}
  </button>
 </div>;
}
