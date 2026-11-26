"""ECL-119: stop outcomes, route closure and the real US-009 aggregate.

Rules from the ratified US-009 BDD (v1.0.0):

- The Operator records each stop as ATENDIDA (with the real ``atendida_en``) or
  NO_ATENDIDA. The first outcome moves the route PLANIFICADA -> EN_CURSO.
- A route closes only with every stop terminal; ``cerrada_en`` is the closing
  instant. An optimization COMPLETADA or a reached ETA never closes a route.
  Repeating a closure returns the stored one: no second audit, no duplicate.
- The dashboard adds only routes closed in [desde 00:00, hasta + 1 day 00:00)
  of Lima. Savings come from sums (never averaged percentages); a zero base
  gives null and negative savings are kept. Window compliance uses real
  ``atendida_en``; NO_ATENDIDA counts in the denominator. Without closed routes
  every indicator is null, never zero.
"""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session, sessionmaker

from app.models.ruta import ParadaRuta
from app.repositories.auditoria import (
    AuditoriaRepository,
    AuditStorageError,
    DetalleRutaCerrada,
    Evento,
    Registro,
)
from app.repositories.cierre_rutas import CierreRutaRepository, CierreStorageError
from app.repositories.optimizaciones import a_float
from app.schemas.rutas import (
    AhorroPeriodo,
    EstadoFinalParada,
    EstadoParada,
    EstadoRuta,
    IndicadoresSostenibilidad,
    ParadaActualizada,
    Periodo,
    ResultadoParadaSolicitud,
    RutaCerrada,
)
from app.services.optimizaciones import LIMA, medianoche


class RutaNoEncontrada(LookupError):
    """404: unknown route, or a stop that is not in that route."""


class CierreConflicto(RuntimeError):
    """409: the state does not allow the change. Message is safe to show."""


class ResultadoInvalido(ValueError):
    """422 without echoing the sent value."""

    def __init__(self, campo: str, motivo: str) -> None:
        super().__init__(motivo)
        self.campo = campo
        self.motivo = motivo


class CierreUnavailable(RuntimeError):
    """Sanitized storage failure."""


class SinInformacion(LookupError):
    """US-010: the period has no closed routes to report."""


# US-010: route rows printed in one PDF. A longer period is cut here and the
# report says so, instead of building hundreds of pages on the free plan.
MAX_RUTAS_REPORTE = 500


@dataclass(frozen=True)
class RutaReporte:
    fecha_operacion: date
    placa: str
    cerrada_en: datetime
    paradas_atendidas: int
    paradas_terminales: int
    distancia_km: float
    co2_kg: float
    combustible_l: float
    costo_soles: float
    ahorro_co2_kg: float


@dataclass(frozen=True)
class ReporteSostenibilidad:
    indicadores: IndicadoresSostenibilidad
    rutas: list[RutaReporte]
    truncado: bool
    generado_en: datetime


class IndicadoresIncompletos(RuntimeError):
    """A closed route lacks data the aggregate needs: never publish partial sums."""


def _ahorro_pct(base: float, nuevo: float) -> float | None:
    return None if base == 0 else (base - nuevo) / base * 100


def _sin_datos(periodo: Periodo) -> IndicadoresSostenibilidad:
    return IndicadoresSostenibilidad(
        periodo=periodo,
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
    )


class CierreRutaService:
    def __init__(
        self,
        factory: sessionmaker[Session],
        reloj: Callable[[], datetime] = lambda: datetime.now(timezone.utc),
    ) -> None:
        self._factory = factory
        self._reloj = reloj

    # --- PATCH /rutas/{ruta_id}/paradas/{parada_id} -------------------------
    def registrar_parada(
        self, ruta_id: UUID, parada_id: UUID, solicitud: ResultadoParadaSolicitud
    ) -> ParadaActualizada:
        momento = solicitud.atendida_en
        try:
            with self._factory.begin() as session:
                repository = CierreRutaRepository(session)
                ruta = repository.ruta(ruta_id)
                if ruta is None:
                    raise RutaNoEncontrada("Ruta no encontrada")
                if ruta.estado == "CERRADA":
                    raise CierreConflicto("La ruta ya está cerrada")
                parada = repository.parada(ruta_id, parada_id)
                if parada is None:
                    raise RutaNoEncontrada("Parada no encontrada en la ruta")
                if momento is not None:
                    if momento > self._reloj():
                        raise ResultadoInvalido(
                            "atendida_en", "La hora de atención no puede ser futura"
                        )
                    if momento < medianoche(ruta.fecha_operacion):
                        raise ResultadoInvalido(
                            "atendida_en",
                            "La hora de atención es anterior a la jornada de la ruta",
                        )
                if parada.estado != "PENDIENTE":
                    if (
                        parada.estado == solicitud.estado.value
                        and parada.atendida_en == momento
                    ):
                        return _parada(parada, ruta.estado)  # repeated request
                    raise CierreConflicto("La parada ya tiene un resultado final")
                parada.estado = solicitud.estado.value
                parada.atendida_en = momento
                if ruta.estado == "PLANIFICADA":
                    ruta.estado = "EN_CURSO"
                repository.guardar()
                return _parada(parada, ruta.estado)
        except (CierreStorageError, SQLAlchemyError):
            raise CierreUnavailable("Route service unavailable") from None

    # --- POST /rutas/{ruta_id}/cierre ---------------------------------------
    def cerrar(self, ruta_id: UUID, actor: UUID) -> RutaCerrada:
        try:
            with self._factory.begin() as session:
                repository = CierreRutaRepository(session)
                ruta = repository.ruta(ruta_id)
                if ruta is None:
                    raise RutaNoEncontrada("Ruta no encontrada")
                conteo = repository.conteo_paradas(ruta_id)
                atendidas = conteo.get(EstadoFinalParada.ATENDIDA.value, 0)
                no_atendidas = conteo.get(EstadoFinalParada.NO_ATENDIDA.value, 0)
                if ruta.estado != "CERRADA":
                    pendientes = conteo.get("PENDIENTE", 0)
                    if pendientes:
                        raise CierreConflicto(
                            f"Faltan {pendientes} paradas por registrar"
                        )
                    if ruta.secuencial_distancia_km is None:
                        raise CierreConflicto(
                            "La ruta no tiene referencia secuencial; vuelve a "
                            "optimizar la jornada"
                        )
                    ruta.estado = "CERRADA"
                    ruta.cerrada_en = self._reloj()
                    repository.guardar()
                    AuditoriaRepository(session).insert(
                        Registro(
                            usuario_id=actor,
                            entidad_id=ruta_id,
                            evento=Evento.RUTA_CERRADA,
                            detalle=DetalleRutaCerrada(
                                paradas_atendidas=atendidas,
                                paradas_no_atendidas=no_atendidas,
                            ),
                        )
                    )
                return RutaCerrada(
                    ruta_id=ruta.ruta_id,
                    estado=EstadoRuta.CERRADA,
                    cerrada_en=ruta.cerrada_en.astimezone(LIMA),
                    paradas_atendidas=atendidas,
                    paradas_no_atendidas=no_atendidas,
                )
        except (CierreStorageError, AuditStorageError, SQLAlchemyError):
            raise CierreUnavailable("Route service unavailable") from None

    # --- GET /indicadores/sostenibilidad ------------------------------------
    def indicadores(self, desde: date, hasta: date) -> IndicadoresSostenibilidad:
        periodo = Periodo(desde=desde, hasta=hasta)
        inicio = medianoche(desde)
        fin = medianoche(hasta + timedelta(days=1))
        try:
            with self._factory() as session:
                repository = CierreRutaRepository(session)
                totales = repository.totales(inicio, fin)
                if not totales["rutas"]:
                    return _sin_datos(periodo)
                versiones = repository.versiones(inicio, fin)
                a_tiempo, terminales = repository.cumplimiento(inicio, fin)
        except (CierreStorageError, SQLAlchemyError):
            raise CierreUnavailable("Indicators unavailable") from None
        if totales["con_referencia"] != totales["rutas"] or not terminales:
            raise IndicadoresIncompletos("Closed route without required data")
        optimizada = {
            m: a_float(totales[m])
            for m in ("distancia_km", "co2_kg", "combustible_l", "costo_soles")
        }
        secuencial = {m: a_float(totales[f"sec_{m}"]) for m in optimizada}
        return IndicadoresSostenibilidad(
            periodo=periodo,
            con_datos=True,
            rutas_cerradas=int(totales["rutas"]),
            **optimizada,
            ahorro_vs_secuencial=AhorroPeriodo(
                **{m: secuencial[m] - optimizada[m] for m in optimizada},
                pct=_ahorro_pct(secuencial["distancia_km"], optimizada["distancia_km"]),
            ),
            cumplimiento_ventanas_pct=a_tiempo / terminales * 100,
            parametros_versiones=versiones,
            simulado=False,
        )

    # --- GET /indicadores/sostenibilidad/reporte --------------------------
    def reporte(self, desde: date, hasta: date) -> ReporteSostenibilidad:
        """US-010: the US-009 aggregate plus one row per closed route.

        The totals come from ``indicadores`` so the PDF and the dashboard can
        never disagree. Without closed routes there is nothing to report.
        """
        indicadores = self.indicadores(desde, hasta)
        if not indicadores.con_datos:
            raise SinInformacion("No closed routes in the period")
        try:
            with self._factory() as session:
                filas = CierreRutaRepository(session).detalle_rutas(
                    medianoche(desde),
                    medianoche(hasta + timedelta(days=1)),
                    MAX_RUTAS_REPORTE + 1,
                )
        except (CierreStorageError, SQLAlchemyError):
            raise CierreUnavailable("Report unavailable") from None
        rutas = [_ruta_reporte(fila) for fila in filas[:MAX_RUTAS_REPORTE]]
        return ReporteSostenibilidad(
            indicadores=indicadores,
            rutas=rutas,
            truncado=len(filas) > MAX_RUTAS_REPORTE,
            generado_en=self._reloj().astimezone(LIMA),
        )


def _ruta_reporte(fila: Any) -> RutaReporte:
    co2 = a_float(fila["co2_kg"])
    secuencial = fila["secuencial_co2_kg"]
    if secuencial is None:
        # A closed route always has its reference (ECL-119 refuses the closure
        # otherwise); a missing one means corrupted data, not a zero saving.
        raise IndicadoresIncompletos("Closed route without sequential reference")
    return RutaReporte(
        fecha_operacion=fila["fecha_operacion"],
        placa=fila["placa"],
        cerrada_en=fila["cerrada_en"].astimezone(LIMA),
        paradas_atendidas=int(fila["paradas_atendidas"]),
        paradas_terminales=int(fila["paradas_terminales"]),
        distancia_km=a_float(fila["distancia_km"]),
        co2_kg=co2,
        combustible_l=a_float(fila["combustible_l"]),
        costo_soles=a_float(fila["costo_soles"]),
        ahorro_co2_kg=a_float(secuencial) - co2,
    )


def _parada(parada: ParadaRuta, ruta_estado: str) -> ParadaActualizada:
    return ParadaActualizada(
        parada_id=parada.parada_id,
        ruta_id=parada.ruta_id,
        estado=EstadoParada(parada.estado),
        atendida_en=(
            None if parada.atendida_en is None else parada.atendida_en.astimezone(LIMA)
        ),
        ruta_estado=EstadoRuta(ruta_estado),
    )
