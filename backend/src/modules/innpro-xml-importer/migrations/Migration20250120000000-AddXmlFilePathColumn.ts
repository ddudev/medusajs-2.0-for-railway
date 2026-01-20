import { Migration } from '@mikro-orm/migrations'

export class Migration20250120000000AddXmlFilePathColumn extends Migration {
  async up(): Promise<void> {
    // Add xml_file_path column to innpro_import_session table
    this.addSql(`
      ALTER TABLE innpro_import_session 
      ADD COLUMN IF NOT EXISTS xml_file_path VARCHAR(500) NULL;
    `)
  }

  async down(): Promise<void> {
    this.addSql(`
      ALTER TABLE innpro_import_session 
      DROP COLUMN IF EXISTS xml_file_path;
    `)
  }
}
