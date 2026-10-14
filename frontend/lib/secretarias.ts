/**
 * Estrutura municipal conforme menu público da Prefeitura de Viçosa/MG.
 * Esta lista é um catálogo de gestão, NÃO uma base de resultados executados.
 * Fonte: https://www.vicosa.mg.gov.br/
 * Revisar a estrutura com atos oficiais sempre que houver reforma administrativa.
 */
export type IndicadorSetorial={nome:string;descricao:string;fonte:string;url:string};
export type Secretaria={sigla:string;slug:string;nome:string;curto:string;missao:string;tema:string;indicadores:IndicadorSetorial[]};
const TRANSP='https://pmvicosa.cidadesmg.com.br/portaltransparencia/index.xhtml';
const RECEITAS='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/execucaoOrcamentaria/receita/receita.xhtml';
const DESPESAS='https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/execucaoOrcamentaria/despesa/despesa.xhtml';
const MUNICIPIO='https://www.vicosa.mg.gov.br/';
const IBGE='https://www.ibge.gov.br/cidades-e-estados/mg/vicosa.html';
const CNES='https://cnes.datasus.gov.br/';
const INEP='https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos';
const PNCP='https://pncp.gov.br/';
const TRANSFERE='https://www.gov.br/transferegov/pt-br';
const FNDE='https://www.gov.br/fnde/pt-br';
const FNS='https://portalfns.saude.gov.br/';
const IND=(nome:string,descricao:string,fonte:string,url:string):IndicadorSetorial=>({nome,descricao,fonte,url});
export const secretarias:Secretaria[]=[
 {sigla:'SEGOV',slug:'governo',curto:'Governo',nome:'Secretaria Municipal de Governo',missao:'Coordenação da agenda de governo, articulação institucional e monitoramento das prioridades municipais.',tema:'Gestão e articulação',
 indicadores:[IND('Prioridades e ações de governo','Ações registradas e andamento por órgão responsável; exige relatório validado.','Prefeitura / gestão de metas',MUNICIPIO),IND('Convênios e parcerias','Instrumentos formalizados com identificação de beneficiário e situação.','Transferegov / Prefeitura',TRANSFERE),IND('Execução das prioridades','Projetos associados a empenhos e pagamentos comprovados.','Portal da Transparência',DESPESAS)]},
 {sigla:'SEMAD',slug:'administracao',curto:'Administração',nome:'Secretaria Municipal de Administração',missao:'Organização administrativa, quadro de pessoal, patrimônio e processos de suporte.',tema:'Gestão interna',
 indicadores:[IND('Servidores por lotação','Vínculo, cargo e distribuição por unidade, exibidos de forma agregada.','Transparência municipal',TRANSP),IND('Despesa com pessoal','Despesa por competência, órgão e fonte, sem duplicar fases contábeis.','Portal da Transparência',DESPESAS),IND('Contratos administrativos','Contratos vigentes, valores e vigências dos serviços de suporte.','PNCP / Prefeitura',PNCP)]},
 {sigla:'SEMAS',slug:'assistencia-social',curto:'Assistência Social',nome:'Secretaria Municipal de Assistência Social',missao:'Proteção social, atendimento a famílias e gestão dos serviços socioassistenciais.',tema:'Proteção social',
 indicadores:[IND('Unidades socioassistenciais','Equipamentos e cobertura territorial, após validação de cadastros.','Prefeitura / CadSUAS',MUNICIPIO),IND('Atendimentos e benefícios','Volume agregado por tipo e período, quando publicado ou autorizado.','Secretaria / bases autorizadas',MUNICIPIO),IND('Recursos da assistência','Transferências, orçamento e pagamentos vinculados à política.','Transparência / transferências',TRANSP)]},
 {sigla:'SEMAG',slug:'agropecuaria',curto:'Agropecuária',nome:'Secretaria Municipal de Agropecuária',missao:'Apoio aos produtores, desenvolvimento rural e iniciativas agropecuárias.',tema:'Desenvolvimento rural',
 indicadores:[IND('Programas rurais','Projetos, convênios e investimentos para comunidades rurais.','Prefeitura / Transferegov',TRANSFERE),IND('Assistência e atendimentos','Atendimentos técnicos e ações por localidade, conforme relatórios oficiais.','Secretaria municipal',MUNICIPIO),IND('Despesas e contratos rurais','Contratos, aquisições e despesas por unidade.','Transparência / PNCP',DESPESAS)]},
 {sigla:'SEMCULTJ',slug:'cultura-turismo-juventude',curto:'Cultura e Turismo',nome:'Secretaria Municipal de Cultura, Turismo e Juventude',missao:'Cultura, patrimônio, turismo e oportunidades para juventude.',tema:'Cultura e juventude',
 indicadores:[IND('Equipamentos culturais','Bibliotecas, espaços culturais e locais com endereço validado.','Prefeitura',MUNICIPIO),IND('Eventos e programas','Ações financiadas, atendimentos e resultados informados em relatórios.','Secretaria municipal',MUNICIPIO),IND('Recursos culturais','Editais, transferências e execução por projeto.','Transparência / transferências',TRANSP)]},
 {sigla:'SEMDEI',slug:'desenvolvimento-economico',curto:'Desenvolvimento Econômico',nome:'Secretaria Municipal de Desenvolvimento Econômico, Empreendedorismo e Inovação',missao:'Empreendedorismo, ambiente de negócios, inovação e desenvolvimento local.',tema:'Economia e inovação',
 indicadores:[IND('Emprego formal','Estoque e variação do emprego, preservando a referência municipal.','Novo CAGED / MTE','https://www.gov.br/trabalho-e-emprego/pt-br/assuntos/estatisticas-trabalho'),IND('Empresas e empreendedorismo','Estabelecimentos e programas de apoio, conforme bases disponíveis.','Prefeitura / dados públicos',MUNICIPIO),IND('Programas de inovação','Chamadas, parcerias e projetos com evidências registradas.','Secretaria / parceiros',MUNICIPIO)]},
 {sigla:'SEMEE',slug:'educacao-esportes',curto:'Educação e Esportes',nome:'Secretaria Municipal de Educação e Esportes',missao:'Rede municipal de ensino, matrículas, professores, transporte e esportes.',tema:'Educação e esportes',
 indicadores:[IND('Escolas municipais','Relação e localização das unidades com códigos oficiais.','INEP / Censo Escolar',INEP),IND('Matrículas e docentes','Matrículas e docentes por escola e ano; não misturar redes.','INEP / Censo Escolar',INEP),IND('Recursos da educação','FNDE, contratos, despesas e programas por competência.','FNDE / Transparência',FNDE)]},
 {sigla:'SEMGF',slug:'gestao-financeira',curto:'Gestão Financeira',nome:'Secretaria Municipal de Gestão Financeira',missao:'Arrecadação, equilíbrio fiscal, despesas e gestão orçamentária municipal.',tema:'Finanças públicas',
 indicadores:[IND('Receita arrecadada','Arrecadação por categoria, fonte e competência.','Portal da Transparência',RECEITAS),IND('Empenhado, liquidado e pago','Três fases exibidas separadamente, sem soma entre etapas.','Portal da Transparência',DESPESAS),IND('CIP / COSIP','Receita vinculada à iluminação e sua conciliação com despesas.','Transparência / Prefeitura',RECEITAS)]},
 {sigla:'SEMSI',slug:'servicos-integrados',curto:'Serviços Integrados',nome:'Secretaria Municipal de Serviços Integrados',missao:'Operação, conservação e manutenção de serviços urbanos.',tema:'Serviços urbanos',
 indicadores:[IND('Manutenção e serviços','Ordens de serviço e atendimentos por bairro quando disponíveis.','Secretaria municipal',MUNICIPIO),IND('Iluminação pública','Despesas, contratos e eventualmente inventário de luminárias.','Prefeitura / contratos',DESPESAS),IND('Serviços por território','Coleta, conservação e serviços localizados em mapa validado.','Prefeitura / CTM autorizado',MUNICIPIO)]},
 {sigla:'SEMSA',slug:'saude',curto:'Saúde',nome:'Secretaria Municipal de Saúde',missao:'Atenção primária, serviços de saúde, vigilância e organização da rede municipal.',tema:'Saúde pública',
 indicadores:[IND('Unidades de saúde','UBS e demais estabelecimentos, códigos CNES e localização.','CNES / DATASUS',CNES),IND('Profissionais e equipes','Profissionais e equipes informados em competência CNES.','CNES / DATASUS',CNES),IND('Recursos da saúde','Repasses do Fundo Nacional de Saúde e execução de despesas.','FNS / Transparência',FNS)]},
 {sigla:'SEPLAG',slug:'planejamento-mobilidade-territorio',curto:'Planejamento e Mobilidade',nome:'Secretaria Municipal de Planejamento, Mobilidade e Gestão Territorial',missao:'Planejamento urbano, gestão territorial, mobilidade e investimentos.',tema:'Território e mobilidade',
 indicadores:[IND('População e setores','Distribuição territorial a partir do Censo 2022.','IBGE',IBGE),IND('Mobilidade urbana','Rede de vias e serviços de transporte, quando georreferenciados.','Prefeitura / CTM autorizado',MUNICIPIO),IND('Projetos e obras','Projetos, contratos e localização com evidência documental.','Portal da Transparência / PNCP',PNCP)]},
 {sigla:'SEMABIO',slug:'meio-ambiente',curto:'Meio Ambiente',nome:'Secretaria Municipal de Meio Ambiente, Biodiversidade e Recursos Hídricos',missao:'Proteção ambiental, biodiversidade, recursos hídricos e sustentabilidade.',tema:'Meio ambiente',
 indicadores:[IND('Áreas de proteção','Unidades e áreas ambientais com geometria de fonte oficial.','Prefeitura / bases ambientais',MUNICIPIO),IND('Licenciamento e fiscalização','Processos e ações agregadas quando publicados.','Secretaria municipal',MUNICIPIO),IND('Saneamento e resíduos','Indicadores setoriais anuais com fonte e responsável identificados.','SNIS/SINISA / SAAE','https://www.gov.br/cidades/pt-br/acesso-a-informacao/acoes-e-programas/saneamento/snis')]}
];
export const outrasUnidades=[
 {sigla:'CGM',nome:'Controladoria-Geral do Município',url:MUNICIPIO},
 {sigla:'PGM',nome:'Procuradoria-Geral do Município',url:MUNICIPIO},
 {sigla:'DT',nome:'Diretoria de Trânsito',url:MUNICIPIO}
];
export const fontesGerais={transparencia:TRANSP,ibge:IBGE,prefeitura:MUNICIPIO,receitas:RECEITAS,despesas:DESPESAS};
export const contextoMunicipal=[
 {rotulo:'População — Censo 2022',valor:'76.430',periodo:'2022',fonte:'IBGE',url:IBGE},
 {rotulo:'Estimativa populacional',valor:'79.797',periodo:'2026',fonte:'IBGE',url:IBGE},
 {rotulo:'Área territorial',valor:'299,418 km²',periodo:'2025',fonte:'IBGE',url:IBGE}
];
export function secretariaPorSlug(slug:string){return secretarias.find(s=>s.slug===slug);}
