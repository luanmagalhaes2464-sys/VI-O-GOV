"""Auditoria documental da folha de Viçosa: concilia rubricas antes de levantar pendências.

Somente desajustes aritméticos são chamados inconsistências. Aumentos com 13º,
férias e indenizações são explicados, não automaticamente sinalizados.
"""
from collections import defaultdict
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Query
from .rh_db import banco, PORTAL
from .rh_inteligencia import parse_mes

router = APIRouter(prefix="/api/v1/rh/auditoria", tags=["RH - conferência de rubricas"])
D = lambda x: Decimal(str(x or 0))
CENTAVO = Decimal("0.02")
# Classificação baseada nos códigos verificados nos PDFs e CSVs importados.
DECIMO = {"0131", "0132", "0134", "0145", "0201"}
FERIAS = {"0124", "0126", "0127", "0135", "0136", "0137", "0138",
          "0139", "0091", "0092", "0096", "0140", "0141", "0153"}
INDENIZACAO = {"2139"}
# O código 0054 "DIAS TRABALHADOS (FÉRIAS)" remunera dias de trabalho
# e não é abatido como verba adicional de férias.

def categoria(r):
    codigo = str(r.get("codigo") or "").zfill(4)
    nome = str(r.get("rubrica") or "").upper()
    if codigo in DECIMO: return "13º salário"
    if codigo in FERIAS: return "Férias e adicionais"
    if codigo in INDENIZACAO or "INDENIZA" in nome: return "Indenizações"
    if "RETRO" in nome or "MES ANTE" in nome: return "Retroativos"
    return "Demais rubricas"

def novo(r):
    return dict(matricula=str(r["matricula"]), nome=r["nome"],cargo=r["cargo"],
        jornada=r["jornada"],departamento=r["departamento"],bruto=Decimal(0),
        descontos=Decimal(0),liquido=Decimal(0),salario_base=None,
        categorias=defaultdict(Decimal),rubricas=defaultdict(Decimal),
        verbas=[])

def monta(rows):
    grupos = {}
    erros = []
    totais = defaultdict(Decimal)
    for r in rows:
        chave = (str(r["matricula"]),r["nome"],r["cargo"],r["jornada"])
        g = grupos.setdefault(chave,novo(r))
        g["bruto"] += D(r["bruto"])
        g["descontos"] += D(r["descontos"])
        g["liquido"] += D(r["liquido"])
        if r["tipo_inclusao"] == "0001" and D(r["salario_base"]) > 0:
            g["salario_base"] = max(g["salario_base"] or Decimal(0),D(r["salario_base"]))
        bruto_rubricas = Decimal(0)
        descontos_rubricas = Decimal(0)
        for item in r["rubricas"] or []:
            valor = D(item.get("valor"))
            codigo = str(item.get("codigo") or "").zfill(4)
            titulo = str(item.get("rubrica") or "Sem descrição")
            tipo = str(item.get("tipo") or "").upper()
            # Janeiro/2026 veio do PDF antigo sem o campo tipo; 0400 é desconto.
            if not tipo:
                tipo = "DESCONTO" if codigo == "0400" or titulo.upper()=="DESCONTOS" else "PROVENTO"
            if tipo == "PROVENTO":
                bruto_rubricas += valor
                cat = categoria(item)
                g["categorias"][cat] += valor
                g["rubricas"][(codigo,titulo,cat)] += valor
                totais[cat] += valor
            elif tipo == "DESCONTO":
                descontos_rubricas += valor
        dif_bruto = r["bruto"] - bruto_rubricas
        dif_desc = r["descontos"] - descontos_rubricas
        dif_liquido = r["bruto"] - r["descontos"] - r["liquido"]
        if any(abs(x)>CENTAVO for x in (dif_bruto,dif_desc,dif_liquido)):
            erros.append({
                "id": "conciliacao-" + str(r["id"]),
                "matricula": str(r["matricula"]), "nome":r["nome"],
                "cargo": r["cargo"],"departamento":r["departamento"],
                "tipo": "conciliacao", "titulo": "Diferença aritmética nas rubricas",
                "detalhes": "Soma dos proventos, descontos e líquido não confere com os valores declarados na linha da folha.",
                "bruto":float(r["bruto"]), "rubricas_bruto":float(bruto_rubricas),
                "descontos":float(r["descontos"]),"rubricas_descontos":float(descontos_rubricas),
                "diferenca_bruto":float(dif_bruto),"diferenca_descontos":float(dif_desc),
                "diferenca_liquido":float(dif_liquido),
                "rubricas":[],"status":"requer_conferencia", "fonte":PORTAL
            })
    return grupos,erros,totais

def detalhe(g):
    return [{
        "codigo": codigo,"nome":nome,"categoria":cat,"valor":round(float(valor),2)
    } for (codigo,nome,cat),valor in sorted(
        g["rubricas"].items(),key=lambda par:(-par[1],par[0][0])) if valor!=0]

@router.get("/resumo")
def resumo(mes:str=Query("2026-07",max_length=7)):
    atual=parse_mes(mes)
    anterior=date(atual.year,atual.month-1,1) if atual.month>1 else None
    competencias=[atual]+([anterior] if anterior else [])
    with banco() as con:
        rows=con.execute("""
            SELECT id,competencia,matricula,nome,cargo,jornada,departamento,
              tipo_inclusao,salario_base,bruto,descontos,liquido,rubricas
            FROM rh_folha_analitica_2026
            WHERE competencia=ANY(%s::date[]) ORDER BY competencia,matricula,id
        """,(competencias,)).fetchall()
    ag = {m:[] for m in competencias}
    for r in rows: ag[r["competencia"]].append(r)
    atuais,erros,totais=monta(ag[atual])
    anteriores,_,totais_anterior=monta(ag[anterior]) if anterior else ({},[],{})
    bruto=sum((g["bruto"] for g in atuais.values()),Decimal(0))
    bruto_anterior=sum((g["bruto"] for g in anteriores.values()),Decimal(0))
    explicados=[]
    revisoes=[]
    # Se uma diferença bruta estiver coberta por rubricas eventuais, não virar alerta.
    for chave,g in atuais.items():
        a=anteriores.get(chave)
        if not a or a["bruto"] <= 0:
            continue
        delta=g["bruto"]-a["bruto"]
        eventuais = sum((g["categorias"].get(c,Decimal(0))-
                        a["categorias"].get(c,Decimal(0)) for c in
                        ("13º salário","Férias e adicionais","Indenizações","Retroativos")),Decimal(0))
        residual=delta-eventuais
        if delta>=Decimal(1500) and delta>=a["bruto"]*Decimal(".3"):
            margem=max(Decimal(700),a["bruto"]*Decimal(".15"))
            if eventuais>0 and abs(residual)<=margem:
                explicados.append({
                    "id":"exp-"+mes+"-"+g["matricula"]+"-"+str(len(explicados)),
                    "nome":g["nome"],"matricula":g["matricula"],"cargo":g["cargo"],
                    "departamento":g["departamento"],
                    "bruto_anterior":round(float(a["bruto"]),2),
                    "bruto_atual":round(float(g["bruto"]),2),
                    "aumento":round(float(delta),2),"eventuais_variacao":round(float(eventuais),2),
                    "residual":round(float(residual),2),
                    "rubricas":detalhe(g),
                    "explicacao":"Diferença acompanhada de rubricas eventuais explicitamente identificadas. A conciliação dos valores não equivale à validação jurídica da verba."
                })
        # Revisão de base é um pedido de conferir atos/tabela legal, nunca prova de erro.
        if g["salario_base"] is not None and a["salario_base"] is not None and a["salario_base"]>0:
            dif=g["salario_base"]-a["salario_base"]
            if abs(dif)>=Decimal(300) and abs(dif)>=a["salario_base"]*Decimal(".15"):
                revisoes.append({
                    "id":"base-"+mes+"-"+g["matricula"]+"-"+str(len(revisoes)),
                    "nome":g["nome"],"matricula":g["matricula"],"cargo":g["cargo"],
                    "departamento":g["departamento"],
                    "base_anterior":round(float(a["salario_base"]),2),
                    "base_atual":round(float(g["salario_base"]),2),
                    "diferenca":round(float(dif),2),
                    "rubricas":detalhe(g),
                    "explicacao":"Mudança relevante no vencimento-base para o mesmo cargo e jornada. É necessário verificar progressão, alteração funcional, decisão administrativa e tabela municipal vigente."
                })
    explicados.sort(key=lambda x:-x["aumento"])
    revisoes.sort(key=lambda x:-abs(x["diferenca"]))
    rubricas_nomeadas = {k:round(float(v),2) for k,v in totais.items()}
    anteriores_nomeadas = {k:round(float(v),2) for k,v in totais_anterior.items()}
    categorias=("13º salário","Férias e adicionais","Indenizações","Retroativos","Demais rubricas")
    distribuicao=[{
        "categoria":c,"atual":rubricas_nomeadas.get(c,0.0),
        "anterior":anteriores_nomeadas.get(c,0.0),
        "variacao":round(rubricas_nomeadas.get(c,0.0)-anteriores_nomeadas.get(c,0.0),2)
    } for c in categorias]
    return {
        "mes":mes,"mes_anterior":anterior.strftime("%Y-%m") if anterior else None,
        "fonte":PORTAL,
        "cobertura":{"linhas":len(ag[atual]),"vinculos":len(atuais),"linhas_anterior":len(ag.get(anterior,[]))},
        "financeiro":{
            "bruto":round(float(bruto),2),
            "bruto_anterior":round(float(bruto_anterior),2) if anterior else None,
            "variacao":round(float(bruto-bruto_anterior),2) if anterior else None,
            "rubricas":distribuicao,
        },
        "contagens":{
            "inconsistencias_aritmeticas":len(erros),
            "variacoes_explicadas":len(explicados),
            "revisoes_base":len(revisoes),
            "verificacoes_legais_automaticas":0
        },
        "inconsistencias":erros[:40],
        "explicados":explicados[:30],
        "revisoes":revisoes[:30],
        "nota":"Os totais utilizam TODAS as inclusões de pagamento da competência; rubricas eventuais são classificadas por códigos do PDF/CSV. A conciliação matemática não atesta base legal, jornada, tempo de serviço ou regularidade funcional. A ausência de documentação legal produz análise inconclusiva, não erro.",
        "politica":"Só divergências aritméticas são chamadas inconsistências; aumentos com férias, décimo terceiro ou indenizações documentados não contam como irregularidades. Alterações de vencimento-base são revisões documentais."
    }
