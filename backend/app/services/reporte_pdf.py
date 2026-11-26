"""US-010: sustainability report as a PDF, without third-party libraries.

The report is plain text and rules on A4 pages with the two standard Helvetica
fonts (no embedded fonts, no images), so a small writer is enough and the API
keeps its dependency set. Text is encoded in WinAnsi (cp1252), which covers
Spanish; the few characters outside it are replaced by ASCII equivalents.

Layout rules: numbers are right-aligned with Helvetica's metric widths, every
page repeats the title and numbers itself ("Página i de N"), and long tables
continue on the next page with their header repeated.
"""

from __future__ import annotations

from collections.abc import Sequence
from dataclasses import dataclass, field
from datetime import date

from app.services.cierre_rutas import ReporteSostenibilidad

# Acta de constitución V_1_1_0, objetivo SMART «Calidad y valor».
META_AHORRO_DISTANCIA_PCT = 10.0
META_CUMPLIMIENTO_VENTANAS_PCT = 85.0

ANCHO, ALTO = 595.28, 841.89  # A4 in points
MARGEN = 42.0
_REEMPLAZOS = str.maketrans({"₂": "2", "−": "-", "≥": ">=", "≤": "<="})

# Helvetica advance widths (1/1000 em) for printable ASCII, from the AFM.
_ANCHOS = dict(
    zip(
        " !\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "[\\]^_`abcdefghijklmnopqrstuvwxyz{|}~",
        (
            278,
            278,
            355,
            556,
            556,
            889,
            667,
            191,
            333,
            333,
            389,
            584,
            278,
            333,
            278,
            278,
            556,
            556,
            556,
            556,
            556,
            556,
            556,
            556,
            556,
            556,
            278,
            278,
            584,
            584,
            584,
            556,
            1015,
            667,
            667,
            722,
            722,
            667,
            611,
            778,
            722,
            278,
            500,
            667,
            556,
            833,
            722,
            778,
            667,
            778,
            722,
            667,
            611,
            722,
            667,
            944,
            667,
            667,
            611,
            278,
            278,
            278,
            469,
            556,
            333,
            556,
            556,
            500,
            556,
            556,
            278,
            556,
            556,
            222,
            222,
            500,
            222,
            833,
            556,
            556,
            556,
            556,
            333,
            500,
            278,
            556,
            500,
            722,
            500,
            500,
            500,
            334,
            260,
            334,
            584,
        ),
        strict=True,
    )
)


def ancho(texto: str, tamano: float, negrita: bool = False) -> float:
    """Approximate rendered width; bold Helvetica is about 5 % wider."""
    unidades = sum(_ANCHOS.get(c, 556) for c in texto.translate(_REEMPLAZOS))
    return unidades * tamano / 1000 * (1.05 if negrita else 1.0)


def _cadena(texto: str) -> bytes:
    crudo = texto.translate(_REEMPLAZOS).encode("cp1252", errors="replace")
    return (
        b"("
        + crudo.replace(b"\\", b"\\\\").replace(b"(", b"\\(").replace(b")", b"\\)")
        + b")"
    )


@dataclass
class _Pagina:
    operaciones: list[bytes] = field(default_factory=list)


class Documento:
    """Minimal page builder: text, rules and automatic page breaks."""

    def __init__(self, encabezado: str) -> None:
        self._encabezado = encabezado
        self.paginas: list[_Pagina] = []
        self.y = 0.0
        self.nueva_pagina()

    def nueva_pagina(self) -> None:
        self.paginas.append(_Pagina())
        self.texto(MARGEN, ALTO - 28, self._encabezado, 8, color=0.35)
        self.linea(MARGEN, ALTO - 34, ANCHO - MARGEN, ALTO - 34, gris=0.75)
        self.y = ALTO - 58

    def espacio(self, alto: float) -> bool:
        """Start a new page if ``alto`` points do not fit; True if it did."""
        if self.y - alto < MARGEN + 24:
            self.nueva_pagina()
            return True
        return False

    def texto(
        self,
        x: float,
        y: float,
        contenido: str,
        tamano: float = 9.5,
        negrita: bool = False,
        color: float = 0.0,
        derecha: bool = False,
    ) -> None:
        if derecha:
            x -= ancho(contenido, tamano, negrita)
        fuente = b"/F2" if negrita else b"/F1"
        self.paginas[-1].operaciones.append(
            b"BT %.3f g %s %.1f Tf %.2f %.2f Td %s Tj ET"
            % (color, fuente, tamano, x, y, _cadena(contenido))
        )

    def linea(
        self, x1: float, y1: float, x2: float, y2: float, gris: float = 0.0
    ) -> None:
        self.paginas[-1].operaciones.append(
            b"%.3f G 0.6 w %.2f %.2f m %.2f %.2f l S" % (gris, x1, y1, x2, y2)
        )

    def parrafo(
        self,
        contenido: str,
        tamano: float = 9.5,
        negrita: bool = False,
        color: float = 0.0,
        sangria: float = 0.0,
    ) -> None:
        """Left-aligned paragraph wrapped to the text width."""
        limite = ANCHO - 2 * MARGEN - sangria
        renglon = ""
        for palabra in contenido.split():
            prueba = f"{renglon} {palabra}".strip()
            if renglon and ancho(prueba, tamano, negrita) > limite:
                self._renglon(renglon, tamano, negrita, color, sangria)
                renglon = palabra
            else:
                renglon = prueba
        if renglon:
            self._renglon(renglon, tamano, negrita, color, sangria)

    def _renglon(
        self,
        contenido: str,
        tamano: float,
        negrita: bool,
        color: float,
        sangria: float,
    ) -> None:
        self.espacio(tamano * 1.45)
        self.texto(MARGEN + sangria, self.y, contenido, tamano, negrita, color)
        self.y -= tamano * 1.45

    def titulo(self, contenido: str) -> None:
        self.espacio(40)
        self.y -= 8
        self.texto(MARGEN, self.y, contenido, 12, negrita=True)
        self.y -= 18

    def tabla(
        self,
        columnas: Sequence[tuple[str, float, bool]],
        filas: Sequence[Sequence[str]],
        tamano: float = 8.5,
    ) -> None:
        """``columnas``: (header, width, right-aligned). Header repeats per page."""
        alto = tamano * 1.9

        def cabecera() -> None:
            self._fila([c[0] for c in columnas], columnas, tamano, negrita=True)
            self.linea(MARGEN, self.y + alto - 4, ANCHO - MARGEN, self.y + alto - 4)

        self.espacio(alto * 2)
        cabecera()
        for fila in filas:
            if self.espacio(alto):
                cabecera()
            self._fila(fila, columnas, tamano)
            self.linea(
                MARGEN,
                self.y + alto - 4,
                ANCHO - MARGEN,
                self.y + alto - 4,
                gris=0.85,
            )
        self.y -= 6

    def _fila(
        self,
        celdas: Sequence[str],
        columnas: Sequence[tuple[str, float, bool]],
        tamano: float,
        negrita: bool = False,
    ) -> None:
        x = MARGEN
        for celda, (_, ancho_col, derecha) in zip(celdas, columnas, strict=True):
            if derecha:
                self.texto(
                    x + ancho_col - 4, self.y, celda, tamano, negrita, derecha=True
                )
            else:
                self.texto(x + 2, self.y, celda, tamano, negrita)
            x += ancho_col
        self.y -= tamano * 1.9

    def pdf(self, titulo: str) -> bytes:
        """Serialize: catalog, page tree, fonts, pages and their contents."""
        total = len(self.paginas)
        for numero, pagina in enumerate(self.paginas, start=1):
            etiqueta = f"Página {numero} de {total}"
            pagina.operaciones.append(
                b"BT 0.350 g /F1 8.0 Tf %.2f %.2f Td %s Tj ET"
                % (ANCHO - MARGEN - ancho(etiqueta, 8), 26.0, _cadena(etiqueta))
            )
        objetos: list[bytes] = [
            b"<< /Type /Catalog /Pages 2 0 R >>",
            b"",  # page tree, filled below
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica "
            b"/Encoding /WinAnsiEncoding >>",
            b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold "
            b"/Encoding /WinAnsiEncoding >>",
            b"<< /Title %s /Producer (EcoLogistica Lima) >>" % _cadena(titulo),
        ]
        hijos = []
        for pagina in self.paginas:
            contenido = b"\n".join(pagina.operaciones)
            objetos.append(
                b"<< /Length %d >>\nstream\n%s\nendstream" % (len(contenido), contenido)
            )
            objetos.append(
                b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 %.2f %.2f] "
                b"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "
                b"/Contents %d 0 R >>" % (ANCHO, ALTO, len(objetos))
            )
            hijos.append(b"%d 0 R" % len(objetos))
        objetos[1] = b"<< /Type /Pages /Kids [%s] /Count %d >>" % (
            b" ".join(hijos),
            total,
        )
        salida = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
        posiciones = []
        for numero, cuerpo in enumerate(objetos, start=1):
            posiciones.append(len(salida))
            salida += b"%d 0 obj\n%s\nendobj\n" % (numero, cuerpo)
        inicio_xref = len(salida)
        salida += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objetos) + 1)
        salida += b"".join(b"%010d 00000 n \n" % p for p in posiciones)
        salida += (
            b"trailer\n<< /Size %d /Root 1 0 R /Info 5 0 R >>\nstartxref\n%d\n%%%%EOF\n"
            % (len(objetos) + 1, inicio_xref)
        )
        return bytes(salida)


# --- report content ------------------------------------------------------------


def _n(valor: float, decimales: int = 2) -> str:
    return f"{valor:,.{decimales}f}"


def _fecha(valor: date) -> str:
    return valor.strftime("%d/%m/%Y")


def _estado_meta(valor: float | None, meta: float) -> str:
    if valor is None:
        return "No calculable"
    return "Cumple" if valor >= meta else "No cumple"


def generar_pdf(reporte: ReporteSostenibilidad) -> bytes:
    datos = reporte.indicadores
    ahorro = datos.ahorro_vs_secuencial
    if not datos.con_datos or ahorro is None:
        raise ValueError("A report needs a period with closed routes")
    doc = Documento("EcoLogística Lima · Reporte de sostenibilidad (US-010)")

    doc.texto(MARGEN, doc.y, "Reporte de sostenibilidad", 18, negrita=True)
    doc.y -= 20
    doc.parrafo(
        "Rutas cerradas del periodo comparadas con la ruta secuencial de "
        "referencia para los mismos pedidos.",
        10,
        color=0.3,
    )
    doc.y -= 6
    periodo = datos.periodo
    meta = [
        ("Generado", f"{reporte.generado_en:%d/%m/%Y %H:%M} (hora de Lima)"),
        (
            "Periodo (filtro)",
            f"{_fecha(periodo.desde)} al {_fecha(periodo.hasta)}, días inclusivos "
            "de Lima (UTC-5)",
        ),
        ("Criterio", "Rutas en estado CERRADA cuyo cierre cae en el periodo"),
        ("Rutas cerradas", f"{datos.rutas_cerradas:,}"),
        ("Parámetros utilizados", ", ".join(datos.parametros_versiones)),
    ]
    for etiqueta, valor in meta:
        doc.espacio(14)
        doc.texto(MARGEN, doc.y, etiqueta, 9.5, negrita=True)
        doc.parrafo(valor, 9.5, sangria=118)
    if datos.simulado:
        doc.parrafo(
            "Datos de demostración: estas cifras no acreditan resultados reales.",
            9.5,
            negrita=True,
        )

    doc.titulo("1. Indicadores del periodo")
    metricas = (
        ("Distancia", "km", datos.distancia_km, ahorro.distancia_km),
        ("Emisiones de CO2", "kg CO2", datos.co2_kg, ahorro.co2_kg),
        ("Combustible", "L", datos.combustible_l, ahorro.combustible_l),
        ("Costo operativo estimado", "S/", datos.costo_soles, ahorro.costo_soles),
    )
    doc.tabla(
        (
            ("Indicador", 150, False),
            ("Unidad", 60, False),
            ("Optimizada", 100, True),
            ("Secuencial", 100, True),
            ("Ahorro", 101, True),
        ),
        [
            (nombre, unidad, _n(total or 0), _n((total or 0) + ahorrado), _n(ahorrado))
            for nombre, unidad, total, ahorrado in metricas
        ],
    )
    doc.parrafo(
        "Ahorro = secuencial - optimizada. Un valor negativo indica mayor consumo "
        "o costo que la referencia. Son métricas estimadas de planificación de las "
        "rutas cerradas, no telemetría medida.",
        8.5,
        color=0.3,
    )

    doc.titulo("2. Cumplimiento de metas")
    pct = ahorro.pct
    cumplimiento = datos.cumplimiento_ventanas_pct
    doc.tabla(
        (
            ("Meta (Acta de constitución, objetivo de calidad y valor)", 311, False),
            ("Resultado", 100, True),
            ("Estado", 100, True),
        ),
        [
            (
                f"Reducir al menos {_n(META_AHORRO_DISTANCIA_PCT, 0)} % la distancia "
                "frente a la ruta secuencial",
                "No calculable" if pct is None else f"{_n(pct)} %",
                _estado_meta(pct, META_AHORRO_DISTANCIA_PCT),
            ),
            (
                f"Atender {_n(META_CUMPLIMIENTO_VENTANAS_PCT, 0)} % o más de las "
                "paradas dentro de su ventana",
                "No disponible" if cumplimiento is None else f"{_n(cumplimiento)} %",
                _estado_meta(cumplimiento, META_CUMPLIMIENTO_VENTANAS_PCT),
            ),
        ],
    )
    doc.parrafo(
        "El cumplimiento de ventanas usa la hora real de atención; una parada no "
        "atendida cuenta como incumplida.",
        8.5,
        color=0.3,
    )

    doc.titulo("3. Emisiones y costo por ruta")
    doc.tabla(
        (
            ("Fecha", 54, False),
            ("Vehículo", 58, False),
            ("Paradas", 50, True),
            ("Distancia km", 66, True),
            ("CO2 kg", 58, True),
            ("Combustible L", 70, True),
            ("Costo S/", 70, True),
            ("Ahorro CO2 kg", 85, True),
        ),
        [
            (
                _fecha(r.fecha_operacion),
                r.placa,
                f"{r.paradas_atendidas}/{r.paradas_terminales}",
                _n(r.distancia_km),
                _n(r.co2_kg),
                _n(r.combustible_l),
                _n(r.costo_soles),
                _n(r.ahorro_co2_kg),
            )
            for r in reporte.rutas
        ],
        tamano=8,
    )
    if reporte.truncado:
        doc.parrafo(
            f"Se muestran las primeras {len(reporte.rutas):,} rutas por fecha de "
            "cierre; los totales de las secciones 1 y 2 incluyen todas. Acota el "
            "periodo para ver el detalle completo.",
            8.5,
            negrita=True,
        )
    doc.parrafo(
        "Paradas = atendidas / terminales. Equivalente ambiental y compensación de "
        "carbono: no disponibles (US-011 queda fuera del alcance del MVP).",
        8.5,
        color=0.3,
    )
    return doc.pdf(f"Reporte de sostenibilidad {periodo.desde} a {periodo.hasta}")
