CREATE TABLE "ponds_tanks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "farm_id" UUID NOT NULL,
    "area_id" UUID,
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "tank_type" VARCHAR(30) NOT NULL DEFAULT 'nursery_tank',
    "volume_m3" DECIMAL(12,3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'empty',
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ponds_tanks_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ponds_tanks_farm_id_fkey"
      FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ponds_tanks_area_id_fkey"
      FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ponds_tanks_volume_m3_check" CHECK ("volume_m3" > 0),
    CONSTRAINT "ponds_tanks_tank_type_check" CHECK ("tank_type" IN ('nursery_tank', 'pond', 'other')),
    CONSTRAINT "ponds_tanks_status_check" CHECK ("status" IN ('empty', 'active', 'cleaning', 'inactive'))
);

CREATE UNIQUE INDEX "ponds_tanks_farm_id_code_key" ON "ponds_tanks"("farm_id", "code");
CREATE INDEX "ponds_tanks_farm_id_area_id_idx" ON "ponds_tanks"("farm_id", "area_id");
CREATE INDEX "ponds_tanks_farm_id_status_idx" ON "ponds_tanks"("farm_id", "status");

CREATE TRIGGER "ponds_tanks_set_updated_at"
BEFORE UPDATE ON "ponds_tanks"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
