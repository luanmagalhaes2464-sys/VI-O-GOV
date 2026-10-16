from datetime import date
from fastapi import HTTPException
import pytest
from app.rh_inteligencia import parse_mes, mes_anterior, interpretar_rgf, numero, LIMITES

def test_competencias_validas():
    assert parse_mes("2026-07") == date(2026, 7, 1)
    assert mes_anterior(date(2026, 7, 1)) == date(2026, 6, 1)
    assert mes_anterior(date(2026, 1, 1)) is None
    with pytest.raises(HTTPException):
        parse_mes("2026-08")

def test_lrf_thresholds_executivo():
    assert LIMITES == {"alerta": 48.6, "prudencial": 51.3, "legal": 54.0}

def test_rgf_precisa_identificar_linha_e_coluna():
    rows = [
        {"conta": "DESPESA TOTAL COM PESSOAL - DTP", "coluna": "% sobre a RCL Ajustada", "valor": "49,31"},
        {"conta": "DESPESA COM PESSOAL", "coluna": "DESPESAS LIQUIDADAS", "valor": "7800000"}
    ]
    assert interpretar_rgf(rows)["valor"] == 49.31
    assert interpretar_rgf([{"conta": "LIMITE LEGAL", "coluna": "% sobre RCL", "valor": "54"}]) is None
    assert interpretar_rgf([]) is None

def test_rgf_ambiguo_nao_publica_percentual():
    rows = [
        {"conta": "DESPESA TOTAL COM PESSOAL", "coluna": "% SOBRE A RCL", "valor": "43,20"},
        {"conta": "DESPESA TOTAL COM PESSOAL", "coluna": "% SOBRE A RCL", "valor": "49,00"}
    ]
    assert interpretar_rgf(rows) is None

def test_numero_fiscal_nao_gera_estimativa():
    assert numero("12.345,67") == 12345.67
    assert numero("—") is None
