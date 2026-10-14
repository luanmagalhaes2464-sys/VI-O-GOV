'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Users,Wallet,ArrowUpRight,ExternalLink,CalendarDays,Database} from 'lucide-react';
import {api,brl,num} from '../lib/api';

type RH={status:string,referencia:string,total_matriculas:number|null,total_pessoas:number|null,total_bruto:number|null,total_liquido:number|null,total_bruto_fonte_2026_01:number,fonte:string,nota:string,data_importacao?:string};
const FONTE='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml';
export default function Home(){
 const [data,setData]=useState<RH|null>(null),[erro,setErro]=useState('');
 useEffect(()=>{api<RH>('/api/v1/rh/resumo').then(r=>{setData(r.data);setErro(r.error||'')})},[]);
 return <div className="rh-home">
  <div className="rh-kicker">VIÇO GOV / VISÃO GERAL</div>
  <h1>Recursos Humanos de Viçosa</h1>
  <p className="rh-subtitle">Um painel enxuto para analisar a quantidade de vínculos, a folha e a distribuição dos servidores municipais.</p>
  <div className="rh-summary">
   <div className="rh-summary-main">
     <div className="rh-summary-tag"><Users size={17}/> QUADRO MUNICIPAL</div>
     <h2>Quantos servidores trabalham na Prefeitura?</h2>
     <div className="rh-main-figure">{num(data?.total_matriculas)}</div>
     <p>{data?.total_matriculas==null?'Aguardando a exportação completa para informar o número de matrículas. Não contaremos apenas os registros exibidos na primeira página do portal.':'Matrículas/vínculos da competência '+data?.referencia+'. Uma mesma pessoa pode ter mais de uma matrícula.'}</p>
     <Link className="rh-primary-link" href="/rh">Explorar análise de RH <ArrowUpRight size={17}/></Link>
   </div>
   <div className="rh-summary-side">
     <div className="rh-side-kicker"><CalendarDays size={15}/> JANEIRO DE 2026</div>
     <span>Valor bruto da folha — fonte oficial</span>
     <strong>R$ 11.822.334,05</strong>
     <small>Folha de Pagamento do Portal da Transparência. Agentes políticos e estagiários são abas separadas.</small>
     <a href={FONTE} target="_blank" rel="noopener noreferrer">Consultar registro no portal <ExternalLink size={14}/></a>
   </div>
  </div>
  <section className="rh-home-secondary">
    <div className="rh-home-heading"><h2>O que vamos analisar?</h2><p>Somente dados de RH, sem outros módulos ou cadastros.</p></div>
    <div className="rh-home-shortcuts">
      <Link href="/rh"><Users size={21}/><strong>Vínculo e situação</strong><span>Efetivos, comissionados e aposentados quando identificados.</span><ArrowUpRight size={16}/></Link>
      <Link href="/rh"><Wallet size={21}/><strong>Faixas de remuneração</strong><span>Distribuição por salário bruto ou líquido, com filtros combinados.</span><ArrowUpRight size={16}/></Link>
      <Link href="/rh"><Database size={21}/><strong>Secretaria e função</strong><span>Quantas matrículas há em cada setor e cargo da folha.</span><ArrowUpRight size={16}/></Link>
    </div>
  </section>
  {erro&&<div className="rh-note">O serviço de dados não respondeu. {erro}</div>}
  <div className="rh-note"><strong>Transparência dos números.</strong> O total bruto acima está documentado no portal para janeiro/2026; ele não é um valor fictício. O total de servidores e os filtros só serão ativados após a importação integral, identificando competência e vínculos.</div>
 </div>
}