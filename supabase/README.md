# Supabase

Thư mục database của hệ thống, gồm migration, seed, RLS policy và PostgreSQL function của Supabase. API nghiệp vụ nằm trong Node.js/Express backend.

Hiện tại chưa tạo schema nghiệp vụ. Khi bắt đầu Sprint 1, tạo migration theo thứ tự:

1. profiles, farms, farm_members
2. ponds, seed_batches, stocking_events
3. care_logs, feeding_logs, water_change_logs
4. environmental_readings, threshold_rules, alerts
5. media_assets, analysis_jobs, analysis_results
6. products, treatments, expenses, sales

Mọi bảng nghiệp vụ phải có RLS policy và `created_at`, `updated_at`. Secret/service-role key chỉ được đặt trong môi trường backend và không được đưa vào React.
