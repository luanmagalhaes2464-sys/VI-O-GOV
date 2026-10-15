'use client';
import {useEffect,useMemo,useState} from 'react';
import {ExternalLink,Users,Wallet,Info,RefreshCw,BarChart3,Lock} from 'lucide-react';
import {IBGE_RH_VALIDADO,RHIBGE,TipoAdministracao,VinculoIBGE,PORTAL_RH,API_SIDRA_RH,FAIXAS_RH} from '../../lib/ibge-rh';
const numero=(n:number)=>new Intl.NumberFormat('pt-BR').format(n);
export default function RH(){
 const [data,setData]=useState<RHIBGE>(IBGE_RH_VALIDADO);
 const [scope,setScope]=useState<'todas'|TipoAdministracao>('todas');
 const [vinculo,setVinculo]=useState<'todos'|VinculoIBGE>('todos');
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let ativo=true;fetch('/api/rh/ibge',{cache:'no-store'}).then(r=>r.json()).then((obj:RHIBGE)=>{if(ativo&&obj.codigo_ibge==='3171303')setData(obj)}).catch(()=>{}).finally(()=>{if(ativo)setLoading(false)});return()=>{ativo=false}},[]);
 const scopes=useMemo(()=>scope==='todas'?data.origens:data.origens.filter(x=>x.tipo===scope),[scope,data]);
 const names=IBGE_RH_VALIDADO.origens[0].vinculos.map(x=>x.nome);
 const serie=names.map(name=>({name,value:scopes.reduce((n,s)=>n+(s.vinculos.find(x=>x.nome===name)?.total||0),0),
   missing:scopes.some(s=>s.vinculos.find(x=>x.nome===name)?.total==null)}));
 const total=vinculo==='todos'?scopes.reduce((n,s)=>n+s.total,0):serie.find(x=>x.name===vinculo)?.value||0;
 const max=Math.max(...serie.map(x=>x.value),1);
 return <div className="rh-page rha-dashboard">
   <div className="rh-kicker">VIÇO GOV / RECURSOS HUMANOS</div>
   <div className="rh-page-title"><div><h1>Dashboard de Recursos Humanos</h1><p>Quadro de pessoal da administração municipal de Viçosa, com atualização automática da consulta ao IBGE.</p></div><a href={API_SIDRA_RH} target="_blank" rel="noopener noreferrer">API IBGE <ExternalLink size={15}/></a></div>
   <div className="rha-status"><RefreshCw size={15}/>{loading?'Consultando SIDRA/IBGE…':data.modo==='api'?'Fonte consultada automaticamente':'Dados históricos verificados; sincronização temporariamente indisponível'}<span>Referência: 2023</span></div>
   <section className="rha-filters"><div><label htmlFor="tipo">Tipo de administração</label><select id="tipo" value={scope} onChange={e=>setScope(e.target.value as typeof scope)}><option value="todas">Direta + indireta</option><option value="direta">Somente administração direta</option><option value="indireta">Somente administração indireta</option></select></div><div><label htmlFor="vin">Vínculo empregatício</label><select id="vin" value={vinculo} onChange={e=>setVinculo(e.target.value as typeof vinculo)}><option value="todos">Todos os vínculos</option>{names.map(x=><option key={x} value={x}>{x}</option>)}</select></div></section>
   <div className="rha-metrics">
     <article><span><Users size={17}/> Pessoas ocupadas</span><strong>{numero(total)}</strong><small>MUNIC 2023 · filtro aplicado</small></article>
     <article><span>Administração direta</span><strong>{numero(data.origens[0].total)}</strong><small>IBGE · 2023 · sem filtro</small></article>
     <article><span>Administração indireta</span><strong>{numero(data.origens[1].total)}</strong><small>IBGE · 2023 · sem filtro</small></article>
   </div>
   <section className="rha-chart-container"><div className="rha-chart-heading"><BarChart3 size={19}/><div><h2>Distribuição por vínculo</h2><p>Quantidade de pessoas ocupadas, por categoria, na esfera administrativa selecionada.</p></div></div><div className="rha-bars">{serie.filter(x=>vinculo==='todos'||x.name===vinculo).map(item=><div className="rha-bar" key={item.name}><span>{item.name}</span><div className="rha-bar-track"><div style={{width:(item.value/max)*100+'%'}}/></div><b>{item.missing&&item.value===0?'—':numero(item.value)}</b></div>)}</div><p className="rha-chart-foot">Na tabela 5881, “—” significa valor não informado pela fonte, não necessariamente zero. Estagiários estão incluídos no conceito de pessoal ocupado.</p></section>
   <section className="rha-chart-container"><h2>Folha de pagamento — janeiro de 2026</h2><p>Valores financeiros confirmados no Portal da Transparência de Viçosa/MG. Não são calculados com o IBGE 2023.</p><div className="rha-finance-pair"><div><span>Bruto</span><strong>R$ 11.822.334,05</strong></div><div><span>Líquido</span><strong>R$ 9.307.582,03</strong></div></div><a href={PORTAL_RH} target="_blank" rel="noopener noreferrer">Fonte oficial da folha <ExternalLink size={14}/></a></section>
   <section className="rha-unavailable"><div><Lock size={20}/><div><h2>Remuneração por faixa, cargo e secretaria</h2><p>Esses filtros precisam dos registros mensais individualizados. O IBGE informa a quantidade por vínculo, mas não publica salário individual, cargo ou lotação nesta tabela. O fornecedor do portal municipal bloqueou a coleta programada (403), por isso não apresentamos números fictícios.</p></div></div><div className="rha-pill-list">{FAIXAS_RH.map(x=><span key={x}>{x}</span>)}</div></section>
   <div className="rha-method"><Info size={18}/><div><b>Metodologia</b><p>O total refere-se a 2023 (Pesquisa MUNIC, tabela 5881). A atualização automática verifica periodicamente a API oficial e mantém a última referência validada em caso de indisponibilidade. “Pessoas ocupadas” não equivale necessariamente a servidores ativos na folha de outubro de 2026.</p></div></div>
 </div>;
}
