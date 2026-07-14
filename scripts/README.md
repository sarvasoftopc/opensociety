# Multi-Tenant SQL Execution Order

Run these scripts from the repo-root `scripts/` folder in this order:

1. `001_create_multi_tenant_foundation.sql`
2. `002_tenantize_society_config.sql`
3. `003_tenantize_apartments.sql`
4. `004_tenantize_users.sql`
5. `005_tenantize_residencies.sql`
6. `006_backfill_default_tenant.sql`
7. `007_enforce_not_null_and_fk_guards.sql`
8. `008_tenantize_visitor_pre_approvals.sql`
9. `009_tenantize_visitor_entries.sql`
10. `010_backfill_visitor_tenant.sql`
11. `011_enforce_visitor_tenant_not_null.sql`
12. `012_tenantize_notices.sql`
13. `013_tenantize_notice_reads.sql`
14. `014_tenantize_guards.sql`
15. `015_tenantize_guard_devices.sql`
16. `016_backfill_notice_and_guard_tenant.sql`
17. `017_enforce_notice_and_guard_tenant_not_null.sql`
18. `018_tenantize_maintenance_tickets.sql`
19. `019_backfill_maintenance_tickets_tenant.sql`
20. `020_enforce_maintenance_tickets_tenant_not_null.sql`
21. `021_tenantize_vehicles.sql`
22. `022_tenantize_parking_slots.sql`
23. `023_backfill_vehicle_and_parking_tenant.sql`
24. `024_enforce_vehicle_and_parking_tenant_not_null.sql`
25. `025_tenantize_bill_config.sql`
26. `026_tenantize_finance_tables.sql`
27. `027_backfill_finance_tenant.sql`
28. `028_enforce_finance_tenant_not_null.sql`
29. `029_tenantize_house_help.sql`
30. `030_tenantize_house_help_children.sql`
31. `031_backfill_house_help_tenant.sql`
32. `032_enforce_house_help_tenant_not_null.sql`
33. `033_tenantize_guard_duty_sessions.sql`
34. `034_backfill_guard_duty_tenant.sql`
35. `035_enforce_guard_duty_tenant_not_null.sql`

If you are starting from a blank Supabase database, use:

- `998_bootstrap_supabase_schema.sql`

If you already have an existing single-tenant OpenSociety database and want to migrate it in-place, use:

- `999_all_in_one_supabase_migration.sql`

## Notes

- `006_backfill_default_tenant.sql` contains placeholder tenant values. Replace `default-society` and `Default Society` before running it in a real environment.
- `007_enforce_not_null_and_fk_guards.sql` should only be executed after you verify every affected row received a `tenant_id`.
- `998_bootstrap_supabase_schema.sql` is the from-scratch schema bootstrap for a blank Supabase/Postgres database.
- `999_all_in_one_supabase_migration.sql` is a concatenated bundle of `001` through `035` in the same order and is intended for migrating an existing single-tenant OpenSociety database in Supabase SQL Editor.
- These scripts now cover the current FastAPI migration foundation plus visitor, notice, guard, guard-duty, ticket, vehicle, parking, finance, and house-help tables.
- Remaining tenantization for any newly added future domains should be added as later numbered scripts so execution order stays stable.
