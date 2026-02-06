import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260204000000 extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "category_extension" ("id" text not null, "original_name" text not null, "external_id" text null, "description" text null, "seo_title" text null, "seo_meta_description" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "category_extension_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_category_extension_original_name" ON "category_extension" ("original_name") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_category_extension_external_id" ON "category_extension" ("external_id") WHERE deleted_at IS NULL;`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_category_extension_deleted_at" ON "category_extension" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "category_extension" cascade;`)
  }
}
