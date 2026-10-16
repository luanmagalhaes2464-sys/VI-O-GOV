'use client';
import {Calculator,BookOpen,ExternalLink} from 'lucide-react';
import {faixasTurmas,regrasEscolares,unidadesDimensionamento,totalTurmas,totaisDimensionamento} from '../lib/dimensionamento-escolar';
const numero=(n:number|null)=>n==null?'—':new Intl.NumberFormat('pt-BR').format(n);
export default function EducacaoDimensionamento(){
 const linhas=unidadesDimensionamento;
 const total=(k:'auxiliar'|'administrativo'|'eventual')=>totaisDimensionamento[k];
 const turmas=totalTurmas;
 return <section className="edu-panel edu-dimensionamento">
  <div className="edu-panel-heading"><div>
   <h2><Calculator size={18}/> Parâmetros de dimensionamento — Educação</h2>
   <p>Simulação indicativa por unidade escolar baseada nas faixas de turmas do Anexo V do Estatuto do Magistério (Lei municipal nº 1.368/1999, alterações da Lei nº 3.003/2023).</p>
  </div><span className="edu-counter">Censo Escolar 2025</span></div>
  <div className="edu-dimension-stats">
   <div><span>Escolas cadastradas</span><strong>{numero(linhas.length)}</strong></div>
   <div><span>Turmas consideradas</span><strong>{numero(turmas)}</strong></div>
   <div><span>Auxiliares de serviço escolar</span><strong>{numero(total('auxiliar'))}</strong></div>
   <div><span>Assistentes administrativos</span><strong>{numero(total('administrativo'))}</strong></div>
  </div>
  <details className="edu-dimension-details"><summary><BookOpen size={15}/> Consultar cálculo por escola e faixas da lei</summary>
   <div className="edu-tablebox"><table className="edu-table edu-dimension-table">
    <thead><tr><th>Escola municipal</th><th>Turmas (2025)</th><th>Auxiliar de serviço</th><th>Assistente administrativo</th><th>Professor eventual</th></tr></thead>
    <tbody>{linhas.map(x=><tr key={x.codigo_inep}><td><b>{x.nome}</b></td><td>{numero(x.turmas)}</td><td>{numero(x.auxiliar)}</td><td>{numero(x.administrativo)}</td><td>{numero(x.eventual)}</td></tr>)}</tbody>
   </table></div>
   <h3>Referência de quantitativos por faixa de turmas</h3>
   <div className="edu-tablebox"><table className="edu-table edu-dimension-table">
    <thead><tr><th>Cargo / faixa</th>{faixasTurmas.map(f=><th key={f}>{f}</th>)}</tr></thead>
    <tbody>{regrasEscolares.map(r=><tr key={r.cargo}><td><b>{r.cargo}</b></td>{r.quantidades.map((n,i)=><td key={i}>{n}</td>)}</tr>)}</tbody>
   </table></div>
  </details>

  <div className="edu-dimension-links">
   <a href="https://leismunicipais.com.br/estatuto-do-magisterio-vicosa-mg" target="_blank" rel="noopener noreferrer">Estatuto do Magistério <ExternalLink size={12}/></a>
   <a href="https://www.vicosa.mg.leg.br/comunicacao/noticias/2023/06-2023/vereador-celebra-conquista-da-educacao-e-aprova-mocao-dos-60-anos-da-aspuv" target="_blank" rel="noopener noreferrer">Lei nº 3.003/2023 <ExternalLink size={12}/></a>
  </div>
 </section>;
}
