'use client';
import Link from 'next/link';
import {useMemo,useState} from 'react';
import {ArrowRight,BookOpen,ExternalLink,Landmark,MapPinned,Search,ShieldCheck,Users,Info} from 'lucide-react';
import {secretarias,outrasUnidades,contextoMunicipal,fontesGerais} from '../lib/secretarias';
import {PageTitle,Panel,Notice} from '../components/ui';

export default function Home(){
 const [busca,setBusca]=useState('');
 const filtradas=useMemo(()=>secretarias.filter(s=>(s.nome+' '+s.sigla+' '+s.curto+' '+s.tema).toLocaleLowerCase('pt-BR').includes(busca.toLocaleLowerCase('pt-BR'))),[busca]);
 return <div className="gov-home">
   <PageTitle eyebrow="VIÇO GOV / VISÃO DO PREFEITO" title="Gestão por secretaria" subtitle="Um ponto de partida para cada área do município, com indicadores definidos e fontes rastreáveis."/>
   <section className="gov-welcome"><div><div className="gov-welcome-label">VIÇOSA · MINAS GERAIS</div><h2>Informação organizada por quem <span>toma a decisão.</span></h2><p>Explore cada secretaria para entender suas responsabilidades, dados essenciais e o que ainda precisa ser integrado. Não tratamos base ausente como valor zero.</p><a href={fontesGerais.prefeitura} target="_blank" rel="noreferrer" className="gov-link-light">Consultar estrutura municipal <ExternalLink size={14}/></a></div><div className="gov-welcome-emblem"><Landmark size={48}/><b>12</b><span>Secretarias</span></div></section>
   <div className="gov-small-title"><b>Contexto municipal</b><span>Dados oficiais de referência — não são resultados de nenhuma secretaria isoladamente.</span></div>
   <div className="gov-context-grid">{contextoMunicipal.map(item=><a key={item.rotulo} className="gov-context" href={item.url} target="_blank" rel="noopener noreferrer"><div>{item.rotulo}</div><strong>{item.valor}</strong><span>{item.fonte} · {item.periodo} <ExternalLink size={11}/></span></a>)}</div>
   <div className="gov-directory-head"><div><h2>Secretarias municipais <span>{secretarias.length}</span></h2><p>Selecione uma secretaria para abrir seu painel de gestão.</p></div><div className="gov-search"><Search size={17}/><input aria-label="Filtrar secretarias" placeholder="Buscar secretaria..." value={busca} onChange={e=>setBusca(e.target.value)}/></div></div>
   <div className="gov-directory">{filtradas.map((s,i)=><Link href={'/secretarias/'+s.slug} key={s.sigla} className="gov-dept">
     <div className="gov-dept-top"><span className="gov-dept-mark">{s.sigla.slice(0,2)}</span><span className="gov-dept-sigla">{s.sigla}</span></div>
     <strong>{s.curto}</strong><p>{s.missao}</p><div className="gov-dept-bottom"><span>{s.indicadores.length} indicadores prioritários</span><ArrowRight size={17}/></div>
   </Link>)}</div>
   {filtradas.length===0&&<div className="gov-empty">Nenhuma secretaria corresponde à sua busca.</div>}
   <Panel title="Órgãos e unidades relacionados" description="Estruturas importantes para o sistema, mas não classificadas como secretarias."><div className="gov-related">{outrasUnidades.map(x=><a key={x.sigla} href={x.url} target="_blank" rel="noreferrer"><span>{x.sigla}</span>{x.nome}<ExternalLink size={13}/></a>)}</div></Panel>
   <Notice><ShieldCheck size={17}/><div><b>Qualidade dos dados:</b> os nomes das secretarias seguem o menu institucional da Prefeitura de Viçosa/MG. Os indicadores setoriais são propostas de acompanhamento; valores financeiros e operacionais só aparecerão após importação e validação. <a href={fontesGerais.transparencia} target="_blank" rel="noopener noreferrer">Portal da Transparência <ExternalLink size={12}/></a></div></Notice>
 </div>
}
