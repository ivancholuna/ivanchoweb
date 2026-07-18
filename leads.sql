CREATE TABLE IF NOT EXISTS leads (
  id                SERIAL PRIMARY KEY,
  nombre            VARCHAR(100),
  email             VARCHAR(150),
  tipo_proyecto     VARCHAR(50),
  presupuesto_estimado VARCHAR(50),
  resumen           TEXT,
  created_at        TIMESTAMP DEFAULT NOW()
);
