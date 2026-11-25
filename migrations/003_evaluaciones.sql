CREATE TABLE evaluaciones (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  url text NOT NULL,
  nota numeric(4,1),
  eliminatorio boolean,
  configuracion jsonb NOT NULL,
  evidencia jsonb NOT NULL,
  veredicto jsonb,
  cuestionario text NOT NULL DEFAULT ''
);

CREATE INDEX evaluaciones_created_at_idx ON evaluaciones (created_at DESC);
