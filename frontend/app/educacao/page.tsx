'use client';
import {useEffect,useMemo,useState} from 'react';
import {BookOpen,Building2,CalendarDays,ClipboardList,ExternalLink,GraduationCap,Info,MapPin,Search,School,Users} from 'lucide-react';
import {indicadoresEducacao,unidadesEscolares} from '../../lib/educacao-dados';
import './educacao.css';

type RHDocentes={mes:string;total:number;linhas:number;cargos:{cargo:string;vinculos:number}[];origem:string;tipo:string;ressalva:string;fonte:string};
const formatar=(v:number|null|undefined)=>v==null?'—':new Intl.NumberFormat('pt-BR').format(v);
const filtros=['Todas','Urbana','Rural'] as const;
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho'];
export default function Educacao(){
 const [busca,setBusca]=useState('');
 const [localizacao,setLocalizacao]=useState<(typeof filtros)[number]>('Todas');
 const [mesRH,setMesRH]=useState('2026-07');
 const [docentes,setDocentes]=useState<RHDocentes|null>(null);
 const [erroDocentes,setErroDocentes]=useState('');
 const [carregando,setCarregando]=useState(true);
 useEffect(()=>{
  let ativo=true;setDocentes(null);setErroDocentes('');setCarregando(true);
  fetch('/api/educacao/professores?mes='+mesRH,{cache:'no-store'})
   .then(async res=>{const obj=await res.json();if(!res.ok)throw new Error(obj.error||'Consulta indisponível.');return obj as RHDocentes;})
   .then(obj=>{if(ativo)setDocentes(obj)})
   .catch(e=>{if(ativo)setErroDocentes(e instanceof Error?e.message:'Não foi possível consultar o RH.')})
   .finally(()=>{if(ativo)setCarregando(false)});
  return()=>{ativo=false};
 },[mesRH]);
 const visiveis=useMemo(()=>unidadesEscolares.filter(e=>{
  const pesquisa=(e.nome+' '+e.bairro+' '+e.codigo_inep).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const termo=busca.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  return (!termo||pesquisa.includes(termo))&&(localizacao==='Todas'||e.localizacao===localizacao);
 }),[busca,localizacao]);
 const referencias=indicadoresEducacao.filter(i=>i.id!=='docentes');
 const matriculas=unidadesEscolares.reduce((v,e)=>v+(e.matriculas||0),0);
 const turmas=unidadesEscolares.reduce((v,e)=>v+(e.turmas||0),0);
 const indicadores=[
  {id:'escolas',titulo:'Escolas da rede municipal',valor:unidadesEscolares.length,periodo:'Censo Escolar 2025',extra:'Unidades municipais em atividade',fonte:'https://prospectei.app.br/escolas/cidade/vicosa-mg/',icon:<School size={17}/>},
  {id:'matriculas',titulo:'Matrículas da rede municipal',valor:matriculas,periodo:'Censo Escolar 2025',extra:'Matrículas somadas por escola',fonte:'https://prospectei.app.br/escolas/cidade/vicosa-mg/',icon:<BookOpen size={17}/>},
  {id:'docentes',titulo:'Professores na folha municipal',valor:carregando||!docentes?null:docentes.total,periodo:'Folha '+mesRH.slice(-2)+'/2026',extra:carregando?'Consultando banco RH...':erroDocentes?'Não foi possível consultar':docentes?.ressalva?'Matrículas funcionais de professor':'Dados funcionais',fonte:docentes?.fonte||'',icon:<Users size={17}/>},
  {id:'turmas',titulo:'Turmas da rede municipal',valor:turmas,periodo:'Censo Escolar 2025',extra:'Turmas somadas por escola',fonte:'https://prospectei.app.br/escolas/cidade/vicosa-mg/',icon:<ClipboardList size={17}/>}
 ];
 return <div className="edu-page">
  <div className="edu-breadcrumb">VIÇO GOV / SECRETARIAS / EDUCAÇÃO</div>
  <div className="edu-heading">
   <div><span className="edu-kicker"><GraduationCap size={15}/> REDE MUNICIPAL DE ENSINO</span>
    <h1>Secretaria de Educação</h1>
    <p>Panorama das escolas, matrículas, professores e turmas da rede municipal de Viçosa–MG. Cada indicador informa sua competência e origem.</p></div>
   <span className="edu-location"><MapPin size={14}/> Viçosa · MG</span>
  </div>
  <div className="edu-reference"><Info size={16}/><span><b>Referências distintas:</b> escolas, alunos e turmas do Censo Escolar 2025; professores por cargo extraídos da folha de RH de 2026. A Câmara mencionou 19 escolas em outra referência de 2025, enquanto a listagem censitária consultada apresenta 18 unidades municipais ativas. Essa diferença ainda requer conciliação.</span></div>
  <div className="edu-metrics">
   {indicadores.map(i=><article className="edu-stat" key={i.id}>
    <div className="edu-stat-top"><span>{i.titulo}</span><span className="edu-stat-icon">{i.icon}</span></div>
    <strong>{i.id==='docentes'&&carregando?'…':formatar(i.valor)}</strong>
    <div className="edu-stat-meta">{i.periodo}</div>
    <p>{i.extra}</p>
    {i.fonte&&<a href={i.fonte} target="_blank" rel="noopener noreferrer">Consultar origem <ExternalLink size={12}/></a>}
   </article>)}
  </div>
  <section className="edu-panel">
   <div className="edu-panel-heading"><div><h2><Building2 size={18}/> Escolas da rede municipal</h2>
    <p>Relação por código INEP, com matrículas, turmas e docentes declarados no Censo de 2025.</p></div>
    <span className="edu-counter">{unidadesEscolares.length} escolas cadastradas</span></div>
   <div className="edu-searchrow">
    <label className="edu-search"><Search size={17}/><input aria-label="Pesquisar escola ou bairro" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar escola, bairro ou código INEP..."/></label>
    <select aria-label="Filtrar localização" value={localizacao} onChange={e=>setLocalizacao(e.target.value as (typeof filtros)[number])}>{filtros.map(x=><option key={x} value={x}>{x==='Todas'?'Todas as localizações':x}</option>)}</select>
   </div>
   <div className="edu-tablebox"><table className="edu-table">
    <thead><tr><th>Unidade escolar</th><th>Localização</th><th>Matrículas (2025)</th><th>Docentes (Censo 2025)</th><th>Turmas (2025)</th><th>Fonte</th></tr></thead>
    <tbody>{visiveis.map(e=><tr key={e.codigo_inep}>
     <td><b>{e.nome}</b><small>INEP {e.codigo_inep} · {e.bairro}</small></td>
     <td>{e.localizacao}</td><td>{formatar(e.matriculas)}</td><td>{formatar(e.docentes)}</td><td>{formatar(e.turmas)}</td>
     <td><a href={e.fonte_url} target="_blank" rel="noopener noreferrer" className="edu-individual-source">Ver registro <ExternalLink size={12}/></a></td>
    </tr>)}</tbody>
   </table>{visiveis.length===0&&<p className="edu-noresult">Nenhuma unidade corresponde à pesquisa.</p>}</div>
   <p className="edu-table-notice">Os números por escola são reproduzidos de base secundária que identifica o Censo Escolar 2025 como origem. Para uso oficial, conferir a exportação do Catálogo de Escolas do INEP. Docentes informados no Censo não devem ser somados como pessoas únicas nem equiparados aos vínculos da folha.</p>
  </section>
  <section className="edu-panel">
   <div className="edu-panel-heading"><div><h2><Users size={18}/> Professores identificados na folha do RH</h2>
    <p>Mesma base de matrículas funcionais utilizada em Recursos Humanos. Inclusões repetidas do mesmo vínculo no mês são consolidadas.</p></div>
    <label className="edu-month-selector"><CalendarDays size={15}/><select aria-label="Selecionar mês da folha dos professores" value={mesRH} onChange={e=>setMesRH(e.target.value)}>{meses.map((m,i)=><option key={m} value={'2026-'+String(i+1).padStart(2,'0')}>{m} / 2026</option>)}</select></label></div>
   {erroDocentes&&<p className="edu-query-error">{erroDocentes}</p>}
   {!carregando&&docentes&&<><div className="edu-rh-summary"><b>{formatar(docentes.total)}</b><span>matrículas funcionais distintas com cargo de professor nesta competência</span></div>
    <div className="edu-role-list">{docentes.cargos.map(c=><div key={c.cargo}><span>{c.cargo}</span><b>{formatar(c.vinculos)}</b></div>)}</div>
    <p className="edu-table-notice">{docentes.ressalva}</p></>}
   {carregando&&<p className="edu-table-notice">Buscando dados da folha...</p>}
  </section>
 </div>;
}
