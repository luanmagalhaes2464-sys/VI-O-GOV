/**
 * Auditoria RH local ao frontend. Evita depender do boot da segunda instância
 * Render para carregar dados que já estão no Neon do próprio painel de RH.
 * Cálculos em centavos; apenas diferenças matemáticas são "inconsistências".
 */
export type Rubrica={codigo:string;nome:string;categoria:string;valor:number};
export type Linha={
 id:number;mes:string;matricula:string;nome:string;cargo:string;jornada:string|null;
 departamento:string|null;tipo_inclusao:string|null;salario_base:string|number|null;
 bruto:string|number;descontos:string|number;liquido:string|number;
 rubricas:Array<{tipo?:string;valor?:string|number;codigo?:string;rubrica?:string}>|null;
 vinculo:string|null;desligamento:string|null;
};
type Grupo={
 matricula:string;nome:string;cargo:string;jornada:string;departamento:string;
 bruto:number;descontos:number;liquido:number;base:number|null;
 categorias:Map<string,number>;rubricas:Map<string,Rubrica>;
 vinculos:Set<string>;semDesligamento:boolean;temporario:boolean;
};
const DECIMO=new Set(['0131','0132','0134','0145','0201']);
const FERIAS=new Set(['0124','0126','0127','0135','0136','0137','0138','0139','0091','0092','0096','0140','0141','0153']);
const INDENIZACAO=new Set(['2139']);
const EVENTUAIS=['13º salário','Férias e adicionais','Indenizações','Retroativos'];
const CATEGORIAS=[...EVENTUAIS,'Demais rubricas'];

const cents=(x:unknown):number=>{
 const n=Number(x??0);
 return Number.isFinite(n)?Math.round(n*100):0;
};
const reais=(x:number):number=>Math.round(x)/100;
function categoria(codigo:string,nome:string):string {
 if(DECIMO.has(codigo))return '13º salário';
 if(FERIAS.has(codigo))return 'Férias e adicionais';
 if(INDENIZACAO.has(codigo)||nome.includes('INDENIZA'))return 'Indenizações';
 if(nome.includes('RETRO')||nome.includes('MES ANTE'))return 'Retroativos';
 return 'Demais rubricas';
}
function novo(row:Linha):Grupo{
 return {
  matricula:String(row.matricula),nome:row.nome,cargo:row.cargo||'Não informado',
  jornada:row.jornada||'',departamento:row.departamento||'Não informado',
  bruto:0,descontos:0,liquido:0,base:null,categorias:new Map(),rubricas:new Map(),
  vinculos:new Set(),semDesligamento:false,temporario:false
 };
}
function detalhar(g:Grupo):Rubrica[]{
 return [...g.rubricas.values()].sort((a,b)=>b.valor-a.valor||a.codigo.localeCompare(b.codigo)).map(r=>({...r,valor:reais(r.valor)}));
}
function processar(linhas:Linha[],mes:string){
 const grupos=new Map<string,Grupo>();
 const totais=new Map<string,number>();
 const erros:Array<Record<string,unknown>>=[];
 const last=mes+'-01';
 for(const r of linhas){
  const key=JSON.stringify([String(r.matricula),r.nome,r.cargo,r.jornada]);
  let g=grupos.get(key);
  if(!g){g=novo(r);grupos.set(key,g);}
  const bruto=cents(r.bruto),descontos=cents(r.descontos),liquido=cents(r.liquido);
  g.bruto+=bruto;g.descontos+=descontos;g.liquido+=liquido;
  if(r.tipo_inclusao==='0001'&&cents(r.salario_base)>0)g.base=Math.max(g.base||0,cents(r.salario_base));
  if(r.desligamento==null||String(r.desligamento)>last)g.semDesligamento=true;
  if(/CONTRAT|TEMPOR/i.test(r.vinculo||''))g.temporario=true;
  g.vinculos.add(JSON.stringify([r.nome,String(r.matricula)]));
  let somap=0,somad=0;
  for(const item of Array.isArray(r.rubricas)?r.rubricas:[]){
   const valor=cents(item.valor),codigo=String(item.codigo||'').padStart(4,'0');
   const nome=String(item.rubrica||'Sem descrição');
   // Janeiro/2026 não contém campo tipo; o código 0400 é desconto.
   const tipo=(item.tipo||((codigo==='0400'||nome.toUpperCase()==='DESCONTOS')?'DESCONTO':'PROVENTO')).toUpperCase();
   if(tipo==='PROVENTO'){
    somap+=valor;const cat=categoria(codigo,nome.toUpperCase());
    g.categorias.set(cat,(g.categorias.get(cat)||0)+valor);
    totais.set(cat,(totais.get(cat)||0)+valor);
    const chave=JSON.stringify([codigo,nome,cat]);
    const old=g.rubricas.get(chave);
    g.rubricas.set(chave,{codigo,nome,categoria:cat,valor:(old?.valor||0)+valor});
   } else if(tipo==='DESCONTO') somad+=valor;
  }
  const difBruto=bruto-somap,difDescontos=descontos-somad,difLiquido=bruto-descontos-liquido;
  if([difBruto,difDescontos,difLiquido].some(v=>Math.abs(v)>2)){
   erros.push({
    id:'conciliacao-'+r.id,matricula:String(r.matricula),nome:r.nome,cargo:r.cargo,departamento:r.departamento,
    titulo:'Diferença aritmética nas rubricas',detalhes:'Os valores de proventos, descontos ou líquido não conferem com a soma das rubricas.',
    bruto:reais(bruto),diferenca_bruto:reais(difBruto),diferenca_descontos:reais(difDescontos),
    diferenca_liquido:reais(difLiquido),rubricas:[],status:'requer_conferencia'
   });
  }
 }
 return {grupos,totais,erros};
}
const fontes=[
 {nome:'Edital de concurso 2023 (vagas oferecidas, não quadro legal)',url:'https://www.vicosa.mg.gov.br/abrir_arquivo.aspx?arquivo=%7BC4DCEAED-EB8C-D471-C5AD-B24AC3A2BD75%7D.pdf&cdLocal=18',tipo:'edital_nao_normativo'},
 {nome:'Plano de carreira do magistério citado pelo edital municipal',url:'https://www.vicosa.mg.gov.br/abrir_arquivo.aspx?arquivo=%7B22A80EE7-4AC0-AD31-6CBB-2BA3DEE2E82C%7D.pdf&cdLocal=18',tipo:'referencia_indireta'},
 {nome:'Portal da Transparência de Viçosa',url:'https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml',tipo:'folha'}
];
const fonte=fontes[2].url;
export function auditarFolha(linhas:Linha[],mes:string){
 const mesAnterior=Number(mes.slice(-2))>1?'2026-'+String(Number(mes.slice(-2))-1).padStart(2,'0'):null;
 const correntes=linhas.filter(x=>x.mes===mes);
 const passadas=mesAnterior?linhas.filter(x=>x.mes===mesAnterior):[];
 if(!correntes.length)throw new Error('Folha não disponível para o período solicitado.');
 const atual=processar(correntes,mes);
 const anterior=processar(passadas,mesAnterior||mes);
 const bruto=[...atual.grupos.values()].reduce((s,g)=>s+g.bruto,0);
 const brutoAnterior=[...anterior.grupos.values()].reduce((s,g)=>s+g.bruto,0);
 const explicados:Array<Record<string,unknown>>=[];
 const revisoes:Array<Record<string,unknown>>=[];
 for(const [chave,g] of atual.grupos){
  const antes=anterior.grupos.get(chave);
  if(!antes||antes.bruto<=0)continue;
  const variacao=g.bruto-antes.bruto;
  const ocasional=EVENTUAIS.reduce((s,cat)=>s+(g.categorias.get(cat)||0)-(antes.categorias.get(cat)||0),0);
  const residual=variacao-ocasional;
  if(variacao>=150000&&variacao>=antes.bruto*.3&&ocasional>0&&Math.abs(residual)<=Math.max(70000,antes.bruto*.15)){
   explicados.push({
    id:'exp-'+mes+'-'+g.matricula+'-'+explicados.length,nome:g.nome,matricula:g.matricula,cargo:g.cargo,departamento:g.departamento,
    bruto_anterior:reais(antes.bruto),bruto_atual:reais(g.bruto),aumento:reais(variacao),
    eventuais_variacao:reais(ocasional),residual:reais(residual),rubricas:detalhar(g)
   });
  }
  if(g.base!=null&&antes.base!=null&&antes.base>0){
   const dif=g.base-antes.base;
   if(Math.abs(dif)>=30000&&Math.abs(dif)>=antes.base*.15){
    revisoes.push({
     id:'base-'+mes+'-'+g.matricula+'-'+revisoes.length,nome:g.nome,matricula:g.matricula,
     cargo:g.cargo,departamento:g.departamento,base_anterior:reais(antes.base),
     base_atual:reais(g.base),diferenca:reais(dif),rubricas:detalhar(g),
     explicacao:'Alteração de vencimento-base identificada. Conferir progressão, reajuste, enquadramento, atos funcionais e tabela vigente antes de classificar como irregular.'
    });
   }
  }
 }
 explicados.sort((a,b)=>Number(b.aumento)-Number(a.aumento));
 revisoes.sort((a,b)=>Math.abs(Number(b.diferenca))-Math.abs(Number(a.diferenca)));
 const rubricas=CATEGORIAS.map(cat=>{
  const valor=atual.totais.get(cat)||0,antes=anterior.totais.get(cat)||0;
  return {categoria:cat,atual:reais(valor),anterior:reais(antes),variacao:reais(valor-antes)};
 });
 const resumo={
  mes,mes_anterior:mesAnterior,fonte,
  cobertura:{linhas:correntes.length,vinculos:atual.grupos.size,linhas_anterior:passadas.length},
  financeiro:{bruto:reais(bruto),bruto_anterior:mesAnterior?reais(brutoAnterior):null,
   variacao:mesAnterior?reais(bruto-brutoAnterior):null,rubricas},
  contagens:{inconsistencias_aritmeticas:atual.erros.length,variacoes_explicadas:explicados.length,
   revisoes_base:revisoes.length,verificacoes_legais_automaticas:0},
  inconsistencias:atual.erros.slice(0,40),explicados:explicados.slice(0,30),revisoes:revisoes.slice(0,30),
  nota:'A soma foi feita com todas as inclusões e rubricas da competência. Sem quadro de cargos e tabelas legais consolidados, não é possível concluir excesso ou remuneração ilegal.',
  politica:'Alerta aritmético distinto de conferência legal. Férias, 13º e indenizações são reconhecidos na composição.'
 };
 // Vínculos observados por cargo+jornada. Edital de concurso NÃO determina o quadro máximo legal.
 const gruposCargo=new Map<string,{cargo:string;jornada:string;vinculos_folha:number;vinculos_sem_desligamento_identificado:number;vinculos_temporarios_identificados:number}>();
 for(const g of atual.grupos.values()){
  if(!g.cargo.trim())continue;
  const key=JSON.stringify([g.cargo,g.jornada]);
  let c=gruposCargo.get(key);
  if(!c){c={cargo:g.cargo,jornada:g.jornada,vinculos_folha:0,vinculos_sem_desligamento_identificado:0,vinculos_temporarios_identificados:0};gruposCargo.set(key,c);}
  c.vinculos_folha+=1;
  if(g.semDesligamento)c.vinculos_sem_desligamento_identificado+=1;
  if(g.temporario)c.vinculos_temporarios_identificados+=1;
 }
 const cargos=[...gruposCargo.values()].sort((a,b)=>b.vinculos_folha-a.vinculos_folha||a.cargo.localeCompare(b.cargo,'pt-BR')).map(x=>({
  ...x,vagas_legais:null,excedentes:null,situacao:'aguardando_quadro_legal_vigente',norma_quadro:null
 }));
 const quadro={mes,cargos,grupos:cargos.length,excessos_confirmados:null,fonte_folha:fonte,
  fontes_referencia:fontes,nota:'Os números representam vínculos observados na folha, não cargos legalmente ocupados. O quadro legal consolidado não está disponível. Não inferir excedentes.'};
 return {auditoria:resumo,quadro};
}
