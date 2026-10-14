"""RH: agregados da folha oficial; registros pessoais não são publicados."""
import json
from pathlib import Path

PATH=Path(__file__).resolve().parent.parent/'data'/'rh_latest.json'

def snapshot():
    if not PATH.is_file(): return None
    data=json.loads(PATH.read_text(encoding='utf-8'))
    return data if data.get('completo') is True else None

def resumo():
    x=snapshot()
    return {'status':'integrado' if x else 'aguardando_exportacao_integral','referencia':x.get('referencia') if x else '2026-01','total_matriculas':x.get('total_matriculas') if x else None,'total_bruto':x.get('total_bruto') if x else None,'total_liquido':x.get('total_liquido') if x else None,'total_bruto_fonte_2026_01':11822334.05,'fonte':'https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml','nota':'Total de matrículas não equivale necessariamente ao total de pessoas; a fonte financeira de janeiro é o valor bruto exibido na aba Folha de Pagamento.'}
