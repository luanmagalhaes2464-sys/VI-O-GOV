'use client';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {useState} from 'react';
import {Menu,X} from 'lucide-react';
import RHAssistenteFlutuante from './rh-assistente-flutuante';
import {menu} from './navigation';

export default function Shell({children}:{children:React.ReactNode}){
 const pathname=usePathname(),[open,setOpen]=useState(false);
 return <div className="app-layout rh-shell">
  {open&&<div className="overlay" onClick={()=>setOpen(false)}/>}
  <aside className={'sidebar '+(open?'show':'')}>
   <div className="brand"><div className="brand-icon">V</div><div><strong>VIÇO <span>GOV</span></strong><small>INTELIGÊNCIA MUNICIPAL</small></div><button onClick={()=>setOpen(false)} className="mobile-only close-btn" aria-label="Fechar menu"><X size={18}/></button></div>
   <nav aria-label="Navegação principal" className="navigation">{menu.map(gr=><div className="nav-group" key={gr.section}><div className="nav-title">{gr.section}</div>{gr.items.map(({slug,name,icon:Icon})=><Link key={slug} onClick={()=>setOpen(false)} href={slug?'/'+slug:'/'} className={'nav-item '+(pathname===(slug?'/'+slug:'/')?'active':'')}><Icon size={18}/><span>{name}</span></Link>)}</div>)}</nav>
  </aside>
  <div className="main-layout"><header className="topbar"><div className="top-left"><button onClick={()=>setOpen(true)} className="mobile-only close-btn" aria-label="Abrir menu"><Menu size={21}/></button><span className="breadcrumb">{pathname.startsWith('/educacao')?'Prefeitura Municipal de Viçosa · Educação':pathname.startsWith('/rh')?'Prefeitura Municipal de Viçosa · Recursos Humanos':'Prefeitura Municipal de Viçosa · Visão Geral'}</span></div></header>
   <main className="content">{children}</main>
  </div>
  <RHAssistenteFlutuante/>
 </div>;
}
