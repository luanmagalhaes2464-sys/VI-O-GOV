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
  {id:'escolas',titulo:'Escolas municipais',valor:18,unidade:'unidades',ano:2025,qualidade:'Unidades municipais ativas no Censo 2025',fonte:'Prospectei · Censo Escolar 2025',fonte_url:'https://prospectei.app.br/escolas/cidade/vicosa-mg/',observacao:'18 escolas ativas listadas no Censo 2025; a Câmara mencionou 19 unidades em audiência. Divergência de critério/cobertura a confirmar.'},
  {id:'matriculas',titulo:'Matrículas da rede municipal',valor:4736,unidade:'matrículas',ano:2025,qualidade:'Soma das 18 unidades municipais no Censo 2025',fonte:'Prospectei · Censo Escolar 2025',fonte_url:'https://prospectei.app.br/escolas/cidade/vicosa-mg/',observacao:'Total somente das escolas de dependência municipal, sem redes estadual, federal e privada.'},
  {id:'docentes',titulo:'Professores na folha de RH',valor:null,unidade:'docentes',ano:null,qualidade:'Aguardando consolidação',fonte:'Portal da Transparência de Viçosa (RH)',fonte_url:'https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml',observacao:'Contagem de matrículas funcionais com cargo de professor na folha de 2026, calculada pela consulta ao Neon.'},
  {id:'turmas',titulo:'Turmas da rede municipal',valor:263,unidade:'turmas',ano:2025,qualidade:'Soma por unidade no Censo 2025',fonte:'Prospectei · Censo Escolar 2025',fonte_url:'https://prospectei.app.br/escolas/cidade/vicosa-mg/',observacao:'Somatório de turmas do Censo 2025 das 18 escolas municipais listadas.'}
] as const;
/** Registros municipais republicados do Censo Escolar 2025 (INEP/MEC).
 * Fonte intermediária: Prospectei — conferir com catálogo oficial INEP.
 * 18 escolas ativas cadastradas; a Câmara municipal informou 19 em outra base.
 * A soma de matrículas de todos os registros é 4.736.
 * O campo docentes por escola refere-se ao Censo, NÃO à folha municipal 2026.
 */
export const unidadesEscolares:UnidadeEscolar[]=[
 {codigo_inep:"31361208",nome:"Centro Municipal de Educação Doutor Januário de Andrade Fontes",bairro:"Centro",localizacao:"Urbana",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:795,docentes:54,turmas:44,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31361208-centro-municipal-de-educacao-doutor-januario-de-andrade-fontes/'},
 {codigo_inep:"31383600",nome:"Centro Municipal de Educação Infantil Doutor Celito Francisco Sari",bairro:"Sagrados Corações",localizacao:"Urbana",etapas:["Educação Infantil"],ano:2025,matriculas:75,docentes:6,turmas:5,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31383600-centro-municipal-de-educacao-infantil-doutor-celito-francisco-sari/'},
 {codigo_inep:"31268674",nome:"Centro Municipal de Educação Infantil Getúlio Dornelles Vargas",bairro:"Não informado",localizacao:"Urbana",etapas:["Educação Infantil"],ano:2025,matriculas:113,docentes:10,turmas:9,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31268674-centro-municipal-de-educacao-infantil-getulio-dornelles-vargas/'},
 {codigo_inep:"31383570",nome:"Centro Municipal de Educação Infantil Leda de Bittencourt Bandeira",bairro:"Nova Viçosa",localizacao:"Urbana",etapas:["Educação Infantil"],ano:2025,matriculas:128,docentes:10,turmas:9,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31383570-centro-municipal-de-educacao-infantil-leda-de-bittencourt-bandeira/'},
 {codigo_inep:"31270890",nome:"Centro Municipal de Educação Infantil Maria José Santana",bairro:"Santo Antônio",localizacao:"Urbana",etapas:["Educação Infantil"],ano:2025,matriculas:330,docentes:29,turmas:23,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31270890-centro-municipal-de-educacao-infantil-maria-jose-santana/'},
 {codigo_inep:"31383562",nome:"Centro Municipal de Educação Infantil Professora Therezinha Mucci Xavier",bairro:"Lourdes",localizacao:"Urbana",etapas:["Educação Infantil"],ano:2025,matriculas:229,docentes:13,turmas:12,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31383562-centro-municipal-de-educacao-infantil-professora-therezinha-mucci-xavier/'},
 {codigo_inep:"31130028",nome:"Escola Municipal Almiro Paraíso",bairro:"Zona rural",localizacao:"Rural",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:133,docentes:17,turmas:10,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31130028-escola-municipal-almiro-paraiso/'},
 {codigo_inep:"31236586",nome:"Escola Municipal Anita Chequer",bairro:"Silvestre",localizacao:"Urbana",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:311,docentes:28,turmas:13,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31236586-escola-municipal-anita-chequer/'},
 {codigo_inep:"31133388",nome:"Escola Municipal Doutor Arthur Bernardes",bairro:"Novo Silvestre",localizacao:"Urbana",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:131,docentes:19,turmas:7,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31133388-escola-municipal-doutor-arthur-bernardes/'},
 {codigo_inep:"31133396",nome:"Escola Municipal Doutor José Teotônio Pacheco",bairro:"Posses",localizacao:"Rural",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:87,docentes:9,turmas:6,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31133396-escola-municipal-doutor-jose-teotonio-pacheco/'},
 {codigo_inep:"31133418",nome:"Escola Municipal Doutor Juscelino Kubitschek",bairro:"Barrinha",localizacao:"Urbana",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:365,docentes:24,turmas:17,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31133418-escola-municipal-doutor-juscelino-kubitschek/'},
 {codigo_inep:"31129909",nome:"Escola Municipal João Francisco da Silva",bairro:"Não informado",localizacao:"Urbana",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:200,docentes:22,turmas:14,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31129909-escola-municipal-joao-francisco-da-silva/'},
 {codigo_inep:"31129950",nome:"Escola Municipal José Lopes Valente Sobrinho",bairro:"Zona rural",localizacao:"Rural",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:99,docentes:10,turmas:7,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31129950-escola-municipal-jose-lopes-valente-sobrinho/'},
 {codigo_inep:"31129925",nome:"Escola Municipal Ministro Edmundo Lins",bairro:"Centro",localizacao:"Urbana",etapas:["Ensino Fundamental"],ano:2025,matriculas:519,docentes:35,turmas:21,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31129925-escola-municipal-ministro-edmundo-lins/'},
 {codigo_inep:"31133426",nome:"Escola Municipal Nossa Senhora de Fátima",bairro:"São José",localizacao:"Urbana",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:361,docentes:38,turmas:23,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31133426-escola-municipal-nossa-senhora-de-fatima/'},
 {codigo_inep:"31133434",nome:"Escola Municipal Padre Francisco José da Silva",bairro:"Nova Viçosa",localizacao:"Urbana",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:479,docentes:35,turmas:24,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31133434-escola-municipal-padre-francisco-jose-da-silva/'},
 {codigo_inep:"31129879",nome:"Escola Municipal Professor Paulo Mário Del Giudice",bairro:"São Francisco de Assis",localizacao:"Rural",etapas:["Educação Infantil"],ano:2025,matriculas:51,docentes:6,turmas:3,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31129879-escola-municipal-professor-paulo-mario-del-giudice/'},
 {codigo_inep:"31278807",nome:"Escola Municipal Professor Pedro Gomide Filho",bairro:"JK",localizacao:"Urbana",etapas:["Educação Infantil","Ensino Fundamental"],ano:2025,matriculas:330,docentes:21,turmas:16,fonte:'Prospectei · Censo Escolar 2025 (INEP/MEC)',fonte_url:'https://prospectei.app.br/escolas/escola/31278807-escola-municipal-professor-pedro-gomide-filho/'},
];
