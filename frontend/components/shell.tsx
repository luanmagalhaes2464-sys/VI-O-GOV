'use client';
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';
import {Menu,X,PanelLeftClose,PanelLeftOpen} from 'lucide-react';
import RHAssistenteFlutuante from './rh-assistente-flutuante';
import {menu} from './navigation';

const STORAGE_KEY='vico-gov.sidebar-collapsed';
export default function Shell({children}:{children:React.ReactNode}){
 const pathname=usePathname();
 const [open,setOpen]=useState(false);
 const [collapsed,setCollapsed]=useState(false);
 useEffect(()=>{
  try{setCollapsed(window.localStorage.getItem(STORAGE_KEY)==='true')}catch{/* Sem armazenamento: manter expandida */}
 },[]);
 const toggleCollapsed=()=>{
  setCollapsed(current=>{
   const next=!current;
   try{window.localStorage.setItem(STORAGE_KEY,String(next))}catch{/* Preferência somente nesta sessão */}
   return next;
  });
 };
 return <div className={'app-layout rh-shell'+(collapsed?' sidebar-collapsed':'')}>
  {open&&<div className="overlay" onClick={()=>setOpen(false)}/>}
  <aside id="vico-sidebar" className={'sidebar '+(open?'show':'')} aria-label="Menu lateral">
   <div className="brand">
    <div className="brand-icon" aria-hidden="true">V</div>
    <div className="brand-name"><strong>VIÇO <span>GOV</span></strong><small>INTELIGÊNCIA MUNICIPAL</small></div>
    <button onClick={()=>setOpen(false)} className="mobile-only close-btn" aria-label="Fechar menu"><X size={18}/></button>
   </div>
   <nav aria-label="Navegação principal" className="navigation">
    {menu.map(group=><div className="nav-group" key={group.section}>
     <div className="nav-title">{group.section}</div>
     {group.items.map(({slug,name,icon:Icon})=><Link key={slug} onClick={()=>setOpen(false)}
      href={slug?'/'+slug:'/'} title={collapsed?name:undefined} aria-label={name}
      className={'nav-item '+(pathname===(slug?'/'+slug:'/')?'active':'')}>
      <Icon size={18}/><span className="nav-item-text">{name}</span>
     </Link>)}
    </div>)}
   </nav>
  </aside>
  <div className="main-layout">
   <header className="topbar"><div className="top-left">
    <button onClick={()=>setOpen(true)} className="mobile-only close-btn" aria-label="Abrir menu"><Menu size={21}/></button>
    <button type="button" className="topbar-sidebar-toggle" onClick={toggleCollapsed}
     aria-label={collapsed?'Expandir menu lateral':'Recolher menu lateral'}
     title={collapsed?'Expandir menu lateral':'Recolher menu lateral'}
     aria-expanded={!collapsed} aria-controls="vico-sidebar">
     {collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}
    </button>
    <span className="breadcrumb">{pathname.startsWith('/educacao')?'Prefeitura Municipal de Viçosa · Educação':pathname.startsWith('/rh')?'Prefeitura Municipal de Viçosa · Recursos Humanos':'Prefeitura Municipal de Viçosa · Visão Geral'}</span>
   </div>
   <div className="topbar-prefeitura" aria-label="Prefeitura Municipal de Viçosa">
    <span className="topbar-prefeitura-brasao">
     <Image src="/brasao-prefeitura-vicosa.svg" alt="Brasão da Prefeitura Municipal de Viçosa" width={74} height={51} unoptimized/>
    </span>
    <span className="topbar-prefeitura-nome">PREFEITURA DE VIÇOSA</span>
   </div>
   </header>
   <main className="content">{children}</main>
  </div>
  <RHAssistenteFlutuante/>
 </div>;
}
