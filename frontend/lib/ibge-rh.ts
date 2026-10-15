// Referência pública verificada em 15/10/2026 via API SIDRA/IBGE, município 3171303.
// A edição MUNIC 2023 não descreve a folha mensal de 2026.
export type TipoAdministracao='direta'|'indireta';
export type VinculoIBGE='Estatutários'|'Celetistas'|'Somente comissionados'|'Estagiários'|'Sem vínculo permanente'|'Sem declaração';
export type RHIBGE={
  ano:number;municipio:string;codigo_ibge:string;fonte:string;consultado_em:string;
  origens:{tipo:TipoAdministracao;total:number;vinculos:{nome:VinculoIBGE;total:number|null}[]}[];
  total:number;observacao:string;modo:'api'|'referencia_validada'
};
export const API_SIDRA_RH='https://apisidra.ibge.gov.br/values/t/5881/n6/3171303/v/all/p/2023/c12471/all';
export const PORTAL_RH='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml';
export const FAIXAS_RH=['Até R$ 2 mil','R$ 2–4 mil','R$ 4–6 mil','R$ 6–8 mil','R$ 8–10 mil','R$ 10–12 mil','Acima de R$ 12 mil'];
const tipos=['Estatutários','Celetistas','Somente comissionados','Estagiários','Sem vínculo permanente','Sem declaração'] as const;
export const IBGE_RH_VALIDADO:RHIBGE={
  ano:2023,municipio:'Viçosa (MG)',codigo_ibge:'3171303',
  fonte:API_SIDRA_RH,consultado_em:'2026-10-15',modo:'referencia_validada',
  origens:[
    {tipo:'direta',total:1526,vinculos:[
      {nome:'Estatutários',total:914},{nome:'Celetistas',total:null},
      {nome:'Somente comissionados',total:240},{nome:'Estagiários',total:372},
      {nome:'Sem vínculo permanente',total:null},{nome:'Sem declaração',total:null}
    ]},
    {tipo:'indireta',total:360,vinculos:[
      {nome:'Estatutários',total:190},{nome:'Celetistas',total:131},
      {nome:'Somente comissionados',total:13},{nome:'Estagiários',total:26},
      {nome:'Sem vínculo permanente',total:null},{nome:'Sem declaração',total:null}
    ]}
  ],total:1886,
  observacao:'MUNIC/IBGE 2023: pessoal ocupado nas administrações direta e indireta. Não corresponde ao quadro mensal de 2026. Traços da fonte foram preservados como ausência de valor.'
};
export function normalizarIBGE(raw:unknown):RHIBGE{
 if(!Array.isArray(raw)||raw.length<12)throw new Error('Resposta de RH incompleta do IBGE.');
 const dados=raw.slice(1) as Record<string,unknown>[];
 const out=JSON.parse(JSON.stringify(IBGE_RH_VALIDADO)) as RHIBGE;
 const map:{[k:string]:VinculoIBGE}={'Estatutários':'Estatutários','Celetistas':'Celetistas','Somente comissionados':'Somente comissionados','Estagiários':'Estagiários','Sem vínculo permanente':'Sem vínculo permanente','Sem declaração':'Sem declaração'};
 for(const registro of dados){
  if(String(registro.D1C)!=='3171303'||String(registro.D3C)!=='2023'||String(registro.D5N)!=='Total')throw new Error('Código IBGE, ano ou classificação incompatível.');
  const escopo=registro.D2C==='1872'?'direta':registro.D2C==='1874'?'indireta':null;
  if(!escopo)throw new Error('Classificação administrativa não reconhecida.');
  const valor=String(registro.V);
  if(valor!=='-'&&!/^[0-9]+$/.test(valor))throw new Error('Valor de RH inválido do IBGE.');
  const parsed=valor==='-'?null:Number(valor);
  const target=out.origens.find(x=>x.tipo===escopo)!;
  if(registro.D4N==='Total'&&parsed!==null)target.total=parsed;
  else if(map[String(registro.D4N)]){
   const row=target.vinculos.find(x=>x.nome===map[String(registro.D4N)])!;
   row.total=parsed;
  }
 }
 if(out.origens.some(x=>x.total<1||x.total>50000))throw new Error('Contagem inconsistente.');
 out.total=out.origens.reduce((s,x)=>s+x.total,0);
 out.modo='api';out.consultado_em=new Date().toISOString();
 return out;
}
