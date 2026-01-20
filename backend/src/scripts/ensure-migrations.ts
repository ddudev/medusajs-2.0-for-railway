import { Pool } from "pg"
import { readFileSync } from "fs"
import { join } from "path"

/**
 * Startup script to ensure required database tables and columns exist
 * 
 * This script runs automatically at startup via the 'start' command in package.json
 * 
 * It ensures:
 * 1. Custom tables exist (econt_settings, xml_import_sessions, innpro_import_sessions, brand, review)
 * 2. Missing columns are added to MedusaJS tables:
 *    - promotion.limit (integer, nullable) - Usage limit for promotions
 *    - promotion.used (integer, NOT NULL, default 0) - Usage count for promotions
 *    - cart.locale (text, nullable) - Locale/language code for cart
 * 
 * These columns are required for MedusaJS 2.12.3+ compatibility but may be missing
 * in databases upgraded from older MedusaJS versions.
 * 
 * Note: MedusaJS module migrations (like product-review) are primarily handled by
 * 'init-backend' which runs 'medusa db:migrate'. This script provides a safety net
 * to ensure tables exist even if migrations haven't run yet.
 * 
 * The script is idempotent - safe to run multiple times.
 */
export default async function ensureMigrations() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.log("⚠️  DATABASE_URL not available, skipping migration check")
    return
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
  })

  try {
    // FIRST: Check and add missing columns to promotion and cart tables
    // These columns are expected by MedusaJS 2.12.3 admin API but may be missing in older databases
    // This MUST run before any early returns or pool closures
    console.log("🔍 Checking for missing columns in promotion and cart tables...")
    console.log("   This fixes compatibility issues after MedusaJS 2.0 upgrade")
    
    try {
      // Check if promotion table exists and add limit/used columns if missing
      const promotionTableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'promotion'
        );
      `)

      if (promotionTableExists.rows[0]?.exists) {
        // Add limit column if it doesn't exist
        const limitColumnExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'promotion' 
            AND column_name = 'limit'
          );
        `)

        if (!limitColumnExists.rows[0]?.exists) {
          console.log("   📦 Adding 'limit' column to promotion table...")
          try {
            await pool.query(`
              ALTER TABLE "promotion" ADD COLUMN "limit" integer NULL;
              COMMENT ON COLUMN "promotion"."limit" IS 'Maximum number of times this promotion can be used. NULL means unlimited.';
            `)
            console.log("   ✅ Successfully added 'limit' column to promotion table")
          } catch (addError: any) {
            if (addError.code === '42701' || addError.message?.includes('already exists')) {
              console.log("   ✅ 'limit' column already exists (race condition)")
            } else {
              console.error(`   ❌ Failed to add 'limit' column: ${addError.message}`)
              throw addError
            }
          }
        } else {
          console.log("   ✅ 'limit' column already exists in promotion table")
        }

        // Add used column if it doesn't exist
        const usedColumnExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'promotion' 
            AND column_name = 'used'
          );
        `)

        if (!usedColumnExists.rows[0]?.exists) {
          console.log("   📦 Adding 'used' column to promotion table...")
          try {
            await pool.query(`
              ALTER TABLE "promotion" ADD COLUMN "used" integer NOT NULL DEFAULT 0;
              COMMENT ON COLUMN "promotion"."used" IS 'Number of times this promotion has been used.';
            `)
            console.log("   ✅ Successfully added 'used' column to promotion table")
          } catch (addError: any) {
            if (addError.code === '42701' || addError.message?.includes('already exists')) {
              console.log("   ✅ 'used' column already exists (race condition)")
            } else {
              console.error(`   ❌ Failed to add 'used' column: ${addError.message}`)
              throw addError
            }
          }
        } else {
          console.log("   ✅ 'used' column already exists in promotion table")
        }
      } else {
        console.log("   ⚠️  Promotion table doesn't exist yet (will be created by MedusaJS migrations)")
      }

      // Check if cart table exists and add locale column if missing
      const cartTableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'cart'
        );
      `)

      if (cartTableExists.rows[0]?.exists) {
        const localeColumnExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'cart' 
            AND column_name = 'locale'
          );
        `)

        if (!localeColumnExists.rows[0]?.exists) {
          console.log("   📦 Adding 'locale' column to cart table...")
          try {
            await pool.query(`
              ALTER TABLE "cart" ADD COLUMN "locale" text NULL;
              COMMENT ON COLUMN "cart"."locale" IS 'Locale/language code for the cart (e.g., en, bg, fr).';
            `)
            console.log("   ✅ Successfully added 'locale' column to cart table")
          } catch (addError: any) {
            if (addError.code === '42701' || addError.message?.includes('already exists')) {
              console.log("   ✅ 'locale' column already exists (race condition)")
            } else {
              console.error(`   ❌ Failed to add 'locale' column: ${addError.message}`)
              throw addError
            }
          }
        } else {
          console.log("   ✅ 'locale' column already exists in cart table")
        }
      } else {
        console.log("   ⚠️  Cart table doesn't exist yet (will be created by MedusaJS migrations)")
      }
      
      console.log("   ✅ Finished checking/adding missing columns")
    } catch (error: any) {
      console.error("   ❌ CRITICAL: Error checking/adding columns:", error.message)
      console.error("   ❌ Stack trace:", error.stack)
      // Don't throw - let the app start, but log the error clearly
      // The app should work without these columns (we've fixed the frontend)
      // But backend queries might still fail until columns are added
      console.error("   ⚠️  If you see 'column does not exist' errors, the migration may have failed")
      console.error("   ⚠️  Check the logs above for specific error details")
    }

    // Check and create econt_settings table if it doesn't exist
    const econtSettingsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'econt_settings'
      );
    `)

    if (!econtSettingsExists.rows[0]?.exists) {
      console.log("📦 Creating econt_settings table...")
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "econt_settings" (
          "id" text NOT NULL,
          "username" text NOT NULL,
          "password" text NOT NULL,
          "live" boolean NOT NULL DEFAULT false,
          "sender_type" text NOT NULL DEFAULT 'OFFICE',
          "sender_city" text NOT NULL,
          "sender_post_code" text NOT NULL,
          "sender_office_code" text NULL,
          "sender_street" text NULL,
          "sender_street_num" text NULL,
          "sender_quarter" text NULL,
          "sender_building_num" text NULL,
          "sender_entrance_num" text NULL,
          "sender_floor_num" text NULL,
          "sender_apartment_num" text NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          "deleted_at" timestamptz NULL,
          CONSTRAINT "econt_settings_pkey" PRIMARY KEY ("id")
        );
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS "IDX_econt_settings_deleted_at" 
        ON "econt_settings" ("deleted_at") 
        WHERE "deleted_at" IS NULL;
      `)

      console.log("✅ econt_settings table created")
    } else {
      console.log("✅ econt_settings table already exists")
    }

    // Check and create brand table if it doesn't exist
    const brandExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'brand'
      );
    `)

    if (!brandExists.rows[0]?.exists) {
      console.log("📦 Creating brand table...")
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "brand" (
          "id" text NOT NULL,
          "name" text NOT NULL,
          "image_url" text NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          "deleted_at" timestamptz NULL,
          CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
        );
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS "IDX_brand_name" 
        ON "brand" (name) 
        WHERE deleted_at IS NULL;
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS "IDX_brand_deleted_at" 
        ON "brand" (deleted_at) 
        WHERE deleted_at IS NULL;
      `)

      console.log("✅ brand table created")
    } else {
      console.log("✅ brand table already exists")
    }

    // Check and create review table if it doesn't exist (Product Review module)
    // Note: Primary migration is handled by Medusa's migration system via Migration20260114065932.ts
    // This is a safety net in case migrations haven't run yet
    const reviewExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'review'
      );
    `)

    if (!reviewExists.rows[0]?.exists) {
      console.log("📦 Creating review table (Product Review module)...")
      await pool.query(`
        CREATE TABLE IF NOT EXISTS "review" (
          "id" text NOT NULL,
          "title" text NULL,
          "content" text NOT NULL,
          "rating" real NOT NULL,
          "first_name" text NOT NULL,
          "last_name" text NOT NULL,
          "status" text CHECK ("status" IN ('pending', 'approved', 'rejected')) NOT NULL DEFAULT 'pending',
          "product_id" text NOT NULL,
          "customer_id" text NULL,
          "created_at" timestamptz NOT NULL DEFAULT now(),
          "updated_at" timestamptz NOT NULL DEFAULT now(),
          "deleted_at" timestamptz NULL,
          CONSTRAINT "review_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "rating_range" CHECK (rating >= 1 AND rating <= 5)
        );
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS "IDX_REVIEW_PRODUCT_ID" 
        ON "review" ("product_id") 
        WHERE deleted_at IS NULL;
      `)

      await pool.query(`
        CREATE INDEX IF NOT EXISTS "IDX_review_deleted_at" 
        ON "review" ("deleted_at") 
        WHERE deleted_at IS NULL;
      `)

      console.log("✅ review table created")
    } else {
      console.log("✅ review table already exists")
    }

    // Check if product-brand link table exists
    // MedusaJS creates link tables with the pattern: {module1}_{entity1}_{module2}_{entity2}
    // For product.brand link, it's: product_product_brand_brand
    const linkTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'product_product_brand_brand'
      );
    `)

    if (!linkTableExists.rows[0]?.exists) {
      console.log("⚠️  product_product_brand_brand link table not found")
      console.log("   This table should be created by 'medusa db:sync-links'")
      console.log("   Run 'npx medusa db:sync-links' manually if needed")
      console.log("   Or ensure 'init-backend' runs successfully at startup")
    } else {
      console.log("✅ product_product_brand_brand link table exists")
    }

    const requiredColumns = ['created_at', 'updated_at', 'deleted_at']
    const tables = ['xml_import_mapping', 'xml_import_config', 'xml_import_execution', 'xml_import_execution_log']
    
    // Check which tables exist
    const existingTables: string[] = []
    for (const table of tables) {
      const checkResult = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table])
      
      if (checkResult.rows[0]?.exists) {
        existingTables.push(table)
      }
    }
    
    if (existingTables.length > 0) {
      // Some tables exist - check for missing columns and add them
      let needsUpdate = false
      const missingColumns: Array<{ table: string; column: string }> = []
      
      // Check each existing table for missing columns
      for (const table of existingTables) {
        for (const column of requiredColumns) {
          const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
            AND column_name = $2;
          `, [table, column])
          
          if (checkColumn.rows.length === 0) {
            needsUpdate = true
            missingColumns.push({ table, column })
          }
        }
      }
      
      if (needsUpdate) {
        console.log(`📦 Adding missing timestamp columns to existing tables...`)
        console.log(`   Missing: ${missingColumns.map(m => `${m.table}.${m.column}`).join(', ')}`)
        
        // Add missing columns to each table
        for (const { table, column } of missingColumns) {
          try {
            if (column === 'deleted_at') {
              await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} TIMESTAMP NULL;`)
            } else {
              // created_at and updated_at should have defaults
              await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} TIMESTAMP DEFAULT NOW();`)
            }
            
            // Verify the column was actually added
            const verifyColumn = await pool.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = $1
              AND column_name = $2;
            `, [table, column])
            
            if (verifyColumn.rows.length > 0) {
              console.log(`   ✅ Added ${column} to ${table}`)
            } else {
              console.error(`   ❌ Failed to add ${column} to ${table} - column still missing after ALTER TABLE`)
            }
          } catch (error: any) {
            // Check if column exists now (might have been added by another process)
            const verifyColumn = await pool.query(`
              SELECT column_name 
              FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = $1
              AND column_name = $2;
            `, [table, column])
            
            if (verifyColumn.rows.length > 0) {
              console.log(`   ✅ ${column} already exists in ${table}`)
            } else if (!error.message?.includes("already exists") && error.code !== "42P07") {
              console.error(`   ❌ Error adding ${column} to ${table}: ${error.message}`)
              throw error // Re-throw if it's a real error and column doesn't exist
            }
          }
        }
        console.log("✅ Finished checking/adding timestamp columns")
      } else {
        console.log("✅ XML Importer tables already exist with all required columns")
      }
      
      // If all tables exist, we're done
      if (existingTables.length === tables.length) {
        return
      }
      
      // Otherwise, continue to create missing tables
      console.log(`📦 Some tables are missing (${tables.length - existingTables.length} of ${tables.length}), creating them...`)
    }

    console.log("📦 XML Importer tables not found, running migrations...")

    // Read and execute migration SQL
    // Try multiple possible paths (development and production builds)
    const possiblePaths = [
      join(__dirname, "../modules/xml-product-importer/migrations/create-tables.sql"),
      join(process.cwd(), "src/modules/xml-product-importer/migrations/create-tables.sql"),
      join(process.cwd(), ".medusa/server/src/modules/xml-product-importer/migrations/create-tables.sql"),
    ]

    let sqlPath: string | null = null
    for (const path of possiblePaths) {
      if (require("fs").existsSync(path)) {
        sqlPath = path
        break
      }
    }

    if (!sqlPath) {
      console.warn("⚠️  Migration SQL file not found. Tried:", possiblePaths.join(", "))
      return
    }

    const sql = readFileSync(sqlPath, "utf-8")
    
    // Split SQL into statements, preserving CREATE TABLE and CREATE INDEX separately
    // This ensures tables are created before indexes
    const lines = sql.split("\n")
    const statements: string[] = []
    let currentStatement = ""

    for (const line of lines) {
      const trimmed = line.trim()
      // Skip comments and empty lines
      if (trimmed.startsWith("--") || trimmed.length === 0) {
        continue
      }
      
      currentStatement += line + "\n"
      
      // If line ends with semicolon, we have a complete statement
      if (trimmed.endsWith(";")) {
        const statement = currentStatement.trim()
        if (statement.length > 0) {
          statements.push(statement)
        }
        currentStatement = ""
      }
    }

    // Execute statements one by one, ensuring each completes before the next
    let successCount = 0
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await pool.query(statement)
          successCount++
        } catch (error: any) {
          // Ignore "already exists" errors (idempotent)
          if (
            error.message?.includes("already exists") ||
            error.code === "42P07" ||
            error.message?.includes("duplicate key") ||
            error.message?.includes("already exist")
          ) {
            // Table/index already exists, continue
            successCount++
            continue
          }
          // For "does not exist" errors, check if it's an index creation issue
          // Indexes might fail if table doesn't exist yet (shouldn't happen, but handle gracefully)
          if (error.message?.includes("does not exist")) {
            if (statement.includes("CREATE INDEX")) {
              console.warn(`  Index creation skipped (table may not be ready): ${error.message}`)
              // Try to create the index later - for now, skip it
              continue
            } else {
              // Table creation failed - this is more serious
              console.error(`  ❌ Failed to create table: ${error.message}`)
              console.error(`  Statement: ${statement.substring(0, 150)}...`)
              // Continue anyway - might be a transient issue
              continue
            }
          }
          // Log other errors but continue
          console.warn(`  Warning: ${error.message}`)
          console.warn(`  Statement: ${statement.substring(0, 80)}...`)
        }
      }
    }

    if (successCount > 0) {
      console.log(`✅ XML Importer migrations completed (${successCount}/${statements.length} statements)`)
      
      // Verify all tables have required columns after creation
      console.log("🔍 Verifying all tables have required columns...")
      const requiredColumns = ['created_at', 'updated_at', 'deleted_at']
      const tables = ['xml_import_mapping', 'xml_import_config', 'xml_import_execution', 'xml_import_execution_log']
      
      let allColumnsPresent = true
      for (const table of tables) {
        for (const column of requiredColumns) {
          const checkColumn = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = $1
            AND column_name = $2;
          `, [table, column])
          
          if (checkColumn.rows.length === 0) {
            console.error(`   ❌ Missing column: ${table}.${column}`)
            allColumnsPresent = false
            
            // Try to add it
            try {
              if (column === 'deleted_at') {
                await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} TIMESTAMP NULL;`)
              } else {
                await pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} TIMESTAMP DEFAULT NOW();`)
              }
              console.log(`   ✅ Added missing ${column} to ${table}`)
            } catch (addError: any) {
              console.error(`   ❌ Failed to add ${column} to ${table}: ${addError.message}`)
            }
          }
        }
      }
      
      if (allColumnsPresent) {
        console.log("✅ All tables verified with required columns")
      } else {
        console.warn("⚠️  Some columns were missing and have been added")
      }
    } else {
      console.warn("⚠️  No migrations were executed")
    }

    // Check and create InnPro Importer tables (fallback only)
    // Note: Primary migration is handled by Medusa's migration system via Migration20250108000000-CreateInnProImporterTables.ts
    // This is a safety net in case migrations haven't run yet
    console.log("🔍 Checking for InnPro Importer tables...")
    const innproTables = ['innpro_import_session', 'innpro_import_config']
    
    for (const table of innproTables) {
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table])

      if (!tableExists.rows[0]?.exists) {
        console.log(`📦 Creating ${table} table...`)
        
        if (table === 'innpro_import_session') {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS innpro_import_session (
              id VARCHAR(255) PRIMARY KEY,
              xml_url VARCHAR(500) NOT NULL,
              xml_file_path VARCHAR(500) NULL,
              parsed_data JSONB,
              selected_categories JSONB,
              selected_brands JSONB,
              selected_product_ids JSONB,
              status VARCHAR(50) NOT NULL,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              deleted_at TIMESTAMP NULL
            );
          `)
          
          await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_innpro_import_session_status 
            ON innpro_import_session(status);
          `)
          console.log(`✅ ${table} table created with xml_file_path column`)
        } else if (table === 'innpro_import_config') {
          await pool.query(`
            CREATE TABLE IF NOT EXISTS innpro_import_config (
              id VARCHAR(255) PRIMARY KEY,
              price_xml_url VARCHAR(500) NOT NULL,
              enabled BOOLEAN DEFAULT true,
              update_inventory BOOLEAN DEFAULT true,
              created_at TIMESTAMP DEFAULT NOW(),
              updated_at TIMESTAMP DEFAULT NOW(),
              deleted_at TIMESTAMP NULL
            );
          `)
          
          await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_innpro_import_config_enabled 
            ON innpro_import_config(enabled);
          `)
          console.log(`✅ ${table} table created`)
        }
      } else {
        console.log(`✅ ${table} table already exists`)
      }
    }

    // Check and add xml_file_path column to innpro_import_session if it doesn't exist
    // (for tables created before the xml_file_path column was added)
    const innproSessionExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'innpro_import_session'
      );
    `)
    
    if (innproSessionExists.rows[0]?.exists) {
      const xmlFilePathColumnExists = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'innpro_import_session'
        AND column_name = 'xml_file_path';
      `)
      
      if (xmlFilePathColumnExists.rows.length === 0) {
        console.log("📦 Adding xml_file_path column to innpro_import_session table...")
        try {
          await pool.query(`
            ALTER TABLE innpro_import_session 
            ADD COLUMN xml_file_path VARCHAR(500) NULL;
          `)
          console.log("✅ xml_file_path column added to innpro_import_session")
        } catch (error: any) {
          if (error.message?.includes("already exists") || error.code === "42701") {
            console.log("✅ xml_file_path column already exists")
          } else {
            console.error(`❌ Error adding xml_file_path column: ${error.message}`)
          }
        }
      } else {
        console.log("✅ xml_file_path column already exists in innpro_import_session")
      }
    }
  } catch (error: any) {
    console.error("❌ Error running migrations:", error.message)
    // Don't throw - allow server to start even if migrations fail
    // They can be run manually if needed
  } finally {
    await pool.end()
  }

    // Note: MedusaJS link tables are created by 'medusa db:sync-links' or 'medusa db:migrate'
    // These should be run by 'init-backend', but if links are missing, run:
    // npx medusa db:sync-links
    // The link table for product-brand should be named: link_product_brand
    console.log("ℹ️  MedusaJS link tables should be created by 'init-backend'")
    console.log("   If you see link errors, ensure 'medusa db:sync-links' has been run")
}


