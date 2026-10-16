'use client';
import {useEffect,useMemo,useState} from 'react';
import {CalendarDays,ChevronDown,ChevronRight,ChevronLeft,Search,Filter,BarChart3,Users,Wallet,Info,RefreshCcw,AlertTriangle,ExternalLink,X} from 'lucide-react';
import {brl,num} from '../../lib/api';
import RHExploracao from '../../components/rh-exploracao';
import RHAuditoria from '../../components/rh-auditoria';
import './rh-auditoria.css';
import FiltroPesquisavel from '../../components/filtro-pesquisavel';
type KPIs={vinculos_mes:number;vinculos_distintos:number;nomes_distintos:number;bruto:number;liquido:number;descontos:number;quinquenio:number};
type Mes={mes:string;disponivel:boolean;indicadores:{bruto:number;liquido:number;quinquenio:number;vinculos_mes:number}|null;fonte?:string};
type Grupo={nome:string;quantidade:number;bruto?:number;media_bruta?:number;maior_remuneracao?:number};
type Row={id:number;mes:string;matricula:string;nome:string;admissao:string|null;cargo:string;vinculo:string;departamento:string;local:string;jornada:string;bruto:number;liquido:number;quinquenio:number;inclusoes_pagamento:number};
type Painel={meses:string[];competencias:Mes[];cobertura:number;totais:KPIs;por_departamento:Grupo[];por_cargo:Grupo[];maiores_salarios:Grupo[];por_vinculo:Grupo[];pessoas:Row[];total_pessoas:number;pagina:number;opcoes:Record<string,string[]>;criterio_salario:string;aviso:string};
const portal='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho'];
const codigo=(i:number)=>'2026-'+String(i+1).padStart(2,'0');
const abreviado=(m:string)=>meses[Number(m.slice(5))-1].slice(0,3);
const cores=['#2458db','#117f79','#7a41e9','#d45d12','#d32d58','#258ca5','#edaf3a','#8795a9'];
type Filtros={departamento:string;cargo:string;vinculo:string;local:string;jornada:string;situacao:string;faixa:string;base:string;busca:string};
const vazio: Filtros={departamento:'',cargo:'',vinculo:'',local:'',jornada:'',situacao:'',faixa:'',base:'bruto',busca:''};
const faixas=[['','Todas as faixas'],['ate_2','Até R$ 2 mil'],['2_4','R$ 2 a 4 mil'],['4_6','R$ 4 a 6 mil'],['6_8','R$ 6 a 8 mil'],['8_10','R$ 8 a 10 mil'],['10_12','R$ 10 a 12 mil'],['acima_12','Acima de R$ 12 mil']];
function Barras({dados,medida,moeda=false}:{dados:Grupo[];medida:'quantidade'|'media_bruta';moeda?:boolean}){
 const lista=dados.filter(x=>Number(x[medida]||0)>0).slice(0,12);
 const maximo=Math.max(1,...lista.map(x=>Number(x[medida]||0)));
 return <div className="rh26-bars">{lista.map((x,i)=><div key={x.nome} className="rh26-bar-item" title={x.nome+' — '+(moeda?brl(x.media_bruta):num(x.quantidade))}>
  <div className="rh26-bar-label"><span>{x.nome}</span><b>{moeda?brl(x.media_bruta):num(x.quantidade)}</b></div>
  <div className="rh26-bar-track"><div style={{width:(Number(x[medida]||0)/maximo*100)+'%',background:cores[i%cores.length]}}/></div>
 </div>)}{!lista.length&&<p className="rh26-muted">Sem valores para os filtros escolhidos.</p>}</div>;
}
function Rosca({dados}:{dados:Grupo[]}){
 const [ativo,setAtivo]=useState(0);
 const top=dados.filter(x=>x.quantidade>0).slice(0,7);
 const restantes=dados.slice(7).reduce((s,x)=>s+x.quantidade,0);
 const items=[...top,...(restantes?[{nome:'Outros departamentos',quantidade:restantes}]:[])];
 const total=items.reduce((s,x)=>s+x.quantidade,0);
 let pos=0;
 const gradient=items.map((x,i)=>{const init=pos;pos+=x.quantidade/Math.max(total,1)*100;return cores[i%cores.length]+' '+init+'% '+pos+'%';}).join(', ');
 const selected=items[ativo]||items[0];
 return <div className="rh26-donut-layout">
  <div className="rh26-ring" role="img" aria-label="Distribuição percentual por departamento" style={{background:total?'conic-gradient('+gradient+')':'#edf1f5'}}>
   <div className="rh26-ring-hole"><strong>{selected?((selected.quantidade/total)*100).toFixed(1).replace('.',',')+'%':'—'}</strong><small>{selected?num(selected.quantidade)+' vínculos-mês':'Sem dados'}</small></div>
  </div>
  <div className="rh26-legend">{items.map((x,i)=><button key={x.nome} className={ativo===i?'active':''} type="button" onClick={()=>setAtivo(i)}>
   <span className="rh26-dot" style={{background:cores[i%cores.length]}}/><span title={x.nome}>{x.nome}</span><b>{(x.quantidade/total*100).toFixed(1).replace('.',',')}%</b>
  </button>)}</div>
 </div>;
}
export default function RecursosHumanos(){
 const [selecionados,setSelecionados]=useState<string[]>(['2026-01']);
 // Deep link da Visão Geral: preserva o mês e aplica o departamento selecionado.
 useEffect(()=>{
  const qs=new URLSearchParams(window.location.search);
  const mes=qs.get('mes');const departamento=qs.get('departamento');
  if(mes&&/^2026-0[1-7]$/.test(mes))setSelecionados([mes]);
  if(departamento&&departamento.length<=160){setF(prev=>({...prev,departamento}));setFiltrosAbertos(true)}
 },[]);
 const [aberto,setAberto]=useState(false),[filtrosAbertos,setFiltrosAbertos]=useState(true),[f,setF]=useState<Filtros>(vazio),[pagina,setPagina]=useState(1);
 const [dados,setDados]=useState<Painel|null>(null),[carregando,setCarregando]=useState(true),[erro,setErro]=useState('');
 const [pessoa,setPessoa]=useState<Row|null>(null);
 const [buscaTabela,setBuscaTabela]=useState('');
 const [buscaTabelaAplicada,setBuscaTabelaAplicada]=useState('');
 useEffect(()=>{
  const timer=window.setTimeout(()=>setBuscaTabelaAplicada(buscaTabela.trim()),300);
  return ()=>window.clearTimeout(timer);
 },[buscaTabela]);
 const consulta=useMemo(()=>{
  const qs=new URLSearchParams({meses:[...selecionados].sort().join(','),pagina:String(pagina)});
  for(const [key,value] of Object.entries(f))if(value)qs.set(key,value);
  return qs.toString();
 },[selecionados,f,pagina]);
 // A busca da tabela não modifica os cards, gráficos ou filtros gerais.
 const consultaTabela=useMemo(()=>{
  const query=new URLSearchParams(consulta);
  if(buscaTabelaAplicada)query.set('tabela_busca',buscaTabelaAplicada);
  return query.toString();
 },[consulta,buscaTabelaAplicada]);
 useEffect(()=>{
  let active=true;setCarregando(true);setErro('');
  fetch('/api/rh/painel?'+consultaTabela,{cache:'no-store'}).then(async r=>{const obj=await r.json();if(!r.ok)throw new Error(obj.error||'Erro HTTP '+r.status);return obj as Painel})
   .then(x=>{if(active)setDados(x)})
   .catch(e=>{if(active)setErro(e instanceof Error?e.message:'Não foi possível carregar os dados.')})
   .finally(()=>{if(active)setCarregando(false)});
  return ()=>{active=false};
 },[consultaTabela]);
 const itens=dados?.competencias||[];
 const filtrados=dados?.totais;
 const mesReferencia=[...selecionados].sort()[selecionados.length-1]||'2026-07';
 const labelSelecionados=selecionados.length===7?'Janeiro a julho de 2026':selecionados.length===1?meses[Number(selecionados[0].slice(-2))-1]+' de 2026':selecionados.map(abreviado).join(', ')+'/2026';
 function alterar(mes:string){setSelecionados(prev=>{
  if(prev.includes(mes))return prev.length===1?prev:prev.filter(x=>x!==mes);
  return [...prev,mes].sort();
 });setPagina(1)}
 function update(key:keyof Filtros,v:string){setF(old=>({...old,[key]:v}));setPagina(1)}
 const options=dados?.opcoes||{};
 const optionsFor=(name:keyof Filtros,label:string,placeholder:string)=><FiltroPesquisavel
  label={label} placeholder={placeholder} value={f[name]}
  options={options[name]||[]} onChange={value=>update(name,value)}/>;
 const top=itens.reduce((v,x)=>Math.max(v,x.indicadores?.bruto||0),1);
 return <div className="rh-page rh26-page">
  <div className="rh-kicker">VIÇO GOV / RECURSOS HUMANOS</div>
  <div className="rh-page-title"><div><h1>Inteligência de Recursos Humanos</h1><p>Prefeitura de Viçosa/MG · folha de pagamento de janeiro a julho de 2026</p></div>
    <a href={portal} target="_blank" rel="noopener noreferrer">Portal oficial <ExternalLink size={14}/></a></div>
  <section className="rh26-months">
    <div className="rh26-month-title"><CalendarDays size={18}/><div><strong>Competências da folha</strong><span>Escolha um ou vários meses para analisar e comparar.</span></div></div>
    <div className="rh26-dropdown-wrap"><button type="button" className="rh26-dropdown-trigger" onClick={()=>setAberto(v=>!v)} aria-expanded={aberto} aria-label="Selecionar meses">
      <span>{labelSelecionados}</span><span className="rh26-count">{selecionados.length} {selecionados.length===1?'mês':'meses'}</span><ChevronDown size={17}/></button>
      {aberto&&<div className="rh26-dropdown-pop"><div className="rh26-dropdown-tools">
       <button onClick={()=>{setSelecionados(meses.map((_,i)=>codigo(i)));setPagina(1)}} type="button">Selecionar todos</button>
       <button onClick={()=>{setSelecionados(['2026-01']);setPagina(1)}} type="button">Somente janeiro</button>
      </div>
      {meses.map((nome,i)=><label key={nome}><input type="checkbox" checked={selecionados.includes(codigo(i))}
        onChange={()=>alterar(codigo(i))} disabled={selecionados.length===1&&selecionados[0]===codigo(i)}/><span>{nome} / 2026</span></label>)}
      <button className="rh26-dropdown-close" type="button" onClick={()=>setAberto(false)}>Aplicar seleção</button></div>}
    </div>
  </section>
  {erro&&<div className="rh-import-error"><AlertTriangle size={17}/>{erro}</div>}
  <section className="rh26-filter-box">
   <div className="rh26-box-head"><button type="button" className="rh26-filter-toggle" onClick={()=>setFiltrosAbertos(v=>!v)} aria-expanded={filtrosAbertos} aria-controls="rh26-filtros">
    <Filter size={17}/><h2>Filtros de análise</h2><span>{filtrosAbertos?'Recolher':'Expandir'}</span>{filtrosAbertos?<ChevronDown size={16} className="rh26-rotate"/>:<ChevronDown size={16}/>}</button>
    {filtrosAbertos&&<button type="button" onClick={()=>{setF({...vazio});setPagina(1)}}><RefreshCcw size={14}/> Limpar filtros</button>}
   </div>
   {filtrosAbertos&&<div id="rh26-filtros" className="rh26-filters">
    <label>Pesquisar servidor ou matrícula<div className="rh26-search"><Search size={14}/><input value={f.busca} placeholder="Nome ou matrícula" onChange={e=>update('busca',e.target.value)}/></div></label>
    {optionsFor('departamento','Secretaria / departamento','Todos os departamentos')}
    {optionsFor('cargo','Cargo / função','Todos os cargos')}
    {optionsFor('vinculo','Vínculo','Todos os vínculos')}
    {optionsFor('local','Local de trabalho','Todos os locais')}
    {optionsFor('jornada','Jornada semanal','Todas as jornadas')}
    <FiltroPesquisavel label="Categoria" placeholder="Todas as categorias" value={f.situacao}
      options={[{value:'efetivo',label:'Efetivos'},{value:'comissionado',label:'Comissionados'},
       {value:'aposentado',label:'Aposentados identificados'},{value:'estagiario',label:'Estagiários'},
       {value:'contratado',label:'Contratados'}]} onChange={value=>update('situacao',value)}/>
    <FiltroPesquisavel label="Faixa salarial" placeholder="Todas as faixas" value={f.faixa}
      options={faixas.filter(([value])=>value).map(([value,label])=>({value,label}))}
      onChange={value=>update('faixa',value)}/>
    <FiltroPesquisavel label="Base salarial" placeholder="Escolher base salarial" value={f.base}
      options={[{value:'bruto',label:'Remuneração bruta'},{value:'liquido',label:'Remuneração líquida'}]}
      onChange={value=>update('base',value||'bruto')}/>
   </div>}
  </section>
  <div className="rh26-cards">
    <article><span><Users size={16}/> Vínculos-mês</span><strong>{carregando?'…':num(filtrados?.vinculos_mes)}</strong><small>Soma dos vínculos nos meses selecionados</small></article>
    <article><span><Users size={16}/> Vínculos distintos</span><strong>{carregando?'…':num(filtrados?.vinculos_distintos)}</strong><small>Sem repetir o mesmo nome e matrícula entre meses</small></article>
    <article><span><Wallet size={16}/> Remuneração bruta</span><strong>{carregando?'…':brl(filtrados?.bruto)}</strong><small>Acumulado de {selecionados.length} {selecionados.length===1?'mês':'meses'}</small></article>
    <article><span><Wallet size={16}/> Quinquênios</span><strong>{carregando?'…':brl(filtrados?.quinquenio)}</strong><small>Rubrica de quinquênio · acumulada</small></article>
  </div>
  <RHAuditoria mes={mesReferencia}/>
  <RHExploracao dados={dados} consulta={consulta}/>
  <section className="rh26-panel rh26-trend"><div className="rh26-panel-head"><h2>Evolução da folha por mês</h2><p>Remuneração bruta mensal; valores de cada competência selecionada.</p></div>
    <div className="rh26-trend-bars">{itens.map((m,i)=><div key={m.mes} className="rh26-trend-item" title={m.mes+' • '+brl(m.indicadores?.bruto)}>
      <strong>{brl(m.indicadores?.bruto)}</strong><div className="rh26-trend-track"><div style={{height:Math.max(5,(Number(m.indicadores?.bruto||0)/top*100))+'%',background:cores[i%cores.length]}}/></div>
      <span>{abreviado(m.mes)}</span></div>)}</div>
  </section>
  <section className="rh26-panel rh26-table-panel">
   <div className="rh26-box-head"><div><Users size={17}/><h2>Servidores e remunerações</h2></div><span>Detalhamento por competência</span></div>
   <div className="rh29-table-tools">
    <label className="rh29-table-search">
     <Search size={16}/>
     <input type="search" value={buscaTabela} aria-label="Pesquisar na tabela de servidores e remunerações"
      placeholder="Buscar nome, matrícula, cargo ou departamento..."
      onChange={e=>{setBuscaTabela(e.target.value);setPagina(1)}}/>
     {buscaTabela&&<button type="button" aria-label="Limpar pesquisa da tabela"
        onClick={()=>{setBuscaTabela('');setBuscaTabelaAplicada('');setPagina(1)}}><X size={15}/></button>}
    </label>
    <span aria-live="polite">{carregando?'Pesquisando…':num(dados?.total_pessoas??0)+' registros encontrados'}</span>
   </div>
   <div className="rh26-table-scroll"><table><thead><tr><th>Competência</th><th>Servidor / matrícula</th><th>Cargo e departamento</th><th>Bruto</th><th>Líquido</th><th>Quinquênio</th><th></th></tr></thead>
     <tbody>{(dados?.pessoas||[]).map(r=><tr key={r.id}>
      <td>{r.mes.slice(-2)+'/2026'}</td><td><b>{r.nome}</b><small>Matrícula {r.matricula}</small></td>
      <td>{r.cargo}<small>{r.departamento}</small></td>
      <td>{brl(r.bruto)}</td><td>{brl(r.liquido)}</td><td>{brl(r.quinquenio)}</td>
      <td><button type="button" onClick={()=>setPessoa(r)} className="rh26-view">Ver <ChevronRight size={14}/></button></td></tr>)}</tbody></table></div>
   {!carregando&&dados?.pessoas.length===0&&<div className="rh29-table-empty">Nenhum servidor encontrado. Tente outro nome, matrícula, cargo ou departamento.</div>}
   <div className="rh26-pagination"><button onClick={()=>setPagina(x=>Math.max(1,x-1))} disabled={pagina===1||carregando}><ChevronLeft size={15}/>Anterior</button><span>Página {pagina} de {Math.max(1,Math.ceil((dados?.total_pessoas??0)/20))}</span><button onClick={()=>setPagina(x=>x+1)} disabled={carregando||!dados||(pagina*20>=dados.total_pessoas)}>Próxima<ChevronRight size={15}/></button></div>
  </section>
  {pessoa&&<div className="rh26-overlay" onClick={()=>setPessoa(null)}><div className="rh26-modal" role="dialog" aria-modal="true" aria-label="Ficha do vínculo" onClick={e=>e.stopPropagation()}>
   <div className="rh26-modal-head"><div><h2>{pessoa.nome}</h2><small>{pessoa.mes.slice(-2)+'/2026'} · matrícula {pessoa.matricula}</small></div><button aria-label="Fechar" onClick={()=>setPessoa(null)}><X size={19}/></button></div>
   <div className="rh26-details">{[
    ['Cargo',pessoa.cargo],['Vínculo',pessoa.vinculo],['Departamento',pessoa.departamento],['Local',pessoa.local],
    ['Admissão',pessoa.admissao||'Não informado'],['Jornada semanal',pessoa.jornada],['Bruto',brl(pessoa.bruto)],
    ['Líquido',brl(pessoa.liquido)],['Quinquênio',brl(pessoa.quinquenio)],['Inclusões de pagamento',num(pessoa.inclusoes_pagamento)]
   ].map(([key,value])=><div key={key}><span>{key}</span><strong>{value}</strong></div>)}</div>
   <p className="rh26-muted">Informações referentes exclusivamente à competência selecionada. Os valores são públicos no relatório de folha.</p>
  </div></div>}
 </div>;
}
