CREATE TABLE "customers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "farm_id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "phone" VARCHAR(20),
  "address" TEXT,
  "customer_type" VARCHAR(30) NOT NULL,
  "notes" TEXT,
  "deleted_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customers_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "customers_name_check" CHECK (char_length(btrim("name")) BETWEEN 1 AND 150),
  CONSTRAINT "customers_type_check" CHECK ("customer_type" IN ('farm','household','cooperative','other'))
);
CREATE INDEX "customers_farm_id_deleted_at_name_idx" ON "customers"("farm_id", "deleted_at", "name");
CREATE TRIGGER "customers_set_updated_at" BEFORE UPDATE ON "customers"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
