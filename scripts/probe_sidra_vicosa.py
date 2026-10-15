"""Valida a API agregada MUNIC/IBGE (município 3171303, nunca outras Viçosas)."""
import json, urllib.request,sys
BASE="https://apisidra.ibge.gov.br/values/t/5881/n6/3171303/v/all/p/2023"
headers={"User-Agent":"VicoGov/0.2 contato tecnico dados abertos"}
try:
 req=urllib.request.Request(BASE,headers=headers)
 with urllib.request.urlopen(req,timeout=35) as f:
  rows=json.load(f)
 print("STATUS=OK")
 print("REGISTROS=",len(rows))
 print(json.dumps(rows[:20],ensure_ascii=False,indent=2)[:16000])
except Exception as e:
 print("STATUS=ERROR",type(e).__name__,str(e)[:200])
 sys.exit(1)
