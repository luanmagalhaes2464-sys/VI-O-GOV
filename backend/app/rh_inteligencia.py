"""VIÇO GOV: alertas exploratórios de RH, RGF/SICONFI e agente com contexto controlado.
Alertas estatísticos NÃO são determinações de pagamentos indevidos.
"""
from __future__ import annotations

import os
import re
import time
import unicodedata
from datetime import date
from decimal import Decimal, InvalidOperation
from functools import lru_cache
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from .rh_db import banco, PORTAL

router = APIRouter(prefix="/api/v1/rh/inteligencia", tags=["RH - inteligencia"])
SICONFI_DOC = "https://apidatalake.tesouro.gov.br/docs/siconfi/"
CODIGO_IBGE = "3171303"
LIMITES = {"alerta": 48.6, "prudencial": 51.3, "legal": 54.0}
NOTICE = ("Triagem estatística, não auditoria conclusiva. Folha bruta não equivale à "
          "Despesa Total com Pessoal (DTP) da LRF; diferenças exigem análise das "
          "rubricas, fatos funcionais e legislação vigente.")

def parse_mes(mes: str) -> date:
    if not re.fullmatch(r"2026-(0[1-7])", mes):
        raise HTTPException(status_code=422, detail="Escolha competência entre 2026-01 e 2026-07.")
    return date.fromisoformat(mes + "-01")

def money(v) -> float:
    return round(float(v or 0), 2)

def mes_anterior(m: date) -> Optional[date]:
    if m.month == 1:
        return None
    return date(m.year, m.month - 1, 1)

@router.get("/alertas")
def alertas(mes: str = Query("2026-07", max_length=7)):
    atual = parse_mes(mes)
    anterior = mes_anterior(atual)
    with banco() as con:
        kpis = con.execute("""
            SELECT COUNT(*) AS lancamentos, COUNT(DISTINCT (nome,matricula)) AS vinculos,
              COUNT(DISTINCT nome) AS nomes, COALESCE(SUM(bruto),0) AS bruto,
              COUNT(*) FILTER (WHERE salario_base IS NULL OR salario_base <= 0) AS sem_base,
              COUNT(*) FILTER (WHERE liquido > bruto + .01) AS liquido_superior
            FROM rh_folha_pessoas_2026 WHERE competencia=%s
        """, (atual,)).fetchone()
        diferencas = []
        if anterior:
            diferencas = con.execute("""
                WITH atual AS (
                    SELECT matricula,nome,cargo,jornada,MIN(departamento) departamento,
                      SUM(bruto) valor
                    FROM rh_folha_pessoas_2026 WHERE competencia=%s
                    GROUP BY matricula,nome,cargo,jornada
                ), anterior AS (
                    SELECT matricula,nome,cargo,jornada,SUM(bruto) valor
                    FROM rh_folha_pessoas_2026 WHERE competencia=%s
                    GROUP BY matricula,nome,cargo,jornada
                )
                SELECT a.matricula,a.nome,a.cargo,a.departamento,a.valor AS valor_atual,
                  p.valor AS valor_anterior, a.valor-p.valor AS diferenca,COUNT(*) OVER() AS total_ocorrencias,
                  ROUND((a.valor-p.valor)*100 / NULLIF(p.valor,0),1) AS variacao
                FROM atual a JOIN anterior p USING(matricula,nome,cargo,jornada)
                WHERE p.valor>=1000 AND a.valor>=p.valor*1.6 AND (a.valor-p.valor)>=1500
                ORDER BY diferenca DESC LIMIT 35
            """, (atual, anterior)).fetchall()
        pares = con.execute("""
            WITH base AS (
                SELECT matricula,nome,cargo,jornada,MIN(departamento) departamento,
                       SUM(bruto) valor
                FROM rh_folha_pessoas_2026 WHERE competencia=%s
                GROUP BY matricula,nome,cargo,jornada
            ), referencia AS (
                SELECT cargo,jornada,COUNT(*) n,
                       percentile_cont(0.5) WITHIN GROUP (ORDER BY valor) mediana
                FROM base WHERE valor>0 AND cargo<>''
                GROUP BY cargo,jornada HAVING COUNT(*)>=12
            )
            SELECT b.matricula,b.nome,b.cargo,b.jornada,b.departamento,b.valor,
                r.n,r.mediana,COUNT(*) OVER() AS total_ocorrencias,
                ROUND(b.valor/NULLIF(r.mediana,0),2) AS multiplicador
            FROM base b JOIN referencia r USING(cargo,jornada)
            WHERE r.mediana>0 AND b.valor>=r.mediana*2.5
              AND b.valor-r.mediana>=2500
            ORDER BY b.valor-r.mediana DESC LIMIT 35
        """, (atual,)).fetchall()
    achados = []
    for a in diferencas:
        achados.append({
            "id": "VAR-" + mes + "-" + a["matricula"] + "-" + str(len(achados)),
            "tipo": "variacao_mensal", "nivel": "atencao",
            "titulo": "Variação relevante na remuneração bruta",
            "descricao": "A remuneração aumentou mais de 60% e R$ 1.500 em relação à competência anterior. Férias, retroativos, 13º e outras parcelas podem justificar a diferença.",
            "servidor": a["nome"], "matricula": a["matricula"], "cargo": a["cargo"],
            "departamento": a["departamento"], "valor_atual": money(a["valor_atual"]),
            "valor_referencia": money(a["valor_anterior"]), "variacao_percentual": money(a["variacao"]),
            "criterio": "Comparação por matrícula, nome, cargo e jornada; variação > 60% e > R$ 1.500.",
            "fonte": PORTAL, "situacao": "requer_conferencia"
        })
    for a in pares:
        achados.append({
            "id": "PAR-" + mes + "-" + a["matricula"] + "-" + str(len(achados)),
            "tipo": "comparacao_pares", "nivel": "informativo",
            "titulo": "Remuneração acima da mediana do grupo",
            "descricao": "Comparação estatística entre vínculos do mesmo cargo e jornada. Progressões, tempo de serviço, múltiplas parcelas e vínculos podem explicar a diferença.",
            "servidor": a["nome"], "matricula": a["matricula"], "cargo": a["cargo"],
            "departamento": a["departamento"], "valor_atual": money(a["valor"]),
            "valor_referencia": money(a["mediana"]), "multiplicador": money(a["multiplicador"]),
            "pares_considerados": int(a["n"]),
            "criterio": "Grupos com pelo menos 12 vínculos; remuneração >= 2,5x mediana e diferença >= R$ 2.500.",
            "fonte": PORTAL, "situacao": "requer_conferencia"
        })
    if int(kpis["sem_base"] or 0):
        achados.append({
            "id": "QUAL-" + mes, "tipo": "qualidade_dados", "nivel": "informativo",
            "titulo": "Vencimento-base ausente ou zerado em parte dos lançamentos",
            "descricao": "O campo extraído de vencimento-base não permite verificar o salário previsto em lei nesses lançamentos; pode decorrer da forma de exportação ou de parcelas específicas. Não significa remuneração irregular.",
            "quantidade": int(kpis["sem_base"]),
            "criterio": "Campo salario_base nulo ou <= 0 no dado importado.",
            "fonte": PORTAL, "situacao": "requer_conferencia"
        })
    return {
        "mes": mes, "mes_comparacao": anterior.strftime("%Y-%m") if anterior else None,
        "indicadores": {
            "lancamentos": int(kpis["lancamentos"]), "vinculos": int(kpis["vinculos"]),
            "nomes_distintos": int(kpis["nomes"]), "bruto": money(kpis["bruto"]),
            "sem_base": int(kpis["sem_base"]), "liquido_superior_bruto": int(kpis["liquido_superior"])
        },
        "resumo": {
            "variacoes": int(diferencas[0]["total_ocorrencias"]) if diferencas else 0,
            "comparacoes_pares": int(pares[0]["total_ocorrencias"]) if pares else 0,
            "qualidade": int(bool(kpis["sem_base"])), "total": len(achados),
            "resultados_limitados": "Até 35 ocorrências por categoria; não é contagem exaustiva."
        },
        "alertas": achados, "fonte": PORTAL, "aviso": NOTICE,
        "observacao": "Dados importados pelo usuário; janeiro possui divergência conhecida de conciliação com o portal."
    }

def strip(text: str) -> str:
    norm = unicodedata.normalize("NFKD", str(text or ""))
    return "".join(c for c in norm if not unicodedata.combining(c)).upper()

def numero(valor):
    if valor is None or isinstance(valor, bool):
        return None
    t = str(valor).replace(" ", "").replace("%", "")
    if "," in t:
        t = t.replace(".", "").replace(",", ".")
    try:
        return float(Decimal(t))
    except (InvalidOperation, ValueError):
        return None

def interpretar_rgf(items):
    """Não inventar percentuais: exigir linha e coluna inequivocamente identificadas."""
    candidatos = []
    for item in items:
        if not isinstance(item, dict):
            continue
        conta = strip(item.get("conta") or item.get("no_conta") or "")
        coluna = strip(item.get("coluna") or item.get("no_coluna") or "")
        if "DESPESA TOTAL COM PESSOAL" not in conta or "RCL" not in coluna or "%" not in coluna:
            continue
        v = numero(item.get("valor"))
        if v is not None and 0 <= v <= 100:
            candidatos.append({"valor": v, "conta": item.get("conta"), "coluna": item.get("coluna")})
    # Não atribuir o percentual de outra coluna ou duplicatas ao Executivo.
    diferentes = {round(x["valor"], 4) for x in candidatos}
    return candidatos[0] if len(diferentes) == 1 and candidatos else None

@lru_cache(maxsize=6)
def buscar_rgf(ano: int, periodo: int, _janela_6h: int):
    params = {
        "an_exercicio": ano, "in_periodicidade": "Q", "nr_periodo": periodo,
        "co_tipo_demonstrativo": "RGF", "no_anexo": "RGF-Anexo 01",
        "co_esfera": "M", "co_poder": "E", "id_ente": CODIGO_IBGE
    }
    erro = None
    # Endereços da API SICONFI: não usar website como fonte dos números.
    for base in ("https://apidatalake.tesouro.gov.br/ords/siconfi/tt/rgf",
                 "https://apidatalake.tesouro.gov.br/ords/cdwhprd/siconfi/tt/rgf"):
        try:
            response = httpx.get(base, params=params, timeout=10.0, follow_redirects=False)
            response.raise_for_status()
            dados = response.json()
            items = dados.get("items", [])
            if not isinstance(items, list):
                raise ValueError("Formato inesperado de dados RGF.")
            return {"itens": len(items), "apurado": interpretar_rgf(items), "url": str(response.url),
                    "erro": None if items else "RGF ainda não disponível para o período solicitado."}
        except (httpx.HTTPError, ValueError) as exc:
            erro = type(exc).__name__
    return {"itens": 0, "apurado": None, "url": SICONFI_DOC,
            "erro": "Não foi possível acessar ou interpretar o RGF oficial (" + str(erro) + ")."}

@router.get("/fiscal")
def fiscal(ano: int = Query(2026, ge=2024, le=2026), periodo: int = Query(2, ge=1, le=3)):
    # A declaração do período mais recente pode não ter sido homologada.
    resultado = buscar_rgf(ano, periodo, int(time.time() // (6 * 3600)))
    candidato = resultado["apurado"]
    pct = candidato["valor"] if candidato else None
    faixa = None
    if pct is not None:
        faixa = ("acima_limite" if pct > LIMITES["legal"] else
                 "prudencial" if pct >= LIMITES["prudencial"] else
                 "alerta" if pct >= LIMITES["alerta"] else "abaixo_alerta")
    return {
        "ente": "Viçosa/MG", "codigo_ibge": CODIGO_IBGE,
        "exercicio": ano, "quadrimestre": periodo,
        "percentual_dtp_executivo": pct, "situacao": faixa or "nao_validado",
        "faixas_percentuais": LIMITES, "itens_rgf": resultado["itens"],
        "referencia_linha": candidato, "fonte": resultado["url"],
        "documentacao": SICONFI_DOC, "erro": resultado["erro"] if not candidato else None,
        "aviso": ("Indicador fiscal extraído do Anexo 01 do RGF do Executivo, "
                  "quando identificável. Não calculado pela soma das folhas mensais. "
                  "Confira sempre retificações e o demonstrativo homologado.")
    }

class Pergunta(BaseModel):
    pergunta: str = Field(min_length=4, max_length=600)
    mes: str = Field(default="2026-07", pattern=r"^2026-0[1-7]$")

@router.post("/agente")
def agente(payload: Pergunta):
    mes = parse_mes(payload.mes)
    with banco() as con:
        resumo = con.execute("""
            SELECT COUNT(*) AS registros, COUNT(DISTINCT (nome,matricula)) AS vinculos,
              COUNT(DISTINCT nome) AS pessoas, COALESCE(SUM(bruto),0) AS bruto,
              COALESCE(SUM(quinquenio),0) AS quinquenio
            FROM rh_folha_pessoas_2026 WHERE competencia=%s
        """, (mes,)).fetchone()
        areas = con.execute("""
            SELECT departamento,COUNT(*) AS registros,SUM(bruto) AS bruto
            FROM rh_folha_pessoas_2026 WHERE competencia=%s
            GROUP BY departamento ORDER BY bruto DESC LIMIT 5
        """, (mes,)).fetchall()
    indicadores = {
        "competencia": payload.mes, "lancamentos": int(resumo["registros"]),
        "vinculos": int(resumo["vinculos"]), "nomes_distintos": int(resumo["pessoas"]),
        "folha_bruta": money(resumo["bruto"]), "quinquenios": money(resumo["quinquenio"]),
        "departamentos_maior_folha": [
            {"departamento": a["departamento"], "registros": int(a["registros"]),
             "bruto": money(a["bruto"])} for a in areas
        ]
    }
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        return {
            "modo": "sem_chave_gemini", "resposta": (
                f"Na competência {payload.mes}, a base contém {indicadores['lancamentos']} lançamentos, "
                f"{indicadores['vinculos']} vínculos por nome e matrícula, "
                f"com folha bruta de R$ {indicadores['folha_bruta']:,.2f}. "
                "Para perguntas sobre legalidade individual, preciso da tabela legal e das rubricas "
                "comprovadas. Para o limite da LRF, consulte o demonstrativo RGF/SICONFI, "
                "não a soma mensal da folha. A IA generativa ainda depende de chave API no servidor."
            ), "indicadores": indicadores, "fontes": [PORTAL, SICONFI_DOC]
        }
    instrucao = (
        "Você é o assistente analítico do protótipo independente VIÇO GOV de Viçosa/MG. "
        "Responda em português brasileiro e com concisão, SOMENTE com o contexto JSON fornecido. "
        "NÃO conclua fraude, salário ilegal, excesso de pessoal ou limite da LRF a partir de valores brutos. "
        "Se faltar tabela legal, rubricas funcionais ou RGF, diga que não é possível concluir. "
        "Não crie números, datas, normas ou fontes. Diferencie registros, vínculos e pessoas. "
        "Identifique a competência. Não inclua nomes individuais pois o contexto só contém agregados."
    )
    import json
    try:
        response = httpx.post(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
            headers={"x-goog-api-key": key, "Content-Type": "application/json"},
            json={"system_instruction": {"parts": [{"text": instrucao}]},
                  "contents": [{"role": "user", "parts": [{"text":
                      "Indicadores verificados (JSON): " + json.dumps(indicadores, ensure_ascii=False) +
                      "\\nPergunta: " + payload.pergunta}]}],
                  "generationConfig": {"temperature": 0.1, "maxOutputTokens": 900}},
            timeout=19.0
        )
        response.raise_for_status()
        data = response.json()
        parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
        texto = " ".join(p.get("text", "") for p in parts).strip()
        if not texto:
            raise ValueError("Resposta vazia do provedor de IA")
    except (httpx.HTTPError, ValueError, IndexError, KeyError):
        raise HTTPException(503, "O serviço Gemini está indisponível; nenhuma resposta foi inventada.") from None
    return {"modo": "gemini", "resposta": texto, "indicadores": indicadores,
            "fontes": [PORTAL, SICONFI_DOC]}
