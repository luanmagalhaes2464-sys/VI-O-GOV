'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {Upload,ExternalLink,Users,Wallet,Filter,RotateCcw,ShieldCheck,AlertCircle,FileCheck2,X} from 'lucide-react';
import {importarCSV,lerSessao,salvarSessao,limparSessao,PainelRH,GrupoRH,FAIXAS,FONTE_RH,BRUTO_OFICIAL_JAN_2026,moeda,numero} from '../../lib/rh-import';

type Filtro={secretaria:string,cargo:string,vinculo:string,situacao:string,faixa:string,tipo:'bruto'|'liquido'};
const limpar:Filtro={secretaria:'',cargo:'',vinculo:'',situacao:'',faixa:'',tipo:'bruto'};
const oficialLiquido=9307582.03;
function group(rows:GrupoRH[],key:'secretaria'|'cargo'|'vinculo'|'situacao'){
 const m=new Map<string,number>();
 for(const row of rows)m.set(row[key],(m.get(row[key])||0)+row.quantidade);
 return [...m.entries()].sort((a,b)=>b[1]-a[1]).map(([nome,valor])=>({nome,valor}));
}
export default function RecursosHumanos(){
 const [dados,setDados]=useState<PainelRH|null>(null),[f,setF]=useState<Filtro>(limpar);
 const [erro,setErro]=useState(''),[carregando,setCarregando]=useState(false);
 useEffect(()=>setDados(lerSessao()),[]);
 const linhas=dados?.grupos??[];
 const opcoes=useMemo(()=>({
  secretarias:[...new Set(linhas.map(x=>x.secretaria))].sort((a,b)=>a.localeCompare(b,'pt-BR')),
  cargos:[...new Set(linhas.map(x=>x.cargo))].sort((a,b)=>a.localeCompare(b,'pt-BR')),
  vinculos:[...new Set(linhas.map(x=>x.vinculo))].sort((a,b)=>a.localeCompare(b,'pt-BR'))
 }),[linhas]);
 const filtrado=useMemo(()=>linhas.filter(x=>
  (!f.secretaria||x.secretaria===f.secretaria)&&
  (!f.cargo||x.cargo===f.cargo)&&
  (!f.vinculo||x.vinculo===f.vinculo)&&
  (!f.situacao||x.situacao===f.situacao)&&
  (!f.faixa||x['faixa_'+f.tipo]===f.faixa)
 ),[linhas,f]);
 const quantidade=filtrado.reduce((n,x)=>n+x.quantidade,0);
 const bruto=filtrado.reduce((n,x)=>n+x.bruto,0);
 const liquido=filtrado.reduce((n,x)=>n+x.liquido,0);
 const serie=FAIXAS.map(b=>({nome:b.label,codigo:b.value,quantidade:filtrado.filter(x=>x['faixa_'+f.tipo]===b.value).reduce((n,x)=>n+x.quantidade,0)}));
 const max=Math.max(1,...serie.map(x=>x.quantidade));
 function update(key:keyof Filtro,value:string){setF(prev=>({...prev,[key]:value}))}
 async function processar(file:File|undefined){
  if(!file)return;setCarregando(true);setErro('');
  try{
   if(file.size>35_000_000)throw new Error('O arquivo deve ter no máximo 35 MB.');
   if(!/\.(csv|txt)$/i.test(file.name))throw new Error('Selecione um arquivo CSV (ou TXT delimitado) exportado pelo portal.');
   const resultado=importarCSV(await file.text());
   salvarSessao(resultado);setDados(resultado);setF({...limpar});
  }catch(e){setErro(e instanceof Error?e.message:'Não foi possível processar o arquivo.');}
  finally{setCarregando(false)}
 }
 return <div className="rh-page">
  <div className="rh-kicker">VIÇO GOV / RECURSOS HUMANOS</div>
  <div className="rh-page-title"><div><h1>Dashboard de Recursos Humanos</h1><p>Distribuição salarial, cargos, secretarias e vínculos da folha de pagamento municipal.</p></div><a href={FONTE_RH} target="_blank" rel="noopener noreferrer">Portal oficial <ExternalLink size={14}/></a></div>

  <section className="rh-import-zone">
   <div className="rh-import-icon">{dados?<FileCheck2 size={24}/>:<Upload size={24}/>}</div>
   <div className="rh-import-copy">
    <strong>{dados?'Folha de '+dados.referencia+' carregada':'Carregar a folha oficial para ativar os gráficos'}</strong>
    <p>{dados?'Foram analisadas '+numero(dados.matriculas)+' matrículas. Os dados estão disponíveis somente nesta sessão.': 'No portal, escolha Folha de Pagamento → janeiro/2026 → Exportar CSV → Baixar Arquivo CSV. Depois selecione o arquivo aqui.'}</p>
    {dados?.aviso&&<small>{dados.aviso}</small>}
   </div>
   <div className="rh-import-actions">
    <label className="rh-upload-button"><Upload size={16}/>{carregando?'Processando…':dados?'Trocar CSV':'Selecionar arquivo CSV'}
      <input type="file" accept=".csv,.txt,text/csv,text/plain" disabled={carregando} onChange={e=>{void processar(e.target.files?.[0]);e.currentTarget.value=''}}/>
    </label>
    {dados&&<button className="rh-clear-data" onClick={()=>{limparSessao();setDados(null);setF({...limpar});setErro('')}}><X size={14}/> Limpar dados desta sessão</button>}
   </div>
  </section>
  {erro&&<div className="rh-import-error" role="alert"><AlertCircle size={18}/>{erro}</div>}

  <section className="rh-filter-panel">
   <div className="rh-filter-head"><div><Filter size={16}/><strong>Filtros da folha</strong><span className="rh-filter-status">{dados?'Competência '+dados.referencia:'Aguardando CSV completo'}</span></div><button onClick={()=>setF({...limpar})} disabled={!dados}><RotateCcw size={14}/> Limpar filtros</button></div>
   <div className="rh-filter-grid">
    <label>Secretaria / departamento<select disabled={!dados} value={f.secretaria} onChange={e=>update('secretaria',e.target.value)}><option value="">Todas</option>{opcoes.secretarias.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label>Cargo / função<select disabled={!dados} value={f.cargo} onChange={e=>update('cargo',e.target.value)}><option value="">Todos</option>{opcoes.cargos.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label>Vínculo declarado<select disabled={!dados} value={f.vinculo} onChange={e=>update('vinculo',e.target.value)}><option value="">Todos</option>{opcoes.vinculos.map(s=><option key={s} value={s}>{s}</option>)}</select></label>
    <label>Situação / categoria<select disabled={!dados} value={f.situacao} onChange={e=>update('situacao',e.target.value)}><option value="">Todos</option><option value="efetivo">Efetivos</option><option value="comissionado">Comissionados</option><option value="aposentado">Aposentados identificados</option><option value="outro">Outros vínculos</option></select></label>
    <label>Faixa salarial<select disabled={!dados} value={f.faixa} onChange={e=>update('faixa',e.target.value)}><option value="">Todas as faixas</option>{FAIXAS.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
    <label>Base da faixa<select disabled={!dados} value={f.tipo} onChange={e=>update('tipo',e.target.value)}><option value="bruto">Remuneração bruta</option><option value="liquido">Remuneração líquida</option></select></label>
   </div>
  </section>

  <div className="rh-metrics">
    <article><span><Users size={16}/> Matrículas / vínculos</span><strong>{dados?numero(quantidade):'—'}</strong><small>{dados?'Filtradas da folha '+dados.referencia:'Quantidade depende do CSV completo'}</small></article>
    <article><span><Wallet size={16}/> Total bruto</span><strong>{moeda(dados?bruto:BRUTO_OFICIAL_JAN_2026)}</strong><small>{dados?'Somatório filtrado · '+dados.referencia:'Oficial · janeiro/2026 · sem filtros'}</small></article>
    <article><span><Wallet size={16}/> Total líquido</span><strong>{moeda(dados?liquido:oficialLiquido)}</strong><small>{dados?'Somatório filtrado · '+dados.referencia:'Oficial · janeiro/2026 · sem filtros'}</small></article>
  </div>

  {!dados?
    <div className="rh-data-wait"><FileCheck2 size={32}/><h2>Valores oficiais já identificados. Falta apenas o detalhamento.</h2><p>O portal confirma os totais bruto e líquido de janeiro/2026, mas apresenta somente parte das matrículas na tela inicial. Carregue a exportação CSV integral para obter contagem, gráficos e filtros reais sem informações inventadas.</p><a href={FONTE_RH} target="_blank" rel="noopener noreferrer">Abrir Folha de Pagamento <ExternalLink size={14}/></a></div>:
    <div className="rh-analysis">
      <section className="rh-chart-panel"><h2>Distribuição por faixa salarial</h2><p>Vínculos por remuneração {f.tipo==='bruto'?'bruta':'líquida'} da competência {dados.referencia}.</p><div className="rh-chart">{serie.map(s=><div key={s.codigo} className="rh-bar-row"><span>{s.nome}</span><div className="rh-bar-bg"><div style={{width:s.quantidade/max*100+'%'}}/></div><strong>{numero(s.quantidade)}</strong></div>)}</div></section>
      <section className="rh-chart-panel"><h2>Por secretaria / departamento</h2><p>Quantidade de matrículas para os filtros selecionados.</p><div className="rh-breakdown">{group(filtrado,'secretaria').map(x=><div key={x.nome}><span>{x.nome}</span><strong>{numero(x.valor)}</strong></div>)}</div></section>
      <section className="rh-chart-panel"><h2>Cargos e funções</h2><p>Até 30 cargos, ordenados pela quantidade de vínculos.</p><div className="rh-breakdown">{group(filtrado,'cargo').slice(0,30).map(x=><div key={x.nome}><span>{x.nome}</span><strong>{numero(x.valor)}</strong></div>)}</div></section>
      <section className="rh-chart-panel"><h2>Tipos de vínculo</h2><p>Classificação preservada conforme a folha municipal.</p><div className="rh-breakdown">{group(filtrado,'vinculo').map(x=><div key={x.nome}><span>{x.nome}</span><strong>{numero(x.valor)}</strong></div>)}</div></section>
      {quantidade===0&&<div className="rh-filter-empty">Nenhuma matrícula corresponde a esta combinação de filtros. Confira os critérios selecionados.</div>}
    </div>}
  <div className="rh-footnote"><ShieldCheck size={15}/> A leitura do CSV acontece no seu navegador. Nomes e matrículas não são enviados ao servidor nem salvos. Apenas grupos estatísticos permanecem na sessão. Uma pessoa pode possuir mais de uma matrícula. A categoria aposentado depende de identificação expressa no vínculo oficial.</div>
  <Link href="/" className="rh-back-overview">Voltar à Visão Geral</Link>
 </div>;
}
