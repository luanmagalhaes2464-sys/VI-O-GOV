# Publicação VIÇO GOV: GitHub + Render + Neon

## 1. Repositório
Crie um repositório **novo e vazio** chamado `vico-gov` em uma conta GitHub autorizada para o projeto VIÇO Engenharia. Evite reutilizar repositórios de projetos municipais ou pessoais já em produção. Recomendação: visibilidade privada até homologação.

## 2. Banco Neon
Projeto já criado: `vico-gov-inteligencia-municipal` (ID `delicate-fire-52355611`), banco `vico_gov`, PG 17, Ohio. PostGIS e 15 tabelas criados, incluindo fontes, registros financeiros, indicadores e auditoria. A série histórica de CIP/COSIP 2015–2017 foi cadastrada com classificação histórica.

Não publique a connection string. Configure-a **apenas** nas variáveis seguras do backend Render, sob nome `DATABASE_URL`.

## 3. Serviços do Render
Recomendação: usar um espaço de trabalho próprio para a VIÇO Engenharia, evitando misturar recursos com apps Ninho Bebê ou Casal Pet Sitter.

Crie serviço Python:
- Nome: `vico-gov-api`
- Build: `cd backend && pip install -r requirements.txt`
- Start: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Plano: `free` para prova de conceito, quando disponível
- Environment: `DATABASE_URL` (secret), `ADMIN_API_KEY` (secret), `CORS_ORIGINS` (URL exata do frontend), `ENVIRONMENT=production`

Crie serviço Node:
- Nome: `vico-gov-web`
- Build: `cd frontend && npm install && npm run build`
- Start: `cd frontend && npm start`
- Environment: `NEXT_PUBLIC_API_BASE_URL=https://URL_REAL_DA_API` (não é secreto)

**Atenção:** `NEXT_PUBLIC_API_BASE_URL` é embutida durante o build; alterá-la exige reconstruir o serviço web. O CORS do backend deve referenciar a origem pública exata da interface, sem barra ao final.

## 4. Testes após deploy
- Backend: `/health` e `/docs`
- `GET /api/v1/fontes` deve listar 47 fontes
- `GET /api/v1/infraestrutura/cosip` deve mostrar 2015, 2016 e 2017 como dados históricos
- `GET /api/v1/dashboard/resumo?ano=2026` deve retornar `null` para valores financeiros não importados, nunca zero inventado
- Frontend: navegar por dashboard, mapa, finanças, recursos, COSIP, fontes e chat
- Perguntar à IA “Qual o valor da CIP de 2026?” deve receber alerta de ausência de valor atual.

## 5. Pendências de MVP para versão institucional
- Rotina oficial de captura de dados do Portal de Transparência (download real, normalização, testes de duplicidade e atualização)
- Importação IBGE/CNES/INEP com coordenadas geográficas verificadas
- Login, RBAC, trilhas de auditoria, proteção de dados conforme LGPD
- IA generativa opcional com provedor de API e controles de consulta; fase atual é assistente de regras com consulta real ao banco
- Autorização para logomarca institucional e acesso a bases internas
