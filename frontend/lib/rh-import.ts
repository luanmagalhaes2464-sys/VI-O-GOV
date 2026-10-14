/**
 * Leitura no navegador de uma exportação pública de RH. Nunca transmite o CSV.
 * Persistem nesta aba apenas agregados; nomes e matrículas não são guardados.
 */
export type GrupoRH={
  secretaria:string;cargo:string;vinculo:string;situacao:string;
  faixa_bruto:string;faixa_liquido:string;quantidade:number;bruto:number;liquido:number
};
export type PainelRH={
  referencia:string;matriculas:number;pessoas:number;bruto:number;liquido:number;
  linhas:number;grupos:GrupoRH[];importadoEm:string;nota:string;aviso:string|null
};
export const RH_SESSION_KEY='vico-gov-rh-agregado-2026-v1';
export const FONTE_RH='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml';
export const BRUTO_OFICIAL_JAN_2026=11822334.05;
export const FAIXAS=[
  {value:'ate_2',label:'Até R$ 2 mil'},{value:'2_4',label:'R$ 2 mil a R$ 4 mil'},
  {value:'4_6',label:'R$ 4 mil a R$ 6 mil'},{value:'6_8',label:'R$ 6 mil a R$ 8 mil'},
  {value:'8_10',label:'R$ 8 mil a R$ 10 mil'},{value:'10_12',label:'R$ 10 mil a R$ 12 mil'},
  {value:'acima_12',label:'Acima de R$ 12 mil'}
];
const normalizar=(s:string)=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'').trim();
export const moeda=(n:number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
export const numero=(n:number)=>new Intl.NumberFormat('pt-BR').format(n);

function linhasCSV(text:string,delim:string):string[][]{
 const rows:string[][]=[];let row:string[]=[],val='',inside=false;
 for(let i=0;i<text.length;i++){
  const c=text[i];
  if(c==='"'){
   if(inside&&text[i+1]==='"'){val+='"';i++}else inside=!inside;
  }else if(c===delim&&!inside){row.push(val);val=''}
  else if((c==='\n'||c==='\r')&&!inside){
   if(c==='\r'&&text[i+1]==='\n')i++;
   row.push(val);if(row.some(t=>t.trim()))rows.push(row);row=[];val='';
  }else val+=c;
 }
 if(inside)throw new Error('O CSV contém aspas não fechadas. Baixe novamente o arquivo oficial.');
 row.push(val);if(row.some(t=>t.trim()))rows.push(row);
 return rows;
}
function localizarCabecalho(text:string){
 let resultado:{rows:string[][];idx:number;map:Map<string,number>}|null=null;
 for(const delim of [';',',','\t','|']){
  const rows=linhasCSV(text,delim);
  for(let i=0;i<Math.min(rows.length,20);i++){
   const cols=rows[i].map(normalizar);
   const idx=(...keys:string[])=>cols.findIndex(c=>keys.some(k=>c===normalizar(k)));
   const matricula=idx('matricula');const nome=idx('servidor','nome','nomeservidor');
   const bruto=idx('valorbruto','bruto','remuneracaobruta','totalbruto');
   const liquido=idx('valorliquido','liquido','remuneracaoliquida','totalliquido');
   const cargo=idx('cargofuncao','cargo','funcao');
   const depto=idx('dpto','departamento','secretaria','lotacao');
   const vinculo=idx('vinculo','tipovinculo','regime');
   if([matricula,nome,bruto,liquido,cargo,depto,vinculo].some(v=>v<0))continue;
   const map=new Map(cols.map((x,j)=>[x,j] as [string,number]));
   resultado={rows,idx:i,map};break;
  }
  if(resultado)break;
 }
 if(!resultado)throw new Error('Não encontrei as colunas matrícula, servidor, cargo/função, vínculo, departamento e valores bruto/líquido. Exporte a aba Folha de Pagamento no formato CSV.');
 return resultado;
}
function numBR(s:string):number{
 const t=s.replace(/\u00a0/g,'').replace(/r\$/gi,'').replace(/\s/g,'').trim();
 if(!t||t==='-')return 0;
 let numeric=t;
 if(t.includes(',')&&t.includes('.'))numeric=t.lastIndexOf(',')>t.lastIndexOf('.')?t.replace(/\./g,'').replace(',','.'):t.replace(/,/g,'');
 else if(t.includes(','))numeric=t.replace(',','.');
 const n=Number(numeric);
 if(!Number.isFinite(n))throw new Error('Valor monetário inválido na exportação: '+s.slice(0,20));
 return Math.round(n*100)/100;
}
function faixa(n:number):string{
 if(n<=2000)return 'ate_2';if(n<=4000)return '2_4';if(n<=6000)return '4_6';
 if(n<=8000)return '6_8';if(n<=10000)return '8_10';if(n<=12000)return '10_12';return 'acima_12';
}
function categoria(s:string):string{
 const v=normalizar(s);
 if(v.includes('aposentad')||v.includes('inativo'))return 'aposentado';
 if(v.includes('comissionad')||v.includes('cargoconfianca'))return 'comissionado';
 if(v.includes('efetivo')||v.includes('efetiv'))return 'efetivo';
 return 'outro';
}
export function importarCSV(text:string):PainelRH{
 if(text.length>35_000_000)throw new Error('Arquivo muito grande. Selecione a exportação CSV mensal da folha de pagamento.');
 const base=localizarCabecalho(text.replace(/^\uFEFF/,''));
 const headers=base.map;
 const index=(...names:string[])=>names.map(normalizar).map(n=>headers.get(n)).find(n=>n!==undefined);
 const get=(row:string[],...names:string[])=>{const n=index(...names);return n!==undefined?(row[n]??'').trim():''};
 const matriculas=new Map<string,{nome:string;grupo:Omit<GrupoRH,'quantidade'>}>();
 const meses=new Set<string>(),anos=new Set<string>();let avaliadas=0;
 for(const row of base.rows.slice(base.idx+1)){
  const mat=get(row,'matricula');const nome=get(row,'servidor','nome','nomeservidor');
  if(!mat||!nome)continue;
  const a=get(row,'ano','exercicio'),m=get(row,'mes','mesreferencia');
  if(a)anos.add(a);if(m)meses.add(m);
  const bruto=numBR(get(row,'valorbruto','bruto','remuneracaobruta','totalbruto'));
  const liquido=numBR(get(row,'valorliquido','liquido','remuneracaoliquida','totalliquido'));
  if(bruto<0||liquido<0)throw new Error('O CSV contém valores negativos. Confira se a exportação é uma folha mensal completa.');
  const secretaria=get(row,'dpto','departamento','secretaria','lotacao')||'Não informado';
  const cargo=get(row,'cargofuncao','cargo','funcao')||'Não informado';
  const vinculo=get(row,'vinculo','tipovinculo','regime')||'Não informado';
  const grupo={secretaria,cargo,vinculo,situacao:categoria(vinculo),faixa_bruto:faixa(bruto),faixa_liquido:faixa(liquido),bruto,liquido};
  const anterior=matriculas.get(mat);
  if(anterior&&JSON.stringify(anterior.grupo)!==JSON.stringify(grupo))
   throw new Error('A matrícula '+mat+' aparece com lançamentos diferentes. Precisamos identificar se há múltiplas rubricas antes de calcular.');
  matriculas.set(mat,{nome,grupo});avaliadas++;
 }
 if(matriculas.size<100)throw new Error('O CSV contém menos de 100 matrículas. Pode estar filtrado ou incompleto; exporte a folha inteira sem filtros.');
 if(anos.size!==1||meses.size!==1)throw new Error('Não foi possível verificar uma única competência mensal no arquivo. Exporte uma folha por mês.');
 const ano=[...anos][0];const mes=Number([...meses][0]);
 if(!/^\d{4}$/.test(ano)||mes<1||mes>12)throw new Error('Ano ou mês inválido na exportação.');
 const grouped=new Map<string,GrupoRH>(),pessoas=new Set<string>();
 let bruto=0,liquido=0;
 for(const {nome,grupo} of matriculas.values()){
  pessoas.add(normalizar(nome));
  bruto+=grupo.bruto;liquido+=grupo.liquido;
  const {bruto:b,liquido:l,...dim}=grupo;
  const key=JSON.stringify(dim);
  const existing=grouped.get(key);
  if(existing){existing.quantidade++;existing.bruto=Math.round((existing.bruto+b)*100)/100;existing.liquido=Math.round((existing.liquido+l)*100)/100}
  else grouped.set(key,{...dim,quantidade:1,bruto:b,liquido:l});
 }
 bruto=Math.round(bruto*100)/100;liquido=Math.round(liquido*100)/100;
 const referencia=ano+'-'+String(mes).padStart(2,'0');
 const divergencia=referencia==='2026-01'&&Math.abs(bruto-BRUTO_OFICIAL_JAN_2026)>BRUTO_OFICIAL_JAN_2026*0.02;
 if(divergencia)throw new Error('A soma da folha difere em mais de 2% do total bruto oficial de janeiro/2026. Verifique se a aba e os filtros da exportação estão corretos.');
 return {
  referencia,matriculas:matriculas.size,pessoas:pessoas.size,bruto,liquido,linhas:avaliadas,
  grupos:[...grouped.values()],importadoEm:new Date().toISOString(),
  nota:'Pessoas estimadas por nomes distintos (não é identificador único oficial). Matrículas são vínculos da folha.',
  aviso:avaliadas!==matriculas.size?'Foram eliminadas linhas repetidas da mesma matrícula, após conferência dos valores.':null
 };
}
export function lerSessao():PainelRH|null{
 try{const s=sessionStorage.getItem(RH_SESSION_KEY);if(!s)return null;const obj=JSON.parse(s) as PainelRH;return obj.grupos?.length&&obj.matriculas>=100?obj:null}catch{return null}
}
export function salvarSessao(data:PainelRH){
 sessionStorage.setItem(RH_SESSION_KEY,JSON.stringify(data));
}
export function limparSessao(){sessionStorage.removeItem(RH_SESSION_KEY)}
