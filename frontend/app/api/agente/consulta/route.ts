import {NextRequest,NextResponse} from 'next/server';
import {Pool} from 'pg';
import {secretarias} from '../../../../lib/secretarias';
import {unidadesEscolares} from '../../../../lib/educacao-dados';

export const runtime='nodejs';
export const dynamic='force-dynamic';
const globalDb=globalThis as typeof globalThis&{__rhPainelPool?:Pool};
function pool(){
 if(!globalDb.__rhPainelPool){
  const connectionString=process.env.DATABASE_URL;
  if(!connectionString)throw new Error('DATABASE_URL não configurada');
  globalDb.__rhPainelPool=new Pool({connectionString,ssl:{rejectUnauthorized:false},max:5,connectionTimeoutMillis:14000,idleTimeoutMillis:25000});
 }
 return globalDb.__rhPainelPool;
}
type Dep={departamento:string;vinculos:string;bruto:string};
type Cargo={cargo:string;vinculos:string;bruto:string};
type Mensal={mes:string;vinculos:string;bruto:string};
type Rubrica={codigo:string;nome:string;total:string};
type Resposta={modo:string;resposta:string;fontes:string[];escopo:string};
const fonteRH='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml';
const fonteEscolas='https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-escolar';
const toMoney=(x:number|string)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(x)||0);
const number=(x:number)=>new Intl.NumberFormat('pt-BR').format(x);
const normal=(x:string)=>x.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
const anoEscolas=2025;
const totalMatriculas=unidadesEscolares.reduce((x,e)=>x+(e.matriculas||0),0);
const totalTurmas=unidadesEscolares.reduce((x,e)=>x+(e.turmas||0),0);
const docentesPorUnidade=unidadesEscolares.reduce((x,e)=>x+(e.docentes||0),0);
const referenciaEscolas='https://prospectei.app.br/escolas/cidade/vicosa-mg/';
const nowWindow=new Map<string,{count:number,at:number}>();
function resposta(modo:string,valor:string,mes:string,fontes=[fonteRH,referenciaEscolas]):Resposta{
 return {modo,resposta:valor,fontes,escopo:'Viço Gov · dados cadastrados até julho/2026; Censo Escolar 2025'};
}
export async function POST(req:NextRequest){
 try{
  // Limite leve por instância; não substitui autenticação e rate-limit centralizado.
  const ip=(req.headers.get('x-forwarded-for')||'anonimo').split(',')[0].trim().slice(0,64);
  const n=Date.now(),entry=nowWindow.get(ip);
  if(entry&&n-entry.at<60000&&entry.count>=15)
   return NextResponse.json({error:'Aguarde um minuto antes de enviar mais perguntas.'},{status:429});
  nowWindow.set(ip,!entry||n-entry.at>=60000?{count:1,at:n}:{count:entry.count+1,at:entry.at});
  if(nowWindow.size>1500)nowWindow.clear();
  const body=await req.json().catch(()=>null);
  const pergunta=String(body?.pergunta||'').trim();
  const mes=String(body?.mes||'2026-07');
  const deptoAtual=String(body?.departamento||'').slice(0,160);
  if(pergunta.length<4||pergunta.length>600||!/^2026-0[1-7]$/.test(mes))
   return NextResponse.json({error:'Pergunta ou competência inválida.'},{status:422});
  const registros=await Promise.all([
   pool().query<Dep>({text:`SELECT departamento,COUNT(DISTINCT (nome,matricula))::text vinculos,COALESCE(SUM(bruto),0)::text bruto
        FROM rh_folha_pessoas_2026 WHERE competencia=$1::date
        GROUP BY departamento ORDER BY SUM(bruto) DESC`,values:[mes+'-01']}),
   pool().query<Cargo>({text:`SELECT cargo,COUNT(DISTINCT (nome,matricula))::text vinculos,COALESCE(SUM(bruto),0)::text bruto
        FROM rh_folha_pessoas_2026 WHERE competencia=$1::date
        GROUP BY cargo ORDER BY COUNT(DISTINCT (nome,matricula)) DESC LIMIT 45`,values:[mes+'-01']}),
   pool().query<Mensal>({text:`SELECT to_char(competencia,'YYYY-MM') mes,
        COUNT(DISTINCT (nome,matricula))::text vinculos,COALESCE(SUM(bruto),0)::text bruto
        FROM rh_folha_pessoas_2026 WHERE competencia BETWEEN '2026-01-01' AND '2026-07-01'
        GROUP BY competencia ORDER BY competencia`,values:[]}),
   pool().query<Rubrica>({text:`SELECT x.item->>'codigo' codigo, x.item->>'rubrica' nome,
         SUM((x.item->>'valor')::numeric)::text total
       FROM rh_folha_analitica_2026 a CROSS JOIN LATERAL jsonb_array_elements(a.rubricas::jsonb) AS x(item)
       WHERE a.competencia=$1::date AND COALESCE(UPPER(x.item->>'tipo'),'PROVENTO')<>'DESCONTO'
       GROUP BY 1,2 ORDER BY SUM((x.item->>'valor')::numeric) DESC LIMIT 35`,values:[mes+'-01']})
  ]);
  const deps=registros[0].rows;
  const cargos=registros[1].rows;
  const meses=registros[2].rows;
  const rubricas=registros[3].rows;
  const sumBruto=deps.reduce((t,r)=>t+Number(r.bruto||0),0);
  const norm=normal(pergunta);
  const current=meses.find(m=>m.mes===mes);
  const selectedDep=deps.find(d=>deptoAtual&&d.departamento===deptoAtual);
  // Preferir sempre identificadores oficiais de lote e competência.
  const contexto={
   competencia:mes,
   folha:{bruto:Math.round(sumBruto*100)/100,vinculos:current?Number(current.vinculos):null,departamentos:deps.map(d=>({
    nome:d.departamento,vinculos:Number(d.vinculos),bruto:Number(d.bruto)
   })),cargos:cargos.map(c=>({cargo:c.cargo,vinculos:Number(c.vinculos),bruto:Number(c.bruto)})),
    meses:meses.map(m=>({mes:m.mes,vinculos:Number(m.vinculos),bruto:Number(m.bruto)})),
    rubricas:rubricas.map(r=>({codigo:r.codigo,nome:r.nome,total:Number(r.total)}))},
   secretarias:secretarias.map(s=>({sigla:s.sigla,nome:s.nome,slug:s.slug})),
   educacao:{ano:anoEscolas,escolas:unidadesEscolares.length,matriculas:totalMatriculas,turmas:totalTurmas,
    soma_docentes_por_escola:docentesPorUnidade,
    unidades:unidadesEscolares.map(e=>({nome:e.nome,codigo_inep:e.codigo_inep,
     matriculas:e.matriculas,turmas:e.turmas,docentes:e.docentes,localizacao:e.localizacao}))},
   filtros_da_tela:{departamento:deptoAtual||null},caveats:[
    'Os totais por departamento da folha são por vínculos de nome+matrícula, não pessoas únicas ativas.',
    'Remuneração bruta não equivale a despesa total fiscal nem orçamento integral por secretaria.',
    'Censo de escolas 2025 de fonte secundária: 18 unidades, mas Câmara referiu 19; conciliar antes de conclusão legal.',
    'Somatório de docentes por escola pode duplicar docentes e não corresponde à folha.',
    'Sem vaga legal consolidada, é impossível afirmar excedentes ou pagamentos indevidos.'
   ]
  };
  const key=process.env.GEMINI_API_KEY?.trim();
  if(key){
   try{
    const controller=new AbortController();const t=setTimeout(()=>controller.abort(),20000);
    let upstream:Response;
    try{
     upstream=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',{
      method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},
      body:JSON.stringify({
       system_instruction:{parts:[{text:
        'Você é Viço IA, agente de análise do VIÇO GOV, protótipo independente de Viçosa-MG. Responda em português claro e de forma objetiva. Responda somente com base no JSON de dados verificados enviado; se faltar informação ou uma fonte detalhada, diga que os dados ainda não permitem concluir. Informe o mês ou ano pertinente. Não invente leis, números, dotações, nomes de pessoas ou causas de divergências. Não afirme irregularidade apenas a partir da folha bruta. Entenda perguntas sobre escolas, secretarias, cargos, folha, rubricas, séries mensais e valores. Quando existir filtro de departamento, use-o se a pergunta remeter à secretaria selecionada. Respostas não ultrapassam 200 palavras.'}]},
       contents:[{role:'user',parts:[{text:'DADOS DO SISTEMA (JSON): '+JSON.stringify(contexto)+'\n\nPERGUNTA: '+pergunta}]}],
       generationConfig:{temperature:0.1,maxOutputTokens:900}
      }),signal:controller.signal,cache:'no-store'
     });
    }finally{clearTimeout(t)}
    if(upstream.ok){
     const result=await upstream.json();
     const parts=result?.candidates?.[0]?.content?.parts||[];
     const txt=parts.map((p:{text?:string})=>p.text||'').join(' ').trim();
     if(txt)return NextResponse.json(resposta('gemini',txt,mes));
    }
   }catch(e){console.warn('Viço IA: modelo indisponível, consultando motor baseado em regras',(e as Error).name);}
  }
  // Sem chave de modelo, responder por consultas determinísticas e não simular IA generativa.
  let answer:string;
  const matchDep=deps.find(d=>norm.includes(normal(d.departamento))||(
   d.departamento.length>15&&d.departamento.split(/\s+-\s+/).some(v=>v.length>10&&norm.includes(normal(v)))
  ))||deps.find(d=>{
   const sl=secretarias.find(s=>norm.includes(normal(s.curto))||norm.includes(normal(s.sigla)));
   return sl?d.departamento.includes(sl.sigla):false;
  })||selectedDep;
  if(/ESCOLA|MATRICUL|ALUNO|TURMA|EDUCACAO INFANTIL|CENSO/.test(norm)&&!/SALARIO|PROFESSOR NA FOLHA|FOLHA/.test(norm)){
   const unidade=unidadesEscolares.find(e=>norm.includes(normal(e.nome))||norm.includes(e.codigo_inep));
   answer=unidade?`${unidade.nome} (INEP ${unidade.codigo_inep}) registrou em 2025 ${number(unidade.matriculas||0)} matrículas, ${number(unidade.turmas||0)} turmas e ${number(unidade.docentes||0)} docentes no cadastro consultado.`:
    `Na base de escolas municipais de Viçosa, referente ao Censo Escolar 2025, constam ${number(unidadesEscolares.length)} escolas, ${number(totalMatriculas)} matrículas e ${number(totalTurmas)} turmas. A soma de docentes por escola é ${number(docentesPorUnidade)} e pode repetir profissionais que atuam em mais de uma unidade. A Câmara mencionou 19 escolas em outra referência; ainda não conciliamos a diferença.`;
  }else if(/QUINQUENIO|PISO|EXCEDEN|VAGA AUTORIZ|ILEGAL|FRAUDE/.test(norm)){
   answer='O sistema ainda não contém, para todos os cargos, as tabelas legais e vagas vigentes consolidadas com os atos funcionais de cada vínculo. Por isso, não posso afirmar irregularidade, excesso de pessoal ou valor ilegal apenas pela folha. Para quinquênios, é preciso confirmar a regra e a situação funcional aplicável.';
  }else if(/RUBRICA|DECIMO|13|FERIA|INDENIZ|RETROATIV/.test(norm)){
   const top=rubricas.slice(0,12);
   answer=`Na folha de ${mes}, as rubricas de maior valor são: ${top.map(x=>`${x.nome} (${toMoney(x.total)})`).join('; ')}. Para pesquisar uma rubrica específica e os nomes vinculados, abra o detalhamento de rubricas em Recursos Humanos.`;
  }else if(/CARGO|FUNCAO|PROFESSOR|MOTORISTA|ENFERMEIR/.test(norm)){
   const cargo=cargos.find(c=>norm.includes(normal(c.cargo)));
   answer=cargo?`Na folha de ${mes}, o cargo ${cargo.cargo} apresenta ${number(Number(cargo.vinculos))} vínculos e remuneração bruta somada de ${toMoney(cargo.bruto)}. Isso não comprova pessoas ativas distintas.`:
    `Os cargos com mais vínculos na folha de ${mes} são: ${cargos.slice(0,8).map(c=>`${c.cargo} (${number(Number(c.vinculos))})`).join('; ')}. Se quiser, pergunte por um cargo específico.`;
  }else if(/EVOLU|AUMENT|DIMINUI|COMPAR|MES ANTERIOR|HISTORIC/.test(norm)){
   answer='Evolução mensal da folha bruta em 2026: '+meses.map(m=>`${m.mes}: ${toMoney(m.bruto)}`).join('; ')+'. Alterações podem envolver 13º, férias e outras rubricas, sem que isso implique aumento do vencimento-base.';
  }else if(/SECRETARIA|DEPARTAMENTO|GAST|DESPES|FOLHA|SERVIDOR|FUNCIONARIO|REMUNERAC|TOTAL/.test(norm)){
   if(matchDep)answer=`No departamento "${matchDep.departamento}", na competência ${mes}, a folha registra ${number(Number(matchDep.vinculos))} vínculos e ${toMoney(matchDep.bruto)} em remuneração bruta. Não é o orçamento total do órgão nem a quantidade necessariamente ativa de pessoas.`;
   else answer=`Na folha de ${mes}, foram registrados ${number(Number(current?.vinculos||0))} vínculos e ${toMoney(sumBruto)} em remuneração bruta. Os departamentos com maior valor são: ${deps.slice(0,5).map(d=>`${d.departamento} (${toMoney(d.bruto)})`).join('; ')}.`;
  }else if(/OLA|OI|BOM DIA|BOA TARDE|BOA NOITE|O QUE VOCE/.test(norm)){
   answer='Olá! Posso analisar as informações já integradas ao Viço Gov: servidores, remuneração, departamentos, cargos, rubricas, escolas municipais, turmas e matrículas. Informe o tema e, se necessário, o mês.';
  }else{
   answer='Não encontrei dados suficientes no Viço Gov para responder com segurança a essa pergunta. Já consigo consultar folha, cargos, despesas brutas por secretaria, escolas, matrículas e turmas. Para outras informações, precisamos integrar novas fontes ou habilitar um modelo de linguagem conectado a esses dados.';
  }
  return NextResponse.json(resposta('consulta_local',answer,mes));
 }catch(e){
  console.error('Falha no Viço IA',(e as Error).name,(e as Error).message);
  return NextResponse.json({error:'A consulta do agente aos dados do sistema está temporariamente indisponível.'},{status:503});
 }
}
