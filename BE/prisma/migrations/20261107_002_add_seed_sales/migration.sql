-- AlterTable
ALTER TABLE "seed_batches" ADD COLUMN     "reserved_quantity" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "phone" VARCHAR(30),
    "address" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" UUID NOT NULL,
    "farm_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_code" VARCHAR(60) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'draft',
    "customer_name" VARCHAR(150) NOT NULL,
    "customer_phone" VARCHAR(30),
    "delivery_address" TEXT,
    "expected_delivery_date" DATE,
    "notes" TEXT,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "created_by" TEXT NOT NULL,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMPTZ(6),
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "delivered_quantity" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DECIMAL(18,2) NOT NULL,
    "line_total" DECIMAL(18,2) NOT NULL,

    CONSTRAINT "sales_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_deliveries" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "request_payload" JSONB NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_deliveries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_delivery_items" (
    "id" UUID NOT NULL,
    "delivery_id" UUID NOT NULL,
    "order_item_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "sales_delivery_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_payments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "idempotency_key" UUID NOT NULL,
    "request_payload" JSONB NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "method" VARCHAR(30) NOT NULL,
    "notes" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customers_farm_id_name_idx" ON "customers"("farm_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_order_code_key" ON "sales_orders"("order_code");

-- CreateIndex
CREATE INDEX "sales_orders_farm_id_status_created_at_idx" ON "sales_orders"("farm_id", "status", "created_at");

-- CreateIndex
CREATE INDEX "sales_orders_customer_id_idx" ON "sales_orders"("customer_id");

-- CreateIndex
CREATE INDEX "sales_orders_created_by_idx" ON "sales_orders"("created_by");

-- CreateIndex
CREATE INDEX "sales_orders_confirmed_by_idx" ON "sales_orders"("confirmed_by");

-- CreateIndex
CREATE INDEX "sales_orders_cancelled_by_idx" ON "sales_orders"("cancelled_by");

-- CreateIndex
CREATE INDEX "sales_order_items_batch_id_idx" ON "sales_order_items"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_order_items_order_id_batch_id_key" ON "sales_order_items"("order_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_deliveries_idempotency_key_key" ON "sales_deliveries"("idempotency_key");

-- CreateIndex
CREATE INDEX "sales_deliveries_order_id_created_at_idx" ON "sales_deliveries"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "sales_deliveries_created_by_idx" ON "sales_deliveries"("created_by");

-- CreateIndex
CREATE INDEX "sales_delivery_items_order_item_id_idx" ON "sales_delivery_items"("order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_delivery_items_delivery_id_order_item_id_key" ON "sales_delivery_items"("delivery_id", "order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "sales_payments_idempotency_key_key" ON "sales_payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "sales_payments_order_id_created_at_idx" ON "sales_payments"("order_id", "created_at");

-- CreateIndex
CREATE INDEX "sales_payments_created_by_idx" ON "sales_payments"("created_by");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_farm_id_fkey" FOREIGN KEY ("farm_id") REFERENCES "farms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "seed_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_deliveries" ADD CONSTRAINT "sales_deliveries_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_deliveries" ADD CONSTRAINT "sales_deliveries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_delivery_items" ADD CONSTRAINT "sales_delivery_items_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "sales_deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_delivery_items" ADD CONSTRAINT "sales_delivery_items_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "sales_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Reservation invariant also protects legacy stock edits.
ALTER TABLE "seed_batches" ADD CONSTRAINT "seed_batches_reserved_quantity_check"
 CHECK ("reserved_quantity" >= 0 AND "reserved_quantity" <= "current_estimated_quantity");
ALTER TABLE "customers" ADD CONSTRAINT "customers_name_check" CHECK (length(btrim("name")) > 0);
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_status_check"
 CHECK ("status" IN ('draft','confirmed','partially_delivered','delivered','completed','cancelled')),
 ADD CONSTRAINT "sales_orders_total_check" CHECK ("total_amount" >= 0);
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_quantity_check"
 CHECK ("quantity" > 0 AND "delivered_quantity" >= 0 AND "delivered_quantity" <= "quantity"),
 ADD CONSTRAINT "sales_order_items_money_check" CHECK ("unit_price" >= 0 AND "line_total" = "quantity" * "unit_price");
ALTER TABLE "sales_delivery_items" ADD CONSTRAINT "sales_delivery_items_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "sales_payments" ADD CONSTRAINT "sales_payments_amount_check" CHECK ("amount" > 0),
 ADD CONSTRAINT "sales_payments_method_check" CHECK ("method" IN ('cash','bank_transfer'));
