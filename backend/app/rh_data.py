"""Relatórios de RH com dados agregados extraídos da folha municipal, sem nomes pessoais."""
import json
from pathlib import Path
from collections import defaultdict

PATH=Path(__file__).resolve().parent.parent/"data"/"rh_latest.json"
FONTE="https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml"
FAIXAS=[("ate_2","Até R$ 2 mil"),("2_4","R$ 2–4 mil"),("4_6","R$ 4–6 mil"),("6_8","R$ 6–8 mil"),("8_10","R$ 8–10 mil"),("10_12","R$ 10–12 mil"),("acima_12","Acima de R$ 12 mil")]

def snapshot():
    if not PATH.is_file():return None
    try:
        data=json.loads(PATH.read_text(encoding="utf-8"))
        if data.get("completo") is True and data.get("total_matriculas",0)>20 and isinstance(data.get("grupos"),list):
            return data
    except (ValueError,TypeError,OSError):
        pass
    return None

def resumo():
    x=snapshot()
    return {"status":"integrado" if x else "aguardando_exportacao_integral",
      "referencia":x.get("referencia") if x else "2026-01",
      "total_matriculas":x.get("total_matriculas") if x else None,
      "total_pessoas":None,
      "total_bruto":x.get("total_bruto") if x else None,
      "total_liquido":x.get("total_liquido") if x else None,
      "total_bruto_fonte_2026_01":11822334.05,"fonte":FONTE,
      "data_importacao":x.get("processado_em") if x else None,
      "nota":"Uma pessoa pode ter mais de uma matrícula. Valores de janeiro são da aba Folha de Pagamento, sem incluir automaticamente agentes políticos e estagiários."}

def analise(secretaria="",cargo="",vinculo="",situacao="",faixa="",tipo_salario="bruto"):
    x=snapshot()
    if not x:
        return {"status":"aguardando_exportacao_integral","referencia":None,
          "quantidade":None,"total_bruto":None,"total_liquido":None,
          "faixas":[],"por_secretaria":[],"por_cargo":[],"por_vinculo":[],
          "opcoes":{"secretarias":[],"cargos":[],"vinculos":[]},
          "nota":"Aguardando exportação integral oficial: os dez primeiros registros visíveis no portal não representam todo o quadro."}
    rows=x["grupos"]
    opts={"secretarias":sorted({r.get("secretaria","") for r in rows if r.get("secretaria")}),
          "cargos":sorted({r.get("cargo","") for r in rows if r.get("cargo")}),
          "vinculos":sorted({r.get("vinculo","") for r in rows if r.get("vinculo")})}
    def match(r):
        return (not secretaria or r.get("secretaria")==secretaria) and (not cargo or r.get("cargo")==cargo) and (not vinculo or r.get("vinculo")==vinculo) and (not situacao or r.get("situacao")==situacao) and (not faixa or r.get("faixa_"+tipo_salario)==faixa)
    filtered=[r for r in rows if match(r)]
    def agrupamento(col):
        acc=defaultdict(lambda:{"quantidade":0,"bruto":0.0,"liquido":0.0})
        for r in filtered:
            a=acc[r.get(col) or "Não informado"]
            a["quantidade"]+=int(r.get("quantidade",0))
            a["bruto"]+=float(r.get("bruto",0))
            a["liquido"]+=float(r.get("liquido",0))
        return sorted([{"nome":k,"quantidade":v["quantidade"],"bruto":round(v["bruto"],2),"liquido":round(v["liquido"],2)} for k,v in acc.items()],key=lambda v:(-v["quantidade"],v["nome"]))
    return {"status":"integrado","referencia":x.get("referencia"),
      "quantidade":sum(int(r["quantidade"]) for r in filtered),
      "total_bruto":round(sum(float(r["bruto"]) for r in filtered),2),
      "total_liquido":round(sum(float(r["liquido"]) for r in filtered),2),
      "faixas":[{"codigo":code,"nome":label,"quantidade":sum(int(r["quantidade"]) for r in filtered if r.get("faixa_"+tipo_salario)==code)} for code,label in FAIXAS],
      "por_secretaria":agrupamento("secretaria"),"por_cargo":agrupamento("cargo"),
      "por_vinculo":agrupamento("vinculo"),"opcoes":opts,
      "nota":"Contagem de vínculos/matrículas na competência informada; não equivale necessariamente ao número de pessoas distintas."}
