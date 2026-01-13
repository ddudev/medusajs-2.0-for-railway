-- SQL script to add missing columns to promotion and cart tables
-- These columns are expected by MedusaJS 2.12.3 admin API but may be missing in older databases
-- Run this manually if the ensure-migrations.ts script doesn't run in production
-- 
-- Usage: psql $DATABASE_URL -f src/db-migrations/add-missing-columns.sql

DO $$ 
BEGIN
  -- Add limit column to promotion table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'promotion' 
    AND column_name = 'limit'
  ) THEN
    ALTER TABLE "promotion" ADD COLUMN "limit" integer NULL;
    COMMENT ON COLUMN "promotion"."limit" IS 'Maximum number of times this promotion can be used. NULL means unlimited.';
    RAISE NOTICE 'Added limit column to promotion table';
  ELSE
    RAISE NOTICE 'limit column already exists in promotion table';
  END IF;

  -- Add used column to promotion table if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'promotion' 
    AND column_name = 'used'
  ) THEN
    ALTER TABLE "promotion" ADD COLUMN "used" integer NOT NULL DEFAULT 0;
    COMMENT ON COLUMN "promotion"."used" IS 'Number of times this promotion has been used.';
    RAISE NOTICE 'Added used column to promotion table';
  ELSE
    RAISE NOTICE 'used column already exists in promotion table';
  END IF;

  -- Add locale column to cart table if it doesn't exist
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'cart'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'cart' 
      AND column_name = 'locale'
    ) THEN
      ALTER TABLE "cart" ADD COLUMN "locale" text NULL;
      COMMENT ON COLUMN "cart"."locale" IS 'Locale/language code for the cart (e.g., en, bg, fr).';
      RAISE NOTICE 'Added locale column to cart table';
    ELSE
      RAISE NOTICE 'locale column already exists in cart table';
    END IF;
  ELSE
    RAISE NOTICE 'Cart table does not exist yet';
  END IF;
END $$;
