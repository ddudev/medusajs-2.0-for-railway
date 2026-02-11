import { Migration } from "@medusajs/framework/mikro-orm/migrations"

export class Migration20260211000000CreateAnalyticsSettingsTable extends Migration {
  override async up(): Promise<void> {
    this.addSql(
      `create table if not exists "analytics_settings" ("id" text not null, "posthog_dashboard_embed_url" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "analytics_settings_pkey" primary key ("id"));`
    )
    this.addSql(
      `CREATE INDEX IF NOT EXISTS "IDX_analytics_settings_deleted_at" ON "analytics_settings" ("deleted_at") WHERE deleted_at IS NULL;`
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "analytics_settings" cascade;`)
  }
}
