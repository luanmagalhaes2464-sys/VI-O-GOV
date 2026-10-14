from app.rh_data import FAIXAS, resumo, analise, snapshot
from app.main import health

def test_api_rh():
    assert health()['status']=='ok'
    assert len(FAIXAS)==7
    assert [f[0] for f in FAIXAS]==['ate_2','2_4','4_6','6_8','8_10','10_12','acima_12']

def test_sem_inventar_quantitativo():
    if snapshot() is None:
        assert resumo()['total_matriculas'] is None
        assert analise()['quantidade'] is None

def test_remuneracao_documental():
    assert resumo()['total_bruto_fonte_2026_01']==11822334.05
