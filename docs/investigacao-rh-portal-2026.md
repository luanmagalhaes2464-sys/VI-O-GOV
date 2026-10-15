# Investigação técnica — coleta RH do Portal da Transparência de Viçosa/MG

**Data do teste:** 15/10/2026  
**Escopo:** identificar uma fonte autorizada de dados mensais de pessoal (01/2026 a 07/2026) para o VIÇO GOV.  
**Importante:** esta investigação ocorreu na branch `investigacao-api-rh-2026`; não altera o ambiente de produção.

## Fonte e funcionalidades verificadas

- Página pública: https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml
- O portal disponibiliza consulta por ano, mês, matrícula, cargo, departamento, local e vínculo.
- O portal expõe ações *Exportar PDF*, *Exportar CSV*, *Exportar TXT* e *Exportar JSON*, além de telas separadas para *Folha de Pagamento*, *Agentes Políticos* e *Estagiários*.
- A listagem traz matrícula, servidor, data de admissão/desligamento, cargo, vínculo, departamento, local, jornada e valores bruto/líquido; rubricas detalhadas precisam ser verificadas por tipo de exportação.
- A presença do botão *Exportar JSON* **não comprova API REST pública nem URL permanente**.

## Teste público automatizado de conectividade

Workflow: `.github/workflows/probe-portal-rh.yml` (branch desta investigação).

| URL testada no runner GitHub | Resultado HTTP | Servidor indicado |
| --- | ---: | --- |
| `/portaltransparencia/` | 403 | cloudflare |
| `/portaltransparencia/index.xhtml` | 403 | cloudflare |
| `/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml` | 403 | cloudflare |
| `/robots.txt` | 403 | cloudflare |

Resultado reproduzido no GitHub Actions sem qualquer download de dado nominal. **O acesso do runner é recusado na camada Cloudflare até para a página inicial e o robots.txt.** Isso explica por que uma automação de navegação pode falhar antes mesmo de localizar o mecanismo de exportação. **Não permite concluir** que não há API interna, ou que todas as origens de rede receberão 403.

## Hipóteses ainda não comprovadas

1. O uso da extensão `.xhtml` e de caminhos com `jsessionid` sugere processamento de formulários com estado de sessão, potencialmente JavaServer Faces, mas ainda não há captura das requisições e do HTML completo para identificar tecnologia, métodos e parâmetros.
2. A origem pode impor políticas específicas para conexões automatizadas vindas de serviços cloud.
3. A exportação JSON pode produzir download dependente da sessão do usuário em vez de uma API pública reutilizável.

## Critério de sucesso da integração

A automação só será considerada concluída depois de ser demonstrada, com autorização:

1. Uma consulta de competência `2026-02` ou posterior sem upload humano de arquivo.
2. Retorno estruturado com parâmetros auditáveis de ano, mês e tipo de folha.
3. Confirmação de totais, número de vínculos e campos (nome, matrícula, cargo, admissão, jornada, vínculo, departamento, local, bruto, líquido e rubricas, inclusive quinquênio).
4. Funcionamento em execução não assistida, com limite de frequência, tratamento de erros e logs sem exposição de dados pessoais.
5. Armazenamento seguro no Neon, sem dados nominais no repositório.

## Próximas verificações

- **Prioritária:** inspecionar uma única operação de exportação **JSON** por navegador autorizado, via aba *Network* das ferramentas de desenvolvedor. Registrar apenas método, caminho sem identificadores, tipo de conteúdo e presença de redirecionamentos. **Nunca compartilhar HAR sem remoção de cookies, cabeçalhos de autenticação, tokens de sessão ou dados pessoais.**
- Verificar a disponibilidade de documentação de API/exportações e política de uso junto ao responsável pelo Portal da Transparência da Prefeitura/fornecedor.
- Caso exista API autenticada ou exportação de arquivo em URL pública estável, configurar credenciais via secrets e política de acesso adequada; evitar contornar os bloqueios do Cloudflare.
- Se houver API de dados agregados somente, preservar no painel o escopo de informações realmente disponíveis; remunerações e rubricas requerem acesso detalhado.
- Verificar os dados do IPREVI separadamente, se o objetivo for incluir aposentados: https://prvicosa.cidadesmg.com.br/portaltransparencia/index.xhtml (autarquia municipal, fonte distinta).

## Conclusão

**Bloqueio técnico confirmado: HTTP 403 / Cloudflare para consultas originadas do GitHub Actions.**  
**API pública mensal de RH: ainda não identificada ou testada.**  
**Integração automática 01/2026–07/2026: ainda não comprovada.**

O backend do VIÇO GOV consultar o Neon **não equivale** ao coletor obter dados automaticamente do portal da Prefeitura.


## Evidência adicional — payload de exportação JSF (15/10/2026)

A operação de **Exportar JSON** foi observada pelo usuário no Chrome DevTools e o corpo da requisição continha os seguintes **nomes de parâmetros e valores não sensíveis**:

| Campo JSF | Valor observado | Interpretação |
| --- | --- | --- |
| `javax.faces.partial.ajax` | `true` | Requisição parcial AJAX |
| `javax.faces.source` | `j_idt221` | Identificador de componente gerado no HTML, possivelmente sujeito a alterações |
| `javax.faces.partial.execute` | `@all` | Processa o formulário na operação |
| `form1` | `form1` | Formulário submetido |
| `anoFolhaPagamento_input` | `2026` | Ano da consulta |
| `mesFolhaPagamento_input` | `1` | Janeiro |
| `tbv1_activeIndex` e `tbv2_activeIndex` | `0` | Aba visível de Folha de Pagamento |
| `javax.faces.ViewState` | PRESENÇA CONFIRMADA; **valor deliberadamente omitido** | Estado de sessão do servidor |

A exportação foi visualizada em duas etapas: XHR `recursosHumanos.xhtml` com status HTTP 200, seguido de uma requisição do tipo `document` e download concluído com nome `Folha Pagamento.json` (aprox. 1,95 MB). A segunda operação ainda precisa de confirmação de método, URL, parâmetros e tipo de resposta nos headers.

**Atenção de segurança:** o valor do `javax.faces.ViewState` foi colado pelo usuário na conversa. Não reutilizar, copiar ou publicar esse valor em arquivos, issues, código-fonte ou logs. O estado pode ser vinculado à sessão e mudar a cada carregamento; fechar/reabrir a sessão antes de novos testes.

### O que esta evidência efetivamente demonstra

- O site processa a exportação com a pilha JSF, enviando filtros no formulário. Isto não demonstra a existência de API REST pública.
- Ano e mês estão expressos por campos de formulário — potencialmente reproduzíveis apenas com sessão autorizada e estado obtido dinamicamente.
- A mensagem de arquivo pronto e a descarga podem ocorrer por operações HTTP distintas, inclusive uma chamada adicional que exige a mesma sessão.
- **Ainda não há prova** de que um serviço remoto como Render possa iniciar uma sessão e baixar automaticamente, pois as tentativas de acesso originadas no GitHub foram bloqueadas pelo Cloudflare.

### Próxima prova controlada, sem credenciais

No DevTools, registrar para a requisição XHR `recursosHumanos.xhtml`: `Request Method`, `Content-Type` da resposta, e **formato/elementos estruturais** da aba Response (sem copiar dados pessoais nem tokens). Para o download (`document`), registrar `Request Method`, **caminho da URL somente** (sem query sensível), `Content-Type` e `Content-Disposition`. Não enviar `Copy as cURL`, HAR bruto, cookies, `ViewState`, nem cabeçalhos `Cookie`/`Authorization`.

Critério adicional: demonstrar que o processo consegue obter `ViewState` próprio, realizar a consulta a `2026-02` e receber a exportação correspondente em sessão autorizada e origem de rede permitida, sem intervenção humana, antes de implantar a coleta agendada.
