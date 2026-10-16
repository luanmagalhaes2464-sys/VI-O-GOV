'use client';
import {useEffect,useMemo,useState} from 'react';
import {ArrowLeft,ChevronLeft,ChevronRight,ExternalLink,Search,Wallet} from 'lucide-react';
import Link from 'next/link';
type R={
 mes:string;categoria:string;rubrica:string;total_categoria:number;valor_selecionado:number;
 total_rubricas:number;rubricas:{chave:string;codigo:string;nome:string;valor:number;ocorrencias:number}[];
 pessoas:{nome:string;matricula:string;cargo:string;departamento:string;valor:number;rubricas:string[]}[];
 total_pessoas:number;pagina:number;tamanho:number;ocorrencias:number;fonte:string;nota:string
};
const money=(v:number|undefined)=>v===undefined?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v);
const number=(v:number|undefined)=>v===undefined?'—':new Intl.NumberFormat('pt-BR').format(v);
export default function DetalhamentoRubricas({mes,categoria}:{mes:string;categoria:string}){
 const [selecionada,setSelecionada]=useState('');
 const [busca,setBusca]=useState('');
 const [buscaAplicada,setBuscaAplicada]=useState('');
 const [pagina,setPagina]=useState(1);
 const [d,setD]=useState<R|null>(null);
 const [carregando,setCarregando]=useState(true);
 const [erro,setErro]=useState('');
 useEffect(()=>{const id=window.setTimeout(()=>{setPagina(1);setBuscaAplicada(busca.trim())},250);return()=>window.clearTimeout(id)},[busca]);
 useEffect(()=>{
  let ativo=true;setCarregando(true);setErro('');
  const qs=new URLSearchParams({mes,categoria,pagina:String(pagina)});
  if(selecionada)qs.set('rubrica',selecionada);
  if(buscaAplicada)qs.set('busca',buscaAplicada);
  fetch('/api/rh/rubricas?'+qs.toString(),{cache:'no-store'}).then(async res=>{
   const o=await res.json();
   if(!res.ok)throw new Error(o.error||'Não foi possível carregar o detalhamento.');
   return o as R;
  }).then(o=>{if(ativo)setD(o)})
   .catch(e=>{if(ativo){setD(null);setErro(e instanceof Error?e.message:'Falha ao consultar dados.')}})
   .finally(()=>{if(ativo)setCarregando(false)});
  return()=>{ativo=false};
 },[mes,categoria,pagina,selecionada,buscaAplicada]);
 const selecionadaInfo=useMemo(()=>d?.rubricas.find(r=>r.chave===selecionada),[d,selecionada]);
 const totalPaginas=Math.ceil((d?.total_pessoas||0)/(d?.tamanho||35));
 return <div className="rhd-page">
  <div className="rhd-top"><Link href="/rh"><ArrowLeft size={15}/> Voltar aos Recursos Humanos</Link><span>VIÇO GOV · CONSULTA DA FOLHA</span></div>
  <div className="rhd-head"><div><div className="rhd-overline"><Wallet size={16}/> DETALHAMENTO DAS RUBRICAS</div>
   <h1>{categoria}</h1><p>Valores e pessoas vinculadas às rubricas dessa categoria na competência {mes.slice(5,7)}/{mes.slice(0,4)}.</p></div>
   <div className="rhd-period">{mes.slice(5,7)}/{mes.slice(0,4)}</div></div>
  <div className="rhd-kpis">
   <article><span>Total da categoria</span><strong>{carregando?'…':money(d?.total_categoria)}</strong><small>Proventos registrados na folha</small></article>
   <article><span>{selecionadaInfo?'Valor da rubrica selecionada':'Rubricas distintas'}</span><strong>{carregando?'…':selecionadaInfo?money(d?.valor_selecionado):number(d?.total_rubricas)}</strong><small>{selecionadaInfo?selecionadaInfo.nome:'Classificadas pelos códigos e descrições da folha'}</small></article>
   <article><span>Matrículas encontradas</span><strong>{carregando?'…':number(d?.total_pessoas)}</strong><small>{buscaAplicada?'Para a pesquisa atual':'Com lançamento nesta categoria'}</small></article>
  </div>
  {erro&&<p className="rhd-error">{erro}</p>}
  <div className="rhd-columns">
   <section className="rhd-panel"><div className="rhd-panel-head"><h2>Composição da categoria</h2><p>Clique em qualquer rubrica para ver somente as matrículas e os valores correspondentes.</p></div>
    <div className="rhd-list">
     <button type="button" className={selecionada===''?'selected':''} onClick={()=>{setSelecionada('');setPagina(1)}}><span><b>Todas as rubricas</b><small>Visualizar todos os lançamentos desta categoria</small></span><strong>{money(d?.total_categoria)}</strong></button>
     {d?.rubricas.map(x=><button type="button" className={selecionada===x.chave?'selected':''} key={x.chave} onClick={()=>{setSelecionada(x.chave);setPagina(1)}}><span><b>{x.nome}</b><small>Código {x.codigo} · {number(x.ocorrencias)} inclusões com esta rubrica</small></span><strong>{money(x.valor)}</strong></button>)}
    </div>
   </section>
   <section className="rhd-panel"><div className="rhd-panel-head"><h2>Servidores / matrículas na folha</h2><p>{selecionadaInfo?.nome||'Todas as rubricas da categoria'} · valores de proventos atribuídos por matrícula.</p></div>
    <label className="rhd-search"><Search size={16}/><input placeholder="Pesquisar nome, matrícula, cargo ou departamento" aria-label="Pesquisar pessoas nas rubricas" value={busca} onChange={e=>setBusca(e.target.value)}/></label>
    {carregando?<p className="rhd-note">Consultando registros do Neon...</p>:d?.pessoas.length===0?<p className="rhd-note">Não foram encontrados lançamentos com os filtros atuais.</p>:
     <div className="rhd-person-list">{d?.pessoas.map(x=><div className="rhd-person" key={x.matricula+'-'+x.nome}><div><strong>{x.nome}</strong><small>{x.cargo} · matrícula {x.matricula}</small><small>{x.departamento}</small>{!selecionada&&<small>Rubricas: {x.rubricas.join(' · ')}</small>}</div><b>{money(x.valor)}</b></div>)}</div>}
    <div className="rhd-pagination"><span>{number(d?.total_pessoas)} matrículas · página {pagina} de {Math.max(totalPaginas,1)}</span>
     <div><button type="button" disabled={pagina<=1||carregando} onClick={()=>setPagina(v=>v-1)} aria-label="Anterior"><ChevronLeft size={18}/></button>
      <button type="button" disabled={pagina>=totalPaginas||carregando} onClick={()=>setPagina(v=>v+1)} aria-label="Próxima"><ChevronRight size={18}/></button></div>
    </div>
   </section>
  </div>
  <div className="rhd-foot"><p>{d?.nota||'Os valores correspondem às rubricas identificadas na folha, não necessariamente ao pagamento líquido.'}</p>
   <a href={d?.fonte||'https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml'} target="_blank" rel="noopener noreferrer">Portal da Transparência de Viçosa <ExternalLink size={13}/></a>
  </div>
 </div>;
}
