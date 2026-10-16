'use client';
import {useEffect,useMemo,useState} from 'react';
import {AlertCircle,CheckCircle2,ChevronDown,ChevronUp,ExternalLink,Info,Scale,Search,ShieldAlert,Users,Wallet} from 'lucide-react';
import {api,brl,num} from '../lib/api';
import {unidadesEscolares} from '../lib/educacao-dados';

type Rubrica={codigo:string;nome:string;categoria:string;valor:number};
type Ocorrencia={id:string;nome:string;matricula:string;cargo:string;departamento:string;rubricas:Rubrica[];detalhes?:string;bruto:number;diferenca_bruto:number;diferenca_descontos:number;diferenca_liquido:number};
type Revisao={id:string;nome:string;matricula:string;cargo:string;departamento:string;base_atual:number;base_anterior:number;diferenca:number;rubricas:Rubrica[];explicacao:string};
type Parcela={categoria:string;atual:number;anterior:number;variacao:number};
type Duplicidade={id:string;tipo:string;nivel:string;nome:string;matricula:string;cargo:string;departamento:string;tipo_inclusao:string;quantidade:number;ids_lancamentos:number[];valor_unitario:number|null;valor_em_revisao:number|null;criterio:string;observacao:string;rubricas:Rubrica[]};
type Auditoria={mes:string;mes_anterior:string|null;fonte:string;cobertura:{linhas:number;vinculos:number};financeiro:{bruto:number;bruto_anterior:number|null;variacao:number|null;rubricas:Parcela[]};contagens:{inconsistencias_aritmeticas:number;variacoes_explicadas:number;revisoes_base:number;verificacoes_legais_automaticas:number;duplicidades_potenciais:number};inconsistencias:Ocorrencia[];revisoes:Revisao[];duplicidades:Duplicidade[];nota:string;politica:string};
type Cargo={cargo:string;jornada:string;vinculos_folha:number;vinculos_sem_desligamento_identificado:number;vinculos_temporarios_identificados:number;vagas_legais:number|null;excedentes:number|null;situacao:string;norma_quadro:string|null};
type Quadro={mes:string;cargos:Cargo[];grupos:number;referencias_identificadas?:number;excessos_confirmados:number|null;fonte_folha:string;fontes_referencia:{nome:string;url:string;tipo:string}[];nota:string};
type Fiscal={percentual_dtp_executivo:number|null;situacao:string;quadrimestre:number;exercicio:number;documentacao:string;fonte:string;erro?:string|null};
type Tipo='base'|'cargos'|'valor'|'duplicidade';
const cards:[Tipo,string,string,'warning'|'neutral'|'critical'][]=[
 ['base','Mudança de vencimento-base','Alterações expressivas entre competências','warning'],
 ['cargos','Quantidade de servidores por cargo','Vínculos na folha × cargos autorizados por lei','neutral'],
 ['valor','Divergência de valor','Rubricas conciliadas; pisos e tabelas a validar','critical'],
 ['duplicidade','Pagamentos possivelmente duplicados','Inclusões repetidas para a mesma matrícula e mês','warning']
];
function rubricasDetalhe(items:Rubrica[]){
 return <div className="rh-a-rubricas"><div className="rh-a-rub-title">Rubricas do pagamento</div>
 {items.map((x,i)=><div key={x.codigo+'-'+i}><span>{x.nome}<small>Código {x.codigo} · {x.categoria}</small></span><strong>{brl(x.valor)}</strong></div>)}</div>;
}
// Referências de dimensionamento POR ESCOLA do Anexo V da Lei municipal
// nº 1.368/1999, na redação da Lei nº 3.003/2023. Não são vagas
// autorizadas no quadro geral. Para usar é preciso cruzar turmas de cada unidade.
const referencialEscolar=(cargo:string):'auxiliar'|'infantil'|'professor'|'administrativo'|null=>{
 const n=cargo.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
 if(n.includes('AUXILIAR DE SERVICO ESCOLAR'))return 'auxiliar';
 if(n.includes('AUXILIAR DE EDUCACAO INFANTIL'))return 'infantil';
 if(/^PROFESSOR (I|II|III)$/.test(n.trim()))return 'professor';
 if(n.includes('ASSISTENTE ADM ESCOLAR')||n.includes('ASSISTENTE ADMINISTRATIVO ESCOLAR'))return 'administrativo';
 return null;
};
const turmasFaixas=['Até 6','7–10','11–14','15–19','20–25','26–30','A partir de 30*'];
const normasPorTurmas=[
 {cargo:'Auxiliar de Serviço Escolar',quantidades:[4,5,6,8,14,14,16]},
 {cargo:'Assistente Administrativo Escolar',quantidades:[1,1,2,4,6,6,6]},
 {cargo:'Professor eventual',quantidades:[1,1,2,2,2,2,2]}
];

/*
 * Simulação escolar a partir das turmas de 2025 nas 18 unidades cadastrais.
 * Não representa vagas criadas por lei nem permite inferir excedentes de 2026.
 * A faixa de 30 turmas é ambígua no texto disponível: não calcular nesse caso.
 */
const indiceFaixa=(turmas:number|null):number|null=>{
 if(turmas==null||turmas<=0)return null;
 if(turmas<=6)return 0;
 if(turmas<=10)return 1;
 if(turmas<=14)return 2;
 if(turmas<=19)return 3;
 if(turmas<=25)return 4;
 if(turmas<=29)return 5;
 if(turmas===30)return null;
 return 6;
};
const unidadesComFaixas=unidadesEscolares.map(e=>({
 ...e,indice:indiceFaixa(e.turmas),auxiliar:e.turmas===null?null:indiceFaixa(e.turmas)===null?null:normasPorTurmas[0].quantidades[indiceFaixa(e.turmas)!],
 administrativo:e.turmas===null?null:indiceFaixa(e.turmas)===null?null:normasPorTurmas[1].quantidades[indiceFaixa(e.turmas)!]
}));
const referenciaCompleta=unidadesComFaixas.length>0&&unidadesComFaixas.every(e=>e.indice!=null);
const totalAuxiliar=referenciaCompleta?unidadesComFaixas.reduce((acc,e)=>acc+(e.auxiliar||0),0):null;
const totalAdministrativo=referenciaCompleta?unidadesComFaixas.reduce((acc,e)=>acc+(e.administrativo||0),0):null;
const totalTurmas=unidadesEscolares.reduce((acc,e)=>acc+(e.turmas||0),0);
const parametroEscolar=(cargo:string):{valor:number|null;descricao:string}|null=>{
 const tipo=referencialEscolar(cargo);
 if(tipo==='auxiliar')return {valor:totalAuxiliar,descricao:'Parâmetro indicativo em 18 escolas, turmas do Censo 2025; não equivale a vagas legais'};
 if(tipo==='administrativo')return {valor:totalAdministrativo,descricao:'Parâmetro indicativo em 18 escolas, turmas do Censo 2025; não equivale a vagas legais'};
 if(tipo==='professor')return {valor:null,descricao:'Referência de '+totalTurmas+' turmas, mas sem distribuição por etapa, horas-aula e jornada; não é possível derivar vagas de professor'};
 if(tipo==='infantil')return {valor:null,descricao:'Exige turmas infantis, turno e jornada separados por escola'};
 return null;
};

const pct=(v:number|null|undefined)=>v==null?'—':v.toFixed(2).replace('.',',')+'%';
export default function RHAuditoria({mes}:{mes:string}){
 const [d,setD]=useState<Auditoria|null>(null),[f,setF]=useState<Fiscal|null>(null);
 const [quadro,setQuadro]=useState<Quadro|null>(null),[quadroErro,setQuadroErro]=useState('');
 const [loading,setLoading]=useState(true),[erro,setErro]=useState(''),[visivel,setVisivel]=useState<Tipo|null>(null);
 const [linha,setLinha]=useState(''),[filtroCargo,setFiltroCargo]=useState('');
 const mesNum=Number(mes.slice(-2)),periodo=Math.ceil(mesNum/4);
 useEffect(()=>{
  let alive=true;setLoading(true);setErro('');setQuadroErro('');
  setD(null);setQuadro(null);setVisivel(null);setLinha('');setFiltroCargo('');
  // A mesma API Next.js do painel RH busca o Neon: sem cold start do backend Render.
  api<{auditoria:Auditoria;quadro:Quadro}>('/api/rh/auditoria?mes='+mes).then(r=>{
   if(!alive)return;
   if(r.data){setD(r.data.auditoria);setQuadro(r.data.quadro);}
   else{setErro(r.error||'Não foi possível consultar as rubricas da folha.');setQuadroErro('Os dados de cargos não foram carregados.');}
  }).finally(()=>{if(alive)setLoading(false)});
  return()=>{alive=false};
 },[mes]);
 useEffect(()=>{let alive=true;setF(null);
  api<Fiscal>('/api/v1/rh/inteligencia/fiscal?ano=2026&periodo='+periodo).then(r=>{if(alive)setF(r.data)});
  return()=>{alive=false};
 },[periodo]);
 const cargosVisiveis=useMemo(()=>quadro?.cargos.filter(c=>
  (c.cargo+' '+c.jornada).toLocaleLowerCase('pt-BR').includes(filtroCargo.trim().toLocaleLowerCase('pt-BR')))||[],[quadro,filtroCargo]);
 const nBase=d?.contagens.revisoes_base;
 const nValor=d?.contagens.inconsistencias_aritmeticas;
 const nDup=d?.contagens.duplicidades_potenciais;
 const totalEventos=d?.financeiro.rubricas.filter(r=>r.categoria!=='Demais rubricas').reduce((s,r)=>s+r.atual,0)||0;
 return <div className="rh-a-stack">
 <section className="rh-a-panel">
  <div className="rh-a-head">
   <div><div className="rh-a-eyebrow"><ShieldAlert size={15}/> ALERTAS DE INCONSISTÊNCIA</div>
   <h2>Situações para a Prefeitura investigar</h2>
   </div>
   <div className="rh-a-count"><span>CONFERÊNCIAS DE VENCIMENTO-BASE</span><strong>{loading?'…':num(nBase)}</strong></div>
  </div>
  {erro&&<div className="rh-a-error"><AlertCircle size={15}/>{erro}</div>}
  <div className="rh-a-cards">{cards.map(([kind,titulo,descricao,tone])=><article className={'rh-a-card '+tone+(visivel===kind?' active':'')} key={kind}>
   <button type="button" aria-expanded={visivel===kind} onClick={()=>{setVisivel(v=>v===kind?null:kind);setLinha('')}}>
    <div className="rh-a-card-row"><span>{kind==='base'?<Scale size={16}/>:kind==='cargos'?<Users size={16}/>:kind==='duplicidade'?<Wallet size={16}/>:<AlertCircle size={16}/>}</span>
     <b>{loading?'…':num(kind==='base'?nBase:kind==='cargos'?quadro?.grupos:kind==='duplicidade'?nDup:nValor)}</b></div>
    <h3>{titulo}</h3><p>{descricao}</p>
    <small>{kind==='cargos'?'▸ Consultar vínculos e legislação':kind==='valor'&&nValor===0?'✓ Soma da folha conciliada':kind==='duplicidade'&&nDup===0?'✓ Sem repetição detectada':'▸ Ver registros'}</small>
   </button></article>)}</div>
  {visivel&&<div className="rh-a-expanded">
   <div className="rh-a-expanded-head"><h3>{cards.find(x=>x[0]===visivel)?.[1]}</h3>
     <button type="button" aria-label="Recolher" onClick={()=>setVisivel(null)}><ChevronUp size={16}/></button></div>
   {visivel==='base'&&<>
    <p className="rh-a-note">Foram identificadas alterações de pelo menos 15% e R$ 300 no vencimento-base do mesmo vínculo, cargo e jornada. Uma progressão, reajuste ou enquadramento pode explicar a alteração. A legalidade depende da norma e do ato funcional vigentes.</p>
    {d?.revisoes.map(x=><div className="rh-a-person" key={x.id}>
      <button type="button" onClick={()=>setLinha(v=>v===x.id?'':x.id)}><span><strong>{x.nome}</strong><small>{x.cargo} · matrícula {x.matricula} · {x.departamento}</small></span>
      <span className="rh-a-value">{brl(x.base_atual)}</span>{linha===x.id?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>
      {linha===x.id&&<div className="rh-a-person-detail"><p>Base anterior: <b>{brl(x.base_anterior)}</b> → atual: <b>{brl(x.base_atual)}</b>. Diferença: <b>{brl(x.diferenca)}</b>.</p>
        <p>{x.explicacao}</p>{rubricasDetalhe(x.rubricas)}</div>}
    </div>)}
    {d?.contagens.revisoes_base===0&&<p className="rh-a-ok"><CheckCircle2 size={16}/> Nenhuma alteração que atenda aos critérios nesta comparação.</p>}
    {Number(nBase||0)>30&&<p className="rh-a-note">Mostrando os 30 primeiros registros do total de {num(nBase)}.</p>}
   </>}
   {visivel==='cargos'&&<>
    <p className="rh-a-note"><b>Os vínculos observados são reais.</b> O quadro agora relaciona a Lei 3.066/2023 e alterações de 2025, o Estatuto do Magistério e a regra de extinção de vagas de Motorista. Há {num(quadro?.referencias_identificadas)} combinações com referência normativa identificada. Para algumas funções é possível calcular um <b>parâmetro por escola (2025)</b>, mas ele não é o limite de cargos autorizados nem comprova excesso em 2026. Um concurso com 45 vagas não significa um limite legal de 45 servidores para o cargo.</p>
    {quadroErro&&<p className="rh-a-error"><AlertCircle size={14}/>{quadroErro}</p>}
    <div className="rh-a-cargo-tools"><label><Search size={15}/><input type="search" aria-label="Pesquisar cargo e jornada" value={filtroCargo} onChange={e=>setFiltroCargo(e.target.value)} placeholder="Pesquisar cargo ou jornada..."/></label>
     <small>{num(quadro?.grupos)} combinações de cargo e jornada na folha</small></div>
    <div className="rh-a-cargo-wrap"><table className="rh-a-cargo-table">
      <thead><tr><th>Cargo / jornada</th><th>Vínculos na folha</th><th>Parâmetro escolar (2025)</th><th>Vagas legais</th><th>Excedentes</th></tr></thead>
      <tbody>{cargosVisiveis.slice(0,50).map((c,i)=>{
        const referencia=parametroEscolar(c.cargo);
        return <tr key={c.cargo+'-'+c.jornada+'-'+i}>
         <td><strong>{c.cargo}</strong><small>{c.jornada||'Jornada não informada'}</small></td>
         <td>{num(c.vinculos_folha)}</td>
         <td>{referencia?.valor!=null?<span className="rh-a-school-estimate" title={referencia.descricao}>{num(referencia.valor)} <small>indicativo*</small></span>:
           referencia?<span className="rh-a-legal-school" title={referencia.descricao}>Regra depende da lotação</span>:<span className="rh-a-muted">—</span>}</td>
         <td>{c.vagas_legais!=null?num(c.vagas_legais):c.situacao==='cargo_em_extincao'?<span className="rh-a-no-reference" title={c.norma_quadro||''}>Extinção parcial</span>:<span className="rh-a-no-reference">A validar</span>}</td>
         <td>{c.excedentes!=null?num(c.excedentes):<span className="rh-a-muted">—</span>}</td>
        </tr>;
       })}</tbody>
    </table></div>
    {!cargosVisiveis.length&&<p className="rh-a-note">Nenhum cargo corresponde à pesquisa.</p>}
    {cargosVisiveis.length>50&&<p className="rh-a-note">Exibindo as primeiras 50 combinações. Pesquise o nome do cargo para refinar.</p>}
    <div className="rh-a-school-law">
      <div className="rh-a-school-law-head">
       <div><strong>Parâmetros de dimensionamento — Educação</strong>
       <p>Anexo V do Estatuto do Magistério de Viçosa: parâmetros de composição do pessoal <b>por unidade escolar</b>, conforme turmas e alunos. Não são limites globais da prefeitura.</p></div>
       <span>Lei 1.368/1999 · alterações da Lei 3.003/2023</span>
      </div>
      <p className="rh-a-note"><b>Simulação por unidade escolar:</b> {num(unidadesEscolares.length)} escolas cadastradas e {num(totalTurmas)} turmas no Censo 2025. Aplicando as faixas mostradas abaixo para cada unidade, obtemos <b>{num(totalAuxiliar)} para Auxiliar de Serviço Escolar</b> e <b>{num(totalAdministrativo)} para Assistente Administrativo Escolar</b>. São parâmetros teóricos, NÃO vagas autorizadas ou funcionários necessários em 2026. A Câmara mencionou 19 unidades, enquanto esta base reúne 18; falta conferir a cobertura e o regime de atendimento.</p>
      <details className="rh-a-school-breakdown"><summary>Ver cálculo de referência por escola (18 unidades · 2025)</summary>
       <div className="rh-a-cargo-wrap"><table className="rh-a-school-table">
        <thead><tr><th>Escola</th><th>Turmas</th><th>Auxiliar de Serviço Escolar*</th><th>Assistente Administrativo Escolar*</th></tr></thead>
        <tbody>{unidadesComFaixas.map(e=><tr key={e.codigo_inep}><td>{e.nome}</td><td>{num(e.turmas)}</td><td>{num(e.auxiliar)}</td><td>{num(e.administrativo)}</td></tr>)}</tbody>
       </table></div>
      </details>
      <div className="rh-a-cargo-wrap"><table className="rh-a-school-table">
       <thead><tr><th>Função / turmas na unidade</th>{turmasFaixas.map(x=><th key={x}>{x}</th>)}</tr></thead>
       <tbody>{normasPorTurmas.map(x=><tr key={x.cargo}><td><strong>{x.cargo}</strong></td>{x.quantidades.map((n,i)=><td key={i}>{n}</td>)}</tr>)}</tbody>
      </table></div>
      <p className="rh-a-note">* O texto publicado usa as faixas '26 a 30' e 'a partir de 30', que se sobrepõem em 30 turmas; nesse caso, a interpretação exata deve ser confirmada com o órgão competente. Há regras específicas para tempo integral e autorização pela Secretaria de Educação. Para professor PEB I e II, a referência legal é de 1 por turma; o PEB III depende do total de horas-aula. Para auxiliar de educação infantil, a norma prevê critério por turma e jornada. Nenhum desses parâmetros comprova excesso municipal: ainda faltam lotação efetiva por unidade, jornadas, atos legais de 2026 e eventual escola não listada.</p>
      <div className="rh-a-doclinks">
       <a href="https://leismunicipais.com.br/estatuto-do-magisterio-vicosa-mg" rel="noopener noreferrer" target="_blank">Consultar texto consolidado do Estatuto <ExternalLink size={12}/></a>
       <a href="https://www.vicosa.mg.leg.br/comunicacao/noticias/2023/06-2023/vereador-celebra-conquista-da-educacao-e-aprova-mocao-dos-60-anos-da-aspuv" rel="noopener noreferrer" target="_blank">Câmara de Viçosa — Lei 3.003/2023 <ExternalLink size={12}/></a>
       <a href="https://www.ibge.gov.br/estatisticas/sociais/habitacao/10586-pesquisa-de-informacoes-basicas-municipais.html" rel="noopener noreferrer" target="_blank">IBGE MUNIC — comparação entre municípios <ExternalLink size={12}/></a>
      </div>
      <p className="rh-a-note"><b>Comparação regional:</b> o IBGE MUNIC informa o total de trabalhadores nas prefeituras por vínculo, mas não define quantidade permitida para cada cargo. Uma média por habitante deve ser apresentada como indicador comparativo, sem ser usada para acusar excesso de servidores.</p>
    </div>
    <div className="rh-a-doclinks">{quadro?.fontes_referencia.map(x=><a key={x.url} href={x.url} rel="noopener noreferrer" target="_blank">{x.nome}<ExternalLink size={12}/></a>)}</div>
    <p className="rh-a-note"><b>Lei localizada não é limite confirmado.</b> No caso de Motorista, a Lei 3.147/2025 extinguiu vagas que estavam desocupadas em maio/2025; não é correto usar o número da lei anterior como teto atual. A contagem de {num(quadro?.grupos)} é de combinações de cargo e jornada, não de cargos criados por lei.</p>
    <p className="rh-a-note">O campo excedentes fica em branco enquanto não houver comparação documental validada. Mesmo quando há parâmetro calculável por turmas, a contagem global da folha não revela a distribuição dos profissionais por escola. Pagamentos após desligamento e vínculos temporários precisam ser distinguidos de cargos efetivos ocupados.</p>
   </>}
   {visivel==='duplicidade'&&<>
    <p className="rh-a-note"><b>Triagem de duplicidades na competência {mes.slice(-2)}/2026:</b> compara a mesma matrícula, cargo, jornada e tipo de inclusão. Verifica lançamentos integralmente iguais (inclusive rubricas) e inclusões regulares múltiplas sem verbas eventuais identificadas. <b>Não é prova de dois depósitos ou fraude.</b></p>
    {nDup===0&&<p className="rh-a-ok"><CheckCircle2 size={16}/> Nenhuma repetição detectada pelos critérios documentais nesta competência.</p>}
    {d?.duplicidades?.map(x=><div className="rh-a-person" key={x.id}>
     <button type="button" onClick={()=>setLinha(v=>v===x.id?'':x.id)}>
      <span><strong>{x.nome}</strong><small>{x.cargo} · matrícula {x.matricula} · {x.departamento}</small></span>
      <span className="rh-a-value">{x.valor_em_revisao==null?x.quantidade+' inclusões':brl(x.valor_em_revisao)}</span>
      {linha===x.id?<ChevronUp size={15}/>:<ChevronDown size={15}/>}
     </button>
     {linha===x.id&&<div className="rh-a-person-detail">
      <p><b>{x.tipo==='repeticao_identica'?'Lançamentos idênticos':'Inclusões regulares múltiplas'}</b> · {x.quantidade} ocorrências · tipo de inclusão {x.tipo_inclusao} · IDs {x.ids_lancamentos.join(', ')}.</p>
      <p>{x.criterio}</p><p>{x.observacao}</p>
      {x.valor_unitario!=null&&<p>Valor bruto de cada lançamento repetido: <b>{brl(x.valor_unitario)}</b>. Valor adicional em revisão (não confirmado como pagamento indevido): <b>{brl(x.valor_em_revisao)}</b>.</p>}
      {x.rubricas.length>0&&rubricasDetalhe(x.rubricas)}
     </div>}
    </div>)}
    {Number(nDup||0)>100&&<p className="rh-a-note">Exibindo as primeiras 100 ocorrências de {num(nDup)}.</p>}
    <p className="rh-a-note">Matrículas diferentes com nomes iguais <b>não</b> são classificadas como pagamentos duplicados: podem representar homônimos ou acumulações permitidas. A confirmação exige o demonstrativo bancário e os atos funcionais.</p>
   </>}
   {visivel==='valor'&&<>
    <p className="rh-a-note"><b>Verificação matemática:</b> o sistema soma proventos e descontos de cada inclusão e confere o total bruto e líquido. Isso não significa que o salário de todos esteja legalmente correto: pisos, progressões e tabelas de vencimentos ainda precisam ser vinculados à legislação.</p>
    {nValor===0&&<p className="rh-a-ok"><CheckCircle2 size={17}/> Nenhuma divergência aritmética encontrada nas rubricas desta competência.</p>}
    {d?.inconsistencias.map(x=><div className="rh-a-person" key={x.id}>
      <button type="button" onClick={()=>setLinha(v=>v===x.id?'':x.id)}><span><strong>{x.nome}</strong><small>{x.cargo} · matrícula {x.matricula} · {x.departamento}</small></span><span className="rh-a-value">{brl(x.bruto)}</span>{linha===x.id?<ChevronUp size={15}/>:<ChevronDown size={15}/>}</button>
      {linha===x.id&&<div className="rh-a-person-detail"><p>Diferença do bruto: <b>{brl(x.diferenca_bruto)}</b>. Descontos: <b>{brl(x.diferenca_descontos)}</b>. Líquido: <b>{brl(x.diferenca_liquido)}</b>.</p><p>{x.detalhes}</p></div>}
    </div>)}
    <div className="rh-a-doclinks">
     <a href="https://planalto.gov.br/ccivil_03/_ato2023-2026/2026/lei/l15437.htm" target="_blank" rel="noopener noreferrer">Piso do magistério 2026 · Lei 15.437<ExternalLink size={12}/></a>
     <a href="https://legis.senado.gov.br/norma/36214460/publicacao/36221438" target="_blank" rel="noopener noreferrer">Piso da enfermagem · Lei 14.434<ExternalLink size={12}/></a>
     <a href="https://www.vicosa.mg.gov.br/abrir_arquivo.aspx?arquivo=%7B22A80EE7-4AC0-AD31-6CBB-2BA3DEE2E82C%7D.pdf&cdLocal=18" target="_blank" rel="noopener noreferrer">Plano de carreira citado no edital municipal<ExternalLink size={12}/></a>
    </div>
    <p className="rh-a-note">Não usamos a remuneração bruta com férias e 13º para avaliar pisos. Para isso será preciso identificar salário-base, complemento de piso, jornada e enquadramento legal.</p>
   </>}
  </div>}
  <div className="rh-a-source"><Info size={15}/> Competência {mes.slice(-2)}/2026 · {num(d?.cobertura.linhas)} inclusões e {num(d?.cobertura.vinculos)} vínculos na folha. <a href={d?.fonte||'https://pmvicosa.cidadesmg.com.br/portaltransparencia/'} target="_blank" rel="noopener noreferrer">Fonte oficial <ExternalLink size={12}/></a></div>
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
   <article><span>Verbas eventuais identificadas</span><strong>{loading||!d?'—':brl(totalEventos)}</strong><small>13º, férias, retroativos e indenizações</small></article>
   <article><span>DTP/RCL no RGF do Executivo</span><strong>{pct(f?.percentual_dtp_executivo)}</strong><small>{f?.percentual_dtp_executivo==null?'Aguardando fonte homologada':'RGF '+periodo+'º quadrimestre de 2026'}</small></article>
  </div>
  {d&&<div className="rh-a-distribution"><div className="rh-a-dist-head"><h3>De onde vem o valor da folha?</h3><p>Clique em uma categoria para abrir nomes e rubricas em outra aba</p></div>
   {d.financeiro.rubricas.map((r,i)=><a className="rh-a-dist rh-a-dist-link" key={r.categoria} href={"/rh/rubricas?mes="+encodeURIComponent(mes)+"&categoria="+encodeURIComponent(r.categoria)} target="_blank" rel="noopener noreferrer" title={"Abrir detalhamento de "+r.categoria+" em outra aba"}>
    <span>{r.categoria}</span><div className="rh-a-track"><div style={{width:(d.financeiro.bruto>0?100*r.atual/d.financeiro.bruto:0)+'%',background:['#e5a13a','#a886d7','#db7480','#729db8','#0b827f'][i]}}/></div>
    <strong>{brl(r.atual)}</strong>{d.mes_anterior&&<small>{r.variacao>=0?'+':''}{brl(r.variacao)} vs. anterior</small>}
   </a>)}
  </div>}
  {d?.mes==='2026-07'&&<p className="rh-a-insight"><CheckCircle2 size={18}/> Em julho, a rubrica <b>adiantamento de 13º</b> representa parte expressiva da diferença frente a junho. A composição da folha explica o crescimento melhor do que uma comparação simples entre totais.</p>}
  <div className="rh-a-fiscal-notice"><Info size={17}/><span>O RGF usa Despesa Total com Pessoal em 12 meses e Receita Corrente Líquida ajustada. Ele não pode ser calculado diretamente somando a remuneração nominal da folha. O percentual oficial fornece contexto, enquanto os gráficos acima explicam os pagamentos efetivos.</span></div>
  {f?.percentual_dtp_executivo!=null&&<div className="rh-a-limit"><div><span>Executivo em relação à RCL ajustada</span><b>{pct(f.percentual_dtp_executivo)}</b></div><div className="rh-a-limit-track"><span style={{width:Math.min(100,f.percentual_dtp_executivo/60*100)+'%'}}/></div><div className="rh-a-limit-markers"><span>0%</span><span>Alerta 48,6%</span><span>Prudencial 51,3%</span><span>Legal 54%</span></div></div>}
  {f?.percentual_dtp_executivo==null&&<p className="rh-a-note">Ainda não foi possível confirmar o percentual do RGF para este quadrimestre. Não utilizamos uma porcentagem estimada.</p>}
  <div className="rh-a-source"><a href="https://apidatalake.tesouro.gov.br/docs/siconfi/" target="_blank" rel="noopener noreferrer">Fonte do RGF/SICONFI <ExternalLink size={12}/></a> · Fonte da folha: documentos oficiais importados para o Viço GOV.</div>
 </section>
 </div>;
}
