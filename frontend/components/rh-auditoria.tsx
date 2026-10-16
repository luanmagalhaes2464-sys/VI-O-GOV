'use client';
import {useEffect,useMemo,useState} from 'react';
import {AlertCircle,CheckCircle2,ChevronDown,ChevronUp,ExternalLink,FileCheck2,Info,ReceiptText,Scale,ShieldAlert,Wallet} from 'lucide-react';
import {api,brl,num} from '../lib/api';

type Rubrica={codigo:string;nome:string;categoria:string;valor:number};
type Ocorrencia={id:string;nome:string;matricula:string;cargo:string;departamento:string;rubricas:Rubrica[];explicacao?:string;titulo?:string;detalhes?:string;bruto:number;rubricas_bruto:number;diferenca_bruto:number;diferenca_descontos:number;diferenca_liquido:number};
type Revisao={id:string;nome:string;matricula:string;cargo:string;departamento:string;base_atual:number;base_anterior:number;diferenca:number;rubricas:Rubrica[];explicacao:string};
type Explicado={id:string;nome:string;matricula:string;cargo:string;departamento:string;bruto_atual:number;bruto_anterior:number;aumento:number;eventuais_variacao:number;residual:number;rubricas:Rubrica[];explicacao:string};
type Parcela={categoria:string;atual:number;anterior:number;variacao:number};
type Auditoria={mes:string;mes_anterior:string|null;fonte:string; cobertura:{linhas:number;vinculos:number};financeiro:{bruto:number;bruto_anterior:number|null;variacao:number|null;rubricas:Parcela[]};contagens:{inconsistencias_aritmeticas:number;variacoes_explicadas:number;revisoes_base:number;verificacoes_legais_automaticas:number};inconsistencias:Ocorrencia[];revisoes:Revisao[];explicados:Explicado[];nota:string;politica:string};
type Fiscal={percentual_dtp_executivo:number|null;situacao:string;quadrimestre:number;exercicio:number;documentacao:string;fonte:string;erro?:string|null};
type Kind='conciliacao'|'base'|'explicados'|'juridico';
const categories:[Kind,string,string,string][]=[
 ['conciliacao','Divergência na soma','Rubricas, descontos e líquido da folha','critical'],
 ['base','Mudança de vencimento-base','Exige tabela legal, progressão ou ato funcional','warning'],
 ['explicados','Aumento explicado','13º, férias, retroativos ou indenizações','success'],
 ['juridico','Validação legal','Depende dos atos e tabelas oficiais','neutral']
];
function rubricasDetalhe(items:Rubrica[]){
 return <div className="rh-a-rubricas"><div className="rh-a-rub-title">Rubricas reais do lançamento</div>{items.map((x,i)=>
   <div key={x.codigo+'-'+i}><span>{x.nome}<small>Código {x.codigo} · {x.categoria}</small></span><strong>{brl(x.valor)}</strong></div>)}</div>
}
const pct=(v:number|null|undefined)=>v==null?'—':v.toFixed(2).replace('.',',')+'%';
export default function RHAuditoria({mes}:{mes:string}){
 const [d,setD]=useState<Auditoria|null>(null),[f,setF]=useState<Fiscal|null>(null);
 const [loading,setLoading]=useState(true),[erro,setErro]=useState(''),[visivel,setVisivel]=useState<Kind|null>(null);
 const [linha,setLinha]=useState('');
 const mesNum=Number(mes.slice(-2));
 const periodo=Math.ceil(mesNum/4);
 useEffect(()=>{let alive=true;setLoading(true);setErro('');setVisivel(null);setLinha('');
  api<Auditoria>('/api/v1/rh/auditoria/resumo?mes='+mes).then(r=>{if(!alive)return;if(r.data)setD(r.data);else{setD(null);setErro(r.error||'Falha na consulta de rubricas.')}})
  .finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[mes]);
 useEffect(()=>{let alive=true;setF(null);
  api<Fiscal>('/api/v1/rh/inteligencia/fiscal?ano=2026&periodo='+periodo).then(r=>{if(alive)setF(r.data)});
  return()=>{alive=false};
 },[periodo]);
 const grupos=useMemo(()=>({
  conciliacao:d?.inconsistencias||[],
  base:d?.revisoes||[],
  explicados:d?.explicados||[]
 }),[d]);
 const n=(kind:Kind)=>kind==='conciliacao'?d?.contagens.inconsistencias_aritmeticas:kind==='base'?d?.contagens.revisoes_base:kind==='explicados'?d?.contagens.variacoes_explicadas:null;
 const totalEventos=d?.financeiro.rubricas.filter(r=>r.categoria!=='Demais rubricas').reduce((s,r)=>s+r.atual,0)||0;
 return <div className="rh-a-stack">
 <section className="rh-a-panel">
  <div className="rh-a-head">
   <div><div className="rh-a-eyebrow"><ShieldAlert size={15}/> ALERTAS DE INCONSISTÊNCIA</div>
   <h2>Situações para a Prefeitura investigar</h2>
   <p>Conferência com os lançamentos reais, incluindo 13º, férias, rescisões e adicionais. Aumento de remuneração, isoladamente, não é erro.</p></div>
   <div className="rh-a-count"><span>DIVERGÊNCIAS ARITMÉTICAS</span><strong>{loading?'…':num(n('conciliacao'))}</strong></div>
  </div>
  {erro&&<div className="rh-a-error"><AlertCircle size={15}/>{erro}</div>}
  <div className="rh-a-cards">{categories.map(([kind,title,desc,tone])=><article key={kind} className={'rh-a-card '+tone+(visivel===kind?' active':'')}>
    <button type="button" aria-expanded={visivel===kind} onClick={()=>{setVisivel(v=>v===kind?null:kind);setLinha('')}}>
     <div className="rh-a-card-row"><span>{kind==='conciliacao'?<AlertCircle size={16}/>:kind==='base'?<Scale size={16}/>:kind==='explicados'?<CheckCircle2 size={16}/>:<FileCheck2 size={16}/>}</span><b>{kind==='juridico'?'Pendente':loading?'…':num(n(kind))}</b></div>
     <h3>{title}</h3><p>{desc}</p>
     <small>{kind==='conciliacao'&&n(kind)===0?'✓ Valores conciliados':kind==='juridico'?'► Entenda o que falta':<>▸ Ver {kind==='explicados'?'pagamentos':'detalhes'}</>}</small>
    </button>
   </article>)}</div>
  {visivel&&<div className="rh-a-expanded">
    <div className="rh-a-expanded-head"><h3>{categories.find(x=>x[0]===visivel)?.[1]}</h3><button type="button" onClick={()=>setVisivel(null)} aria-label="Recolher"><ChevronUp size={16}/></button></div>
    {visivel==='juridico'?<p className="rh-a-note">O banco possui rubricas, cargos, jornadas e salários-base, mas ainda precisamos vincular as tabelas de vencimentos e atos funcionais vigentes (progressões, enquadramento, quinquênios e autorizações). Sem esses documentos, o sistema não afirma que alguém recebe acima ou abaixo do devido.</p>:null}
    {visivel==='conciliacao'&&n('conciliacao')===0?<p className="rh-a-ok"><CheckCircle2 size={17}/> Nenhuma divergência aritmética identificada: total bruto, soma dos proventos, descontos e líquido conciliam nas linhas verificadas.</p>:null}
    {visivel==='explicados'&&<p className="rh-a-note">Estes pagamentos <b>não entram como inconsistências</b>. O sistema reconstruiu o aumento com rubricas eventuais e separou o que ainda depende de comprovação funcional.</p>}
    {visivel==='base'&&<p className="rh-a-note">Mudanças superiores a 15% e R$ 300 no vencimento-base para o mesmo cargo e jornada. Necessitam consulta à legislação e aos atos de progressão; não são prova de pagamento errado.</p>}
    {visivel!=='juridico'&&(grupos[visivel]||[]).slice(0,30).map(x=><div className="rh-a-person" key={x.id}>
      <button type="button" onClick={()=>setLinha(p=>p===x.id?'':x.id)}><span><strong>{x.nome}</strong><small>{x.cargo} · matrícula {x.matricula} · {x.departamento}</small></span>
      <span className="rh-a-value">{visivel==='base'?brl((x as Revisao).base_atual):visivel==='explicados'?brl((x as Explicado).bruto_atual):brl((x as Ocorrencia).bruto)}</span>
      {linha===x.id?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>
      {linha===x.id&&<div className="rh-a-person-detail">
       {visivel==='base'&&<p>Base anterior: <b>{brl((x as Revisao).base_anterior)}</b> → base atual: <b>{brl((x as Revisao).base_atual)}</b>. Diferença: <b>{brl((x as Revisao).diferenca)}</b>.</p>}
       {visivel==='explicados'&&<p>Bruto anterior: <b>{brl((x as Explicado).bruto_anterior)}</b> → bruto atual: <b>{brl((x as Explicado).bruto_atual)}</b>. Aumento: <b>{brl((x as Explicado).aumento)}</b>. Variação das verbas eventuais: <b>{brl((x as Explicado).eventuais_variacao)}</b>. Diferença restante: <b>{brl((x as Explicado).residual)}</b>.</p>}
       {visivel==='conciliacao'&&<p>Diferença bruto: <b>{brl((x as Ocorrencia).diferenca_bruto)}</b>; descontos: <b>{brl((x as Ocorrencia).diferenca_descontos)}</b>; líquido: <b>{brl((x as Ocorrencia).diferenca_liquido)}</b>.</p>}
       <p>{(x as Revisao|Explicado).explicacao||(x as Ocorrencia).detalhes}</p>
       {x.rubricas?.length>0&&rubricasDetalhe(x.rubricas)}
      </div>}
    </div>)}
    {visivel!=='juridico'&&n(visivel)>30&&<p className="rh-a-note">Exibindo os 30 primeiros registros. Total identificado: {num(n(visivel))}.</p>}
  </div>}
  <div className="rh-a-source"><Info size={15}/> Análise da competência {mes.slice(-2)}/2026, com {num(d?.cobertura.linhas)} inclusões de pagamento e {num(d?.cobertura.vinculos)} vínculos/competência. <a href={d?.fonte||'https://pmvicosa.cidadesmg.com.br/portaltransparencia/'} target="_blank" rel="noopener noreferrer">Fonte oficial <ExternalLink size={12}/></a></div>
 </section>
 <section className="rh-a-panel rh-a-fiscal">
  <div className="rh-a-head">
   <div><div className="rh-a-eyebrow"><Wallet size={15}/> INTELIGÊNCIA FISCAL LIGADA À FOLHA</div>
   <h2>O que explica o gasto com pessoal neste mês?</h2>
   <p>Composição do pagamento importado, evolução mensal e contexto do limite fiscal do Executivo.</p></div>
  </div>
  <div className="rh-a-fiscal-top">
   <article><span>Folha bruta de {mes.slice(-2)}/2026</span><strong>{brl(d?.financeiro.bruto)}</strong><small>Valores registrados no banco do RH</small></article>
   <article><span>Variação ante o mês anterior</span><strong>{d?.financeiro.variacao==null?'—':brl(d.financeiro.variacao)}</strong><small>Inclui parcelas eventuais, não equivale à DTP fiscal</small></article>
   <article><span>Verbas eventuais identificadas</span><strong>{loading?'…':brl(totalEventos)}</strong><small>13º, férias, retroativos e indenizações</small></article>
   <article><span>DTP/RCL no RGF do Executivo</span><strong>{pct(f?.percentual_dtp_executivo)}</strong><small>{f?.percentual_dtp_executivo==null?'Aguardando fonte homologada':'2º quadrimestre'===periodo+'º quadrimestre'?'RGF 2º quadrimestre de 2026':'RGF '+periodo+'º quadrimestre de 2026'}</small></article>
  </div>
  {d&&<div className="rh-a-distribution"><div className="rh-a-dist-head"><h3>De onde vem o valor da folha?</h3><p>Classificação real dos proventos por rubrica, sem estimar despesa fiscal</p></div>
   {d.financeiro.rubricas.map((r,i)=><div className="rh-a-dist" key={r.categoria}>
    <span>{r.categoria}</span><div className="rh-a-track"><div style={{width:(d.financeiro.bruto>0?100*r.atual/d.financeiro.bruto:0)+'%',background:['#e5a13a','#a886d7','#db7480','#729db8','#0b827f'][i]}}/></div>
    <strong>{brl(r.atual)}</strong>{d.mes_anterior&&<small>{r.variacao>=0?'+':''}{brl(r.variacao)} vs. anterior</small>}
   </div>)}
  </div>}
  {d?.mes==='2026-07'&&<p className="rh-a-insight"><CheckCircle2 size={18}/> Em julho, a rubrica <b>adiantamento de 13º</b> representa parte expressiva da diferença frente a junho. A composição da folha explica o crescimento melhor do que uma comparação simples entre totais.</p>}
  <div className="rh-a-fiscal-notice"><Info size={17}/><span>O RGF usa Despesa Total com Pessoal em 12 meses e Receita Corrente Líquida ajustada. Ele não pode ser calculado diretamente somando a remuneração nominal da folha. O percentual oficial fornece contexto, enquanto os gráficos acima explicam os pagamentos efetivos.</span></div>
  {f?.percentual_dtp_executivo!=null&&<div className="rh-a-limit"><div><span>Executivo em relação à RCL ajustada</span><b>{pct(f.percentual_dtp_executivo)}</b></div><div className="rh-a-limit-track"><span style={{width:Math.min(100,f.percentual_dtp_executivo/60*100)+'%'}}/></div><div className="rh-a-limit-markers"><span>0%</span><span>Alerta 48,6%</span><span>Prudencial 51,3%</span><span>Legal 54%</span></div></div>}
  {f?.percentual_dtp_executivo==null&&<p className="rh-a-note">Ainda não foi possível confirmar o percentual do RGF para este quadrimestre. Não utilizamos uma porcentagem estimada.</p>}
  <div className="rh-a-source"><a href="https://apidatalake.tesouro.gov.br/docs/siconfi/" target="_blank" rel="noopener noreferrer">Fonte do RGF/SICONFI <ExternalLink size={12}/></a> · Fonte da folha: documentos oficiais importados para o Viço GOV.</div>
 </section>
 </div>;
}
