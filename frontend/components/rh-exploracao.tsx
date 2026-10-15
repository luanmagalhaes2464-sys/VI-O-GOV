'use client';
import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ArrowRight,BarChart3,ChevronRight,Info,Users,Wallet,X} from 'lucide-react';
import {brl,num} from '../lib/api';

const cores=['#2458db','#117f79','#7842eb','#da6010','#d42e59','#258fa6','#edad39','#8d9bb1'];
type Grupo={nome:string;quantidade:number;bruto?:number;media_bruta?:number;maior_remuneracao?:number};
type PessoaGrupo={id:number;mes:string;matricula:string;nome:string;cargo:string;departamento:string;bruto:number;liquido:number;quinquenio:number;inclusoes_pagamento:number};
type Estatisticas={vinculos_mes:number;vinculos_distintos:number;bruto:number;liquido:number;media_bruta:number;quinquenio:number};
type GrupoResposta={modo:'cargo'|'departamento';nome:string;resumo:Estatisticas;pessoas:PessoaGrupo[];pagina:number;tamanho:number;observacao:string};
type Rubrica={codigo:string;rubrica:string;tipo:string;valor:number};
type Inclusao={tipo_inclusao:string;bruto:number;descontos:number;liquido:number;salario_base:number;quinquenio:number;rubricas:Rubrica[]};
type PessoaDetalhada={pessoa:PessoaGrupo&{admissao:string|null;vinculo:string;local_trabalho:string;jornada:string;descontos:number;salario_base:number};
 inclusoes:Inclusao[];explicacao:string;fonte:string};
type Dataset={por_departamento:Grupo[];por_cargo:Grupo[];maiores_salarios:Grupo[];criterio_salario:string};
type Fatia=Grupo&{percentual:number};
type Selecionado={tipo:'departamento'|'cargo';nome:string;quantidade:number;bruto:number;percentual?:number;outros?:Grupo[];media?:number};
const money=(v:number|undefined)=>brl(v??0);
const labelMes=(month:string)=>month?.slice(5)+'/2026';

function Fatias({dados,onSelect}:{dados:Grupo[];onSelect:(f:Selecionado)=>void}){
 const ativos=dados.filter(x=>Number(x.quantidade)>0);
 const primeiros=ativos.slice(0,7);
 const extras=ativos.slice(7);
 const outros=extras.reduce((acc,x)=>({quantidade:acc.quantidade+Number(x.quantidade),bruto:acc.bruto+Number(x.bruto||0)}),{quantidade:0,bruto:0});
 const conjunto=[...primeiros,...(outros.quantidade?[{nome:'Outros departamentos',quantidade:outros.quantidade,bruto:outros.bruto}]:[])];
 const total=conjunto.reduce((acc,x)=>acc+Number(x.quantidade),0);
 const totalBruto=conjunto.reduce((acc,x)=>acc+Number(x.bruto||0),0);
 const raio=86,comprimento=2*Math.PI*raio;
 let anterior=0;
 const fatias:Fatia[]=conjunto.map(x=>({nome:x.nome,quantidade:x.quantidade,bruto:x.bruto,percentual:100*x.quantidade/Math.max(1,total)}));
 return <div className="rh27-pie">
  <div className="rh27-pie-illustration">
   <svg viewBox="0 0 250 250" role="group" aria-label="Gráfico de rosca interativo: clique numa fatia para ver departamento, percentual e gasto">
    <circle cx="125" cy="125" r={raio} stroke="#edf1f5" strokeWidth="54" fill="none"/>
    <g transform="rotate(-90 125 125)">
    {fatias.map((x,i)=>{
     const tamanho=x.percentual/100*comprimento;
     const inicio=anterior;anterior+=tamanho;
     return <circle key={x.nome} cx="125" cy="125" r={raio} fill="none" stroke={cores[i%cores.length]}
      strokeWidth="54" strokeDasharray={Math.max(0,tamanho-1.1)+' '+comprimento} strokeDashoffset={-inicio}
      className="rh27-slice" tabIndex={0} role="button"
      aria-label={x.nome+', '+x.percentual.toFixed(1)+'%, gasto bruto de '+money(x.bruto)}
      onClick={()=>onSelect({tipo:'departamento',nome:x.nome,quantidade:x.quantidade,bruto:Number(x.bruto||0),percentual:x.percentual,outros:x.nome==='Outros departamentos'?extras:undefined})}
      onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect({tipo:'departamento',nome:x.nome,quantidade:x.quantidade,bruto:Number(x.bruto||0),percentual:x.percentual,outros:x.nome==='Outros departamentos'?extras:undefined})}}}/>;
    })}
    </g>
    <text x="125" y="119" textAnchor="middle" fontSize="23" fill="#24384f" fontWeight="750">{num(total)}</text>
    <text x="125" y="138" textAnchor="middle" fontSize="11" fill="#8b9eac">vínculos-mês</text>
   </svg>
  </div>
  <p className="rh27-chart-hint">Clique em uma fatia colorida para ver o departamento, a participação e o gasto.</p>
  <span className="rh27-total-caption">Gasto bruto total selecionado: <b>{money(totalBruto)}</b></span>
 </div>;
}
function ListaBarras({dados,medida,onSelect}:{dados:Grupo[];medida:'quantidade'|'media_bruta';onSelect:(g:Grupo)=>void}){
 const lista=dados.filter(x=>Number(x[medida]||0)>0).slice(0,12);
 const max=Math.max(1,...lista.map(x=>Number(x[medida]||0)));
 return <div className="rh26-bars">{lista.map((item,i)=>
  <button type="button" key={item.nome} className="rh27-bar-click" onClick={()=>onSelect(item)}
   title={'Abrir cargo '+item.nome+' e consultar remunerações individuais'}>
   <div className="rh26-bar-label"><span>{item.nome}</span><b>{medida==='quantidade'?num(item.quantidade):money(item.media_bruta)}</b></div>
   <div className="rh26-bar-track"><div style={{width:(Number(item[medida]||0)/max*100)+'%',background:cores[i%cores.length]}}/></div>
  </button>
 )}{!lista.length&&<p className="rh26-muted">Nenhum cargo nos filtros selecionados.</p>}</div>;
}
export default function RHExploracao({dados,consulta}:{dados:Dataset|null;consulta:string}){
 const [selecionado,setSelecionado]=useState<Selecionado|null>(null);
 const [resultado,setResultado]=useState<GrupoResposta|null>(null);
 const [detalhe,setDetalhe]=useState<PessoaDetalhada|null>(null);
 const [pagina,setPagina]=useState(1);
 const [erro,setErro]=useState('');
 const [carregando,setCarregando]=useState(false);
 const [carregandoPessoa,setCarregandoPessoa]=useState(false);
 const filtroBase=useMemo(()=>{const p=new URLSearchParams(consulta);p.delete('pagina');return p},[consulta]);
 useEffect(()=>{setSelecionado(null);setResultado(null);setDetalhe(null);setErro('');setPagina(1)},[consulta]);
 const carregarGrupo=useCallback(async(grupo:Selecionado,page:number,autoPessoa=false)=>{
  if(grupo.outros){setResultado(null);setCarregando(false);return}
  const params=new URLSearchParams(filtroBase.toString());
  params.set('modo',grupo.tipo);params.set('valor',grupo.nome);params.set('pagina',String(page));
  setErro('');setCarregando(true);setResultado(null);
  try{
   const res=await fetch('/api/rh/explorar?'+params.toString(),{cache:'no-store'});
   const obj=await res.json();
   if(!res.ok)throw Error(obj.error||'Consulta não disponível');
   setResultado(obj as GrupoResposta);
   if(autoPessoa&&(obj as GrupoResposta).pessoas[0])void abrirPessoa((obj as GrupoResposta).pessoas[0]);
  }catch(error){setErro(error instanceof Error?error.message:'Erro ao consultar pessoas.')}
  finally{setCarregando(false)}
 },[filtroBase]);
 async function abrirPessoa(p:PessoaGrupo){
  setCarregandoPessoa(true);setErro('');
  try{
   const response=await fetch('/api/rh/explorar?modo=pessoa&id='+p.id,{cache:'no-store'});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||'Não foi possível ler as rubricas.');
   setDetalhe(payload as PessoaDetalhada);
  }catch(e){setErro(e instanceof Error?e.message:'Erro ao consultar rubricas.')}
  finally{setCarregandoPessoa(false)}
 }
 function abrirCargo(x:Grupo,autoPessoa=false){
  const grupo:Selecionado={tipo:'cargo',nome:x.nome,quantidade:x.quantidade,bruto:Number(x.bruto||0),media:Number(x.media_bruta||0)};
  setSelecionado(grupo);setDetalhe(null);setPagina(1);
  void carregarGrupo(grupo,1,autoPessoa);
 }
 function abrirSetor(x:Selecionado){
  setSelecionado(x);setDetalhe(null);setResultado(null);setErro('');setPagina(1);
  if(!x.outros)void carregarGrupo(x,1);
 }
 function navegar(page:number){
  if(!selecionado)return;
  setPagina(page);void carregarGrupo(selecionado,page);
 }
 function fechar(){setSelecionado(null);setResultado(null);setDetalhe(null);setErro('');}
 const media=resultado?.resumo.media_bruta??selecionado?.media??0;
 return <>
  <div className="rh26-chart-grid">
   <section className="rh26-panel rh26-dept">
    <div className="rh26-panel-head"><h2>Distribuição por departamento</h2><p>Participação percentual dos vínculos-mês por departamento.</p></div>
    <Fatias dados={dados?.por_departamento||[]} onSelect={abrirSetor}/>
   </section>
   <section className="rh26-panel">
    <div className="rh26-panel-head"><h2>Cargos com mais matrículas</h2><p>Clique em um cargo para ver o gasto total e os valores individuais.</p></div>
    <ListaBarras dados={dados?.por_cargo||[]} medida="quantidade" onSelect={abrirCargo}/>
   </section>
   <section className="rh26-panel">
    <div className="rh26-panel-head"><h2>Cargos com maiores salários</h2><p>Média bruta por vínculo-mês, do maior para o menor. Clique para ver servidores e rubricas.</p></div>
    <ListaBarras dados={dados?.maiores_salarios||[]} medida="media_bruta" onSelect={x=>abrirCargo(x,true)}/>
   </section>
  </div>
  {selecionado&&<div className="rh26-overlay" onClick={fechar}>
   <div className="rh26-modal rh27-modal" role="dialog" aria-modal="true" aria-label={'Detalhamento de '+selecionado.nome}
    onClick={e=>e.stopPropagation()}>
    <div className="rh26-modal-head">
     <div><span className="rh27-eyebrow">{selecionado.tipo==='cargo'?'ANÁLISE POR CARGO':'ANÁLISE POR DEPARTAMENTO'}</span><h2>{selecionado.nome}</h2><small>Considera os filtros e as competências selecionadas no dashboard.</small></div>
     <button type="button" aria-label="Fechar detalhes" onClick={fechar}><X size={19}/></button>
    </div>
    {selecionado.tipo==='departamento'&&<div className="rh27-summary">
     <div><span>Participação nos vínculos-mês</span><strong>{(selecionado.percentual||0).toFixed(1).replace('.',',')}%</strong></div>
     <div><span>Gasto bruto do departamento</span><strong>{money(selecionado.bruto)}</strong></div>
     <div><span>Quantidade de vínculos-mês</span><strong>{num(selecionado.quantidade)}</strong></div>
    </div>}
    {selecionado.outros&&<div className="rh27-records">
     <h3>Departamentos agrupados em “Outros”</h3>
     {selecionado.outros.map((x,i)=><div key={i} className="rh27-person">
      <div><b>{x.nome}</b><small>{num(x.quantidade)} vínculos-mês</small></div>
      <strong>{money(x.bruto)}</strong>
     </div>)}
    </div>}
    {carregando&&<p className="rh27-busy">Consultando valores individuais e remunerações…</p>}
    {erro&&<p className="rh27-error">{erro}</p>}
    {resultado&&<>
     {selecionado.tipo==='cargo'&&<div className="rh27-summary">
      <div><span>Gasto bruto total do cargo</span><strong>{money(resultado.resumo.bruto)}</strong></div>
      <div><span>Remuneração média por vínculo-mês</span><strong>{money(media)}</strong></div>
      <div><span>Vínculos-mês / distintos</span><strong>{num(resultado.resumo.vinculos_mes)} / {num(resultado.resumo.vinculos_distintos)}</strong></div>
     </div>}
     {selecionado.tipo==='cargo'&&<p className="rh27-note">A média inclui todos os pagamentos brutos da competência, não somente o salário-base. Pagamentos extraordinários podem elevar o valor.</p>}
    {carregandoPessoa&&<p className="rh27-busy">Carregando composição da remuneração…</p>}
    {detalhe&&<div className="rh27-pay-detail">
     <div className="rh27-detail-head"><div><span className="rh27-eyebrow">COMPOSIÇÃO DA REMUNERAÇÃO</span><h3>{detalhe.pessoa.nome}</h3>
      <p>{labelMes(detalhe.pessoa.mes)} · matrícula {detalhe.pessoa.matricula} · {detalhe.pessoa.cargo}</p></div>
      <button onClick={()=>setDetalhe(null)} aria-label="Fechar composição"><X size={16}/></button>
     </div>
     <div className="rh27-pay-totals">
      <div><span>Salário-base registrado</span><strong>{money(detalhe.pessoa.salario_base)}</strong></div>
      <div><span>Proventos brutos</span><strong>{money(detalhe.pessoa.bruto)}</strong></div>
      <div><span>Descontos</span><strong>{money(detalhe.pessoa.descontos)}</strong></div>
      <div><span>Líquido</span><strong>{money(detalhe.pessoa.liquido)}</strong></div>
     </div>
     {detalhe.inclusoes.map((inc,index)=>{
      const proventos=inc.rubricas.filter(x=>x.tipo!=='DESCONTO');
      const descontos=inc.rubricas.filter(x=>x.tipo==='DESCONTO');
      return <section key={index} className="rh27-pay-inclusion">
       <h4>Inclusão {inc.tipo_inclusao} · bruto {money(inc.bruto)}</h4>
       <p className="rh27-note">Proventos e adicionais</p>
       {proventos.map((item,i)=><div className="rh27-rubrica" key={i}><span>{item.rubrica} <small>({item.codigo})</small></span><b>{money(item.valor)}</b></div>)}
       {descontos.length>0&&<><p className="rh27-note">Descontos</p>
        {descontos.map((item,i)=><div className="rh27-rubrica rh27-discount" key={i}><span>{item.rubrica} <small>({item.codigo})</small></span><b>− {money(item.valor)}</b></div>)}</>}
      </section>;
     })}
     <p className="rh27-note"><Info size={14}/> As rubricas explicam a <b>composição do valor</b>, não a justificativa legal ou administrativa de cada pagamento. {detalhe.explicacao}</p>
    </div>}

     <div className="rh27-records">
      <h3>{selecionado.tipo==='cargo'?'Servidores e remuneração individual':'Servidores vinculados ao departamento'}</h3>
      <p className="rh27-note">Valores por matrícula e competência, em ordem decrescente de remuneração bruta. Clique na pessoa para ver as rubricas.</p>
      {resultado.pessoas.map(row=><button type="button" className={'rh27-person '+(detalhe?.pessoa.id===row.id?'selected':'')} key={row.id} onClick={()=>void abrirPessoa(row)}>
       <div><b>{row.nome}</b><small>{labelMes(row.mes)} · matrícula {row.matricula}{selecionado.tipo==='departamento'?' · '+row.cargo:''}</small></div>
       <strong>{money(row.bruto)} <ChevronRight size={14}/></strong>
      </button>)}
      {resultado.pessoas.length===0&&<p className="rh27-note">Não há pessoas com os filtros selecionados.</p>}
     </div>
     <div className="rh27-pages">
      <button disabled={pagina===1||carregando} onClick={()=>navegar(pagina-1)}><ArrowLeft size={14}/>Anterior</button>
      <small>Página {pagina}</small>
      <button disabled={carregando||resultado.pessoas.length<25} onClick={()=>navegar(pagina+1)}>Próxima<ArrowRight size={14}/></button>
     </div>
    </>}
   </div>
  </div>}
 </>;
}
