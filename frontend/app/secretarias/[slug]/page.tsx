'use client';
import {useEffect,useState} from 'react';
import {useParams} from 'next/navigation';
import Link from 'next/link';
import {ArrowLeft,ArrowRight,ExternalLink,FileSearch,DatabaseZap,Info,Landmark,Users,Wallet,MapPinned} from 'lucide-react';
import {secretariaPorSlug,secretarias,contextoMunicipal,fontesGerais} from '../../../lib/secretarias';
import {api,brl,num} from '../../../lib/api';
import {Notice,PageTitle,Panel} from '../../../components/ui';

type ResumoSetorial={ano:number,sigla:string,despesa_paga:number|null,servidores:number|null,registros_financeiros:number,nota:string};
export default function SecretariaView(){
 const params=useParams();const slug=String(params.slug||'');const secretaria=secretariaPorSlug(slug);
 const [ano,setAno]=useState(2026),[resumo,setResumo]=useState<ResumoSetorial|null>(null);
 useEffect(()=>{setResumo(null);if(!secretaria)return;let ativo=true;api<ResumoSetorial>('/api/v1/secretarias/'+secretaria.sigla+'/resumo?ano='+ano).then(r=>{if(ativo)setResumo(r.data)});return()=>{ativo=false};},[ano,secretaria?.sigla]);
 if(!secretaria)return <><PageTitle title="Secretaria não encontrada" subtitle="Essa unidade não foi identificada no catálogo municipal."/><Link className="gov-back" href="/">Voltar à gestão municipal</Link></>;
 const qtd=secretarias.length,indice=secretarias.findIndex(s=>s.sigla===secretaria.sigla),proxima=secretarias[(indice+1)%qtd];
 return <div className="gov-unit">
   <Link href="/" className="gov-back"><ArrowLeft size={15}/> Todas as secretarias</Link>
   <PageTitle eyebrow={'SECRETARIAS MUNICIPAIS / '+secretaria.sigla} title={secretaria.nome} subtitle={secretaria.missao}><div className="select-wrap"><select aria-label="Ano" value={ano} onChange={e=>setAno(Number(e.target.value))}>{[2026,2025,2024,2023,2022].map(n=><option key={n}>{n}</option>)}</select></div></PageTitle>
   <section className="gov-unit-head"><div><span className="gov-unit-type">PAINEL SETORIAL · {secretaria.sigla}</span><h2>Visão de gestão e acompanhamento</h2><p>Acompanhe o que esta secretaria executa, onde atua, quanto utiliza e quais dados comprovam seus resultados.</p></div><div className="gov-unit-head-note"><Info size={18}/><span>Indicadores listados ≠ dados já importados</span></div></section>
   <div className="gov-unit-metrics">
     <div className="gov-unit-kpi"><div><Wallet size={17}/> Despesa paga · {ano}</div><strong>{brl(resumo?.despesa_paga)}</strong><span>{resumo?.despesa_paga==null?'Sem registros validados atribuídos a esta secretaria':'Total dos registros setoriais validados; verificar cobertura'}</span></div>
     <div className="gov-unit-kpi"><div><Users size={17}/> Servidores · {ano}</div><strong>{num(resumo?.servidores)}</strong><span>{resumo?.servidores==null?'Lotação agregada não importada':'Lotação da base disponível, sujeita à cobertura'}</span></div>
     <div className="gov-unit-kpi"><div><Landmark size={17}/> Indicadores setoriais</div><strong>{secretaria.indicadores.length}</strong><span>Indicadores planejados e suas fontes de referência</span></div>
   </div>
   {secretaria.sigla==='SEPLAG' && <div className="gov-city-evidence"><strong><MapPinned size={17}/> Contexto territorial do município</strong><div>{contextoMunicipal.map(x=><a key={x.rotulo} href={x.url} target="_blank" rel="noopener noreferrer"><small>{x.rotulo} · {x.periodo}</small><b>{x.valor}</b><span>Fonte: IBGE <ExternalLink size={12}/></span></a>)}</div><p>Dados municipais do IBGE, não atribuídos exclusivamente à SEPLAG.</p></div>}
   <Panel title="O que acompanhar nesta secretaria" description="Indicadores organizados por responsabilidade, com fonte indicada e status da integração.">
     <div className="gov-indicator-list">{secretaria.indicadores.map((indicador,i)=><article key={indicador.nome} className="gov-indicator">
       <div className="gov-indicator-index">0{i+1}</div><div className="gov-indicator-content"><div className="gov-indicator-title"><strong>{indicador.nome}</strong><span className="gov-pending">A integrar</span></div><p>{indicador.descricao}</p><a href={indicador.url} target="_blank" rel="noopener noreferrer">Fonte de referência: {indicador.fonte} <ExternalLink size={13}/></a></div><div className="gov-indicator-value">—<small>Sem valor validado</small></div>
     </article>)}</div>
   </Panel>
   <div className="gov-subsections">
      <Panel title="Finanças e pessoas" description="Informações compartilhadas com os demais órgãos."><div className="gov-info-links"><Link href="/financas"><Wallet size={17}/> Consultar despesas do município <ArrowRight size={16}/></Link><Link href="/recursos"><Landmark size={17}/> Recursos e convênios <ArrowRight size={16}/></Link><a href={fontesGerais.transparencia} target="_blank" rel="noopener noreferrer"><FileSearch size={17}/> Transparência oficial <ExternalLink size={14}/></a></div><p className="gov-method-note">Atribuir uma despesa a uma secretaria requer o código da unidade orçamentária correspondente. Não fazemos vinculação apenas por palavras no nome.</p></Panel>
      <Panel title="Território e serviços" description="Integração espacial para relacionar demandas aos equipamentos do município."><div className="gov-services-placeholder"><MapPinned size={29}/><strong>Camadas setoriais em preparação</strong><span>Localização de unidades, investimentos e regiões atendidas depende de coordenadas verificadas.</span><Link href="/mapa">Abrir mapa municipal <ArrowRight size={14}/></Link></div></Panel>
   </div>
   <div className="gov-bottom-next"><span>{secretaria.sigla} · Painel setorial</span><Link href={'/secretarias/'+proxima.slug}>Próxima secretaria: {proxima.curto} <ArrowRight size={15}/></Link></div>
   <Notice>Esta página identifica indicadores úteis para decisão. A presença de uma fonte oficial não significa que os registros já estejam carregados. A cobertura, o exercício, as classificações contábeis e a data de atualização deverão aparecer junto de cada resultado.</Notice>
 </div>;
}
