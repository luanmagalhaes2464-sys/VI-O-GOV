/**
 * Secretaria de Educação — Viçosa/MG.
 * Registre SOMENTE números fundamentados; null significa "não apurado", nunca zero.
 * Os agregados foram reportados pela Câmara de Viçosa, não extraídos automaticamente
 * de microdados do Inep. Dados por escola poderão ser adicionados com ano e fonte.
 */
export type UnidadeEscolar={
  codigo_inep:string;
  nome:string;
  bairro:string;
  localizacao:'Urbana'|'Rural'|'Não informada';
  etapas:string[];
  ano:number;
  matriculas:number|null;
  docentes:number|null;
  turmas:number|null;
  fonte:string;
  fonte_url:string;
};
export const fontesEducacao=[
  {id:'censo',nome:'INEP • Catálogo de Escolas',descricao:'Cadastro oficial por unidade: código, dependência municipal, endereço, modalidade e situação de funcionamento.',url:'https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/inep-data/catalogo-de-escolas/'},
  {id:'estatisticas',nome:'INEP • Estatísticas Censo Escolar',descricao:'Matrículas, docentes e indicadores municipais por rede de ensino e ano de referência.',url:'https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/inep-data/estatisticas-censo-escolar'},
  {id:'microdados',nome:'INEP • Microdados 2025',descricao:'Dados abertos detalhados para conferência e consolidação por escola e município.',url:'https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos/microdados/censo-escolar'},
  {id:'camara',nome:'Câmara Municipal de Viçosa • 17/12/2025',descricao:'Audiência sobre inclusão escolar: referência histórica de 19 escolas municipais.',url:'https://www.vicosa.mg.leg.br/imprensa/noticias/2025/12-2025/audiencia-publica-aponta-desafios-e-proximos-passos-para-a-inclusao-escolar-em-vicosa'}
];
export const indicadoresEducacao=[
  {id:'escolas',titulo:'Escolas municipais',valor:19,unidade:'unidades',ano:2025,qualidade:'Informado em audiência pública',fonte:'Câmara Municipal de Viçosa — 17/12/2025',fonte_url:fontesEducacao[3].url,observacao:'Informação declarada em audiência, não uma contagem automatizada do cadastro do INEP de 2026.'},
  {id:'matriculas',titulo:'Matrículas da rede municipal',valor:null,unidade:'matrículas',ano:null,qualidade:'Aguardando consolidação',fonte:'INEP / Secretaria Municipal',fonte_url:fontesEducacao[1].url,observacao:'Não substituir pelo total de estudantes de todas as redes de Viçosa.'},
  {id:'docentes',titulo:'Docentes da rede municipal',valor:null,unidade:'docentes',ano:null,qualidade:'Aguardando consolidação',fonte:'INEP / Secretaria Municipal',fonte_url:fontesEducacao[1].url,observacao:'Docentes no Censo Escolar não são necessariamente o mesmo conceito de vínculos na folha de RH.'},
  {id:'turmas',titulo:'Turmas da rede municipal',valor:null,unidade:'turmas',ano:null,qualidade:'Aguardando consolidação',fonte:'INEP / Secretaria Municipal',fonte_url:fontesEducacao[2].url,observacao:'Usar sempre o mesmo ano de referência e a dependência municipal.'}
] as const;
/**
 * Sem escolas individuais importadas ainda. Evitar gerar escolas demonstrativas
 * ou confundir uma contagem histórica com o catálogo de unidades em operação.
 */
export const unidadesEscolares:UnidadeEscolar[]=[];
