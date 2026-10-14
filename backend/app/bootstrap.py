import json
from pathlib import Path
from .db import conn
from .config import settings

DATA_DIR=Path(__file__).parent/'data'

def load_local(name):
    return json.loads((DATA_DIR/name).read_text(encoding='utf-8'))

def bootstrap_sources():
    if not settings.database_url:
        return
    fontes=load_local('fontes.json')
    # Somente metadados: NÃO carregar valores atuais fictícios.
    with conn() as db:
        with db.cursor() as cur:
            for s in fontes:
                cur.execute('''INSERT INTO fontes_dados
                  (id,tema,nome,instituicao,situacao,formato,ingestao,periodicidade,
                   chave_vinculo,uso,classificacao,prioridade,fase,cuidado,url)
                  VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                  ON CONFLICT (id) DO UPDATE SET nome=EXCLUDED.nome,
                   situacao=EXCLUDED.situacao,formato=EXCLUDED.formato,
                   ingestao=EXCLUDED.ingestao,cuidado=EXCLUDED.cuidado,url=EXCLUDED.url''',
                  tuple(s.get(k) for k in ['id','tema','nome','instituicao','situacao','formato','ingestao','periodicidade','chave_vinculo','uso','classificacao','prioridade','fase','cuidado','url']))
        db.commit()
