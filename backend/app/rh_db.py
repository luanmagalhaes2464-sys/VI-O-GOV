"""VIÇO GOV: consulta de folha pública por matrícula e competência, diretamente no Neon.
Nenhum registro nominal foi adicionado ao GitHub; os originais permanecem no banco.
"""
import os
import re
from contextlib import contextmanager
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, HTTPException, Query
from psycopg import connect
from psycopg.rows import dict_row

router = APIRouter(prefix="/api/v1/rh/folha", tags=["RH - folha mensal"])
FAIXAS = (
    ("ate_2","Até R$ 2 mil",None,2000),
    ("2_4","R$ 2–4 mil",2000,4000),
    ("4_6","R$ 4–6 mil",4000,6000),
    ("6_8","R$ 6–8 mil",6000,8000),
    ("8_10","R$ 8–10 mil",8000,10000),
    ("10_12","R$ 10–12 mil",10000,12000),
    ("acima_12","Acima de R$ 12 mil",12000,None),
)
ORIGEM="Folha de Pagamento, Prefeitura Municipal de Viçosa/MG, PDF fornecido pelo usuário"
PORTAL="https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml"

def competencia(valor:str)->date:
    if not re.fullmatch(r"2026-(0[1-7])",valor):
        raise HTTPException(422,"Informe uma competência entre 2026-01 e 2026-07.")
    return date.fromisoformat(valor+"-01")

@contextmanager
def banco():
    url=os.getenv("DATABASE_URL")
    if not url:
        raise HTTPException(503,"A conexão do banco de RH ainda não foi configurada.")
    try:
        with connect(url,connect_timeout=12,row_factory=dict_row) as con:
            yield con
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(503,"Não foi possível consultar o banco de RH no momento.") from None

def tipo(vinculo:str)->str:
    nome=vinculo.upper()
    if "APOSENTADO" in nome or "INATIVO" in nome:return "aposentado"
    if "COMISSIONADO" in nome:return "comissionado"
    if "EST. EFETIVO" in nome:return "efetivo"
    if "ESTAVEL" in nome:return "estavel"
    if "ESTAGI" in nome:return "estagiario"
    return "outros"

def sql_filtros(competencia_val:str, departamento:str="", cargo:str="", vinculo:str="",
                local:str="", jornada:str="", situacao:str="", faixa:str="", base:str="bruto",
                busca:str=""):
    clauses=["competencia=%s"]
    vals=[competencia(competencia_val)]
    for col,value in [("departamento",departamento),("cargo",cargo),("vinculo",vinculo),
                      ("local_trabalho",local),("jornada",jornada)]:
        if value:
            clauses.append(col+"=%s");vals.append(value)
    if situacao:
        tipos={"aposentado":"vinculo ILIKE '%%APOSENTADO%%' OR vinculo ILIKE '%%INATIVO%%'",
               "efetivo":"vinculo ILIKE '%%EST. EFETIVO%%'",
               "comissionado":"vinculo ILIKE '%%COMISSIONADO%%'",
               "estavel":"vinculo ILIKE '%%ESTAVEL%%'",
               "estagiario":"vinculo ILIKE '%%ESTAGI%%'"}
        if situacao not in tipos:raise HTTPException(422,"Categoria inválida.")
        clauses.append("("+tipos[situacao]+")")
    if base not in ("bruto","liquido"):raise HTTPException(422,"Base salarial inválida.")
    if faixa:
        entry=next((x for x in FAIXAS if x[0]==faixa),None)
        if not entry:raise HTTPException(422,"Faixa salarial inválida.")
        if entry[2] is not None:clauses.append(base+">%s");vals.append(entry[2])
        if entry[3] is not None:clauses.append(base+"<=%s");vals.append(entry[3])
    if busca:
        clauses.append("(nome ILIKE %s OR matricula ILIKE %s)")
        vals.extend(["%"+busca+"%","%"+busca+"%"])
    return " AND ".join(clauses),vals

@router.get("/competencias")
def listar_competencias():
    with banco() as con:
        rows=con.execute("SELECT to_char(competencia,'YYYY-MM') AS mes, registros,validada,divergencia FROM rh_cargas ORDER BY competencia").fetchall()
    disponiveis={x["mes"]:x for x in rows}
    return {"meses":[{"mes":f"2026-{i:02d}","disponivel":f"2026-{i:02d}" in disponiveis,
                      "registros":disponiveis.get(f"2026-{i:02d}",{}).get("registros")}
                     for i in range(1,8)],"fonte":ORIGEM}

@router.get("/resumo")
def resumo(competencia_mes:str=Query("2026-01",alias="mes")):
    c=competencia(competencia_mes)
    with banco() as con:
        d=con.execute("""SELECT COUNT(*) AS matriculas,COUNT(DISTINCT nome) AS nomes_distintos,
                      COALESCE(SUM(bruto),0) AS bruto,COALESCE(SUM(liquido),0) AS liquido,
                      COALESCE(SUM(descontos),0) AS descontos,COALESCE(SUM(quinquenio),0) AS quinquenio,
                      COUNT(*) FILTER(WHERE desligamento IS NOT NULL AND desligamento<=competencia) AS desligados_ate_inicio_mes
                    FROM rh_folha_mensal WHERE competencia=%s""",(c,)).fetchone()
        carga=con.execute("SELECT paginas_pdf,bruto_portal,divergencia,validada,notas FROM rh_cargas WHERE competencia=%s",(c,)).fetchone()
    if not carga: return {"mes":competencia_mes,"disponivel":False,"fonte":PORTAL}
    return {"mes":competencia_mes,"disponivel":True,"matriculas":d["matriculas"],
        "nomes_distintos":d["nomes_distintos"],"bruto":d["bruto"],"liquido":d["liquido"],
        "descontos":d["descontos"],"quinquenio":d["quinquenio"],"paginas":carga["paginas_pdf"],
        "bruto_portal":carga["bruto_portal"],"divergencia":carga["divergencia"],
        "conciliado":carga["validada"],"nota":carga["notas"],"fonte":ORIGEM,
        "aviso":"Contagem de matrículas da folha, não necessariamente servidores ativos únicos."}

@router.get("/filtros")
def filtros(mes:str="2026-01"):
    c=competencia(mes)
    with banco() as con:
        result={}
        for col,key in (("departamento","departamentos"),("cargo","cargos"),
                        ("vinculo","vinculos"),("local_trabalho","locais"),("jornada","jornadas")):
            result[key]=[x["v"] for x in con.execute(f"SELECT DISTINCT {col} AS v FROM rh_folha_mensal WHERE competencia=%s AND {col}<>'' ORDER BY v",(c,)).fetchall()]
    return {"mes":mes,**result}

def params(mes,departamento,cargo,vinculo,local,jornada,situacao,faixa,base,busca):
    return sql_filtros(mes,departamento,cargo,vinculo,local,jornada,situacao,faixa,base,busca)

@router.get("/analise")
def analise(mes:str="2026-01",
    departamento:str=Query("",max_length=160),
    cargo:str=Query("",max_length=120),
    vinculo:str=Query("",max_length=120),
    local:str=Query("",max_length=180),
    jornada:str=Query("",max_length=20),
    situacao:str=Query("",max_length=30),
    faixa:str=Query("",max_length=20),
    base:str=Query("bruto",max_length=10),
    busca:str=Query("",max_length=80)):
    where,args=params(mes,departamento,cargo,vinculo,local,jornada,situacao,faixa,base,busca)
    with banco() as con:
        metrics=con.execute(f"""SELECT COUNT(*) AS matriculas, COUNT(DISTINCT nome) AS nomes_distintos,
                 COALESCE(SUM(bruto),0) AS bruto, COALESCE(SUM(liquido),0) AS liquido,
                 COALESCE(SUM(descontos),0) AS descontos,COALESCE(SUM(quinquenio),0) AS quinquenio,
                 COALESCE(AVG({base}),0) AS media
                 FROM rh_folha_mensal WHERE {where}""",args).fetchone()
        def group(column,limit=30):
            return con.execute(f"""SELECT {column} AS nome,COUNT(*) AS quantidade,
                    SUM(bruto) AS bruto,SUM(liquido) AS liquido
                    FROM rh_folha_mensal WHERE {where}
                    GROUP BY {column} ORDER BY quantidade DESC,nome LIMIT %s""",[*args,limit]).fetchall()
        areas=group("departamento")
        cargos=group("cargo")
        vinculos=group("vinculo")
        locais=group("local_trabalho")
        faixas=[]
        for codigo,nome,low,high in FAIXAS:
            clauses=[where];p=list(args)
            if low is not None:clauses.append(base+">%s");p.append(low)
            if high is not None:clauses.append(base+"<=%s");p.append(high)
            row=con.execute("SELECT COUNT(*) AS quantidade FROM rh_folha_mensal WHERE "+" AND ".join(clauses),p).fetchone()
            faixas.append({"codigo":codigo,"nome":nome,"quantidade":row["quantidade"]})
    return {"mes":mes,"quantitativos":metrics,"faixas":faixas,
            "por_departamento":areas,"por_cargo":cargos,"por_vinculo":vinculos,
            "por_local":locais,"fonte":ORIGEM,
            "nota":"Valores mensais de matrículas constantes no PDF de janeiro; não representam necessariamente quadro ativo."}

@router.get("/pessoas")
def pessoas(mes:str="2026-01",
    departamento:str=Query("",max_length=160),
    cargo:str=Query("",max_length=120),
    vinculo:str=Query("",max_length=120),
    local:str=Query("",max_length=180),
    jornada:str=Query("",max_length=20),
    situacao:str=Query("",max_length=30),
    faixa:str=Query("",max_length=20),
    base:str=Query("bruto",max_length=10),
    busca:str=Query("",max_length=80),
    pagina:int=Query(1,ge=1,le=500),
    tamanho:int=Query(20,ge=1,le=50)):
    where,args=params(mes,departamento,cargo,vinculo,local,jornada,situacao,faixa,base,busca)
    with banco() as con:
        total=con.execute(f"SELECT COUNT(*) AS total FROM rh_folha_mensal WHERE {where}",args).fetchone()["total"]
        rows=con.execute(f"""SELECT matricula,nome,admissao,desligamento,jornada,cargo,vinculo,
                departamento,local_trabalho,bruto,liquido,descontos,quinquenio,pagina_pdf,
                (SELECT (item->>'valor')::NUMERIC FROM jsonb_array_elements(rubricas) AS item
                   WHERE item->>'codigo'='100' LIMIT 1) AS salario_base
                FROM rh_folha_mensal WHERE {where} ORDER BY nome,matricula LIMIT %s OFFSET %s""",
               [*args,tamanho,(pagina-1)*tamanho]).fetchall()
    return {"mes":mes,"total":total,"pagina":pagina,"tamanho":tamanho,"pessoas":rows,
            "nota":"Remuneração individual disponível no documento público de folha da Prefeitura. Registros por matrícula."}

@router.get("/pessoas/{matricula}")
def pessoa(matricula:str,mes:str="2026-01"):
    if not re.fullmatch(r"\d{1,12}",matricula):raise HTTPException(422,"Matrícula inválida.")
    with banco() as con:
        record=con.execute("""SELECT competencia,matricula,nome,admissao,desligamento,jornada,cargo,vinculo,
             departamento,local_trabalho,bruto,liquido,descontos,quinquenio,rubricas,pagina_pdf,
             (SELECT (item->>'valor')::NUMERIC FROM jsonb_array_elements(rubricas) AS item
                WHERE item->>'codigo'='100' LIMIT 1) AS salario_base
             FROM rh_folha_mensal WHERE competencia=%s AND matricula=%s""",(competencia(mes),matricula.lstrip('0') or '0')).fetchone()
    if not record:raise HTTPException(404,"Matrícula não localizada.")
    return {"registro":record,"fonte":ORIGEM,
            "observacao":"Rubricas correspondem ao documento do mês selecionado; quinquênio considera a rubrica código 105."}
