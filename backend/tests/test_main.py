from app.main import normalizar,resposta_agente,load_local

def test_acento():
    assert normalizar('Iluminação PÚBLICA')=='iluminacao publica'

def test_catalogo():
    assert len(load_local('fontes.json'))==47

def test_sem_dados_nao_inventa():
    r=resposta_agente('Qual o tempo médio dos ônibus?',2026)
    assert r['tipo']=='sem_dados'


def test_perfil_municipal_fontes():
    from app.main import perfil_municipal
    perfil=perfil_municipal()
    assert perfil['codigo_ibge']=='3171303'
    assert perfil['populacao_estimada']['ano']==2026
    assert perfil['populacao_estimada']['valor']==79797
    assert perfil['hospitais_gerais_identificados']['valor']==2
    assert {x['cnes'] for x in perfil['hospitais_gerais_identificados']['unidades']}=={'2099454','2099438'}
    assert perfil['caixa_disponivel'] is None
