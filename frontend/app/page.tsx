'use client';
import {useEffect,useMemo,useState} from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,Building2,CalendarDays,Clapperboard,GraduationCap,HeartHandshake,HeartPulse,
  Landmark,Leaf,Lightbulb,MapPinned,RefreshCcw,Sprout,Users,Wallet,Wrench,Info
} from 'lucide-react';
import {secretarias} from '../lib/secretarias';
import './visao-geral.css';

type ResumoSecretaria={slug:string;nome:string;curto:string;sigla:string;vinculos:number|null;registros:number|null;bruto:number|null;situacao:string;departamentos:string[]};
type Painel={mes:string;disponivel:boolean;secretarias:ResumoSecretaria[];outros:{departamento:string;vinculos:number;bruto:number}[];total_bruto_da_folha:number;metodologia:string;ressalva:string;fonte:string;aviso?:string};
const nomes=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho'];
const cores=['#4375c2','#a35a81','#13877c','#b77c22','#795dba','#347da4','#bf4553','#68844b','#8a668f','#b95e48','#496db1','#4c8a6d'];
const icones=[Landmark,Building2,HeartHandshake,Sprout,Clapperboard,Lightbulb,GraduationCap,Wallet,Wrench,HeartPulse,MapPinned,Leaf];
const numero=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('pt-BR').format(n);
const moeda=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export default function Home(){
 const [mes,setMes]=useState('2026-07');
 const [dados,setDados]=useState<Painel|null>(null);
 const [carregando,setCarregando]=useState(true);
 const [erro,setErro]=useState('');
 useEffect(()=>{
  let ativo=true;setErro('');setCarregando(true);setDados(null);
  fetch('/api/visao-geral/secretarias?mes='+mes,{cache:'no-store'})
   .then(async r=>{const obj=await r.json();if(!r.ok)throw new Error(obj.error||'Consulta não disponível');return obj as Painel})
   .then(data=>{if(ativo)setDados(data)})
   .catch(e=>{if(ativo)setErro(e instanceof Error?e.message:'Falha ao carregar a folha')})
   .finally(()=>{if(ativo)setCarregando(false)});
  return()=>{ativo=false};
 },[mes]);
 const porSlug=useMemo(()=>new Map((dados?.secretarias||[]).map(s=>[s.slug,s])),[dados]);
 const outrosBruto=dados?.outros.reduce((t,x)=>t+x.bruto,0)||0;
 return <div className="vg-page">
  <div className="vg-heading">
   <div><div className="vg-eyebrow">VIÇO GOV / VISÃO GERAL</div>
    <h1>Panorama das Secretarias</h1>
    <p>Servidores identificados e remuneração bruta mensal, com base na folha pública da Prefeitura de Viçosa/MG.</p>
   </div>
   <label className="vg-month"><CalendarDays size={17}/><span>Competência</span>
    <select value={mes} aria-label="Selecionar competência da folha" onChange={e=>setMes(e.target.value)}>
     {nomes.map((n,i)=><option key={n} value={'2026-'+String(i+1).padStart(2,'0')}>{n} / 2026</option>)}
    </select>
   </label>
  </div>
  {erro&&<div className="vg-error"><Info size={17}/>{erro}<button type="button" onClick={()=>{setMes(mes);setCarregando(true);window.location.reload()}} aria-label="Tentar novamente"><RefreshCcw size={15}/> Recarregar</button></div>}
  {dados&&!dados.disponivel&&<div className="vg-error"><Info size={18}/>{dados.aviso}</div>}
  <div className="vg-grid">
   {secretarias.map((s,i)=>{
    const data=porSlug.get(s.slug);
    const c=cores[i%cores.length],Icon=icones[i%icones.length];
    const valor=carregando?'…':dados?.disponivel?numero(data?.vinculos):'—';
    const bruto=carregando?'…':dados?.disponivel?moeda(data?.bruto):'—';
    const departamento=data?.departamentos?.[0];
    const destino=departamento?`/rh?mes=${encodeURIComponent(mes)}&departamento=${encodeURIComponent(departamento)}`:`/rh?mes=${encodeURIComponent(mes)}`;
    return <Link key={s.slug} href={destino} className="vg-card vg-card-clickable" style={{borderTopColor:c,'--vg-color':c} as React.CSSProperties} aria-label={`Abrir Recursos Humanos da ${s.nome} em ${mes}`}>
     <div className="vg-card-head">
      <span className="vg-card-icon" style={{backgroundColor:c+'16',color:c}}><Icon size={21}/></span>
      <span className="vg-card-tag">{s.sigla}</span>
     </div>
     <h2>{s.nome}</h2>
     <div className="vg-card-info">
      <div><span><Users size={14}/> Vínculos na folha</span><strong>{valor}</strong></div>
      <div><span><Wallet size={14}/> Remuneração bruta</span><strong>{bruto}</strong></div>
     </div>
     <div className="vg-card-footer"><span>{mes.slice(5,7)}/{mes.slice(0,4)}</span><span className="vg-card-open">Abrir secretaria <ArrowUpRight size={14}/></span></div>
    </Link>;
   })}
  </div>
  {dados?.disponivel&&dados.outros.length>0&&<p className="vg-outros">
    Órgãos não incluídos nos cards de secretarias ({dados.outros.map(o=>o.departamento).join(' · ')}): {moeda(outrosBruto)} da folha bruta. Esses pagamentos não foram atribuídos artificialmente a nenhuma secretaria.
   </p>}
 </div>;
}
