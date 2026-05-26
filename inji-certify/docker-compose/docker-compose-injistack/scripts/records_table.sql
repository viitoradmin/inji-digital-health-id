CREATE TABLE IF NOT EXISTS certify.records (
  id            VARCHAR(36)  NOT NULL DEFAULT gen_random_uuid()::text,
  first_name    VARCHAR(128) NOT NULL,
  last_name     VARCHAR(128) NOT NULL,
  dob           DATE,
  gender        VARCHAR(32),
  phone_number  VARCHAR(20),
  email         VARCHAR(255),
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_records_id PRIMARY KEY (id),
  CONSTRAINT uq_records_email UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_records_last_name ON certify.records (last_name);
CREATE INDEX IF NOT EXISTS idx_records_phone_number ON certify.records (phone_number);

COMMENT ON TABLE certify.records IS 'Person identity records (local dev)';
