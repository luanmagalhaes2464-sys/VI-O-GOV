# Status verificável — 14/10/2026

## Concluído
- Neon: projeto independente `vico-gov-inteligencia-municipal`, banco `vico_gov` (ID delic​ate-fire-52355611, sem espaço oculto no identificador: `delicate-fire-52355611`).
- PostGIS habilitado; tabelas e índices do schema criados e consultados no Neon.
- CIP histórica 2015, 2016 e 2017 inserida e conferida com classificação `oficial_historico`.
- API Python com `/health`, `/docs`, `/api/v1/...` para dashboard, fontes, COSIP, finanças, recursos, mapa, equipamentos, servidores, saúde, educação, obras e perguntas.
- Frontend Next.js/React + interface responsiva, sem logos oficiais não fornecidas/sem autorização.
- Catálogo JSON de 47 fontes catalogadas extraídas da planilha de arquitetura enviada.
- Assistente inicial: consultas controladas ao banco, sem modelo de linguagem externo, sem inventar números.
- Testes locais de API com conexão à base desabilitada e Postgres substituído por stub de importação: endpoints de fontes, histórico, dashboard, mapa, agente e bloqueio admin passaram.
- Arquivos TypeScript/TSX passaram na verificação sintática.

## Não concluído / motivos
- Não foi possível fazer `npm install` neste ambiente; build real Next.js e testes de navegador não foram executados.
- GitHub: as duas conexões disponíveis permitem escrever em repositórios existentes, mas a ferramenta não permite criar um novo repositório. É necessária criação externa de repositório vazio independente e definição da conta (pessoal ou Viçosa SMART).
- Render: os espaços disponíveis detectados são `Ninho_Bebe` e `Casal Pet Sitter`. Recomendado espaço independente para a VIÇO Engenharia ou confirmação explícita de qual usar. Nenhuma produção Render foi alterada.
- Não há integração automática atual com Portal da Transparência, INEP, IBGE, CNES; catálogo não equivale à integração.
- Falta autenticação de usuários e proteção de dados necessária antes de uso com informação não pública.
- Não há agente de IA generativa, apenas consultas regradas, conforme limitação declarada na interface.

## Próximo passo
1. Criar repositório GitHub vazio `vico-gov`, preferencialmente privado.
2. Confirmar Render workspace (ou criar um novo para VIÇO Engenharia).
3. Sincronizar código, configurar variáveis de ambiente secretas e publicar serviços.
4. Validar HTTPS e testar integridade com o banco real.
