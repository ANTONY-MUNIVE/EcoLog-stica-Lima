#!/bin/sh
# ECL-124 · Arranque de la API en Render (render.yaml, servicio ecologistica-api).
# 1. Render entrega postgresql://; la API exige el driver postgresql+psycopg.
# 2. Activa PostGIS (la imagen postgis/postgis lo trae activado; Render no).
# 3. Aplica las migraciones y arranca uvicorn en el puerto que asigna Render.
set -eu
: "${RENDER_DATABASE_URL:?Falta RENDER_DATABASE_URL}"
DATABASE_URL="$(printf %s "$RENDER_DATABASE_URL" | sed -E 's#^postgres(ql)?://#postgresql+psycopg://#')"
export DATABASE_URL

python - <<'PY'
import os

import psycopg

with psycopg.connect(os.environ["RENDER_DATABASE_URL"]) as conn:
    conn.execute("CREATE EXTENSION IF NOT EXISTS postgis")
PY

python -m alembic upgrade head
exec python -m uvicorn app.main:create_app --factory --host 0.0.0.0 \
  --port "${PORT:-8000}" --proxy-headers --forwarded-allow-ips="*"
