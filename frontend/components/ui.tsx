import Link from 'next/link';
import {ReactNode} from 'react';
import {Info, ExternalLink, DatabaseZap} from 'lucide-react';
export function PageTitle({eyebrow,title,subtitle,children}:{eyebrow?:string,title:string,subtitle:string,children?:ReactNode}){
 return <section className="page-heading"><div><div className="eyebrow">{eyebrow||'VIÇO GOV / INTELIGÊNCIA MUNICIPAL'}</div><h1>{title}</h1><p>{subtitle}</p></div>{children&&<div className="heading-actions">{children}</div>}</section>
}
export function Panel({title,description,children,extra}:{title:string,description?:string,children:ReactNode,extra?:ReactNode}){return <section className="panel"><div className="panel-head"><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{extra}</div><div className="panel-body">{children}</div></section>}
export function Placeholder({text='Ainda não há dados importados e validados para esta visualização.'}:{text?:string}){return <div className="placeholder"><DatabaseZap size={30}/><strong>Aguardando integração</strong><p>{text}</p></div>}
export function Notice({children}:{children:ReactNode}){return <div className="notice"><Info size={18}/><div>{children}</div></div>}
export function SourceLink({url,label}:{url?:string,label:string}){return url?<a href={url} target="_blank" rel="noopener noreferrer" className="source-link">{label} <ExternalLink size={13}/></a>:<span className="source-link">{label}</span>}
export function UnderConstruction({label}:{label:string}){return <><PageTitle title={label} subtitle="Estrutura inicial concluída; aguardando importações verificadas para apresentar indicadores reais."/><Panel title="Conexão de dados pendente" description="O módulo já está previsto na arquitetura e na API."><Placeholder/></Panel><Notice>Não exibimos números de exemplo como se fossem oficiais. O módulo será alimentado apenas por informações rastreáveis e com período identificado.</Notice></>}
