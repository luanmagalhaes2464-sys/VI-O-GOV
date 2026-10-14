"""VIÇO GOV API. Público: dados abertos e indicadores demonstrados; mutações exigem credencial administrativa.
A API NÃO simula dados financeiros nem inventa municípios/equipamentos."""
import logging
import re
import unicodedata
from contextlib import asynccontextmanager
from decimal import Decimal
from datetime import date, datetime
from hashlib import sha256
from typing import Literal

from fastapi import FastAPI, HTTPException, Query, Header, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .config import settings
from .db import query, conn
from .bootstrap import bootstrap_sources, load_local

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("vico_gov")

@asynccontextmanager
async def lifespan(_app:FastAPI):
    try:
        bootstrap_sources()
    except Exception:
        logger.exception("Falha ao sincronizar catálogo; API seguirá sem atualização")
    yield

app=FastAPI(title="VIÇO GOV — API de Inteligência Municipal", version="0.1.0",
 description="Indicadores rastreáveis e metadados de fontes públicas; não representa sistema oficial da Prefeitura.", lifespan=lifespan)
app.add_middleware(CORSMiddleware,allow_origins=[v.strip() for v in settings.cors_origins.split(',') if v.strip()],allow_credentials=False,allow_methods=['GET','POST'],allow_headers=['Content-Type','X-Admin-Key'])

HIST_URL='https://www.vicosa.mg.gov.br/abrir_arquivo.aspx/Anexo_II__Termo_de_Referencia?arquivo=%7BC2E1BCC5-71DC-C8BC-5A70-A8BDEB04C5E7%7D.pdf&cdLocal=2'

def safe_query(sql, params=()):
    if not settings.database_url:
        return []
    try:
        return query(sql,params)
    except Exception:
        logger.exception('Consulta ao banco falhou')
        raise HTTPException(503,"Banco de dados indisponível. Tente novamente.")

def serial(v):
    if isinstance(v,Decimal): return float(v)
    if isinstance(v,(datetime,date)): return v.isoformat()
    if isinstance(v,list): return [serial(item) for item in v]
    if isinstance(v,dict): return {k:serial(x) for k,x in v.items()}
    return v

@app.get('/health')
def health():
    return {'status':'ok','name':settings.app_name,'database_configured':bool(settings.database_url)}

@app.get('/api/v1/dashboard/resumo')
def resumo(ano:int=Query(2026,ge=2000,le=2200)):
    rows=safe_query('''SELECT tipo,SUM(valor) AS total,MAX(competencia) AS ultima_competencia
      FROM registros_financeiros WHERE ano=%s AND qualidade='validado' AND tipo IN ('receita','pagamento') GROUP BY tipo''',(ano,))
    values={r['tipo']:r for r in rows}
    servidores=safe_query('''SELECT SUM(total_servidores) AS total FROM servidores_agregado WHERE ano=%s''',(ano,))
    return {'ano':ano,'receita_arrecadada':serial(values['receita']['total']) if 'receita' in values else None,
      'despesa_paga':serial(values['pagamento']['total']) if 'pagamento' in values else None,
      'servidores':serial(servidores[0]['total']) if servidores and servidores[0]['total'] is not None else None,
      'emendas_recebidas':None,'qualidade':'sem_dado_validado' if not values else 'parcial',
      'aviso':'Ausência de dados não significa valor zero. Valores de emendas exigem conciliação e não são somados à receita.'}

@app.get('/api/v1/fontes')
def fontes(tema:str|None=None,prioridade:str|None=None):
    rows=load_local('fontes.json')
    if tema: rows=[r for r in rows if tema.lower() in (r.get('tema') or '').lower()]
    if prioridade: rows=[r for r in rows if r.get('prioridade')==prioridade]
    return {'total':len(rows),'items':rows,'nota':'Fonte catalogada não significa extração automatizada funcional.'}

@app.get('/api/v1/indicadores/historicos')
def historicos():
    return {'items':load_local('evidencias.json'),'nota':'Exemplos de evidências documentadas, não indicadores atuais.'}

@app.get('/api/v1/infraestrutura/cosip')
def cosip(ano:int|None=None):
    dados=safe_query('''SELECT ano,valor,fonte_url,observacao FROM indicador_valores
       WHERE indicador_codigo='cip_historica' ORDER BY ano''')
    if not dados:
        dados=[{'ano':r['ano'],'valor':r['valor'],'fonte_url':r['url'],'observacao':'Dado histórico; não corresponde a receita atual.'}
               for r in load_local('evidencias.json') if 'CIP/COSIP' in r['nome']]
    if ano: dados=[r for r in dados if r['ano']==ano]
    return {'tipo':'historico_oficial','items':[serial(r) for r in dados],
      'fonte':HIST_URL,'alerta':'Somente série histórica de 2015–2017. Não extrapolar nem tratar como saldo livre em 2026.'}

@app.get('/api/v1/financas/{natureza}')
def financas(natureza:Literal['receitas','despesas'],ano:int=Query(2026,ge=2000,le=2200),fase:Literal['empenho','liquidacao','pagamento']='pagamento'):
    tipo='receita' if natureza=='receitas' else fase
    dados=safe_query('''SELECT o.nome AS orgao,COALESCE(r.descricao,'Sem descrição') AS descricao,
      SUM(r.valor) AS valor,COUNT(*) AS lancamentos,MAX(r.competencia) AS competencia
      FROM registros_financeiros r LEFT JOIN orgaos o ON o.id=r.orgao_id
      WHERE r.ano=%s AND r.tipo=%s AND r.qualidade='validado'
      GROUP BY o.nome,r.descricao ORDER BY valor DESC LIMIT 100''',(ano,tipo))
    return {'ano':ano,'natureza':natureza,'fase':tipo,'total':sum(float(r['valor']) for r in dados) if dados else None,
      'items':[serial(x) for x in dados], 'aviso':'Empenho, liquidação e pagamento são fases distintas. Não somar entre si.'}

@app.get('/api/v1/recursos/{categoria}')
def recursos(categoria:Literal['emendas','convenios'],ano:int=Query(2026,ge=2000,le=2200)):
    tipo='emenda' if categoria=='emendas' else 'convenio'
    rows=safe_query('''SELECT codigo,ano,concedente,beneficiario,origem,objeto,situacao,
      valor_indicado,valor_pactuado,valor_repassado,valor_executado FROM instrumentos_recursos
      WHERE ano=%s AND tipo=%s ORDER BY codigo LIMIT 100''',(ano,tipo))
    return {'ano':ano,'items':[serial(r) for r in rows],
      'aviso':'Cada etapa do recurso corresponde a evento próprio, não somar colunas para obter total.'}

@app.get('/api/v1/mapa/camadas')
def camadas():
    return {'items':[
       {'id':'osm','nome':'Mapa base OpenStreetMap','disponivel':True,'fonte':'OpenStreetMap'},
       {'id':'setores','nome':'Setores censitários 2022','disponivel':False,'fonte':'IBGE','nota':'Geometrias a importar'},
       {'id':'escolas','nome':'Escolas','disponivel':False,'fonte':'INEP','nota':'Coordenadas a validar'},
       {'id':'saude','nome':'Estabelecimentos de saúde','disponivel':False,'fonte':'CNES','nota':'Coordenadas a validar'},
       {'id':'obras','nome':'Obras e infraestrutura','disponivel':False,'fonte':'Prefeitura','nota':'Requer carga validada'}]}

@app.get('/api/v1/mapa/equipamentos')
def equipamentos(tipo:str|None=None):
    where=' WHERE tipo=%s' if tipo else ''
    dados=safe_query('''SELECT tipo,nome,endereco,codigo_oficial,ST_X(geom) AS longitude,
      ST_Y(geom) AS latitude,ano_referencia FROM equipamentos_publicos
      WHERE geom IS NOT NULL''' + (' AND tipo=%s' if tipo else '') + ' LIMIT 500', (tipo,) if tipo else ())
    return {'type':'FeatureCollection','features':[{'type':'Feature','geometry':{'type':'Point','coordinates':[float(r['longitude']),float(r['latitude'])]},
      'properties':{k:r[k] for k in ['tipo','nome','endereco','codigo_oficial','ano_referencia']}} for r in dados]}

@app.get('/api/v1/populacao/setores')
def populacao():
    rows=safe_query('''SELECT codigo,ano,populacao,domicilios,ST_AsGeoJSON(geom)::json AS geometry
      FROM setores_censitarios WHERE geom IS NOT NULL LIMIT 1000''')
    return {'type':'FeatureCollection','features':[{'type':'Feature','geometry':r['geometry'],
      'properties':{'codigo':r['codigo'],'ano':r['ano'],'populacao':r['populacao'],'domicilios':r['domicilios']}} for r in rows]}

@app.get('/api/v1/educacao/escolas')
def escolas():
    rows=safe_query("SELECT nome,endereco,codigo_oficial,ano_referencia FROM equipamentos_publicos WHERE tipo='escola' ORDER BY nome LIMIT 500")
    return {'items':[serial(r) for r in rows]}

@app.get('/api/v1/saude/unidades')
def unidades():
    rows=safe_query("SELECT nome,endereco,codigo_oficial,ano_referencia FROM equipamentos_publicos WHERE tipo IN ('ubs','hospital','saude') ORDER BY nome LIMIT 500")
    return {'items':[serial(r) for r in rows]}

@app.get('/api/v1/servidores/resumo')
def servidores(ano:int=Query(2026,ge=2000,le=2200)):
    rows=safe_query('''SELECT o.nome AS secretaria,SUM(s.total_servidores) AS total,
      SUM(s.despesa_pessoal) AS despesa_pessoal FROM servidores_agregado s
      LEFT JOIN orgaos o ON o.id=s.orgao_id WHERE s.ano=%s
      GROUP BY o.nome ORDER BY total DESC''',(ano,))
    return {'ano':ano,'items':[serial(r) for r in rows], 'nota':'Somente dados agregados.'}

@app.get('/api/v1/infraestrutura/obras')
def obras():
    rows=safe_query('SELECT codigo,nome,situacao,valor_previsto,valor_pago FROM obras ORDER BY id DESC LIMIT 100')
    return {'items':[serial(r) for r in rows]}

class Pergunta(BaseModel):
    pergunta:str=Field(min_length=4,max_length=600)
    ano:int=Field(default=2026,ge=2000,le=2200)

def normalizar(s:str)->str:
    return ''.join(x for x in unicodedata.normalize('NFKD',s.lower()) if not unicodedata.combining(x))

def resposta_agente(q:str,ano:int):
    p=normalizar(q)
    if any(x in p for x in ['cip','cosip','iluminacao']):
        return {'resposta':'Existem valores documentados de arrecadação da CIP/COSIP para 2015, 2016 e 2017. Não há valor corrente validado nesta base para 2026.',
         'tipo':'historico','dados':cosip()['items'],'fontes':[HIST_URL], 'sugestao':'Consulte o módulo Iluminação/COSIP para a série histórica.'}
    if any(x in p for x in ['servidor','secretaria tem mais']):
        data=servidores(ano)
        if data['items']:
            r=data['items'][0];return {'resposta':f"Em {ano}, a secretaria com maior número no conjunto disponível é {r['secretaria']}, com {r['total']} servidores agregados.", 'tipo':'registro','dados':data['items'],'fontes':['Portal da Transparência — carga validada']}
        return {'resposta':f'Ainda não há dados de servidores validados para {ano}. Não é possível identificar a secretaria com mais servidores.','tipo':'sem_dados','fontes':['Portal da Transparência de Viçosa — a integrar']}
    if any(x in p for x in ['despesa','gasto','pagou','pagamento']):
        data=financas('despesas',ano=ano,fase='pagamento')
        if data['items']:
            return {'resposta':f"O total dos pagamentos validados presentes na consulta de {ano} é R$ {data['total']:,.2f}. Verifique a abrangência da base importada.",'tipo':'registro','dados':data['items'],'fontes':['Registros financeiros municipais importados']}
        return {'resposta':f'Não existem despesas pagas validadas carregadas para {ano}. Empenhado, liquidado e pago são valores distintos.','tipo':'sem_dados','fontes':['Portal da Transparência de Viçosa — a integrar']}
    if any(x in p for x in ['emenda','convenio','recurso recebido','transferencia']):
        data=recursos('emendas',ano=ano)
        return {'resposta':f'Foram localizados {len(data["items"])} instrumentos de emenda cadastrados para {ano}.' if data['items'] else f'Os dados de emendas para {ano} ainda não foram conciliados nesta plataforma; não é possível informar o total recebido.', 'tipo':'registro' if data['items'] else 'sem_dados','dados':data['items'],'fontes':['Transferegov / portal municipal — a conciliar']}
    if any(x in p for x in ['fonte','bases de dados','integracao']):
        rows=load_local('fontes.json')
        return {'resposta':f'A arquitetura cadastra {len(rows)} fontes de dados. Isso não significa que todas estejam integradas ou atualizadas.', 'tipo':'catalogo','dados':[{'nome':r['nome'],'fase':r['fase']} for r in rows[:8]],'fontes':['Catálogo técnico do projeto VIÇO GOV']}
    return {'resposta':'Ainda não tenho dados suficientes ou uma consulta validada para responder essa pergunta. Tente consultar CIP/COSIP, servidores, despesas, emendas ou fontes de dados.', 'tipo':'sem_dados','fontes':[]}

@app.post('/api/v1/agente/perguntas')
def agente(payload:Pergunta):
    r=resposta_agente(payload.pergunta,payload.ano)
    # Não persistir texto livre. Armazenar somente hash da pergunta + categoria + resposta.
    if settings.database_url:
        try:
            with conn() as db:
                with db.cursor() as cur:
                    from psycopg.types.json import Jsonb
                    cur.execute('INSERT INTO agente_perguntas(pergunta,intencao,resposta) VALUES (%s,%s,%s)', ('sha256:'+sha256(payload.pergunta.encode('utf-8')).hexdigest(), r['tipo'],Jsonb(r)))
                db.commit()
        except Exception:
            logger.exception('Não foi possível salvar auditoria de pergunta')
    return r

@app.get('/api/v1/admin/fontes')
def fontes_admin(x_admin_key:str|None=Header(default=None)):
    require_admin(x_admin_key)
    return fontes()

@app.get('/api/v1/admin/importacoes')
def importacoes(x_admin_key:str|None=Header(default=None)):
    require_admin(x_admin_key)
    return {'items':[serial(r) for r in safe_query('SELECT id,fonte_id,iniciada_em,finalizada_em,status,total_linhas FROM importacoes ORDER BY id DESC LIMIT 100')]}

def require_admin(key:str|None):
    from secrets import compare_digest
    if not settings.admin_api_key or not key or not compare_digest(key, settings.admin_api_key):
        raise HTTPException(403,'Acesso administrativo não autorizado')

@app.get('/api/v1/indicadores/{codigo}')
def indicador(codigo:str):
    if not re.fullmatch(r'[a-z0-9_]{3,90}',codigo):
        raise HTTPException(400,'Código inválido')
    rows=safe_query('SELECT codigo,nome,descricao,unidade,metodologia,disponibilidade FROM indicadores WHERE codigo=%s',(codigo,))
    if not rows: raise HTTPException(404,'Indicador ainda não cadastrado')
    values=safe_query('SELECT ano,valor,referencia,fonte_url,qualidade,observacao FROM indicador_valores WHERE indicador_codigo=%s ORDER BY ano',(codigo,))
    return {'indicador':serial(rows[0]),'historico':[serial(v) for v in values]}
