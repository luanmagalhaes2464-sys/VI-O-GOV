'use client';
import {useMemo,useState} from 'react';
import {
  ArrowUpRight,BookOpen,Building2,CalendarDays,ClipboardList,
  Download,ExternalLink,GraduationCap,Info,MapPin,Search,School,Users
} from 'lucide-react';
import {fontesEducacao,indicadoresEducacao,unidadesEscolares} from '../../lib/educacao-dados';
import './educacao.css';

const formatar=(v:number|null)=>v===null?'—':new Intl.NumberFormat('pt-BR').format(v);
const filtros=['Todas','Urbana','Rural'] as const;

export default function Educacao(){
 const [busca,setBusca]=useState('');
 const [localizacao,setLocalizacao]=useState<(typeof filtros)[number]>('Todas');
 const visiveis=useMemo(()=>unidadesEscolares.filter(e=>{
  const pesquisa=(e.nome+' '+e.bairro+' '+e.codigo_inep).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const termo=busca.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
  return (!termo||pesquisa.includes(termo))&&(localizacao==='Todas'||e.localizacao===localizacao);
 }),[busca,localizacao]);
 const escolares=indicadoresEducacao;
 return <div className="edu-page">
  <div className="edu-breadcrumb">VIÇO GOV / SECRETARIAS / EDUCAÇÃO</div>
  <div className="edu-heading">
   <div>
    <span className="edu-kicker"><GraduationCap size={15}/> REDE MUNICIPAL DE ENSINO</span>
    <h1>Secretaria de Educação</h1>
    <p>Escolas, matrículas, professores e turmas da rede municipal de Viçosa/MG. Indicadores com origem, período e nível de validação.</p>
   </div>
   <span className="edu-location"><MapPin size={14}/> Viçosa · MG</span>
  </div>
  <div className="edu-reference"><CalendarDays size={17}/><span><strong>Referência inicial: 2025</strong> · Iniciando a base da Educação. Os números da folha de RH não são automaticamente somados aos docentes do Censo Escolar.</span></div>

  <div className="edu-metrics">
   {escolares.map((i,idx)=><article className="edu-stat" key={i.id}>
    <div className="edu-stat-top"><span>{i.titulo}</span><span className="edu-stat-icon">
     {idx===0?<School size={17}/>:idx===1?<BookOpen size={17}/>:idx===2?<Users size={17}/>:<ClipboardList size={17}/>}
    </span></div>
    <strong>{formatar(i.valor)}</strong>
    <div className="edu-stat-meta">{i.valor===null?'Dado ainda não importado':i.unidade+' · '+i.ano}</div>
    <p>{i.qualidade}</p>
    {i.valor!==null&&<a href={i.fonte_url} target="_blank" rel="noopener noreferrer">Ver fonte <ExternalLink size={12}/></a>}
   </article>)}
  </div>

  <div className="edu-grid">
   <section className="edu-panel">
    <div className="edu-panel-heading">
     <div><h2><Building2 size={18}/> Escolas da rede municipal</h2>
      <p>Cadastro por unidade, utilizando o código INEP para evitar duplicidades de nomes.</p></div>
     <span className="edu-counter">{visiveis.length} unidades cadastradas</span>
    </div>
    <div className="edu-searchrow">
     <label className="edu-search"><Search size={17}/><input aria-label="Pesquisar escola ou bairro" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Pesquisar escola, bairro ou código INEP..."/></label>
     <select aria-label="Filtrar localização" value={localizacao} onChange={e=>setLocalizacao(e.target.value as (typeof filtros)[number])}>
      {filtros.map(x=><option key={x} value={x}>{x==='Todas'?'Todas as localizações':x}</option>)}
     </select>
    </div>
    {unidadesEscolares.length===0?
     <div className="edu-empty"><School size={34}/><h3>Cadastro por escola ainda não importado</h3>
      <p>Já temos a referência histórica de 19 escolas municipais em 2025. Para listar cada unidade com segurança precisamos dos códigos e nomes do Catálogo de Escolas do INEP ou de uma planilha da Secretaria.</p>
      <a href={fontesEducacao[0].url} target="_blank" rel="noopener noreferrer">Consultar escolas no INEP <ArrowUpRight size={15}/></a>
     </div>:
     <div className="edu-tablebox"><table className="edu-table">
      <thead><tr><th>Escola</th><th>Localização</th><th>Matrículas</th><th>Docentes</th><th>Turmas</th><th>Ano</th></tr></thead>
      <tbody>{visiveis.map(e=><tr key={e.codigo_inep}><td><b>{e.nome}</b><small>INEP {e.codigo_inep} · {e.bairro}</small></td>
       <td>{e.localizacao}</td><td>{formatar(e.matriculas)}</td><td>{formatar(e.docentes)}</td><td>{formatar(e.turmas)}</td><td>{e.ano}</td></tr>)}</tbody>
     </table>{visiveis.length===0&&<p className="edu-noresult">Nenhuma unidade corresponde à pesquisa.</p>}</div>
    }
   </section>

   <aside className="edu-panel edu-sources">
    <div className="edu-panel-heading"><div><h2><Info size={18}/> Fontes dos dados</h2><p>Acompanhamos ano e origem antes de apresentar indicadores como atuais.</p></div></div>
    {fontesEducacao.map(s=><a className="edu-source" href={s.url} target="_blank" rel="noopener noreferrer" key={s.id}>
      <span><strong>{s.nome}</strong><small>{s.descricao}</small></span><ExternalLink size={15}/></a>)}
    <div className="edu-source-alert"><Info size={16}/><span>Escolas estaduais e particulares não entram nos totais da rede municipal. Matrículas e docentes do INEP são indicadores educacionais; vínculos funcionais pertencem ao RH.</span></div>
   </aside>
  </div>
  <section className="edu-panel edu-ingestion">
   <div><span className="edu-kicker"><Download size={15}/> PRÓXIMA ETAPA · ALIMENTAÇÃO DE DADOS</span>
    <h2>Base preparada para receber os dados por escola</h2>
    <p>Podemos começar com a planilha da Secretaria ou com a exportação oficial do INEP. Campos esperados: <b>código INEP, nome, bairro, zona urbana/rural, etapas, matrículas, docentes, turmas, ano e fonte</b>. Se um campo não estiver disponível, fica sem preenchimento — nunca será tratado como zero.</p>
    <small>A importação definitiva será feita após verificar a planilha e sua competência. O portal não permite gravação pública sem autenticação.</small>
   </div>
   <a className="edu-download" href="/modelo-escolas-vicosa.csv" download><Download size={16}/> Baixar modelo CSV</a>
  </section>
 </div>;
}
