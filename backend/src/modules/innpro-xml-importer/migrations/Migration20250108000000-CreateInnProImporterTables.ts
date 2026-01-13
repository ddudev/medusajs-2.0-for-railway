import { Migration } from '@mikro-orm/migrations'

export class Migration20250108000000CreateInnProImporterTables extends Migration {
  async up(): Promise<void> {
    // Create innpro_import_session table
    this.addSql(`
      CREATE TABLE IF NOT EXISTS innpro_import_session (
        id VARCHAR(255) PRIMARY KEY,
        xml_url VARCHAR(500) NOT NULL,
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

    // Create innpro_import_config table
    this.addSql(`
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

    // Create indexes for better performance
    this.addSql(`
      CREATE INDEX IF NOT EXISTS idx_innpro_import_session_status 
      ON innpro_import_session(status);
      
      CREATE INDEX IF NOT EXISTS idx_innpro_import_config_enabled 
      ON innpro_import_config(enabled);
    `)
  }

  async down(): Promise<void> {
    this.addSql(`DROP TABLE IF EXISTS innpro_import_session;`)
    this.addSql(`DROP TABLE IF EXISTS innpro_import_config;`)
  }
}
