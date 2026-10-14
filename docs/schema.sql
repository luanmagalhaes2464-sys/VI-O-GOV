-- VIÇO GOV | Schema inicial Postgres 17 + PostGIS
-- Schema executado no projeto Neon dedicado em 14/10/2026.
-- Execute apenas em banco novo, ou use ferramenta de migração versionada.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE TABLE IF NOT EXISTS fontes_dados (
  id TEXT PRIMARY KEY, tema TEXT NOT NULL, nome TEXT NOT NULL, instituicao TEXT NOT NULL,
  situacao TEXT, formato TEXT, ingestao TEXT, periodicidade TEXT, chave_vinculo TEXT,
  uso TEXT, classificacao TEXT, prioridade TEXT, fase TEXT, cuidado TEXT, url TEXT,
  importado_em TIMESTAMPTZ, criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS importacoes (
  id BIGSERIAL PRIMARY KEY, fonte_id TEXT REFERENCES fontes_dados(id),
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(), finalizada_em TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('iniciada','concluida','erro')),
  total_linhas INT, checksum TEXT, erro TEXT
);
CREATE TABLE IF NOT EXISTS orgaos (
  id BIGSERIAL PRIMARY KEY,codigo TEXT UNIQUE,nome TEXT NOT NULL,tipo TEXT
);
CREATE TABLE IF NOT EXISTS registros_financeiros (
  id BIGSERIAL PRIMARY KEY, origem_id TEXT NOT NULL, referencia_externa TEXT,
  ano INT NOT NULL CHECK (ano BETWEEN 1900 AND 2200), competencia DATE,
  tipo TEXT NOT NULL CHECK (tipo IN ('receita','empenho','liquidacao','pagamento','transferencia')),
  valor NUMERIC(18,2) NOT NULL, orgao_id BIGINT REFERENCES orgaos(id),
  fonte_recurso TEXT,natureza TEXT,descricao TEXT,instrumento TEXT,
  fonte_id TEXT REFERENCES fontes_dados(id), qualidade TEXT NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(origem_id,referencia_externa,tipo,competencia)
);
CREATE TABLE IF NOT EXISTS instrumentos_recursos (
  id BIGSERIAL PRIMARY KEY, codigo TEXT UNIQUE, tipo TEXT NOT NULL, ano INT,
  concedente TEXT,beneficiario TEXT,origem TEXT,objeto TEXT,situacao TEXT,
  valor_indicado NUMERIC(18,2), valor_pactuado NUMERIC(18,2),
  valor_repassado NUMERIC(18,2), valor_executado NUMERIC(18,2),
  fonte_id TEXT REFERENCES fontes_dados(id), atualizado_em TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS obras (
  id BIGSERIAL PRIMARY KEY,codigo TEXT UNIQUE,nome TEXT NOT NULL,situacao TEXT,
  orgao_id BIGINT REFERENCES orgaos(id),valor_previsto NUMERIC(18,2),
  valor_pago NUMERIC(18,2),geom GEOMETRY(Geometry,4326),
  fonte_id TEXT REFERENCES fontes_dados(id), atualizado_em TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS recurso_obra_vinculos (
  instrumento_id BIGINT NOT NULL REFERENCES instrumentos_recursos(id),
  obra_id BIGINT NOT NULL REFERENCES obras(id), evidencia_url TEXT NOT NULL,
  verificado BOOLEAN DEFAULT FALSE, PRIMARY KEY(instrumento_id,obra_id)
);
CREATE TABLE IF NOT EXISTS setores_censitarios (
  codigo TEXT PRIMARY KEY,ano INT NOT NULL DEFAULT 2022,populacao INTEGER,domicilios INTEGER,
  geom GEOMETRY(MultiPolygon,4326),fonte_id TEXT REFERENCES fontes_dados(id), atualizado_em TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS equipamentos_publicos (
  id BIGSERIAL PRIMARY KEY,codigo_oficial TEXT,tipo TEXT NOT NULL,nome TEXT NOT NULL,
  endereco TEXT,geom GEOMETRY(Point,4326),ano_referencia INT,
  fonte_id TEXT REFERENCES fontes_dados(id),atualizado_em TIMESTAMPTZ,
  UNIQUE(tipo,codigo_oficial)
);
CREATE TABLE IF NOT EXISTS servidores_agregado (
  id BIGSERIAL PRIMARY KEY,ano INT NOT NULL,mes INT CHECK(mes BETWEEN 1 AND 12),
  orgao_id BIGINT REFERENCES orgaos(id),cargo TEXT,
  total_servidores INT NOT NULL CHECK(total_servidores>=0),
  despesa_pessoal NUMERIC(18,2),fonte_id TEXT REFERENCES fontes_dados(id)
);
CREATE TABLE IF NOT EXISTS indicadores (
  codigo TEXT PRIMARY KEY,nome TEXT NOT NULL,descricao TEXT,unidade TEXT,
  metodologia TEXT,fonte_id TEXT REFERENCES fontes_dados(id),
  disponibilidade TEXT NOT NULL DEFAULT 'pendente'
);
CREATE TABLE IF NOT EXISTS indicador_valores (
  id BIGSERIAL PRIMARY KEY,indicador_codigo TEXT NOT NULL REFERENCES indicadores(codigo),
  ano INT NOT NULL,valor NUMERIC(18,2) NOT NULL,referencia TEXT,fonte_url TEXT,
  qualidade TEXT NOT NULL CHECK (qualidade IN ('oficial_historico','oficial_atual','estimado','demonstrativo')),
  observacao TEXT,UNIQUE(indicador_codigo,ano,referencia)
);
CREATE TABLE IF NOT EXISTS agente_perguntas (
  id BIGSERIAL PRIMARY KEY,pergunta TEXT NOT NULL,intencao TEXT,
  resposta JSONB NOT NULL,fonte TEXT,criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,email TEXT UNIQUE NOT NULL,nome TEXT NOT NULL,
  perfil TEXT NOT NULL CHECK(perfil IN ('admin','gestor','analista','leitor')),
  ativo BOOLEAN DEFAULT TRUE,criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS auditoria (
  id BIGSERIAL PRIMARY KEY,ator TEXT,acao TEXT NOT NULL,recurso TEXT NOT NULL,
  metadados JSONB,criado_em TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_setores_geom ON setores_censitarios USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_equip_geom ON equipamentos_publicos USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_obras_geom ON obras USING GIST(geom);
CREATE INDEX IF NOT EXISTS idx_financeiro_ano_tipo ON registros_financeiros(ano,tipo);
CREATE INDEX IF NOT EXISTS idx_agente_data ON agente_perguntas(criado_em DESC);
