# Publicação aprovada: VIÇO GOV / VIÇO Engenharia

**Proprietário confirmado**: GitHub `luanmagalhaes2464-sys`.

**Repositório desejado**: `luanmagalhaes2464-sys/vico-gov` (novo, **privado e vazio**).

**Workspace Render desejado**: `VIÇO Engenharia` (**novo**, sem reutilizar Ninho_Bebe ou Casal Pet Sitter).

**Banco existente no Neon**: projeto `vico-gov-inteligencia-municipal` (`delicate-fire-52355611`), database `vico_gov`, PostgreSQL 17 com PostGIS, região `aws-us-east-2`.

## Ações manuais mínimas

1. No GitHub, abra https://github.com/new. Selecione a conta `luanmagalhaes2464-sys`; nome `vico-gov`; visibilidade **Private**; não adicione README, licença, `.gitignore` ou template. Clique **Create repository**.
2. No Render, abra https://dashboard.render.com/ e clique no seletor de workspace no canto superior esquerdo, **+ New Workspace**. Nome: `VIÇO Engenharia`; selecione Hobby se disponível e finalize o fluxo de plano/pagamento quando solicitado.
3. Avise no ChatGPT: **"Criei o repositório e o workspace do VIÇO GOV. Pode publicar."** Se possível, informe o link do repositório. Não compartilhe senhas, tokens ou strings de conexão.

## Próximas ações pela conexão

- Validar permissão de escrita no novo repositório e enviar o código inicial (frontend, backend, documentação e render.yaml), sem sobrescrever outros projetos.
- Identificar o ID do novo workspace Render e criar dois serviços: `vico-gov-api` (Python) e `vico-gov-web` (Node).
- Obter a string de conexão do banco Neon sem exibi-la em resposta pública e configurá-la como segredo `DATABASE_URL` **somente** na API.
- Definir `CORS_ORIGINS` com a origem exata do frontend e `NEXT_PUBLIC_API_BASE_URL` com a URL pública da API, seguido de novo build do frontend.
- Conferir deploys, logs e rotas `/health`, `/docs`, `/api/v1/fontes`, `/api/v1/infraestrutura/cosip`; testar interface.

## Atenção

- Um repositório privado precisa estar acessível ao Render GitHub App para o deploy. Caso o Render não consiga encontrá-lo, autorize o acesso ao repositório `vico-gov` na integração GitHub do Render.
- Não publicar credenciais na pasta do projeto, nos commits, no `.env.example`, em chats ou em screenshots.
- A interface é demonstrativa e pública; sem autenticação de usuários, portanto não deve exibir dados pessoais ou internos.
- Dados abertos atuais ainda não estão importados. A série da CIP/COSIP 2015–2017 é histórica. Assistente inicial opera por regras, não é IA generativa.
