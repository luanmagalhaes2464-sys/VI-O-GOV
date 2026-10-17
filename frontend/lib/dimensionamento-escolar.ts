import {unidadesEscolares} from './educacao-dados';

/** Parâmetros do Anexo V do Estatuto do Magistério na redação de 2023.
 * Produzem referências de dimensionamento por faixa de turmas, NÃO vagas
 * legalmente autorizadas, que requerem o quadro de cargos vigente.
 */
export const faixasTurmas=['Até 6','7–10','11–14','15–19','20–25','26–30','Acima de 30'];
export const regrasEscolares=[
 {cargo:'Auxiliar de Serviço Escolar',campo:'auxiliar' as const,quantidades:[4,5,6,8,14,14,16]},
 {cargo:'Assistente Administrativo Escolar',campo:'administrativo' as const,quantidades:[1,1,2,4,6,6,6]},
 {cargo:'Professor eventual',campo:'eventual' as const,quantidades:[1,1,2,2,2,2,2]}
];
export type CampoDimensionamento='auxiliar'|'administrativo'|'eventual';
export const indiceFaixa=(turmas:number|null):number|null=>{
 if(turmas==null||!Number.isInteger(turmas)||turmas<=0||turmas===30)return null;
 if(turmas<=6)return 0;
 if(turmas<=10)return 1;
 if(turmas<=14)return 2;
 if(turmas<=19)return 3;
 if(turmas<=25)return 4;
 if(turmas<=29)return 5;
 return 6;
};
export const unidadesDimensionamento=unidadesEscolares.map(e=>{
 const idx=indiceFaixa(e.turmas);
 return {codigo_inep:e.codigo_inep,nome:e.nome,turmas:e.turmas,faixa:idx,
  auxiliar:idx==null?null:regrasEscolares[0].quantidades[idx],
  administrativo:idx==null?null:regrasEscolares[1].quantidades[idx],
  // Professor eventual exige turmas elegíveis por etapa; o Censo agregado não separa.
  eventual:null as number|null};
});
export const totalTurmas=unidadesDimensionamento.reduce((x,u)=>x+(u.turmas||0),0);
export const totaisDimensionamento:Record<CampoDimensionamento,number|null>={
 auxiliar:unidadesDimensionamento.length&&unidadesDimensionamento.every(u=>u.auxiliar!=null)?
  unidadesDimensionamento.reduce((x,u)=>x+(u.auxiliar||0),0):null,
 administrativo:unidadesDimensionamento.length&&unidadesDimensionamento.every(u=>u.administrativo!=null)?
  unidadesDimensionamento.reduce((x,u)=>x+(u.administrativo||0),0):null,
 eventual:unidadesDimensionamento.length&&unidadesDimensionamento.every(u=>u.eventual!=null)?
  unidadesDimensionamento.reduce((x,u)=>x+(u.eventual||0),0):null
};
const normalizar=(nome:string)=>nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().trim();
export function parametroPorCargo(cargo:string):{valor:number|null;regra?:string;descricao:string}|null{
 const n=normalizar(cargo);
 if(n.includes('AUXILIAR DE SERVICO ESCOLAR'))
  return {valor:totaisDimensionamento.auxiliar,descricao:'Soma automática dos parâmetros por turma das '+unidadesDimensionamento.length+' escolas (Censo 2025). Não equivale a vagas legais.'};
 if(n.includes('ASSISTENTE ADM ESCOLAR')||n.includes('ASSISTENTE ADMINISTRATIVO ESCOLAR'))
  return {valor:totaisDimensionamento.administrativo,descricao:'Soma automática dos parâmetros por turma das '+unidadesDimensionamento.length+' escolas (Censo 2025). Não equivale a vagas legais.'};
 if(n.includes('PROFESSOR EVENTUAL'))
  return {valor:null,regra:'Faixa de turmas elegíveis',
   descricao:'O Anexo V exige turmas da educação infantil até o 5º ano e condições de turmas integrais do Fundamental II; não calcular a partir das 263 turmas agregadas.'};
 if(/^PROFESSOR (I|II)$/.test(n))
  return {valor:null,regra:'Etapas não separadas',
   descricao:'A rede tem '+totalTurmas+' turmas em 2025, mas o cadastro disponível informa somente o total por escola. O PEB I atua na Educação Infantil e o PEB II pode atuar na Educação Infantil ou anos iniciais; a referência legal é um professor por turma da etapa correspondente. O total de turmas da rede NÃO pode ser atribuído integralmente a cada cargo.'};
 if(n==='PROFESSOR III')
  return {valor:null,regra:'Horas-aula não informadas',
   descricao:'PEB III: exige as horas-aula dos anos finais por disciplina e a carga horária básica aplicável, inclusive extensões de jornada. O total de '+totalTurmas+' turmas em 2025 não permite o cálculo por especialidade.'};
 if(n.includes('AUXILIAR DE EDUCACAO INFANTIL'))
  return {valor:null,descricao:'Faltam distribuição das turmas por idade, turno e jornada da unidade.'};
 return null;
}
