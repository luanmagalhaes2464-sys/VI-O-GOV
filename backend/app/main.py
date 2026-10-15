"""VIÇO GOV • Módulo exclusivo de Recursos Humanos de Viçosa/MG."""
from fastapi import FastAPI, Query
from fastapi.responses import RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal
from .rh_data import resumo, analise
from .rh_db import router as rh_folha_router

app=FastAPI(title="VIÇO GOV | Recursos Humanos",version="0.2.0",
 description="Painel baseado na folha de pagamento oficial. A ausência de dados não é zero.")
app.add_middleware(CORSMiddleware,allow_origins=["https://vico-gov-web-vicosa.onrender.com"],
 allow_credentials=False,allow_methods=["GET"],allow_headers=["Content-Type"])

@app.get("/",include_in_schema=False)
def home():
    return RedirectResponse(url="https://vico-gov-web-vicosa.onrender.com")

@app.get("/health")
def health():
    return {"status":"ok","scope":"recursos_humanos"}

@app.get("/api/v1/rh/resumo")
def rh_resumo():
    return resumo()

@app.get("/api/v1/rh/analise")
def rh_analise(
    secretaria:str=Query(default="",max_length=150),
    cargo:str=Query(default="",max_length=150),
    vinculo:str=Query(default="",max_length=150),
    situacao:Literal["","aposentado","efetivo","comissionado","outro"]="",
    faixa:str=Query(default="",max_length=30),
    tipo_salario:Literal["bruto","liquido"]="bruto"
):
    return analise(secretaria,cargo,vinculo,situacao,faixa,tipo_salario)

app.include_router(rh_folha_router)
