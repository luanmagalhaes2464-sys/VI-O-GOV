'use client';
import {useMemo} from 'react';
import {Calculator,BookOpen,ExternalLink} from 'lucide-react';
import {unidadesEscolares} from '../lib/educacao-dados';
const faixas=['Até 6','7–10','11–14','15–19','20–25','26–30','Acima de 30'];
const regras=[
 {cargo:'Auxiliar de Serviço Escolar',quantidades:[4,5,6,8,14,14,16]},
 {cargo:'Assistente Administrativo Escolar',quantidades:[1,1,2,4,6,6,6]},
 {cargo:'Professor eventual',quantidades:[1,1,2,2,2,2,2]}
];
const faixa=(n:number|null)=>{
 if(n==null||n<=0||n===30)return null;
 if(n<=6)return 0;if(n<=10)return 1;if(n<=14)return 2;
 if(n<=19)return 3;if(n<=25)return 4;if(n<=29)return 5;return 6;
};
const numero=(n:number|null)=>n==null?'—':new Intl.NumberFormat('pt-BR').format(n);
export default function EducacaoDimensionamento(){
 const linhas=useMemo(()=>unidadesEscolares.map(e=>{
  const indice=faixa(e.turmas);
  return {id:e.codigo_inep,nome:e.nome,turmas:e.turmas,
   auxiliar:indice===null?null:regras[0].quantidades[indice],
   administrativo:indice===null?null:regras[1].quantidades[indice],
   eventual:indice===null?null:regras[2].quantidades[indice]};
 }),[]);
 const total=(k:'auxiliar'|'administrativo'|'eventual')=>
  linhas.some(r=>r[k]===null)?null:linhas.reduce((t,r)=>t+(r[k]||0),0);
 const turmas=linhas.reduce((t,r)=>t+(r.turmas||0),0);
 return <section className="edu-panel edu-dimensionamento">
  <div className="edu-panel-heading"><div>
   <h2><Calculator size={18}/> Parâmetros de dimensionamento — Educação</h2>
   <p>Simulação indicativa por unidade escolar baseada nas faixas de turmas do Anexo V do Estatuto do Magistério (Lei municipal nº 1.368/1999, alterações da Lei nº 3.003/2023).</p>
  </div><span className="edu-counter">Censo Escolar 2025</span></div>
  <div className="edu-dimension-stats">
   <div><span>Escolas cadastradas</span><strong>{numero(linhas.length)}</strong></div>
   <div><span>Turmas consideradas</span><strong>{numero(turmas)}</strong></div>
   <div><span>Auxiliares de serviço escolar*</span><strong>{numero(total('auxiliar'))}</strong></div>
   <div><span>Assistentes administrativos*</span><strong>{numero(total('administrativo'))}</strong></div>
  </div>
  <details className="edu-dimension-details"><summary><BookOpen size={15}/> Consultar cálculo por escola e faixas da lei</summary>
   <div className="edu-tablebox"><table className="edu-table edu-dimension-table">
    <thead><tr><th>Escola municipal</th><th>Turmas (2025)</th><th>Auxiliar de serviço*</th><th>Assistente administrativo*</th><th>Professor eventual*</th></tr></thead>
    <tbody>{linhas.map(x=><tr key={x.id}><td><b>{x.nome}</b></td><td>{numero(x.turmas)}</td><td>{numero(x.auxiliar)}</td><td>{numero(x.administrativo)}</td><td>{numero(x.eventual)}</td></tr>)}</tbody>
   </table></div>
   <h3>Referência de quantitativos por faixa de turmas</h3>
   <div className="edu-tablebox"><table className="edu-table edu-dimension-table">
    <thead><tr><th>Cargo / faixa</th>{faixas.map(f=><th key={f}>{f}</th>)}</tr></thead>
    <tbody>{regras.map(r=><tr key={r.cargo}><td><b>{r.cargo}</b></td>{r.quantidades.map((n,i)=><td key={i}>{n}</td>)}</tr>)}</tbody>
   </table></div>
  </details>
  <p className="edu-table-notice">* São <b>parâmetros teóricos para as 18 escolas listadas</b>, não o quadro legal de vagas nem comprovação de excedentes. A Câmara informou 19 unidades em outra referência de 2025. As regras devem ser confirmadas considerando jornada, tempo integral, lotação de 2026 e eventual 19ª escola. A redação consultada se sobrepõe exatamente em 30 turmas; nesse caso o cálculo fica sem valor. Os cargos de professor I, II e III dependem também de turmas por etapa e distribuição de horas-aula.</p>
  <div className="edu-dimension-links">
   <a href="https://leismunicipais.com.br/estatuto-do-magisterio-vicosa-mg" target="_blank" rel="noopener noreferrer">Estatuto do Magistério <ExternalLink size={12}/></a>
   <a href="https://www.vicosa.mg.leg.br/comunicacao/noticias/2023/06-2023/vereador-celebra-conquista-da-educacao-e-aprova-mocao-dos-60-anos-da-aspuv" target="_blank" rel="noopener noreferrer">Lei nº 3.003/2023 <ExternalLink size={12}/></a>
  </div>
 </section>;
}
