'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Filter,RotateCcw,ExternalLink,FileSpreadsheet,Users,Wallet,Info} from 'lucide-react';
import {api,brl,num} from '../../lib/api';
type Linha={nome:string,quantidade:number,bruto:number,liquido:number};
type Faixa={codigo:string,nome:string,quantidade:number};
type Analise={status:string,referencia:string|null,quantidade:number|null,total_bruto:number|null,total_liquido:number|null,faixas:Faixa[],por_secretaria:Linha[],por_cargo:Linha[],por_vinculo:Linha[],opcoes:{secretarias:string[],cargos:string[],vinculos:string[]},nota:string};
const FONTE='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml';
const BANDAS=[{codigo:'',nome:'Todas as faixas'},{codigo:'ate_2',nome:'Até R$ 2 mil'},{codigo:'2_4',nome:'R$ 2 a 4 mil'},{codigo:'4_6',nome:'R$ 4 a 6 mil'},{codigo:'6_8',nome:'R$ 6 a 8 mil'},{codigo:'8_10',nome:'R$ 8 a 10 mil'},{codigo:'10_12',nome:'R$ 10 a 12 mil'},{codigo:'acima_12',nome:'Acima de R$ 12 mil'}];
const initial={secretaria:'',cargo:'',vinculo:'',situacao:'',faixa:'',tipo_salario:'bruto'};
export default function RH(){
 const [f,setF]=useState(initial),[dados,setDados]=useState<Analise|null>(null),[loading,setLoading]=useState(true),[erro,setErro]=useState('');
 useEffect(()=>{let active=true;setLoading(true);
  const search=new URLSearchParams(f).toString();
  api<Analise>('/api/v1/rh/analise?'+search).then(r=>{if(active){setDados(r.data);setErro(r.error||'');setLoading(false)}});
  return()=>{active=false};
 },[f]);
 function change(key:keyof typeof initial,val:string){setF(prev=>({...prev,[key]:val}))}
 const pronto=dados?.status==='integrado';
 const max=Math.max(1,...(dados?.faixas||[]).map(x=>x.quantidade));
 return <div className="rh-page">
   <div className="rh-kicker">VIÇO GOV / RECURSOS HUMANOS</div>
   <div className="rh-page-title"><div><h1>Análise do quadro de pessoal</h1><p>Vínculos, funções, remuneração e distribuição por departamento, a partir da folha oficial.</p></div><a href={FONTE} target="_blank" rel="noopener noreferrer">Fonte oficial <ExternalLink size={15}/></a></div>
   <div className="rh-info-banner"><Info size={17}/><div><b>Referência da análise: {dados?.referencia||'a confirmar'}</b><span>Utilizamos matrícula/vínculo como unidade de contagem; não necessariamente pessoas distintas. Aposentados só aparecem quando explicitamente classificados na fonte. Os filtros serão calculados somente sobre exportação completa.</span></div></div>
   <section className="rh-filter-panel">
     <div className="rh-filter-head"><div><Filter size={16}/><strong>Filtros da folha</strong></div><button onClick={()=>setF({...initial})}><RotateCcw size={14}/> Limpar filtros</button></div>
     <div className="rh-filter-grid">
       <label>Secretaria / departamento<select value={f.secretaria} onChange={e=>change('secretaria',e.target.value)}><option value="">Todas</option>{dados?.opcoes.secretarias.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Cargo / função<select value={f.cargo} onChange={e=>change('cargo',e.target.value)}><option value="">Todos</option>{dados?.opcoes.cargos.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Vínculo declarado<select value={f.vinculo} onChange={e=>change('vinculo',e.target.value)}><option value="">Todos</option>{dados?.opcoes.vinculos.map(x=><option key={x} value={x}>{x}</option>)}</select></label>
       <label>Situação / categoria<select value={f.situacao} onChange={e=>change('situacao',e.target.value)}><option value="">Todos</option><option value="efetivo">Efetivos</option><option value="comissionado">Comissionados</option><option value="aposentado">Aposentados identificados</option><option value="outro">Outros vínculos</option></select></label>
       <label>Faixa salarial<select value={f.faixa} onChange={e=>change('faixa',e.target.value)}>{BANDAS.map(x=><option key={x.codigo} value={x.codigo}>{x.nome}</option>)}</select></label>
       <label>Base da faixa<select value={f.tipo_salario} onChange={e=>change('tipo_salario',e.target.value)}><option value="bruto">Salário bruto</option><option value="liquido">Salário líquido</option></select></label>
     </div>
   </section>
   <div className="rh-metrics">
    <article><span><Users size={16}/> Matrículas no filtro</span><strong>{num(dados?.quantidade)}</strong><small>{pronto?'Exportação validada · '+dados?.referencia:'Carga integral pendente'}</small></article>
    <article><span><Wallet size={16}/> Total bruto</span><strong>{brl(dados?.total_bruto)}</strong><small>Somatório na seleção</small></article>
    <article><span><Wallet size={16}/> Total líquido</span><strong>{brl(dados?.total_liquido)}</strong><small>Somatório na seleção</small></article>
   </div>
   {!pronto?<div className="rh-data-wait"><FileSpreadsheet size={32}/><h2>Aguardando a exportação completa do portal</h2><p>Não vou exibir dez pessoas do portal como se fossem o quadro inteiro. Os filtros já estão preparados, mas os quantitativos e os gráficos só estarão disponíveis após a importação oficial.</p><a href={FONTE} target="_blank" rel="noopener noreferrer">Acessar folha de pagamento no Portal da Transparência <ExternalLink size={14}/></a>{erro&&<small>{erro}</small>}</div>:
    <div className="rh-analysis">
      <section className="rh-chart-panel"><h2>Distribuição por faixa salarial</h2><p>Quantidade de matrículas por remuneração {f.tipo_salario==='bruto'?'bruta':'líquida'}.</p><div className="rh-chart">{dados.faixas.map(x=><div key={x.codigo} className="rh-bar-row"><span>{x.nome}</span><div className="rh-bar-bg"><div style={{width:(x.quantidade/max)*100+'%'}}/></div><strong>{num(x.quantidade)}</strong></div>)}</div></section>
      <section className="rh-chart-panel"><h2>Distribuição por departamento</h2><p>Contagem de matrículas dos órgãos e secretarias presentes na folha.</p><div className="rh-breakdown">{dados.por_secretaria.map((row,i)=><div key={row.nome}><span>{row.nome}</span><strong>{num(row.quantidade)}</strong></div>)}</div></section>
      <section className="rh-chart-panel"><h2>Funções com mais vínculos</h2><p>Os cargos são preservados conforme constam no portal.</p><div className="rh-breakdown">{dados.por_cargo.slice(0,20).map(row=><div key={row.nome}><span>{row.nome}</span><strong>{num(row.quantidade)}</strong></div>)}</div></section>
      <section className="rh-chart-panel"><h2>Tipo de vínculo</h2><p>Não presumimos aposentadoria a partir de idade ou data de admissão.</p><div className="rh-breakdown">{dados.por_vinculo.map(row=><div key={row.nome}><span>{row.nome}</span><strong>{num(row.quantidade)}</strong></div>)}</div></section>
    </div>}
   <div className="rh-footnote">Fonte: Portal da Transparência de Viçosa/MG. Faixas de salários aplicadas aos valores da competência escolhida, não a salário-base. O painel evita expor matrículas individuais e qualquer CPF.</div>
 </div>
}