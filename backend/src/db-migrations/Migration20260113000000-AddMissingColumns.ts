import { Migration } from '@mikro-orm/migrations'

/**
 * Migration to add missing columns that may be expected by the frontend/UI
 * - promotion.limit: Usage limit for promotions
 * - promotion.used: Usage count for promotions  
 * - cart.locale: Locale/language for cart
 * 
 * These columns are added as nullable since they may not be used by all installations
 */
export class Migration20260113000000AddMissingColumns extends Migration {
  override async up(): Promise<void> {
    // Add limit and used columns to promotion table if they don't exist
    this.addSql(`
      DO $$ 
      BEGIN
        -- Add limit column to promotion table
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'promotion' 
          AND column_name = 'limit'
        ) THEN
          ALTER TABLE "promotion" ADD COLUMN "limit" integer NULL;
          COMMENT ON COLUMN "promotion"."limit" IS 'Maximum number of times this promotion can be used. NULL means unlimited.';
        END IF;

        -- Add used column to promotion table
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'promotion' 
          AND column_name = 'used'
        ) THEN
          ALTER TABLE "promotion" ADD COLUMN "used" integer NOT NULL DEFAULT 0;
          COMMENT ON COLUMN "promotion"."used" IS 'Number of times this promotion has been used.';
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
          END IF;
        END IF;
      END $$;
    `)
  }

  override async down(): Promise<void> {
    // Remove the columns if rolling back
    this.addSql(`
      DO $$ 
      BEGIN
        -- Remove limit column from promotion table
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'promotion' 
          AND column_name = 'limit'
        ) THEN
          ALTER TABLE "promotion" DROP COLUMN "limit";
        END IF;

        -- Remove used column from promotion table
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'promotion' 
          AND column_name = 'used'
        ) THEN
          ALTER TABLE "promotion" DROP COLUMN "used";
        END IF;

        -- Remove locale column from cart table
        IF EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'cart'
        ) THEN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'cart' 
            AND column_name = 'locale'
          ) THEN
            ALTER TABLE "cart" DROP COLUMN "locale";
          END IF;
        END IF;
      END $$;
    `)
  }
}
