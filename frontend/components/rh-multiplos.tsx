'use client';
import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,BarChart3,CalendarDays,Search,Filter,ArrowLeft,ArrowRight,Info} from 'lucide-react';
import {brl,num} from '../lib/api';
type Indicadores={registros_mes:number;matriculas_distintas:number;nomes_distintos:number;bruto:number;liquido:number;descontos:number;quinquenio:number};
type Month={mes:string;disponivel:boolean;conciliado?:boolean;divergencia?:number;indicadores:Indicadores|null};
type Group={nome:string;registros_mes:number;matriculas_distintas:number;bruto:number};
type Row={mes:string;matricula:string;nome:string;admissao:string|null;jornada:string;cargo:string;vinculo:string;departamento:string;local_trabalho:string;bruto:number;liquido:number;quinquenio:number};
type Data={meses_solicitados:string[];meses_disponiveis:string[];meses_pendentes:string[];periodo_completo:boolean;por_mes:Month[];totais_disponiveis:Indicadores|null;faixas:Group[];por_departamento:Group[];por_cargo:Group[];por_vinculo:Group[];por_local:Group[];registros:Row[];pagina:number;tamanho:number;opcoes:Record<string,string[]>;observacao:string};
const faixas=[['','Todas as faixas'],['ate_2','Até R$ 2 mil'],['2_4','R$ 2 a 4 mil'],['4_6','R$ 4 a 6 mil'],['6_8','R$ 6 a 8 mil'],['8_10','R$ 8 a 10 mil'],['10_12','R$ 10 a 12 mil'],['acima_12','Acima de R$ 12 mil']];
const defaults={departamento:'',cargo:'',vinculo:'',local:'',jornada:'',situacao:'',faixa:'',base:'bruto',busca:''};
const names=['Jan','Fev','Mar','Abr','Mai','Jun','Jul'];
export default function RHMultiplos({meses}:{meses:string[]}){
 const [filters,setFilters]=useState(defaults);
 const [page,setPage]=useState(1);
 const [data,setData]=useState<Data|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const search=useMemo(()=>{
  const params=new URLSearchParams({meses:[...meses].sort().join(','),pagina:String(page)});
  for(const [key,value] of Object.entries(filters))if(value)params.set(key,value);
  return params.toString();
 },[meses,filters,page]);
 useEffect(()=>{
  let alive=true;setLoading(true);setError('');
  fetch('/api/rh/periodo?'+search,{cache:'no-store'}).then(async res=>{
   const obj=await res.json();
   if(!res.ok)throw new Error(obj.error||'Erro HTTP '+res.status);
   return obj as Data;
  }).then(r=>{if(alive)setData(r)})
    .catch(e=>{if(alive){setError(e instanceof Error?e.message:'Consulta indisponível');setData(null)}})
    .finally(()=>{if(alive)setLoading(false)});
  return ()=>{alive=false};
 },[search]);
 function change(key:keyof typeof defaults,value:string){setFilters(v=>({...v,[key]:value}));setPage(1)}
 const available=data?.meses_disponiveis.length??0;
 const total=data?.totais_disponiveis;
 const graph=data?.por_mes??[];
 const max=Math.max(1,...graph.map(x=>x.indicadores?.bruto??0));
 return <section className="rhm-dashboard">
  <div className="rhm-intro">
   <h2>Comparativo entre competências</h2>
   <p>Valores mensais e acumulados dos meses escolhidos, com dados oficiais carregados. A mesma matrícula pode constar em vários meses.</p>
  </div>
  {loading&&<div className="rhm-loading">Consultando as competências selecionadas…</div>}
  {error&&<div className="rh-import-error"><AlertTriangle size={16}/>{error}</div>}
  {data&&<>
   <div className="rhm-coverage">
    <CalendarDays size={19}/>
    <div><strong>{available} de {meses.length} {meses.length===1?'mês disponível':'meses disponíveis'} no banco</strong>
     <p>{data.meses_pendentes.length>0?
      'Ainda sem dados: '+data.meses_pendentes.map(m=>names[Number(m.slice(-2))-1]+'/2026').join(', ')+'. Esses meses não são contabilizados como zero.':
      'Todos os meses selecionados têm uma base mensal disponível.'}</p>
    </div>
   </div>
   {total&&<>
    <div className="rhm-stats">
     <article><span>Registros-mês</span><strong>{num(total.registros_mes)}</strong><small>Mesma matrícula pode aparecer em vários meses</small></article>
     <article><span>Matrículas distintas</span><strong>{num(total.matriculas_distintas)}</strong><small>Sem repetir matrícula no período disponível</small></article>
     <article><span>Folha bruta acumulada</span><strong>{brl(total.bruto)}</strong><small>Apenas competências com dados</small></article>
     <article><span>Quinquênios acumulados</span><strong>{brl(total.quinquenio)}</strong><small>Rubrica 105 · meses com dados</small></article>
    </div>
    <div className="rhm-box">
     <h3>Evolução mensal da folha</h3>
     <p>Comparação da remuneração bruta. A falta de base é indicada separadamente, sem criar zeros.</p>
     <div className="rhm-bars">{graph.map(row=><div className="rhm-month" key={row.mes}>
      <span>{names[Number(row.mes.slice(-2))-1]}</span>
      <div className="rhm-track">{row.disponivel&&<div style={{width:(row.indicadores?.bruto??0)/max*100+'%'}}/>}</div>
      <strong>{row.disponivel?brl(row.indicadores?.bruto):'Sem dados'}</strong>
     </div>)}</div>
    </div>
    <div className="rhm-box">
     <div className="rhm-box-heading"><div><h3><Filter size={16}/> Filtros combinados</h3><p>Aplicados a cada registro mensal antes de consolidar os valores.</p></div>
       <button onClick={()=>{setFilters({...defaults});setPage(1)}}>Limpar filtros</button></div>
     <div className="rhm-filter-grid">
      <label>Nome ou matrícula<div className="rhm-search"><Search size={14}/><input placeholder="Pesquisar" value={filters.busca} onChange={e=>change('busca',e.target.value)}/></div></label>
      {(['departamento','cargo','vinculo','local','jornada'] as const).map((key,i)=>
       <label key={key}>{['Departamento','Cargo / função','Vínculo','Local de trabalho','Jornada semanal'][i]}
         <select value={filters[key]} onChange={e=>change(key,e.target.value)}><option value="">Todos</option>
           {(data.opcoes[key]||[]).map(x=><option key={x} value={x}>{x}</option>)}
         </select></label>)}
      <label>Tipo de vínculo<select value={filters.situacao} onChange={e=>change('situacao',e.target.value)}>
       <option value="">Todos</option><option value="efetivo">Efetivos</option><option value="comissionado">Comissionados</option>
       <option value="estavel">Estáveis</option><option value="aposentado">Aposentados identificados</option><option value="estagiario">Estagiários</option>
      </select></label>
      <label>Faixa salarial<select value={filters.faixa} onChange={e=>change('faixa',e.target.value)}>{faixas.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
      <label>Base salarial<select value={filters.base} onChange={e=>change('base',e.target.value)}><option value="bruto">Bruto</option><option value="liquido">Líquido</option></select></label>
     </div>
    </div>
    <div className="rhm-group-grid">
     {([
      {title:'Por departamento',values:data.por_departamento},
      {title:'Por vínculo',values:data.por_vinculo},
      {title:'Por cargo',values:data.por_cargo},
      {title:'Faixas salariais mensais',values:data.faixas}
     ]).map(({title,values})=><section className="rhm-box" key={title}>
      <h3><BarChart3 size={16}/>{title}</h3>
      <p>Contagem de registros-mês nos meses carregados.</p>
      <div className="rhm-group">{values.slice(0,20).map(x=><div key={x.nome}><span>{x.nome}</span><strong>{num(x.registros_mes)}</strong></div>)}</div>
     </section>)}
    </div>
    <section className="rhm-box">
     <h3>Lançamentos mensais por matrícula</h3>
     <p>A mesma pessoa pode aparecer em diferentes meses, uma linha por matrícula e competência.</p>
     <div className="rhm-table-scroll"><table>
      <thead><tr><th>Mês</th><th>Servidor e matrícula</th><th>Cargo / departamento</th><th>Bruto</th><th>Líquido</th><th>Quinquênio</th></tr></thead>
      <tbody>{data.registros.map(x=><tr key={x.mes+'-'+x.matricula}>
       <td>{x.mes.slice(-2)+'/2026'}</td><td><strong>{x.nome}</strong><small>Matrícula {x.matricula}</small></td>
       <td>{x.cargo}<small>{x.departamento}</small></td><td>{brl(x.bruto)}</td><td>{brl(x.liquido)}</td><td>{brl(x.quinquenio)}</td>
      </tr>)}</tbody>
     </table></div>
     <div className="rhm-pagination"><button disabled={page===1} onClick={()=>setPage(v=>v-1)}><ArrowLeft size={14}/>Anterior</button>
      <span>Página {page}</span>
      <button disabled={!data.registros.length||data.registros.length<20} onClick={()=>setPage(v=>v+1)}>Próxima<ArrowRight size={14}/></button></div>
    </section>
   </>}
   {!total&&<div className="rhm-empty">Nenhum dos meses selecionados possui uma base validada. Não há valores para exibir ou comparar.</div>}
   <div className="rhm-method"><Info size={16}/>{data.observacao}</div>
  </>}
 </section>;
}
