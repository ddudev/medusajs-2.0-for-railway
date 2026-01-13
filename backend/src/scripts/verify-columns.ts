/**
 * Quick verification script to check if required columns exist
 * Run with: medusa exec ./src/scripts/verify-columns.ts
 */
import { Pool } from "pg"

export default async function verifyColumns() {
  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.log("⚠️  DATABASE_URL not available")
    return
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    connectionTimeoutMillis: 10000,
  })

  try {
    console.log("🔍 Verifying required columns exist...\n")

    // Check promotion.limit
    const limitExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'promotion' 
        AND column_name = 'limit'
      );
    `)
    console.log(`promotion.limit: ${limitExists.rows[0]?.exists ? '✅ EXISTS' : '❌ MISSING'}`)

    // Check promotion.used
    const usedExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'promotion' 
        AND column_name = 'used'
      );
    `)
    console.log(`promotion.used: ${usedExists.rows[0]?.exists ? '✅ EXISTS' : '❌ MISSING'}`)

    // Check cart.locale
    const localeExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'cart' 
        AND column_name = 'locale'
      );
    `)
    console.log(`cart.locale: ${localeExists.rows[0]?.exists ? '✅ EXISTS' : '❌ MISSING'}`)

    console.log("\n✅ Verification complete")
  } catch (error: any) {
    console.error("❌ Error verifying columns:", error.message)
  } finally {
    await pool.end()
  }
}
