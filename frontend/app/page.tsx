'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Users,Wallet,Landmark,ArrowUpRight,ExternalLink,RefreshCw,Info} from 'lucide-react';
import {IBGE_RH_VALIDADO,RHIBGE,PORTAL_RH,API_SIDRA_RH} from '../lib/ibge-rh';

const numero=(x:number)=>new Intl.NumberFormat('pt-BR').format(x);
export default function Home(){
 const [data,setData]=useState<RHIBGE>(IBGE_RH_VALIDADO),[loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;fetch('/api/rh/ibge',{cache:'no-store'}).then(r=>r.json()).then((r:RHIBGE)=>{if(active&&r.codigo_ibge==='3171303')setData(r)}).catch(()=>{}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 const direta=data.origens.find(x=>x.tipo==='direta')!.total;
 const indireta=data.origens.find(x=>x.tipo==='indireta')!.total;
 return <div className="rh-home">
  <div className="rh-kicker">VIÇO GOV / VISÃO GERAL</div>
  <h1>Pessoal da Prefeitura de Viçosa</h1>
  <p className="rh-subtitle">Indicadores de recursos humanos com dados oficiais e referência identificada, sem necessidade de importar arquivos.</p>
  <div className="rha-status"><RefreshCw size={15}/>{loading?'Consultando a API IBGE…':data.modo==='api'?'Dados obtidos automaticamente do IBGE':'Cópia oficial validada; conexão IBGE em verificação'} <span>IBGE MUNIC · 2023</span></div>
  <section className="rha-overview">
   <div className="rha-lead">
    <div className="rha-label"><Users size={19}/> PESSOAL OCUPADO · IBGE MUNIC 2023</div>
    <strong>{numero(data.total)}</strong>
    <h2>Administrações direta e indireta</h2>
    <p>Dado oficial de 2023. Não é o total de funcionários ativos em outubro de 2026, nem a contagem mensal da folha atual.</p>
    <Link href="/rh">Analisar tipos de vínculo <ArrowUpRight size={16}/></Link>
   </div>
   <div className="rha-two">
    <div><span>Administração direta</span><b>{numero(direta)}</b><small>IBGE · 2023</small></div>
    <div><span>Administração indireta</span><b>{numero(indireta)}</b><small>IBGE · 2023</small></div>
   </div>
  </section>
  <div className="rha-financial"><div className="rha-finance-head"><Wallet size={19}/><span>FOLHA DE PAGAMENTO · JANEIRO/2026</span></div><div className="rha-payroll"><div><small>Remuneração bruta total</small><strong>R$ 11.822.334,05</strong></div><div><small>Remuneração líquida total</small><strong>R$ 9.307.582,03</strong></div></div><p>Valores exibidos pela Prefeitura na aba Folha de Pagamento. Não abrangem automaticamente agentes políticos e estagiários de outras abas.</p><a href={PORTAL_RH} target="_blank" rel="noopener noreferrer">Conferir no Portal da Transparência <ExternalLink size={14}/></a></div>
  <div className="rha-method"><Info size={18}/><div><b>Por que os períodos são diferentes?</b><p>A API IBGE fornece estatísticas de vínculos da pesquisa MUNIC de 2023; o portal municipal confirma os valores totais de folha em janeiro de 2026, mas bloqueou nossa coleta automática dos registros individuais. Não combinamos essas fontes como se fossem o mesmo mês. A atualização da consulta ao IBGE ocorre automaticamente.</p><a href={API_SIDRA_RH} target="_blank" rel="noopener noreferrer">Consultar dados abertos do IBGE <ExternalLink size={13}/></a></div></div>
 </div>;
}
