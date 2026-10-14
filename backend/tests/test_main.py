from app.main import normalizar,resposta_agente,load_local

def test_acento():
    assert normalizar('Iluminação PÚBLICA')=='iluminacao publica'

def test_catalogo():
    assert len(load_local('fontes.json'))==47

def test_sem_dados_nao_inventa():
    r=resposta_agente('Qual o tempo médio dos ônibus?',2026)
    assert r['tipo']=='sem_dados'
