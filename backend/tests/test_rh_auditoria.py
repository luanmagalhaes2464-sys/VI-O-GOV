from datetime import date
from decimal import Decimal
from app.rh_auditoria import monta,categoria

def linha(rid,mes,tipo,bruto,descontos,itens,base=0):
    return {"id":rid,"competencia":date.fromisoformat(mes+"-01"),
        "matricula":"100","nome":"Pessoa demonstrativa","cargo":"Cargo teste",
        "jornada":"40:00","departamento":"Unidade teste",
        "tipo_inclusao":tipo,"salario_base":Decimal(str(base)),
        "bruto":Decimal(str(bruto)), "descontos":Decimal(str(descontos)),
        "liquido":Decimal(str(bruto-descontos)), "rubricas":itens}

def test_classificacao_das_parcelas_importadas():
    assert categoria({"codigo":"0131","rubrica":"ADIANT.13 SALARIO"})=="13º salário"
    assert categoria({"codigo":"2139","rubrica":"LICENCA-PRÊMIO (INDENIZADA)"})=="Indenizações"
    assert categoria({"codigo":"0126","rubrica":"FERIAS NO MES"})=="Férias e adicionais"
    assert categoria({"codigo":"0054","rubrica":"DIAS TRABALHADOS (FERIAS)"})=="Demais rubricas"
    assert categoria({"codigo":"0400","rubrica":"DESCONTOS"})=="Demais rubricas"

def test_soma_bate_com_rubricas():
    rows=[linha(1,"2026-07","0001",2500,300,[
        {"tipo":"PROVENTO","codigo":"0100","rubrica":"SALARIO BASE","valor":2000},
        {"tipo":"PROVENTO","codigo":"0131","rubrica":"ADIANT.13 SALARIO","valor":500},
        {"tipo":"DESCONTO","codigo":"0400","rubrica":"DESCONTOS","valor":300}
    ],base=2000)]
    agrupados,erros,totais=monta(rows)
    assert erros==[]
    assert totais["13º salário"]==Decimal("500")
    assert list(agrupados.values())[0]["bruto"]==Decimal("2500")

def test_diferenca_aritmetica_e_alerta_objetivo():
    rows=[linha(1,"2026-07","0001",2600,300,[
        {"tipo":"PROVENTO","codigo":"0100","rubrica":"SALARIO BASE","valor":2000},
        {"tipo":"PROVENTO","codigo":"0131","rubrica":"ADIANT.13 SALARIO","valor":500},
        {"tipo":"DESCONTO","codigo":"0400","rubrica":"DESCONTOS","valor":300}
    ])]
    _,errors,_=monta(rows)
    assert len(errors)==1
    assert errors[0]["diferenca_bruto"]==100.0
