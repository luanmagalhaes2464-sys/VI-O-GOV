'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {AlertCircle,AlertTriangle,BarChart3,Bot,BookOpen,CalendarDays,CheckCircle2,ChevronDown,ExternalLink,Info,Landmark,Search,Send,ShieldCheck,Wallet} from 'lucide-react';
import {api,brl,num} from '../../../lib/api';
import './inteligencia.css';

type Tipo='variacao_mensal'|'comparacao_pares'|'qualidade_dados';
type Alerta={id:string;tipo:Tipo;nivel:string;titulo:string;descricao:string;servidor?:string;matricula?:string;cargo?:string;departamento?:string;valor_atual?:number;valor_referencia?:number;variacao_percentual?:number;multiplicador?:number;pares_considerados?:number;quantidade?:number;criterio:string;fonte:string;situacao:string};
type Alertas={mes:string;mes_comparacao:string|null;indicadores:{lancamentos:number;vinculos:number;nomes_distintos:number;bruto:number;sem_base:number;liquido_superior_bruto:number};resumo:{variacoes:number;comparacoes_pares:number;qualidade:number;total:number;resultados_limitados:string};alertas:Alerta[];fonte:string;aviso:string;observacao:string};
type Fiscal={ente:string;exercicio:number;quadrimestre:number;percentual_dtp_executivo:number|null;situacao:string;faixas_percentuais:{alerta:number;prudencial:number;legal:number};itens_rgf:number;referencia_linha:{valor:number;conta:string;coluna:string}|null;fonte:string;documentacao:string;erro:string|null;aviso:string};
type Agente={modo:'gemini'|'sem_chave_gemini';resposta:string;fontes:string[];indicadores?:Record<string,unknown>};
type Mensagem={autor:'usuario'|'assistente';texto:string;fontes?:string[]};
const periodos=Array.from({length:7},(_,i)=>'2026-'+String(i+1).padStart(2,'0'));
const nomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho'];
const sugestoes=['A folha de julho aumentou em relação a junho?','Qual departamento concentra a maior folha?','Os salários acima da mediana são irregulares?','Como funciona o limite de gasto com pessoal da LRF?'];
const fmt=(v:number|null|undefined)=>v==null?'—':v.toFixed(2).replace('.',',')+'%';
function nomeMes(v:string){return nomes[Math.max(0,Number(v.slice(-2))-1)]+' / 2026'}
export default function InteligenciaRH(){
 const [aba,setAba]=useState<'alertas'|'fiscal'|'agente'>('alertas');
 const [mes,setMes]=useState('2026-07'),[tipo,setTipo]=useState('todos'),[busca,setBusca]=useState('');
 const [alertas,setAlertas]=useState<Alertas|null>(null),[erroAlertas,setErroAlertas]=useState(''),[cargaAlertas,setCargaAlertas]=useState(false);
 const [ano,setAno]=useState(2026),[periodo,setPeriodo]=useState(2),[fiscal,setFiscal]=useState<Fiscal|null>(null),[erroFiscal,setErroFiscal]=useState(''),[cargaFiscal,setCargaFiscal]=useState(false);
 const [mensagens,setMensagens]=useState<Mensagem[]>([{autor:'assistente',texto:'Olá! Sou o assistente do RH do Viço GOV. Trabalho com os indicadores da folha disponível, indico as fontes e explico quando não há dados suficientes para concluir.'}]);
 const [pergunta,setPergunta]=useState(''),[enviando,setEnviando]=useState(false),[modo,setModo]=useState('');
 const [aberto,setAberto]=useState('');
 useEffect(()=>{let alive=true;setCargaAlertas(true);setErroAlertas('');
  api<Alertas>('/api/v1/rh/inteligencia/alertas?mes='+mes).then(r=>{
   if(!alive)return;if(r.data)setAlertas(r.data);else{setAlertas(null);setErroAlertas(r.error||'Consulta indisponível.')}
  }).finally(()=>{if(alive)setCargaAlertas(false)});
  return()=>{alive=false};
 },[mes]);
 useEffect(()=>{if(aba!=='fiscal')return;let alive=true;setCargaFiscal(true);setErroFiscal('');
  api<Fiscal>('/api/v1/rh/inteligencia/fiscal?ano='+ano+'&periodo='+periodo).then(r=>{
    if(!alive)return;if(r.data)setFiscal(r.data);else{setFiscal(null);setErroFiscal(r.error||'RGF indisponível.')}
  }).finally(()=>{if(alive)setCargaFiscal(false)});
  return()=>{alive=false};
 },[aba,ano,periodo]);
 const filtrados=useMemo(()=>alertas?.alertas.filter(x=>(tipo==='todos'||x.tipo===tipo)&&
  (!busca.trim()||[x.titulo,x.servidor,x.matricula,x.cargo,x.departamento].some(s=>(s||'').toLowerCase().includes(busca.toLowerCase().trim()))))||[],[alertas,tipo,busca]);
 async function enviar(texto:string){
  const q=texto.trim();if(!q||enviando)return;
  setMensagens(p=>[...p,{autor:'usuario',texto:q}]);setPergunta('');setEnviando(true);
  const r=await api<Agente>('/api/v1/rh/inteligencia/agente',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pergunta:q,mes})});
  if(r.data){setModo(r.data.modo);setMensagens(p=>[...p,{autor:'assistente',texto:r.data!.resposta,fontes:r.data!.fontes}]);}
  else setMensagens(p=>[...p,{autor:'assistente',texto:(r.error||'Não foi possível responder.')+' Não vou inventar uma análise.'}]);
  setEnviando(false);
 }
 const pct=fiscal?.percentual_dtp_executivo;
 return <div className="int-page">
  <div className="rh-kicker">VIÇO GOV / RECURSOS HUMANOS / INTELIGÊNCIA</div>
  <div className="int-heading"><div><h1>Alertas e Inteligência de RH</h1><p>Triagem de inconsistências, monitoramento fiscal e assistência com fontes verificáveis.</p></div><Link href="/rh">Voltar à folha <ExternalLink size={14}/></Link></div>
  <div className="int-tabs" role="tablist" aria-label="Áreas de inteligência">
   <button type="button" role="tab" aria-selected={aba==='alertas'} className={aba==='alertas'?'active':''} onClick={()=>setAba('alertas')}><AlertTriangle size={16}/> Alertas e Auditoria</button>
   <button type="button" role="tab" aria-selected={aba==='fiscal'} className={aba==='fiscal'?'active':''} onClick={()=>setAba('fiscal')}><Landmark size={16}/> Inteligência Fiscal</button>
   <button type="button" role="tab" aria-selected={aba==='agente'} className={aba==='agente'?'active':''} onClick={()=>setAba('agente')}><Bot size={16}/> Assistente IA</button>
  </div>
  {aba==='alertas'&&<div className="int-section">
   <div className="int-tools">
    <label><CalendarDays size={16}/> Competência <select value={mes} onChange={e=>{setMes(e.target.value);setAberto('')}}>{periodos.map(x=><option value={x} key={x}>{nomeMes(x)}</option>)}</select><ChevronDown size={13}/></label>
    <span>Comparação mensal com a competência anterior, quando disponível.</span>
   </div>
   {erroAlertas&&<div className="int-warning"><AlertCircle size={17}/>{erroAlertas}</div>}
   <div className="int-kpis">
    <article><span><Wallet size={15}/> Folha bruta</span><strong>{cargaAlertas?'…':brl(alertas?.indicadores.bruto)}</strong><small>Remuneração, não DTP da LRF</small></article>
    <article><span><ShieldCheck size={15}/> Vínculos identificados</span><strong>{cargaAlertas?'…':num(alertas?.indicadores.vinculos)}</strong><small>Nome + matrícula, sem deduplicar pessoas</small></article>
    <article><span><BarChart3 size={15}/> Variações relevantes</span><strong>{cargaAlertas?'…':num(alertas?.resumo.variacoes)}</strong><small>Necessitam conferência de rubricas</small></article>
    <article><span><Info size={15}/> Comparações entre pares</span><strong>{cargaAlertas?'…':num(alertas?.resumo.comparacoes_pares)}</strong><small>Indícios estatísticos, não irregularidades</small></article>
   </div>
   <div className="int-panel">
    <div className="int-panel-header"><div><h2>Ocorrências para conferência</h2><p>Clique em cada ocorrência para ver valores, critério e fonte.</p></div><span className="int-count">{num(filtrados.length)} exibidas</span></div>
    <div className="int-filters">
     <label className="int-search"><Search size={16}/><input value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Buscar cargo, servidor, matrícula ou departamento..." aria-label="Pesquisar ocorrências"/></label>
     <select aria-label="Filtrar tipo de alerta" value={tipo} onChange={e=>setTipo(e.target.value)}><option value="todos">Todas as ocorrências</option><option value="variacao_mensal">Variação mensal</option><option value="comparacao_pares">Comparação salarial</option><option value="qualidade_dados">Qualidade dos dados</option></select>
    </div>
    {cargaAlertas?<p className="int-muted">Analisando as competências...</p>:
      <div className="int-list">{filtrados.map(x=><article className="int-alert" key={x.id}>
       <button type="button" onClick={()=>setAberto(v=>v===x.id?'':x.id)} aria-expanded={aberto===x.id}>
        <span className="int-indicator" data-kind={x.nivel}><AlertTriangle size={16}/></span>
        <span className="int-alert-text"><b>{x.titulo}</b><small>{x.servidor?x.servidor+' · '+x.cargo:x.quantidade?num(x.quantidade)+' lançamentos':''}</small></span>
        <span className="int-alert-amount">{brl(x.valor_atual)}<small>{x.variacao_percentual!=null?'+'+fmt(x.variacao_percentual):x.multiplicador!=null?fmt(x.multiplicador).replace('%','')+'× a mediana':''}</small></span>
        <ChevronDown size={17}/></button>
       {aberto===x.id&&<div className="int-alert-detail"><p>{x.descricao}</p>
        <div className="int-detail-grid">
         {x.matricula&&<div><span>Matrícula</span><strong>{x.matricula}</strong></div>}
         {x.departamento&&<div><span>Departamento</span><strong>{x.departamento}</strong></div>}
         {x.valor_referencia!=null&&<div><span>Valor de comparação</span><strong>{brl(x.valor_referencia)}</strong></div>}
         {x.pares_considerados!=null&&<div><span>Vínculos no grupo</span><strong>{num(x.pares_considerados)}</strong></div>}
        </div>
        <p><b>Regra:</b> {x.criterio}</p><a href={x.fonte} target="_blank" rel="noopener noreferrer">Conferir fonte da folha <ExternalLink size={13}/></a>
        <p className="int-review"><Info size={14}/> Pendente de conferência documental; não há conclusão de irregularidade.</p>
       </div>}</article>)}
       {!filtrados.length&&<p className="int-muted">Nenhuma ocorrência com os filtros aplicados.</p>}
      </div>}
   </div>
   <div className="int-notice"><Info size={18}/><span>{alertas?.aviso||'Análise baseada nos registros de remuneração disponíveis.'} {alertas?.resumo.resultados_limitados||''}</span></div>
  </div>}
  {aba==='fiscal'&&<div className="int-section">
    <div className="int-tools"><label><CalendarDays size={16}/> Exercício <select value={ano} onChange={e=>setAno(Number(e.target.value))}>{[2026,2025,2024].map(x=><option key={x}>{x}</option>)}</select></label>
     <label>Quadrimestre <select value={periodo} onChange={e=>setPeriodo(Number(e.target.value))}>{[1,2,3].map(x=><option key={x} value={x}>{x}º quadrimestre</option>)}</select></label>
    </div>
    <div className="int-panel">
     <div className="int-panel-header"><div><h2>Despesa Total com Pessoal — Poder Executivo</h2><p>Fonte: RGF, Anexo 01 · Tesouro Nacional / SICONFI</p></div><Landmark size={23}/></div>
     {cargaFiscal?<p className="int-muted">Consultando a API oficial do Tesouro Nacional...</p>:<>
      {erroFiscal&&<p className="int-warning">{erroFiscal}</p>}
      <div className="int-fiscal-number"><strong>{fmt(pct)}</strong><span>{pct==null?'Indicador ainda não validado para o período':fiscal?.situacao==='acima_limite'?'Acima do limite legal':fiscal?.situacao==='prudencial'?'Patamar prudencial':fiscal?.situacao==='alerta'?'Faixa de alerta':'Abaixo do patamar de alerta'}</span></div>
      <div className="int-gauge"><div style={{width:pct==null?'0%':Math.min(100,pct/60*100)+'%'}}/></div>
      <div className="int-scale"><span>0%</span><span>Alerta 48,6%</span><span>Prudencial 51,3%</span><span>Legal 54%</span><span>60%</span></div>
      <div className="int-limits"><div><span>Alerta</span><strong>48,60%</strong></div><div><span>Prudencial</span><strong>51,30%</strong></div><div><span>Limite legal Executivo</span><strong>54,00%</strong></div></div>
      {fiscal?.erro&&<div className="int-warning"><AlertCircle size={18}/><span>{fiscal.erro} Não vamos preencher a porcentagem com uma estimativa.</span></div>}
      {fiscal?.referencia_linha&&<p className="int-muted">Extração: {fiscal.referencia_linha.conta} · {fiscal.referencia_linha.coluna}</p>}
     </>}
    </div>
    <div className="int-notice"><Info size={18}/><span>O RGF considera regras fiscais, encargos e período móvel, diferentes da soma da folha nominal. A ausência de demonstrativo não significa gasto zero. Confirme a homologação e eventuais retificações.</span></div>
    <a className="int-official" href="https://apidatalake.tesouro.gov.br/docs/siconfi/" target="_blank" rel="noopener noreferrer">Documentação oficial da API SICONFI <ExternalLink size={14}/></a>
  </div>}
  {aba==='agente'&&<div className="int-section">
    <div className="int-panel int-chat">
      <div className="int-chat-head"><div className="int-chat-symbol"><Bot size={22}/></div><div><h2>Assistente Inteligente Viço GOV</h2><p>Consultas agregadas verificáveis, sem acesso livre ao banco de dados</p></div><span className="int-chat-mode">{modo==='gemini'?'Gemini ativo':modo==='sem_chave_gemini'?'Modo básico':'Consulta supervisionada'}</span></div>
      <div className="int-chat-feed" aria-live="polite">{mensagens.map((m,i)=><div className={'int-message '+m.autor} key={i}>
       <p>{m.texto}</p>{m.fontes?.length?<div className="int-sources">{m.fontes.map(f=><a href={f} target="_blank" rel="noopener noreferrer" key={f}>Fonte oficial <ExternalLink size={12}/></a>)}</div>:null}
      </div>)}{enviando&&<p className="int-muted">Consultando os dados disponíveis...</p>}</div>
      {mensagens.length<=2&&<div className="int-suggestions">{sugestoes.map(q=><button key={q} type="button" disabled={enviando} onClick={()=>enviar(q)}>{q}</button>)}</div>}
      <form className="int-chat-form" onSubmit={e=>{e.preventDefault();enviar(pergunta)}}><input aria-label="Perguntar ao assistente" value={pergunta} maxLength={600} onChange={e=>setPergunta(e.target.value)} placeholder="Pergunte sobre salários, secretarias, gastos e legislação..."/><button type="submit" disabled={enviando||pergunta.trim().length<4} aria-label="Enviar pergunta"><Send size={18}/></button></form>
      <div className="int-chat-foot"><BookOpen size={14}/> IA não conclui ilegalidade nem substitui análise funcional, fiscal e jurídica.</div>
    </div>
  </div>}
 </div>;
}
