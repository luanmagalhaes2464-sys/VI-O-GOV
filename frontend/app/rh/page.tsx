'use client';
import {useEffect,useMemo,useState} from 'react';
import {AlertTriangle,ArrowLeft,ArrowRight,BarChart3,CalendarDays,ExternalLink,Filter,Info,Search,Users,Wallet,X} from 'lucide-react';
import {api,brl,num} from '../../lib/api';

type RHResumo={mes:string;disponivel:boolean;matriculas:number;nomes_distintos:number;bruto:number;liquido:number;descontos:number;quinquenio:number;divergencia:number;conciliado:boolean;};
type Opcoes={mes:string;departamentos:string[];cargos:string[];vinculos:string[];locais:string[];jornadas:string[]};
type Grupo={nome:string;quantidade:number;bruto:number;liquido:number};
type Faixa={codigo:string;nome:string;quantidade:number};
type RHAnalise={mes:string;quantitativos:{matriculas:number;nomes_distintos:number;bruto:number;liquido:number;descontos:number;quinquenio:number;media:number};faixas:Faixa[];por_departamento:Grupo[];por_cargo:Grupo[];por_vinculo:Grupo[];por_local:Grupo[]};
type Pessoa={matricula:string;nome:string;admissao:string|null;desligamento:string|null;jornada:string;cargo:string;vinculo:string;departamento:string;local_trabalho:string;bruto:number;liquido:number;descontos:number;quinquenio:number;pagina_pdf:number;salario_base:number|null};
type Pessoas={mes:string;total:number;pagina:number;tamanho:number;pessoas:Pessoa[]};
type Detalhe={registro:Pessoa&{rubricas:{codigo:string;rubrica:string;valor:number}[];competencia:string}};
type FilterState={departamento:string;cargo:string;vinculo:string;local:string;jornada:string;situacao:string;faixa:string;base:string;busca:string};
const defaults:FilterState={departamento:'',cargo:'',vinculo:'',local:'',jornada:'',situacao:'',faixa:'',base:'bruto',busca:''};
const source='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml';
const meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho'];
const todasFaixas=[['ate_2','Até R$ 2 mil'],['2_4','R$ 2 a R$ 4 mil'],['4_6','R$ 4 a R$ 6 mil'],['6_8','R$ 6 a R$ 8 mil'],['8_10','R$ 8 a R$ 10 mil'],['10_12','R$ 10 a R$ 12 mil'],['acima_12','Acima de R$ 12 mil']];
const empty:Opcoes={mes:'2026-01',departamentos:[],cargos:[],vinculos:[],locais:[],jornadas:[]};
export default function RHPage(){
 const [mes,setMes]=useState('2026-01'),[f,setF]=useState<FilterState>(defaults),[pagina,setPagina]=useState(1);
 const [resumo,setResumo]=useState<RHResumo|null>(null),[filtros,setFiltros]=useState<Opcoes>(empty);
 const [analise,setAnalise]=useState<RHAnalise|null>(null),[pessoas,setPessoas]=useState<Pessoas|null>(null);
 const [erro,setErro]=useState(''),[loading,setLoading]=useState(true);
 const [detalhe,setDetalhe]=useState<Detalhe|null>(null),[carregandoDetalhe,setCarregandoDetalhe]=useState(false);
 const qs=useMemo(()=>{const p=new URLSearchParams({mes});for(const [chave,valor] of Object.entries(f))if(valor)p.set(chave,valor);return p.toString()},[mes,f]);
 useEffect(()=>{let active=true;setLoading(true);setErro('');setDetalhe(null);
  const p=qs+'&pagina='+pagina+'&tamanho=20';
  Promise.all([api<RHResumo>('/api/v1/rh/folha/resumo?mes='+mes),
               api<Opcoes>('/api/v1/rh/folha/filtros?mes='+mes),
               api<RHAnalise>('/api/v1/rh/folha/analise?'+qs),
               api<Pessoas>('/api/v1/rh/folha/pessoas?'+p)])
   .then(([r,o,a,n])=>{if(!active)return;setResumo(r.data);setFiltros(o.data||empty);setAnalise(a.data);setPessoas(n.data);
    setErro(r.error||o.error||a.error||n.error||'')})
   .finally(()=>{if(active)setLoading(false)});
  return()=>{active=false};
 },[mes,qs,pagina]);
 function update(key:keyof FilterState,value:string){setF(prev=>({...prev,[key]:value}));setPagina(1)}
 function chooseMonth(v:string){setMes(v);setF({...defaults});setPagina(1)}
 function abrir(p:Pessoa){setDetalhe(null);setCarregandoDetalhe(true);
   api<Detalhe>('/api/v1/rh/folha/pessoas/'+encodeURIComponent(p.matricula)+'?mes='+mes)
     .then(r=>{if(r.data)setDetalhe(r.data);else setErro(r.error||'Falha ao abrir matrícula.')})
     .finally(()=>setCarregandoDetalhe(false));
 }
 const disponivel=resumo?.disponivel===true;
 const total=analise?.quantitativos;
 const max=Math.max(1,...(analise?.faixas||[]).map(x=>x.quantidade));
 const podeAvancar=!!pessoas&&pagina*20<pessoas.total;
 return <div className="rh-page rhx-page">
  <div className="rh-kicker">VIÇO GOV / RECURSOS HUMANOS</div>
  <div className="rh-page-title"><div><h1>Dashboard da folha de pagamento</h1><p>Prefeitura Municipal de Viçosa · dados individuais, cargos, departamento, vínculo, jornada e quinquênio.</p></div><a href={source} target="_blank" rel="noopener noreferrer">Fonte oficial <ExternalLink size={15}/></a></div>
  <div className="rhx-status"><CalendarDays size={17}/><strong>Período da folha</strong><select aria-label="Competência" value={mes} onChange={e=>chooseMonth(e.target.value)}>{meses.map((label,i)=><option value={`2026-${String(i+1).padStart(2,'0')}`} key={label}>{label} / 2026{i>0?' — pendente':''}</option>)}</select><span className={disponivel?'rhx-available':'rhx-pending'}>{disponivel?'Dados carregados no Neon':'Sem base carregada'}</span></div>
  {disponivel&&<div className="rhx-caution"><AlertTriangle size={17}/><span>Janeiro/2026: PDF com {num(resumo!.matriculas)} matrículas. A soma bruta do PDF difere {brl(resumo!.divergencia)} do total exibido no portal. Os valores permanecem identificados como <b>não conciliados</b>, e não são projetados para outros meses.</span></div>}
  {erro&&<div className="rh-import-error"><Info size={17}/>{erro}</div>}
  {disponivel?
   <>
    <div className="rhx-filters">
      <div className="rhx-filters-heading"><div><Filter size={17}/><strong>Filtros de pessoal</strong></div><button onClick={()=>{setF({...defaults});setPagina(1)}}>Limpar filtros</button></div>
      <div className="rhx-grid">
       <label>Nome ou matrícula<div className="rhx-search"><Search size={15}/><input value={f.busca} onChange={e=>update('busca',e.target.value)} placeholder="Pesquisar..." aria-label="Pesquisar nome ou matrícula"/></div></label>
       <label>Departamento / secretaria<select value={f.departamento} onChange={e=>update('departamento',e.target.value)}><option value="">Todos</option>{filtros.departamentos.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Cargo / função<select value={f.cargo} onChange={e=>update('cargo',e.target.value)}><option value="">Todos</option>{filtros.cargos.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Vínculo<select value={f.vinculo} onChange={e=>update('vinculo',e.target.value)}><option value="">Todos</option>{filtros.vinculos.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Tipo de vínculo<select value={f.situacao} onChange={e=>update('situacao',e.target.value)}><option value="">Todos</option><option value="efetivo">Efetivo</option><option value="estavel">Estável</option><option value="comissionado">Comissionado</option><option value="aposentado">Aposentado</option><option value="estagiario">Estagiário</option></select></label>
       <label>Local de trabalho<select value={f.local} onChange={e=>update('local',e.target.value)}><option value="">Todos</option>{filtros.locais.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Jornada semanal<select value={f.jornada} onChange={e=>update('jornada',e.target.value)}><option value="">Todas</option>{filtros.jornadas.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Faixa salarial<select value={f.faixa} onChange={e=>update('faixa',e.target.value)}><option value="">Todas as faixas</option>{todasFaixas.map(([v,n])=><option key={v} value={v}>{n}</option>)}</select></label>
       <label>Base da faixa<select value={f.base} onChange={e=>update('base',e.target.value)}><option value="bruto">Bruto</option><option value="liquido">Líquido</option></select></label>
      </div>
    </div>
    <div className="rhx-stats">
      <div><span><Users size={16}/> Matrículas no filtro</span><strong>{loading?'…':num(total?.matriculas)}</strong><small>{mes} · valores do PDF</small></div>
      <div><span><Wallet size={16}/> Total bruto</span><strong>{loading?'…':brl(total?.bruto)}</strong><small>Valor mensal filtrado</small></div>
      <div><span>Valor líquido</span><strong>{loading?'…':brl(total?.liquido)}</strong><small>Valor mensal filtrado</small></div>
      <div><span>Quinquênio (rubrica 105)</span><strong>{loading?'…':brl(total?.quinquenio)}</strong><small>Somatório filtrado</small></div>
    </div>
    <div className="rhx-charts">
     <section className="rhx-panel"><div className="rhx-panel-title"><BarChart3 size={17}/><h2>Distribuição por faixa salarial</h2></div><p>Remuneração {f.base==='bruto'?'bruta':'líquida'} · contagem por matrícula</p><div className="rhx-bars">{(analise?.faixas||[]).map(x=><div className="rhx-bar" key={x.codigo}><span>{x.nome}</span><div><i style={{width:x.quantidade/max*100+'%'}}/></div><b>{num(x.quantidade)}</b></div>)}</div></section>
     <section className="rhx-panel"><div className="rhx-panel-title"><Users size={17}/><h2>Distribuição por departamento</h2></div><p>Departamentos com mais matrículas na seleção.</p><div className="rhx-breakdown">{(analise?.por_departamento||[]).slice(0,14).map(x=><div key={x.nome}><span title={x.nome}>{x.nome}</span><b>{num(x.quantidade)}</b></div>)}</div></section>
     <section className="rhx-panel"><div className="rhx-panel-title"><Users size={17}/><h2>Vínculos</h2></div><p>Classificações conforme a folha municipal.</p><div className="rhx-breakdown">{(analise?.por_vinculo||[]).map(x=><div key={x.nome}><span>{x.nome}</span><b>{num(x.quantidade)}</b></div>)}</div></section>
     <section className="rhx-panel"><div className="rhx-panel-title"><Users size={17}/><h2>Cargos com mais matrículas</h2></div><p>Cargos e funções da base selecionada.</p><div className="rhx-breakdown">{(analise?.por_cargo||[]).slice(0,15).map(x=><div key={x.nome}><span>{x.nome}</span><b>{num(x.quantidade)}</b></div>)}</div></section>
    </div>
    <section className="rhx-panel rhx-table">
      <div className="rhx-table-heading"><div><h2>Pessoas e matrículas</h2><p>Selecione um registro para ver admissão, local, jornada e rubricas de pagamento.</p></div><span>{num(pessoas?.total)} registros</span></div>
      <div className="rhx-table-scroll"><table><thead><tr><th>Nome / matrícula</th><th>Cargo</th><th>Departamento</th><th>Admissão</th><th>Bruto</th><th>Quinquênio</th><th></th></tr></thead><tbody>
      {(pessoas?.pessoas||[]).map(x=><tr key={x.matricula}><td><strong>{x.nome}</strong><small>Matrícula {x.matricula}</small></td><td>{x.cargo||'Não informado'}</td><td>{x.departamento}</td><td>{x.admissao?x.admissao.split('-').reverse().join('/'):'—'}</td><td>{brl(x.bruto)}</td><td>{brl(x.quinquenio)}</td><td><button className="rhx-detail-btn" onClick={()=>abrir(x)}>Detalhar</button></td></tr>)}
      </tbody></table></div>
      {pessoas?.total===0&&<div className="rhx-empty">Nenhum registro corresponde aos filtros.</div>}
      <div className="rhx-pages"><span>Página {pagina} de {Math.max(1,Math.ceil((pessoas?.total||0)/20))}</span><div><button disabled={pagina<=1} onClick={()=>setPagina(p=>p-1)}><ArrowLeft size={15}/> Anterior</button><button disabled={!podeAvancar} onClick={()=>setPagina(p=>p+1)}>Próxima <ArrowRight size={15}/></button></div></div>
    </section>
   </>:
   <div className="rh-data-wait"><CalendarDays size={32}/><h2>Sem folha disponível para {meses[Number(mes.slice(-2))-1]} de 2026</h2><p>O arquivo recebido contém somente janeiro/2026. Fevereiro a julho não foram estimados e só aparecerão quando as bases mensais forem obtidas e validadas.</p></div>}
  <div className="rhx-note"><Info size={16}/><span>Dados públicos de remuneração por matrícula, extraídos do PDF informado. O total de matrículas não equivale à quantidade de funcionários ativos; folhas podem conter rescisões, aposentados e estagiários. A fonte original deverá ser consultada para auditoria.</span></div>
  {carregandoDetalhe&&<div className="rhx-dialog-back"><div className="rhx-dialog"><p>Carregando os detalhes da matrícula…</p></div></div>}
  {detalhe&&<div className="rhx-dialog-back" onClick={()=>setDetalhe(null)}><div className="rhx-dialog" role="dialog" aria-modal="true" aria-label="Detalhes da folha" onClick={e=>e.stopPropagation()}>
   <div className="rhx-dialog-head"><div><h2>{detalhe.registro.nome}</h2><p>Matrícula {detalhe.registro.matricula} · {mes}</p></div><button aria-label="Fechar" onClick={()=>setDetalhe(null)}><X size={19}/></button></div>
   <div className="rhx-detail-grid">{[
      ['Cargo/função',detalhe.registro.cargo],['Vínculo',detalhe.registro.vinculo],
      ['Departamento',detalhe.registro.departamento],['Local',detalhe.registro.local_trabalho],
      ['Admissão',detalhe.registro.admissao?detalhe.registro.admissao.split('-').reverse().join('/'):'—'],
      ['Jornada semanal',detalhe.registro.jornada],['Salário-base (rubrica 100)',brl(detalhe.registro.salario_base)],
      ['Quinquênio (rubrica 105)',brl(detalhe.registro.quinquenio)],
      ['Total bruto',brl(detalhe.registro.bruto)],['Descontos',brl(detalhe.registro.descontos)],
      ['Total líquido',brl(detalhe.registro.liquido)],['Página do PDF',String(detalhe.registro.pagina_pdf)]
    ].map(([k,v])=><div key={k}><span>{k}</span><strong>{v||'—'}</strong></div>)}</div>
   <h3>Rubricas desta competência</h3><div className="rhx-rubricas">{detalhe.registro.rubricas.map((r,i)=><div key={i}><span>{r.codigo} — {r.rubrica}</span><b>{brl(r.valor)}</b></div>)}</div>
   <a href={source} target="_blank" rel="noopener noreferrer">Conferir no Portal da Transparência <ExternalLink size={14}/></a>
  </div></div>}
 </div>;
}
