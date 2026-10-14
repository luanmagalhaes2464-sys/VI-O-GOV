"""Exporta CSV público da folha RH e mantém no Git apenas estatísticas agrupadas."""
import asyncio,csv,hashlib,io,json,os,re,unicodedata
from collections import defaultdict
from pathlib import Path
from datetime import datetime,timezone
from playwright.async_api import async_playwright,TimeoutError as BrowserTimeout

URL="https://pmvicosa.cidadesmg.com.br/portaltransparencia/publica/recursosHumanos/recursosHumanos.xhtml"
OUT=Path(__file__).resolve().parents[1]/"backend"/"data"/"rh_latest.json"
ANO=int(os.getenv("RH_ANO","2026"));MES=int(os.getenv("RH_MES","1"))

def norm(s):
    text="".join(c for c in unicodedata.normalize("NFKD",str(s).lower()) if not unicodedata.combining(c))
    return re.sub("[^a-z0-9]+","",text)

def get(row,*keys):
    source={norm(k):v for k,v in row.items()}
    return next((str(source[norm(k)] or "").strip() for k in keys if norm(k) in source),"")

def valor(s):
    t=str(s).replace("R$","").replace(" ","").replace("\xa0","").strip()
    return float(t.replace(".","").replace(",",".")) if "," in t else float(t or 0)

def faixa(v):
    for limit,tag in [(2000,"ate_2"),(4000,"2_4"),(6000,"4_6"),(8000,"6_8"),(10000,"8_10"),(12000,"10_12")]:
        if v<=limit:return tag
    return "acima_12"

def status(v):
    v=norm(v)
    if "aposentad" in v:return "aposentado"
    if "comissionad" in v:return "comissionado"
    if "efetiv" in v:return "efetivo"
    return "outro"

def agregar(raw):
    decoded=None
    for encoding in ("utf-8-sig","cp1252","latin1"):
        try:decoded=raw.decode(encoding);break
        except UnicodeDecodeError:pass
    if not decoded:raise ValueError("Codificação do CSV não reconhecida")
    try:delimiter=csv.Sniffer().sniff(decoded[:15000],delimiters=";,\t|").delimiter
    except csv.Error:delimiter=";"
    records=list(csv.DictReader(io.StringIO(decoded),delimiter=delimiter))
    if len(records)<100:raise ValueError("Arquivo parece ser apenas uma página, não a folha integral")
    if not get(records[0],"Matrícula","Matricula"):raise ValueError("Campo Matrícula ausente; revisar exportação")
    pessoas={}
    for r in records:
        matricula=get(r,"Matrícula","Matricula")
        if not matricula:continue
        ano=get(r,"Ano");mes=get(r,"Mês","Mes")
        if ano and int(ano)!=ANO:raise ValueError("Exercício incorreto")
        if mes and int(mes)!=MES:raise ValueError("Competência incorreta")
        cargo=get(r,"Cargo/Função","Cargo Funcao","Cargo") or "Não informado"
        secretaria=get(r,"Dpto","Departamento","Secretaria") or "Não informado"
        vinculo=get(r,"Vínculo","Vinculo") or "Não informado"
        bruto=round(valor(get(r,"Valor Bruto","Bruto")),2)
        liquido=round(valor(get(r,"Valor Líquido","Valor Liquido","Liquido")),2)
        item=dict(secretaria=secretaria,cargo=cargo,vinculo=vinculo,situacao=status(vinculo),
                  faixa_bruto=faixa(bruto),faixa_liquido=faixa(liquido),bruto=bruto,liquido=liquido)
        if matricula in pessoas and pessoas[matricula]!=item:
            raise ValueError("Uma matrícula tem múltiplos lançamentos distintos; revisar antes de agregar")
        pessoas[matricula]=item
    if len(pessoas)<100:raise ValueError("Exportação insuficiente; nenhum total publicado")
    group=defaultdict(lambda:{"quantidade":0,"bruto":0.0,"liquido":0.0})
    dims=("secretaria","cargo","vinculo","situacao","faixa_bruto","faixa_liquido")
    for item in pessoas.values():
        key=tuple(item[k] for k in dims)
        g=group[key];g["quantidade"]+=1;g["bruto"]+=item["bruto"];g["liquido"]+=item["liquido"]
    grupos=[dict(zip(dims,key),quantidade=g["quantidade"],bruto=round(g["bruto"],2),liquido=round(g["liquido"],2)) for key,g in group.items()]
    grupos.sort(key=lambda r:(r["secretaria"],r["cargo"],r["vinculo"],r["faixa_bruto"]))
    return dict(completo=True,fonte="Portal da Transparência da Prefeitura de Viçosa/MG",fonte_url=URL,
      referencia=f"{ANO:04d}-{MES:02d}",total_matriculas=len(pessoas),
      total_bruto=round(sum(x["bruto"] for x in pessoas.values()),2),
      total_liquido=round(sum(x["liquido"] for x in pessoas.values()),2),
      grupos=grupos,linhas_exportadas=len(records),sha256_csv=hashlib.sha256(raw).hexdigest(),
      processado_em=datetime.now(timezone.utc).isoformat())

async def baixar():
    async with async_playwright() as playwright:
        browser=await playwright.chromium.launch(headless=True,args=["--no-sandbox"])
        page=await browser.new_page(accept_downloads=True,locale="pt-BR")
        response=await page.goto(URL,wait_until="domcontentloaded",timeout=90000)
        print("Portal status:",response.status if response else "sem resposta")
        await page.wait_for_timeout(5000)
        botao=page.get_by_text("Exportar CSV",exact=False)
        print("Controles CSV:",await botao.count())
        if await botao.count()<1:raise RuntimeError("Exportar CSV indisponível")
        try:
            async with page.expect_download(timeout=16000) as download_event:
                await botao.first.click(timeout=16000)
            download=await download_event.value
        except BrowserTimeout:
            pronto=page.get_by_text("Baixar Arquivo CSV",exact=False)
            await pronto.first.wait_for(timeout=60000)
            async with page.expect_download(timeout=60000) as download_event:
                await pronto.first.click()
            download=await download_event.value
        path=await download.path()
        if path is None:raise RuntimeError("Download não foi salvo")
        raw=Path(path).read_bytes()
        await browser.close()
        if len(raw)<15000:raise RuntimeError("CSV parece parcial ou vazio")
        return raw

if __name__=="__main__":
    snapshot=agregar(asyncio.run(baixar()))
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(snapshot,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("Referência:",snapshot["referencia"],"matrículas:",snapshot["total_matriculas"],"grupos:",len(snapshot["grupos"]))
