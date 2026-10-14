# VIÇO GOV — Plataforma de Inteligência Municipal

MVP funcional, demonstrativo e **não oficial** para Viçosa/MG, com governança de dados, dashboard, mapa OpenStreetMap, finanças, acompanhamento de emendas, histórico de COSIP e assistente de consultas controladas. Desenvolvido como base tecnológica da VIÇO Engenharia.

## Stack
- Frontend: Next.js 14, React 18, TypeScript, Lucide, CSS responsivo
- Backend: Python 3.11+, FastAPI, Psycopg 3
- Banco: PostgreSQL 17 + PostGIS no Neon
- Publicação: dois Web Services no Render (frontend Node, backend Python)

## Executar localmente

```bash
cd backend
python -m venv .venv
source .venv/bin/activate # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
cp .env.example .env # configurar DATABASE_URL se disponível
uvicorn app.main:app --reload --port 8000
```

Em outro terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Acesse `http://localhost:3000`, API em `http://localhost:8000/docs`.

## Fluxo de deploy no Render
1. Publique a pasta deste projeto em **novo repositório** (não altere sistemas existentes).
2. Crie Web Service Python, repositório na raiz, build `cd backend && pip install -r requirements.txt`, start `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Env `DATABASE_URL`, `CORS_ORIGINS=https://URL-DO-FRONTEND`, `ADMIN_API_KEY`.
3. Crie Web Service Node, build `cd frontend && npm install && npm run build`, start `cd frontend && npm start`. Env de build `NEXT_PUBLIC_API_BASE_URL=https://URL-DO-BACKEND`.
4. Valide `/health`, `/docs`, `/api/v1/fontes`, `/api/v1/infraestrutura/cosip` e as telas.
5. Configuração de CORS requer o URL público exato do frontend. A variável NEXT_PUBLIC_API_BASE_URL requer rebuild do frontend após mudança.

## Banco / migração
O schema inicial foi criado em um projeto Neon separado. O arquivo `docs/schema.sql` permite recriá-lo em um banco novo, antes do primeiro deploy. Durante o startup do FastAPI, as 47 fontes previstas no inventário XLSX são sincronizadas por ID para a tabela `fontes_dados`. Dados correntes de finanças ou equipamentos **não são inventados**.

## Segurança e ética de dados
- Interface demo pública **não possui login ou upload**, mesmo que seus caminhos futuros constem do backlog. Não inclua dados pessoais ou relatórios internos.
- A chave administrativa fica somente no backend. Nunca use `NEXT_PUBLIC_` em variáveis secretas.
- O agente inicial é um classificador de intenção com consultas SQL parametrizadas, **não LLM**; recomendações geradas ou RAG exigem fases futuras.
- Valores indicados, pactuados, repassados e executados são etapas distintas; não totalize colunas.
- Série COSIP 2015–2017 não representa valores de 2026.
- Para acesso restrito real: implementar autenticação, RBAC, migrações versionadas e testes de penetração antes de inserir registros sensíveis.

## Pastas
- `frontend/`: interface, mapa e chat
- `backend/`: API e catálogo de 47 fontes
- `docs/`: esquema, deployment e backlog

## Implantação autorizada (conta e workspace)

GitHub escolhido: `luanmagalhaes2464-sys`; repositório GitHub `VI-O-GOV`. Render escolhido: workspace `VIÇO GOV`. Consulte [`docs/CONFIGURACAO_APROVADA.md`](docs/CONFIGURACAO_APROVADA.md). O código é publicado no repositório e serviço Render dedicados quando os deploys são configurados.

## Verificações automatizadas

O workflow `.github/workflows/ci.yml` executará testes Python e o build Next.js no GitHub após o primeiro envio do código. Não precisa de dados privados do Neon para esses testes.
