-- Quick migration SQL - copy and paste this into psql
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'promotion' AND column_name = 'limit') THEN
    ALTER TABLE "promotion" ADD COLUMN "limit" integer NULL;
    RAISE NOTICE 'Added limit column';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'promotion' AND column_name = 'used') THEN
    ALTER TABLE "promotion" ADD COLUMN "used" integer NOT NULL DEFAULT 0;
    RAISE NOTICE 'Added used column';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cart' AND column_name = 'locale') THEN
      ALTER TABLE "cart" ADD COLUMN "locale" text NULL;
      RAISE NOTICE 'Added locale column';
    END IF;
  END IF;
END $$;
