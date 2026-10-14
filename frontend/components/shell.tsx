'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {PanelLeftClose, Menu, Search, ShieldCheck, ArrowUpRight, Bot, X, UserRound} from 'lucide-react';
import {menu} from './navigation';

export default function Shell({children}:{children:React.ReactNode}){
  const pathname=usePathname();
  const [isOpen,setOpen]=useState(false);
  const [search,setSearch]=useState('');
  return <div className="app-layout">
    {isOpen && <div className="overlay" onClick={()=>setOpen(false)} />}
    <aside className={'sidebar '+(isOpen?'show':'')}>
      <div className="brand"><div className="brand-icon">V</div><div><strong>VIÇO <span>GOV</span></strong><small>INTELIGÊNCIA MUNICIPAL</small></div><button onClick={()=>setOpen(false)} aria-label="Fechar menu" className="mobile-only close-btn"><X size={19}/></button></div>
      <div className="brand-context"><span className="dot"/> <div><b>Viçosa / MG</b><small>Ambiente demonstrativo</small></div></div>
      <nav aria-label="Menu principal" className="navigation">{menu.map(group=><div className="nav-group" key={group.section}>
        <div className="nav-title">{group.section}</div>
        {group.items.map(({slug,name,icon:Icon})=><Link key={slug} onClick={()=>setOpen(false)} href={slug?`/${slug}`:'/'} className={'nav-item '+(pathname===(slug?`/${slug}`:'/')?'active':'')}><Icon size={18}/><span>{name}</span></Link>)}
      </div>)}</nav>
      <div className="sidebar-footer"><ShieldCheck size={17}/><span>Fontes e evidências rastreáveis</span></div>
    </aside>
    <div className="main-layout">
      <header className="topbar"><div className="top-left"><button aria-label="Abrir menu" className="icon-button mobile-only" onClick={()=>setOpen(true)}><Menu size={23}/></button><span className="breadcrumb">Plataforma de Inteligência Municipal</span></div>
        <div className="top-actions"><div className="searchbox"><Search size={17}/><input placeholder="Buscar módulo..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter' && search.trim()) {const q=encodeURIComponent(search);window.location.href=`/agente?q=${q}`}}}/></div><span className="prototype-pill">PROTÓTIPO</span><span className="avatar"><UserRound size={17}/></span></div>
      </header>
      <main className="content">{children}<footer className="main-footer"><span>VIÇO GOV • Plataforma demonstrativa, não oficial</span><span>Desenvolvimento: VIÇO Engenharia <ArrowUpRight size={12}/></span></footer></main>
    </div>
    <Link href="/agente" aria-label="Abrir o assistente VIÇO IA" className="assistant-fab"><Bot size={23}/><span>Fale com a VIÇO IA</span></Link>
  </div>
}
