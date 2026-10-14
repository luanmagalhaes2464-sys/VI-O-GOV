'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Activity,ArrowRight,Building2,CalendarDays,ExternalLink,GraduationCap,Hospital,Info,Landmark,MapPinned,ShieldCheck,Users,Wallet} from 'lucide-react';
import {api,brl} from '../lib/api';
import {PageTitle,Notice} from '../components/ui';

const IBGE='https://www.ibge.gov.br/cidades-e-estados/mg/vicosa.html';
const RECEITAS='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/execucaoOrcamentaria/receita/receita.xhtml';
const DESPESAS='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/execucaoOrcamentaria/despesa/despesa.xhtml';
const TRANSP='https://pmvicosa.cidadesmg.com.br/portaltransparencia/index.xhtml';
const TRANSFERE='https://www.gov.br/transferegov/pt-br';
const CNES1='https://cnes2.datasus.gov.br/Mod_Conjunto.asp?VCo_Unidade=3171302099454';
const CNES2='https://cnes2.datasus.gov.br/Mod_Conjunto.asp?VCo_Unidade=3171302099438';
type Financeiro={ano:number;receita_arrecadada:number|null;despesa_paga:number|null;servidores:number|null;emendas_recebidas:number|null;qualidade:string;aviso:string};
type Perfil={populacao_estimada:{valor:number;ano:number};populacao_censo:{valor:number;ano:number};escolarizacao_6a14:{valor:number;ano:number};hospitais_gerais_identificados:{valor:number;competencia_referencia:string;unidades:{nome:string;cnes:string;url:string}[]};dados_revisados_em:string};
const formata=(n:number)=>new Intl.NumberFormat('pt-BR').format(n);
export default function Home(){
 const [ano,setAno]=useState(2026);
 const [financeiro,setFinanceiro]=useState<Financeiro|null>(null);
 const [perfil,setPerfil]=useState<Perfil|null>(null);
 const [conectado,setConectado]=useState<boolean|null>(null);
 useEffect(()=>{let ativo=true;setFinanceiro(null);api<Financeiro>('/api/v1/dashboard/resumo?ano='+ano).then(r=>{if(ativo){setFinanceiro(r.data);setConectado(!!r.data)}});return()=>{ativo=false}},[ano]);
 useEffect(()=>{let ativo=true;api<Perfil>('/api/v1/municipio/perfil').then(r=>{if(ativo)setPerfil(r.data)});return()=>{ativo=false}},[]);
 const populacao=perfil?.populacao_estimada?.valor??79797;
 const hospitais=perfil?.hospitais_gerais_identificados?.valor??2;
 const escolarizacao=perfil?.escolarizacao_6a14?.valor??99.34;
 const indicadores=[
   {nome:'Hospitais gerais identificados',valor:formata(hospitais),ref:'CNES · cadastros de outubro/2026',info:'São Sebastião e São João Batista',icone:Hospital,url:CNES1,disponivel:true},
   {nome:'População estimada',valor:formata(populacao),ref:'IBGE · estimativa 2026',info:'Habitantes do município',icone:Users,url:IBGE,disponivel:true},
   {nome:'Escolarização (6 a 14 anos)',valor:escolarizacao.toFixed(2).replace('.',',')+'%',ref:'IBGE · Censo 2022',info:'Taxa de escolarização municipal',icone:GraduationCap,url:IBGE,disponivel:true},
   {nome:'Receita arrecadada',valor:brl(financeiro?.receita_arrecadada),ref:'Transparência · exercício '+ano,info:financeiro?.receita_arrecadada==null?'Aguardando registros validados':'Valor da base importada; confira a cobertura',icone:Wallet,url:RECEITAS,disponivel:financeiro?.receita_arrecadada!=null},
   {nome:'Despesa paga',valor:brl(financeiro?.despesa_paga),ref:'Transparência · exercício '+ano,info:financeiro?.despesa_paga==null?'Aguardando registros validados':'Valor da base importada; confira a cobertura',icone:Landmark,url:DESPESAS,disponivel:financeiro?.despesa_paga!=null},
   {nome:'Disponibilidade de caixa',valor:'A apurar',ref:'Demonstrativos fiscais · competência a confirmar',info:'Saldo bancário conciliado com vinculações e obrigações, não a receita anual',icone:Building2,url:TRANSP,disponivel:false}
 ];
 return <div className="decision-home">
   <PageTitle eyebrow="VIÇO GOV / PANORAMA MUNICIPAL" title="Viçosa em números" subtitle="Os indicadores mais importantes para acompanhar a situação do município, com fontes e datas de referência.">
     <div className="select-wrap"><CalendarDays size={15}/><select aria-label="Exercício financeiro" value={ano} onChange={e=>setAno(Number(e.target.value))}>{[2026,2025,2024,2023].map(x=><option key={x} value={x}>Financeiro {x}</option>)}</select></div>
   </PageTitle>
   <section className="decision-intro">
     <div><div className="decision-eyebrow"><span/> PAINEL DE INTELIGÊNCIA MUNICIPAL</div><h2>Dados para entender <em>Viçosa</em> e planejar melhor.</h2><p>Saúde, população, orçamento e recursos em uma mesma visão. Os números são identificados como oficiais, históricos ou ainda não integrados.</p></div>
     <div className="decision-intro-mark"><MapPinned size={26}/><strong>VIÇOSA</strong><span>MINAS GERAIS</span></div>
   </section>
   <div className="decision-section-head"><div><h2>Indicadores essenciais</h2><p>Dados de fontes oficiais. Cada cartão informa a referência e a situação da informação.</p></div><span className="decision-period">Referências 2022–2026</span></div>
   <div className="decision-metrics">{indicadores.map(item=><div className="decision-metric" key={item.nome}>
      <div className="decision-metric-head"><span>{item.nome}</span><span className="decision-icon"><item.icone size={19}/></span></div>
      <strong className={item.disponivel?'':'decision-unavailable'}>{item.valor}</strong>
      <p>{item.info}</p>
      <div className="decision-metric-bottom"><span>{item.ref}</span><a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={'Abrir fonte de '+item.nome}><ExternalLink size={15}/></a></div>
   </div>)}</div>
   <div className="decision-columns">
     <section className="decision-panel"><div className="decision-panel-head"><div><h3>Dinheiro público e execução</h3><p>O que entrou, o que foi pago e o que está disponível.</p></div><Link href="/financas">Detalhar <ArrowRight size={14}/></Link></div>
      <div className="decision-finance-lines">
        <div><span>Receitas arrecadadas · {ano}</span><b>{brl(financeiro?.receita_arrecadada)}</b></div>
        <div><span>Despesas pagas · {ano}</span><b>{brl(financeiro?.despesa_paga)}</b></div>
        <div><span>Disponibilidade financeira / caixa</span><b className="decision-finance-muted">Não apurada</b></div>
      </div>
      <div className="decision-explainer"><Info size={16}/><span><b>Caixa ≠ receita arrecadada.</b> Para informar quanto a Prefeitura tem disponível, precisamos dos saldos conciliados, obrigações e vinculação por fonte de recursos, com a competência do demonstrativo fiscal.</span></div>
      <a className="decision-source" href={TRANSP} target="_blank" rel="noopener noreferrer">Conferir transparência e demonstrativos fiscais <ExternalLink size={13}/></a>
     </section>
     <section className="decision-panel"><div className="decision-panel-head"><div><h3>Recursos e transferências</h3><p>Valores efetivamente recebidos devem ser conciliados.</p></div><Link href="/recursos">Detalhar <ArrowRight size={14}/></Link></div>
       <div className="decision-finance-lines">
        <div><span>Emendas parlamentares recebidas · {ano}</span><b>{brl(financeiro?.emendas_recebidas)}</b></div>
        <div><span>Convênios e transferências</span><b className="decision-finance-muted">A integrar</b></div>
        <div><span>Recursos vinculados (saúde, educação, COSIP)</span><b className="decision-finance-muted">A conciliar</b></div>
       </div>
       <div className="decision-explainer"><Info size={16}/><span>Emenda indicada, empenhada pelo concedente, repassada e aplicada são eventos diferentes. O painel não soma essas etapas nem considera recursos vinculados como caixa livre.</span></div>
       <a className="decision-source" href={TRANSFERE} target="_blank" rel="noopener noreferrer">Consultar fonte federal de transferências <ExternalLink size={13}/></a>
     </section>
   </div>
   <section className="decision-panel decision-health">
     <div className="decision-panel-head"><div><h3>Rede hospitalar identificada</h3><p>Hospitais gerais com cadastros individuais confirmados no CNES em outubro de 2026.</p></div><Link href="/secretarias/saude">Secretaria de Saúde <ArrowRight size={14}/></Link></div>
     <div className="decision-hospital-list">
       {(perfil?.hospitais_gerais_identificados?.unidades??[
        {nome:'Hospital São Sebastião',cnes:'2099454',url:CNES1},
        {nome:'Hospital São João Batista',cnes:'2099438',url:CNES2}
       ]).map(h=><a key={h.cnes} href={h.url} target="_blank" rel="noopener noreferrer"><span className="decision-hospital-icon"><Hospital size={19}/></span><div><strong>{h.nome}</strong><small>Hospital geral · CNES {h.cnes}</small></div><ExternalLink size={15}/></a>)}
     </div>
     <p className="decision-disclaimer">Dois hospitais gerais identificados, não uma contagem automatizada de todas as unidades de saúde. Para indicadores de UBS, leitos e equipes ainda será necessária importação completa por competência.</p>
   </section>
   <div className="decision-next"><Link href="/mapa"><MapPinned size={19}/><span>Explorar mapa e equipamentos</span><ArrowRight size={16}/></Link><Link href="/fontes"><ShieldCheck size={19}/><span>Ver fontes e evidências</span><ArrowRight size={16}/></Link><Link href="/agente"><Activity size={19}/><span>Perguntar à VIÇO IA</span><ArrowRight size={16}/></Link></div>
   {conectado===false&&<Notice>Os dados de referência do IBGE e CNES continuam disponíveis. Os indicadores financeiros dependem da conexão entre o Render, a API e o Neon, além da importação municipal validada.</Notice>}
   <div className="decision-footer"><ShieldCheck size={15}/><span>Referências oficiais consultadas em outubro/2026; população estimada e escolarização seguem períodos próprios. Informações ausentes não significam valor zero.</span></div>
 </div>;
}
