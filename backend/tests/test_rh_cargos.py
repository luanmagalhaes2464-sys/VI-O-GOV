from contextlib import contextmanager
from app import rh_auditoria as auditoria

def test_quadro_nao_inventa_vagas_ou_excedentes(monkeypatch):
    class Dummy:
        def execute(self, sql, params):
            assert "DISTINCT (nome, matricula)" in sql
            assert str(params[0]) == "2026-07-01"
            return self
        def fetchall(self):
            return [{
                "cargo": "PROFESSOR II",
                "jornada": "24:00",
                "vinculos_folha": 211,
                "vinculos_sem_desligamento_identificado": 210,
                "vinculos_temporarios_identificados": 111
            }]
    @contextmanager
    def stub():
        yield Dummy()
    monkeypatch.setattr(auditoria, "banco", stub)
    resultado=auditoria.cargos_ocupacao(mes="2026-07")
    assert resultado["cargos"][0]["vinculos_folha"] == 211
    assert resultado["cargos"][0]["vagas_legais"] is None
    assert resultado["cargos"][0]["excedentes"] is None
    assert resultado["excessos_confirmados"] is None
    assert resultado["fontes_referencia"][0]["tipo"] == "edital_nao_normativo"
