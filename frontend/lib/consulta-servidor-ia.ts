import type {Pool} from 'pg';

type Historico={autor:string;texto:string};
type LinhaRH={
 mes:string;nome:string;matricula:string;cargo:string;departamento:string;
 jornada:string|null;bruto:string;liquido:string;descontos:string;
 salario_base:string|null;quinquenio:string|null;inclusoes_pagamento:number;
};
export type ConsultaIndividual={resposta:string;identificado:boolean;ambiguo?:boolean};

const norm=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'')
 .toUpperCase().replace(/[^A-Z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
const moeda=(v:string|number)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'})
 .format(Number(v));
const mesNome=['janeiro','fevereiro','março','abril','maio','junho','julho'];
const palavrasIndividuais=/\b(SALARIO|SALARIAL|REMUNERACAO|VENCIMENTO|RECEBE|RECEBEU|GANHA|GANHOU|BRUTO|LIQUIDO|CONTRACHEQUE|PAGAMENTO|QUINQUENIO|CARGO|FUNCAO|LOTACAO|JORNADA|MATRICULA|TRABALHA|RECEBIDO|PESSOA|SERVIDOR|SERVIDORA)\b/;
const referenciasContexto=/\b(ELE|ELA|DELA|DELE|DELES|DESSA|DESSE|MESMO|MESMA|ESSA|ESSE|CONTINUANDO)\b/;

// Determinar a pessoa pelo nome cadastrado no próprio banco, não por chute do modelo.
// Usa correspondência completa quando disponível; nomes parciais só são aceitos
// se houver uma única correspondência, para evitar expor a remuneração de outra pessoa.
function nomesNaPergunta(frase:string,nomes:string[]):string[]{
 const q=' '+norm(frase)+' ';
 const completas=nomes.filter(n=>q.includes(' '+norm(n)+' '));
 if(completas.length)return completas.sort((a,b)=>b.length-a.length);
 const parciais=nomes.filter(n=>{
  const palavras=norm(n).split(' ');
  const indices: string[]=[];
  for(let i=0;i<palavras.length-1;i++){
   for(let tamanho=Math.min(palavras.length-i,4);tamanho>=2;tamanho--){
    const trecho=palavras.slice(i,i+tamanho).join(' ');
    if(trecho.length>=10&&q.includes(' '+trecho+' '))indices.push(trecho);
   }
  }
  return indices.length>0;
 });
 return parciais;
}

export async function consultarPessoaRH(
 db:Pool,pergunta:string,mes:string,historico:Historico[]
):Promise<ConsultaIndividual|null>{
 const p=norm(pergunta);
 // Consultas agregadas (ranking, cargos, secretarias etc.) são processadas pelo fluxo comum.
 if(!palavrasIndividuais.test(p))return null;
 const nomesRes=await db.query<{nome:string}>(
  "SELECT DISTINCT nome FROM rh_folha_pessoas_2026 WHERE nome IS NOT NULL AND length(trim(nome))>=8");
 const nomes=nomesRes.rows.map(r=>r.nome);
 let encontrados=nomesNaPergunta(pergunta,nomes);
 if(encontrados.length===0&&referenciasContexto.test(p)){
  for(const h of [...historico].reverse()){
   if(h.autor!=='usuario')continue;
   encontrados=nomesNaPergunta(h.texto,nomes);
   if(encontrados.length)break;
  }
 }
 if(!encontrados.length)return null;
 if(encontrados.length>1){
  const opcoes=[...new Set(encontrados)].slice(0,6).join('; ');
  return {identificado:false,ambiguo:true,resposta:
   'Encontrei mais de um nome correspondente na folha: '+opcoes+'. Informe o nome completo para consultar o registro correto.'};
 }
 const nome=encontrados[0];
 const dados=await db.query<LinhaRH>({
  text:`SELECT to_char(competencia,'YYYY-MM') mes,nome,matricula,cargo,departamento,
   jornada,bruto::text,liquido::text,descontos::text,salario_base::text,
   quinquenio::text,inclusoes_pagamento
   FROM rh_folha_pessoas_2026 WHERE nome=$1 ORDER BY competencia DESC,matricula`,
  values:[nome]
 });
 const registros=dados.rows.filter(r=>r.mes===mes);
 const mesNum=Number(mes.split('-')[1])-1;
 const referencia=mesNome[mesNum]+' de 2026';
 if(!registros.length)return {identificado:true,resposta:
  nome+' consta na base de RH, mas não encontrei remuneração na competência '+referencia+'. Você pode solicitar outro mês disponível.'};
 const salBase=/\b(VENCIMENTO BASE|VENCIMENTO-BASE|SALARIO BASE|SALARIO-BASE|PISO)\b/.test(p);
 const perguntaHistorico=/\b(HISTORICO|EVOLUCAO|COMPAR|MUDOU|AUMENTOU|DIMINUIU|ANTERIOR|MESES|MES ANTERIOR)\b/.test(p);
 const detalhes=registros.map(r=>{
  const values=['bruto '+moeda(r.bruto),'líquido '+moeda(r.liquido)];
  if(salBase&&r.salario_base!==null)values.push('vencimento-base registrado '+moeda(r.salario_base));
  return 'Matrícula '+r.matricula+': '+values.join(', ')+
   '. Cargo: '+r.cargo+'. Departamento: '+r.departamento+'.';
 }).join(' ');
 let composicao='';
 // Múltiplas inclusões em uma mesma competência podem ser 13º, férias e
 // pagamentos complementares. O bruto mensal já agrega essas inclusões.
 if(registros.some(r=>Number(r.inclusoes_pagamento)>1)){
  type RubricaIndividual={tipo?:string;valor?:number;rubrica?:string};
  const analiticas=await db.query<{tipo_inclusao:string;rubricas:RubricaIndividual[]}>({
   text:`SELECT tipo_inclusao,rubricas FROM rh_folha_analitica_2026
    WHERE nome=$1 AND competencia=$2::date ORDER BY tipo_inclusao`,
   values:[nome,mes+'-01']
  });
  const categorias=new Map<string,number>();
  for(const linha of analiticas.rows){
   if(linha.tipo_inclusao==='0001')continue;
   for(const r of linha.rubricas||[]){
    if((r.tipo||'').toUpperCase()==='DESCONTO'||!Number.isFinite(Number(r.valor)))continue;
    const categoria=(r.rubrica||'Pagamento complementar').trim();
    categorias.set(categoria,(categorias.get(categoria)||0)+Number(r.valor));
   }
  }
  if(categorias.size){
   composicao=' A competência contém '+registros.map(r=>r.inclusoes_pagamento).join(', ')+' inclusões na folha. '+
    'Rubricas complementares: '+[...categorias].map(([nomeRubrica,valor])=>
     nomeRubrica+' ('+moeda(valor)+')').join('; ')+'.'+
    ' Esses valores já fazem parte da remuneração bruta informada e não devem ser somados novamente.';
  }else composicao=' A competência contém mais de uma inclusão na folha; o valor bruto já é a soma dessas inclusões.';
 }
 const todos=dados.rows.map(r=>({mes:r.mes,bruto:Number(r.bruto)}));
 let complemento='';
 if(perguntaHistorico){
  complemento=' Histórico da remuneração bruta: '+todos.map(r=>
   mesNome[Number(r.mes.split('-')[1])-1]+': '+moeda(r.bruto)).join('; ')+'.';
 }else if(/\b(AUMENT|DIFERENC|VARIACAO)\b/.test(p)){
  const anterior=dados.rows.find(r=>r.mes<mes);
  if(anterior)complemento=' Diferença bruta frente à competência '+anterior.mes+': '+
   moeda(Number(registros[0].bruto)-Number(anterior.bruto))+'.';
 }
 return {identificado:true,resposta:
  'Na folha de '+referencia+', '+nome+' apresenta: '+detalhes+
  composicao+complemento+' Fonte: folha municipal de Recursos Humanos integrada ao Viço Gov. '+
  'Os valores são remuneração registrada, não uma confirmação de depósitos bancários.'};
}
