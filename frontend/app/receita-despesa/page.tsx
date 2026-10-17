'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowDownRight,ArrowUpRight,BarChart3,CalendarDays,Coins,FileText,Landmark,ReceiptText,RefreshCcw,Wallet} from 'lucide-react';
import './receita-despesa.css';

type Mensal={mes:string;categoria:string;centavos:number};
type Anual={grupo:string;indicador:string;centavos:number};
type Conciliacao={mes:string;ops_coincidentes:number;centavos_coincidentes:number;ops_exclusivas_ordem:number;centavos_exclusivas_ordem:number};
type Financas={ano:number;mensal:Mensal[];anual:Anual[];conciliacao:Conciliacao[]};
const meses=[['2026-01','Janeiro'],['2026-02','Fevereiro'],['2026-03','Março'],['2026-04','Abril'],['2026-05','Maio'],['2026-06','Junho'],['2026-07','Julho'],['2026-08','Agosto'],['2026-09','Setembro'],['2026-10','Outubro']] as const;
const moeda=(n:number|undefined|null)=>n==null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100);
const categoriaReceita=['receita_orc','receita_extra','receita_estorno'];
const categoriaPagamentos=['pagamento_orc','pagamento_extra','pagamento_restos'];
const titulo:Record<string,string>={
 receita_orc:'Orçamentária',receita_extra:'Extraorçamentária',receita_estorno:'Estornos registrados',
 pagamento_orc:'Orçamentária',pagamento_extra:'Extraorçamentária',pagamento_restos:'Restos a pagar'
};
export default function ReceitaDespesa(){
 const [dados,setDados]=useState<Financas|null>(null);
 const [periodo,setPeriodo]=useState('todos');
 const [erro,setErro]=useState('');
 const [carregando,setCarregando]=useState(true);
 const [tentativa,setTentativa]=useState(0);
 useEffect(()=>{
  let ativo=true;setCarregando(true);setErro('');
  fetch('/api/receita-despesa',{cache:'no-store'})
   .then(async r=>{const o=await r.json();if(!r.ok)throw new Error(o.error||'Consulta indisponível');return o as Financas})
   .then(v=>{if(ativo)setDados(v)})
   .catch(e=>{if(ativo)setErro(e instanceof Error?e.message:'Erro ao carregar valores')})
   .finally(()=>{if(ativo)setCarregando(false)});
  return()=>{ativo=false};
 },[tentativa]);
 const {totais,serie}=useMemo(()=>{
  const totais:Record<string,number>={};
  const serie=meses.map(([mes,nome])=>{
   const total:Record<string,number>={};
   (dados?.mensal||[]).filter(x=>x.mes===mes).forEach(x=>{total[x.categoria]=(total[x.categoria]||0)+x.centavos});
   return {mes,nome,total,
    receita:categoriaReceita.reduce((v,key)=>v+(total[key]||0),0),
    pagamentos:categoriaPagamentos.reduce((v,key)=>v+(total[key]||0),0),
    diarias:total.diarias||0,recebido:total.transferencia_entrada||0,repassado:total.transferencia_saida||0,
    temReceita:categoriaReceita.some(key=>key in total),
    temPagamento:categoriaPagamentos.some(key=>key in total)
   };
  });
  (dados?.mensal||[]).filter(x=>x.mes.startsWith('2026-')&&(periodo==='todos'||x.mes===periodo))
   .forEach(x=>{totais[x.categoria]=(totais[x.categoria]||0)+x.centavos});
  return {totais,serie};
 },[dados,periodo]);
 const somar=(categorias:string[])=>categorias.reduce((v,k)=>v+(totais[k]||0),0);
 const receitaTotal=somar(categoriaReceita),pagamentoTotal=somar(categoriaPagamentos);
 const anual=(grupo:string,indicador:string)=>dados?.anual.find(x=>x.grupo===grupo&&x.indicador===indicador)?.centavos;
 const previsto=(indicador:string)=>['receitas_correntes','receitas_capital','receitas_intra'].reduce((t,g)=>t+(anual(g,indicador)||0),0);
 const conciliado=useMemo(()=>{
  const linhas=(dados?.conciliacao||[]).filter(x=>periodo==='todos'||x.mes===periodo);
  const encontrados=linhas.reduce((v,x)=>v+x.ops_coincidentes,0);
  const exclusivos=linhas.reduce((v,x)=>v+x.ops_exclusivas_ordem,0);
  const valorRepetidoFontes=linhas.reduce((v,x)=>v+x.centavos_coincidentes,0);
  const valorExclusivo=linhas.reduce((v,x)=>v+x.centavos_exclusivas_ordem,0);
  return {encontrados,exclusivos,valorRepetidoFontes,valorExclusivo,
   totalBase:valorRepetidoFontes+valorExclusivo,registros:encontrados+exclusivos};
 },[dados,periodo]);
 const maxSerie=Math.max(1,...serie.flatMap(x=>[x.receita,x.pagamentos]));
 return <div className="fin-page">
  <div className="fin-top">
   <div><div className="fin-overline">VIÇO GOV / FINANÇAS</div><h1>Receita e Despesa</h1></div>
   <label className="fin-period"><CalendarDays size={17}/><span>Período</span>
    <select aria-label="Período financeiro" value={periodo} onChange={e=>setPeriodo(e.target.value)}>
     <option value="todos">Acumulado · 2026</option>
     {meses.map(([m,n])=><option key={m} value={m}>{n} / 2026</option>)}
    </select>
   </label>
  </div>
  {erro&&<div className="fin-error">{erro}<button onClick={()=>setTentativa(v=>v+1)}><RefreshCcw size={14}/> Atualizar</button></div>}
  <div className="fin-highlights">
   <article className="fin-highlight fin-receita"><div className="fin-hl-header"><span>Receitas registradas</span><ArrowDownRight size={21}/></div><strong>{carregando?'…':moeda(receitaTotal)}</strong></article>
   <article className="fin-highlight fin-despesa"><div className="fin-hl-header"><span>Pagamentos realizados</span><ArrowUpRight size={21}/></div><strong>{carregando?'…':moeda(pagamentoTotal)}</strong></article>
   <article className="fin-highlight fin-diarias"><div className="fin-hl-header"><span>Diárias</span><Wallet size={20}/></div><strong>{carregando?'…':moeda(totais.diarias||0)}</strong></article>
  </div>

  <section className="fin-panel fin-recon-panel" aria-label="Conciliação de pagamentos">
   <header className="fin-panel-head">
    <h2><FileText size={17}/> Conciliação de pagamentos</h2>
    <span>2026</span>
   </header>
   <div className="fin-recon-grid">
    <div><span>OPs na base principal</span><strong>{conciliado.registros.toLocaleString('pt-BR')}</strong></div>
    <div><span>Coincidentes entre relatórios</span><strong>{conciliado.encontrados.toLocaleString('pt-BR')}</strong><small>{moeda(conciliado.valorRepetidoFontes)}</small></div>
    <div><span>Somente na Ordem Cronológica</span><strong>{conciliado.exclusivos.toLocaleString('pt-BR')}</strong><small>{moeda(conciliado.valorExclusivo)}</small></div>
    <div><span>Base sem soma duplicada</span><strong className="fin-recon-sum">{moeda(conciliado.totalBase)}</strong></div>
   </div>
   <div className="fin-recon-foot">
    <span>Fonte principal: Ordem Cronológica de Pagamentos</span>
    <span>Mesmo número de OP e mesmo valor = mesma ocorrência entre relatórios</span>
    <span>Duplicidade de pagamento ao credor: não comprovada</span>
   </div>
  </section>
  <div className="fin-columns">
   <section className="fin-panel">
    <header className="fin-panel-head"><h2><Landmark size={17}/> Receita</h2><span>{moeda(receitaTotal)}</span></header>
    <div className="fin-lines">{categoriaReceita.map(cat=><div className="fin-line" key={cat}><span>{titulo[cat]}</span><strong>{moeda(totais[cat]||0)}</strong></div>)}</div>
   </section>
   <section className="fin-panel">
    <header className="fin-panel-head"><h2><ReceiptText size={17}/> Despesa</h2><span>{moeda(pagamentoTotal)}</span></header>
    <div className="fin-lines">{categoriaPagamentos.map(cat=><div className="fin-line" key={cat}><span>{titulo[cat]}</span><strong>{moeda(totais[cat]||0)}</strong></div>)}</div>
   </section>
  </div>
  <section className="fin-panel">
   <header className="fin-panel-head"><h2><Coins size={17}/> Transferências financeiras</h2></header>
   <div className="fin-two">
    <div><span>Recebidas</span><strong>{moeda(totais.transferencia_entrada||0)}</strong></div>
    <div><span>Repassadas</span><strong>{moeda(totais.transferencia_saida||0)}</strong></div>
   </div>
  </section>
  <section className="fin-panel">
   <header className="fin-panel-head"><h2><BarChart3 size={17}/> Evolução mensal</h2>
    <div className="fin-legend"><span className="fin-dot fin-green"/> Receita <span className="fin-dot fin-rose"/> Pagamentos</div></header>
   <div className="fin-chart">{serie.map(x=><button key={x.mes} type="button" onClick={()=>setPeriodo(periodo===x.mes?'todos':x.mes)}
     aria-pressed={periodo===x.mes} className={'fin-chart-line '+(periodo===x.mes?'selected':'')}
     title={x.nome+' · Receita: '+(x.temReceita?moeda(x.receita):'sem registro')+' · Pagamentos: '+(x.temPagamento?moeda(x.pagamentos):'sem registro')}>
     <span className="fin-chart-label">{x.nome.slice(0,3)}</span>
     <span className="fin-chart-tracks">
      <i className="fin-chart-bar fin-green" style={{width:(x.receita/maxSerie*100)+'%'}}/>
      <i className="fin-chart-bar fin-rose" style={{width:(x.pagamentos/maxSerie*100)+'%'}}/>
     </span>
     <span className="fin-chart-month-value">{x.temReceita?moeda(x.receita):'—'}</span>
    </button>)}</div>
  </section>
  <section className="fin-panel">
   <header className="fin-panel-head"><h2><FileText size={17}/> Consolidação mensal</h2><span>2026</span></header>
   <div className="fin-table-wrap"><table className="fin-table">
    <thead><tr><th>Mês</th><th>Receita</th><th>Pagamentos</th><th>Diárias</th><th>Recebidas</th><th>Repassadas</th></tr></thead>
    <tbody>{serie.map(x=><tr key={x.mes} onClick={()=>setPeriodo(periodo===x.mes?'todos':x.mes)} className={periodo===x.mes?'selected':''}>
     <td><strong>{x.nome}</strong></td><td>{x.temReceita?moeda(x.receita):'—'}</td>
     <td>{x.temPagamento?moeda(x.pagamentos):'—'}</td><td>{x.diarias?moeda(x.diarias):'—'}</td>
     <td>{x.recebido?moeda(x.recebido):'—'}</td><td>{x.repassado?moeda(x.repassado):'—'}</td>
    </tr>)}</tbody>
   </table></div>
  </section>
  <div className="fin-columns fin-annual">
   <section className="fin-panel">
    <header className="fin-panel-head"><h2><FileText size={17}/> Empenhos</h2><span>2026</span></header>
    <div className="fin-lines">
     {([['empenhado','Empenhado'],['liquidado','Liquidado'],['pago_empenhos','Pago']] as const).map(([key,name])=>
      <div className="fin-line" key={key}><span>{name}</span><strong>{moeda(anual('empenhos',key))}</strong></div>)}
    </div>
   </section>
   <section className="fin-panel">
    <header className="fin-panel-head"><h2><Landmark size={17}/> Previsão e arrecadação</h2><span>2026</span></header>
    <div className="fin-lines">
     {([['prevista','Previsão inicial'],['atualizada','Previsão atualizada'],['arrecadada','Arrecadação']] as const).map(([key,name])=>
      <div className="fin-line" key={key}><span>{name}</span><strong>{moeda(dados?previsto(key):null)}</strong></div>)}
    </div>
   </section>
  </div>
  <section className="fin-panel fin-budget-panel">
   <header className="fin-panel-head"><h2>Receitas por natureza</h2><span>2026</span></header>
   <div className="fin-table-wrap"><table className="fin-table">
    <thead><tr><th>Natureza</th><th>Previsão inicial</th><th>Atualizada</th><th>Arrecadada</th></tr></thead>
    <tbody>{([['receitas_correntes','Receitas correntes'],['receitas_capital','Receitas de capital'],['receitas_intra','Intraorçamentárias']] as const).map(([key,label])=><tr key={key}>
     <td><strong>{label}</strong></td><td>{moeda(anual(key,'prevista'))}</td>
     <td>{moeda(anual(key,'atualizada'))}</td><td>{moeda(anual(key,'arrecadada'))}</td>
    </tr>)}</tbody>
   </table></div>
  </section>
 </div>;
}
