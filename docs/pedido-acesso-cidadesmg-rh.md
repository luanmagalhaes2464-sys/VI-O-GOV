# Solicitação técnica de acesso automatizado — VIÇO GOV / RH Viçosa 2026

**Investigação:** 15/10/2026. **Produção:** nenhuma alteração. **Status da integração na fonte:** PENDENTE DE AUTORIZAÇÃO E TESTE.

## Contexto confirmado

- Portal da Prefeitura de Viçosa/MG 2026: https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml
- O site oficial da Prefeitura diferencia portal 2026 (CidadesMG) e transparência anterior (2025).
- A exportação de folha utiliza HTTP POST na mesma página `recursosHumanos.xhtml`, formulário JSF, filtros `anoFolhaPagamento_input` e `mesFolhaPagamento_input`, resposta AJAX XML; depois gera arquivo JSON. O usuário demonstrou download de janeiro/2026, sem login.
- Execução de um coletor no GitHub Actions recebeu HTTP 403 / Cloudflare inclusive na página inicial; o acesso do navegador do usuário retornou 200.
- **Não existe endpoint de origem validado para uso não assistido. Não alegar integração concluída.**

## Possível fornecedor (a confirmar para portal 2026)

Os sistemas anteriores de `cidadesmg.com.br/portaltransparencia/faces/user/...` trazem créditos explícitos a **Síntese Tecnologia e Informática**, empresa de soluções municipais, inclusive folha. NÃO há prova documental nesta pesquisa de contrato com a Prefeitura de Viçosa para o *novo portal 2026*, portanto a abordagem deve primeiro confirmar sua responsabilidade técnica.

- Empresa: https://www.sintesetecnologia.com.br/
- Telefones publicados pela empresa: (38) 3222-0813
- E-mail de suporte publicado na Google Play: `sintesemoc@gmail.com` (também `sinteset@gmail.com` em outro app)
- E-mail do desenvolvedor publicado na Google Play: `adm@sintesetecnologia.com.br`
- Fonte: https://play.google.com/store/apps/details?id=com.hlh.myapplicationportaldeservicos
- Evidência de atribuição no portal anterior: https://cidadesmg.com.br/portaltransparencia/faces/admin/admin.xhtml?Param=CurralDeDentro

## Município / área custodiante

- Departamento de Folha de Pagamento: `pmvpessoal@yahoo.com.br` / (31) 2170-0415.
- Secretaria de Administração (SEMAD): `administracao@vicosa.mg.gov.br`.
- Ouvidoria Geral: (31) 3874-8385.
- Fonte municipal de contatos: https://transparencia.vicosa.mg.gov.br/organograma/unidade/auditoria-interna/102
- Site oficial: https://www.vicosa.mg.gov.br/

## Solicitação prioritária à Síntese (confirmar responsabilidade técnica)

Assunto: Consulta técnica — API/exportação automática de RH da Prefeitura de Viçosa/MG (VIÇO GOV)

Prezados(as),

Estamos desenvolvendo o VIÇO GOV, painel analítico que reutiliza os dados públicos do Portal da Transparência da Prefeitura de Viçosa/MG. Identificamos a plataforma CidadesMG em `pmvicosa.cidadesmg.com.br`.

Em primeiro lugar, solicitamos confirmar se a Síntese Tecnologia e Informática opera atualmente esse portal (versão 2026) ou informar o contato do responsável técnico.

Nosso objetivo é consultar mensalmente a Folha de Pagamento de **janeiro a julho de 2026 e competências futuras** sem intervenção manual. O portal oferece exportação JSON, mas o sistema identifica operações JSF com sessão; a tentativa a partir de ambiente automatizado recebeu HTTP 403 via Cloudflare.

Caso sejam os responsáveis, pedimos:
1. Disponibilidade de API oficial, serviço de exportação em lote, ou URL estável para consulta por ano, mês, tipo de folha, com retorno JSON/CSV.
2. Documentação técnica, parâmetros, autenticação, limites de consumo, paginação, competência e versionamento.
3. Campos disponíveis: matrícula/nome publicados, data de admissão, desligamento, cargo, vínculo, departamento, local, jornada, salário-base, total bruto/descontos/líquido e rubricas (quinquênio incluído).
4. Política de atualização, retificações e identificação dos valores oficiais de conferência por competência.
5. Possibilidade de permitir acesso técnico autorizado do serviço hospedado no Render ou de disponibilizar exportação periódica (SFTP/bucket/arquivo em URL autorizada) que não dependa de interação no navegador.
6. Quem, na Prefeitura, autoriza tal integração e quais condições contratuais, de LGPD e de uso dos dados publicados se aplicam.

Podemos realizar prova de conceito limitada exclusivamente à competência **2026-02**, com baixa frequência de chamadas e validação dos totais contra o portal, antes de ampliar o uso.

Agradecemos o encaminhamento ao time responsável ou o envio da documentação apropriada.

Atenciosamente,
Equipe VIÇO GOV / VIÇO Engenharia

## Solicitação simultânea à Prefeitura — e-SIC / Secretaria de Administração

Assunto: Pedido de acesso em formato estruturado e identificação do fornecedor do Portal da Transparência de Viçosa/MG

Prezados(as),

Solicitamos, no âmbito da Lei nº 12.527/2011, informação sobre:
1. A identificação do fornecedor responsável pela aplicação de Portal da Transparência 2026 hospedada em `pmvicosa.cidadesmg.com.br`, incluindo contrato, gestor/fiscal e canal técnico;
2. Existência de API, documentação ou serviço de exportação automática de folha pública por competência;
3. Possibilidade de disponibilização em formato estruturado reutilizável, por mês, de janeiro a julho de 2026, e atualizações futuras, dos mesmos campos que o portal já torna públicos (sem informações restritas);
4. Caso não exista API, viabilidade de acesso técnico autorizado a arquivos estruturados mensais ou outra forma de fornecimento regular, com critérios de proteção de dados;
5. Setor que pode autorizar integração entre o VIÇO GOV e o portal.

Solicitamos resposta ou encaminhamento ao setor competente, com a indicação das condições técnicas e administrativas necessárias.

Atenciosamente,
Equipe VIÇO GOV / VIÇO Engenharia

## Critérios de aceite

- Prova de obtenção automática de **fevereiro/2026** a partir da fonte oficial, sem arquivo fornecido pelo usuário, por canal autorizado.
- Credenciais, se houver, somente no gerenciador de segredos; nenhum JSESSIONID, ViewState ou dados nominais no repositório público.
- Requisições auditáveis, limitadas e com tratamento de bloqueios sem tentativas de evasão.
- Verificação de esquema, unicidade por matrícula/competência, descontos, bruto/líquido, total oficial, rubricas e eventuais revisões.
- Após o sucesso, agendar ingestão das competências restantes e posteriores para Neon.
