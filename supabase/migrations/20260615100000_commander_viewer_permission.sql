-- New "commander viewer" permission: sees the dashboard like a manager
-- but without the notes log, the old manager home, or the warehouse.
alter type public.employee_permissions add value if not exists 'commander_viewer';
