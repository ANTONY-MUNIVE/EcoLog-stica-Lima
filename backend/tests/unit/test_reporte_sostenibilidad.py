"""US-010 (ECL-16): sustainability report without a database.

Covers the repository query shape, the service (totals reused from US-009,
no-data and truncation rules) and the PDF writer (valid structure, required
content: generation date, period filter and parameter versions).
"""

import re
from contextlib import nullcontext
from datetime import date, datetime, timedelta, timezone
from unittest.mock import MagicMock, Mock

import pytest
from sqlalchemy.dialects import postgresql
from sqlalchemy.exc import OperationalError

from app.repositories.cierre_rutas import CierreRutaRepository, CierreStorageError
from app.schemas.rutas import AhorroPeriodo, IndicadoresSostenibilidad, Periodo
from app.services import cierre_rutas as modulo
from app.services import reporte_pdf
from app.services.cierre_rutas import (
    LIMA,
    MAX_RUTAS_REPORTE,
    CierreRutaService,
    CierreUnavailable,
    IndicadoresIncompletos,
    ReporteSostenibilidad,
    RutaReporte,
    SinInformacion,
)

DESDE = date(2026, 11, 1)
HASTA = date(2026, 11, 30)
AHORA = datetime(2026, 11, 25, 15, 30, tzinfo=timezone.utc)
CIERRE = datetime(2026, 11, 16, 23, 0, tzinfo=timezone.utc)


def fila(placa="ABC-123", **cambios):
    base = {
        "fecha_operacion": date(2026, 11, 16),
        "placa": placa,
        "cerrada_en": CIERRE,
        "distancia_km": 100.0,
        "co2_kg": 20.0,
        "combustible_l": 10.0,
        "costo_soles": 160.0,
        "secuencial_co2_kg": 26.0,
        "paradas_atendidas": 9,
        "paradas_terminales": 10,
    }
    return {**base, **cambios}


class FakeRepo:
    def __init__(self):
        self.totales_actuales = {
            "rutas": 2,
            "con_referencia": 2,
            "distancia_km": 150.0,
            "co2_kg": 30.0,
            "combustible_l": 15.0,
            "costo_soles": 240.0,
            "sec_distancia_km": 200.0,
            "sec_co2_kg": 40.0,
            "sec_combustible_l": 20.0,
            "sec_costo_soles": 320.0,
        }
        self.filas = [fila(), fila("XYZ-987")]
        self.falla_detalle = False
        self.llamada = None

    def totales(self, desde, hasta):
        return self.totales_actuales

    def versiones(self, desde, hasta):
        return ["REF-A"]

    def cumplimiento(self, desde, hasta):
        return (17, 20)

    def detalle_rutas(self, desde, hasta, limite):
        if self.falla_detalle:
            raise CierreStorageError("private")
        self.llamada = (desde, hasta, limite)
        return self.filas


@pytest.fixture
def repo(monkeypatch):
    fake = FakeRepo()
    monkeypatch.setattr(modulo, "CierreRutaRepository", lambda session: fake)
    return fake


def service():
    fabrica = Mock(side_effect=lambda: nullcontext(Mock()))
    return CierreRutaService(fabrica, reloj=lambda: AHORA)


# --- repository ------------------------------------------------------------------


def test_route_detail_query_exposes_only_the_plate_and_aggregates():
    session = MagicMock()
    session.execute.return_value.mappings.return_value.all.return_value = [fila()]
    repository = CierreRutaRepository(session)
    desde = datetime(2026, 11, 1, 5, tzinfo=timezone.utc)
    hasta = datetime(2026, 12, 1, 5, tzinfo=timezone.utc)
    assert repository.detalle_rutas(desde, hasta, 501) == [fila()]
    consulta = str(
        session.execute.call_args.args[0].compile(
            dialect=postgresql.dialect(), compile_kwargs={"literal_binds": True}
        )
    )
    assert "JOIN vehiculo" in consulta and "LEFT OUTER JOIN parada_ruta" in consulta
    assert "ruta.estado = 'CERRADA'" in consulta and "ruta.cerrada_en <" in consulta
    assert "GROUP BY ruta.ruta_id, vehiculo.placa" in consulta
    assert "ORDER BY ruta.cerrada_en, vehiculo.placa" in consulta
    assert "LIMIT 501" in consulta and "FILTER" in consulta
    for privado in ("trazado", "conductor", "cliente", "direccion"):
        assert privado not in consulta


def test_route_detail_storage_errors_are_sanitized():
    session = MagicMock()
    session.execute.side_effect = OperationalError("SELECT", {}, Exception("secret"))
    with pytest.raises(CierreStorageError) as error:
        CierreRutaRepository(session).detalle_rutas(CIERRE, CIERRE, 1)
    assert "secret" not in str(error.value)


# --- service ---------------------------------------------------------------------


def test_report_reuses_the_dashboard_totals_and_adds_one_row_per_route(repo):
    reporte = service().reporte(DESDE, HASTA)
    datos = reporte.indicadores
    assert datos.con_datos and datos.rutas_cerradas == 2 and datos.co2_kg == 30
    assert datos.cumplimiento_ventanas_pct == 85
    assert [r.placa for r in reporte.rutas] == ["ABC-123", "XYZ-987"]
    ruta = reporte.rutas[0]
    assert ruta.ahorro_co2_kg == 6 and ruta.paradas_atendidas == 9
    assert ruta.cerrada_en.utcoffset() == timedelta(hours=-5)
    assert not reporte.truncado
    assert reporte.generado_en == AHORA.astimezone(LIMA)
    # Same Lima window as US-009 and one extra row to detect truncation.
    assert repo.llamada == (
        datetime(2026, 11, 1, 5, tzinfo=timezone.utc),
        datetime(2026, 12, 1, 5, tzinfo=timezone.utc),
        MAX_RUTAS_REPORTE + 1,
    )


def test_report_without_closed_routes_has_no_information(repo):
    repo.totales_actuales = {"rutas": 0}
    with pytest.raises(SinInformacion):
        service().reporte(DESDE, HASTA)
    assert repo.llamada is None


def test_long_periods_are_cut_and_flagged(repo):
    repo.filas = [fila(f"P-{i:04d}") for i in range(MAX_RUTAS_REPORTE + 1)]
    reporte = service().reporte(DESDE, HASTA)
    assert reporte.truncado and len(reporte.rutas) == MAX_RUTAS_REPORTE


def test_report_storage_failure_is_unavailable(repo):
    repo.falla_detalle = True
    with pytest.raises(CierreUnavailable):
        service().reporte(DESDE, HASTA)


def test_a_closed_route_without_reference_is_never_reported_as_zero_saving(repo):
    repo.filas = [fila(secuencial_co2_kg=None)]
    with pytest.raises(IndicadoresIncompletos):
        service().reporte(DESDE, HASTA)


# --- PDF ---------------------------------------------------------------------------


def indicadores(**cambios):
    base = {
        "periodo": Periodo(desde=DESDE, hasta=HASTA),
        "con_datos": True,
        "rutas_cerradas": 2,
        "distancia_km": 150.0,
        "co2_kg": 30.0,
        "combustible_l": 15.0,
        "costo_soles": 240.0,
        "ahorro_vs_secuencial": AhorroPeriodo(
            distancia_km=50.0, co2_kg=10.0, combustible_l=5.0, costo_soles=80.0, pct=25
        ),
        "cumplimiento_ventanas_pct": 85.0,
        "parametros_versiones": ["REF-A", "REF-(B)"],
        "simulado": False,
    }
    return IndicadoresSostenibilidad(**{**base, **cambios})


def ruta(placa="ABC-123"):
    return RutaReporte(
        fecha_operacion=date(2026, 11, 16),
        placa=placa,
        cerrada_en=CIERRE.astimezone(LIMA),
        paradas_atendidas=9,
        paradas_terminales=10,
        distancia_km=1234.5,
        co2_kg=20.0,
        combustible_l=10.0,
        costo_soles=160.0,
        ahorro_co2_kg=-1.5,
    )


def reporte(rutas=None, truncado=False, **cambios):
    return ReporteSostenibilidad(
        indicadores=indicadores(**cambios),
        rutas=[ruta()] if rutas is None else rutas,
        truncado=truncado,
        generado_en=datetime(2026, 11, 25, 10, 30, tzinfo=LIMA),
    )


def textos(pdf: bytes) -> str:
    """Every string drawn with Tj, decoded from WinAnsi, in page order."""
    crudos = re.findall(rb"\((.*?)(?<!\\)\) Tj", pdf)
    return "\n".join(
        c.replace(b"\\(", b"(")
        .replace(b"\\)", b")")
        .replace(b"\\\\", b"\\")
        .decode("cp1252")
        for c in crudos
    )


def test_pdf_is_structurally_valid():
    pdf = reporte_pdf.generar_pdf(reporte())
    assert pdf.startswith(b"%PDF-1.4") and pdf.rstrip().endswith(b"%%EOF")
    inicio = int(re.search(rb"startxref\n(\d+)", pdf).group(1))
    assert pdf[inicio:].startswith(b"xref")
    entradas = re.findall(rb"(\d{10}) 00000 n ", pdf)
    for numero, posicion in enumerate(entradas, start=1):
        assert pdf[int(posicion) :].startswith(b"%d 0 obj" % numero)
    for longitud, cuerpo in re.findall(
        rb"<< /Length (\d+) >>\nstream\n(.*?)\nendstream", pdf, re.S
    ):
        assert int(longitud) == len(cuerpo)


def test_pdf_states_date_filters_parameters_and_goals():
    contenido = textos(reporte_pdf.generar_pdf(reporte()))
    assert "25/11/2026 10:30 (hora de Lima)" in contenido
    assert "01/11/2026 al 30/11/2026" in contenido
    assert "REF-A, REF-(B)" in contenido  # parentheses survive escaping
    assert "Emisiones de CO2" in contenido and "kg CO2" in contenido
    assert "25.00 %" in contenido and "Cumple" in contenido  # 25 % >= 10 %
    assert "85.00 %" in contenido  # 85 % meets the 85 % goal exactly
    assert "No cumple" not in contenido
    assert "ABC-123" in contenido and "1,234.50" in contenido and "-1.50" in contenido
    assert "9/10" in contenido and "Página 1 de 1" in contenido
    assert "Datos de demostración" not in contenido
    assert "Se muestran las primeras" not in contenido


def test_pdf_marks_missed_goals_and_uncomputable_savings():
    ahorro = AhorroPeriodo(
        distancia_km=0.0, co2_kg=-2.0, combustible_l=0.0, costo_soles=0.0, pct=None
    )
    contenido = textos(
        reporte_pdf.generar_pdf(
            reporte(
                ahorro_vs_secuencial=ahorro,
                cumplimiento_ventanas_pct=60.0,
                simulado=True,
            )
        )
    )
    assert "No calculable" in contenido and "No cumple" in contenido
    assert "Datos de demostración" in contenido


def test_long_tables_continue_with_header_and_page_numbers():
    rutas = [ruta(f"P-{i:04d}") for i in range(120)]
    pdf = reporte_pdf.generar_pdf(reporte(rutas=rutas, truncado=True))
    paginas = int(re.search(rb"/Count (\d+)", pdf).group(1))
    assert paginas >= 3
    contenido = textos(pdf)
    # The route table spans several pages and repeats its header on each one.
    flujos = re.findall(rb"stream\n(.*?)endstream", pdf, re.S)
    con_rutas = [f for f in flujos if b"(P-0" in f]
    assert len(con_rutas) >= 3
    assert all(b"(Ahorro CO2 kg)" in s for s in con_rutas)
    assert f"Página {paginas} de {paginas}" in contenido
    assert "Se muestran las primeras 120 rutas" in contenido
    assert "P-0119" in contenido


def test_pdf_needs_a_period_with_data():
    sin_datos = ReporteSostenibilidad(
        indicadores=IndicadoresSostenibilidad(
            periodo=Periodo(desde=DESDE, hasta=HASTA),
            con_datos=False,
            rutas_cerradas=0,
            distancia_km=None,
            co2_kg=None,
            combustible_l=None,
            costo_soles=None,
            ahorro_vs_secuencial=None,
            cumplimiento_ventanas_pct=None,
            parametros_versiones=[],
            simulado=False,
        ),
        rutas=[],
        truncado=False,
        generado_en=AHORA,
    )
    with pytest.raises(ValueError):
        reporte_pdf.generar_pdf(sin_datos)


def test_width_and_encoding_helpers():
    assert reporte_pdf.ancho("10", 10) == pytest.approx(11.12)
    assert reporte_pdf.ancho("A", 10, negrita=True) > reporte_pdf.ancho("A", 10)
    assert reporte_pdf._cadena("CO₂ (a)\\") == b"(CO2 \\(a\\)\\\\)"
    assert reporte_pdf._cadena("ñ").endswith(b"\xf1)")  # WinAnsi, not UTF-8
