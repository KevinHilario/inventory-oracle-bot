CREATE TABLE agent_runs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  consulta text NOT NULL,
  modelo text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('ok', 'fallback', 'error')),
  pasos jsonb NOT NULL,
  respuesta text NOT NULL,
  input_tokens integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  duracion_ms integer NOT NULL DEFAULT 0
);

CREATE INDEX agent_runs_created_at_idx ON agent_runs (created_at DESC);
