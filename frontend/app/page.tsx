'use client';
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Users,Wallet,ArrowUpRight,ExternalLink,Info,CalendarDays,CheckCircle2,AlertTriangle} from 'lucide-react';
import {api,brl,num} from '../lib/api';
type Resumo={
 mes:string;disponivel:boolean;matriculas:number;nomes_distintos:number;
 bruto:number;liquido:number;descontos:number;quinquenio:number;
 bruto_portal:number;divergencia:number;conciliado:boolean;nota:string;fonte:string;
};
const fonte='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml';
export default function Home(){
 const [r,setR]=useState<Resumo|null>(null);
 const [erro,setErro]=useState('');
 useEffect(()=>{let ativo=true;api<Resumo>('/api/v1/rh/folha/resumo?mes=2026-01').then(x=>{if(ativo){setR(x.data);setErro(x.error||'')}});return()=>{ativo=false}},[]);
 return <div className="rh-home">
  <div className="rh-kicker">VIÇO GOV / VISÃO GERAL</div>
  <h1>Recursos Humanos da Prefeitura</h1>
  <p className="rh-subtitle">Folha de janeiro de 2026 da Prefeitura Municipal de Viçosa/MG — dados individuais processados e armazenados no Neon.</p>
  <div className="rh-live-source"><CalendarDays size={16}/><strong>Referência: janeiro/2026</strong><span>Fonte: PDF da folha municipal, 2.151 páginas</span><a href={fonte} target="_blank" rel="noopener noreferrer">Portal oficial <ExternalLink size={13}/></a></div>
  <div className="rh-home-figures">
   <article className="rh-home-figure rh-home-figure-people">
     <span className="rh-home-tag"><Users size={18}/> MATRÍCULAS NA FOLHA</span>
     <strong>{r?.disponivel?num(r.matriculas):'—'}</strong>
     <h2>Registros identificados no mês</h2>
     <p>{r?.disponivel?`${num(r.nomes_distintos)} nomes distintos, não necessariamente ${num(r.nomes_distintos)} pessoas únicas. A folha pode incluir desligados, estagiários e agentes políticos.`:'Consultando a base de RH no Neon.'}</p>
     <Link href="/rh">Explorar pessoas e vínculos <ArrowUpRight size={16}/></Link>
   </article>
   <article className="rh-home-figure rh-home-figure-payroll">
     <span className="rh-home-tag"><Wallet size={18}/> VALOR BRUTO DAS MATRÍCULAS</span>
     <strong>{brl(r?.bruto)}</strong>
     <h2>Total extraído do PDF · janeiro/2026</h2>
     <p>Remuneração bruta calculada a partir das páginas da folha. Descontos e valores líquidos não são incluídos nesse total bruto.</p>
     <Link href="/rh">Analisar remunerações <ArrowUpRight size={16}/></Link>
   </article>
  </div>
  {r?.disponivel&&<section className="rh-overview-stats">
    <div><span>Valor líquido da folha PDF</span><strong>{brl(r.liquido)}</strong></div>
    <div><span>Descontos na folha PDF</span><strong>{brl(r.descontos)}</strong></div>
    <div><span>Rubrica de quinquênio (105)</span><strong>{brl(r.quinquenio)}</strong></div>
  </section>}
  {r?.disponivel&&r.divergencia>0&&<div className="rh-reconciliation"><AlertTriangle size={20}/><div><b>Diferença em relação ao total do portal</b><p>O PDF enviado soma {brl(r.bruto)}, mas o portal exibe {brl(r.bruto_portal)} para janeiro/2026: diferença de {brl(r.divergencia)}. Mantemos os dois valores separados até haver conciliação. O cálculo interno do PDF confere para bruto, descontos e líquido.</p></div></div>}
  {erro&&<div className="rh-import-error"><Info size={17}/>A API ainda não respondeu: {erro}. O dashboard evita apresentar estimativas como dados de 2026.</div>}
  <div className="rh-overview-next"><div><h2>Dashboard detalhado de RH</h2><p>Filtros de secretaria, local, cargo, vínculo, jornada, faixa salarial e consulta por nome ou matrícula.</p></div><Link href="/rh">Abrir análise da folha <ArrowUpRight size={17}/></Link></div>
  <div className="rh-home-note"><CheckCircle2 size={17}/><span>As páginas do PDF foram processadas para janeiro/2026. Fevereiro a julho serão habilitados conforme as bases oficiais forem obtidas. Ter opção de exportar PDF no portal não garante uma API pública acessível.</span></div>
 </div>;
}
