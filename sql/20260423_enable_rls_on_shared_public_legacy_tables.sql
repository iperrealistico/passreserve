-- Shared Supabase project: dwvvjoqsmqjvouuhyvii
-- Purpose: harden legacy MTB Reserve tables that still live in the exposed
-- public schema. Passreserve's active runtime data lives in the separate
-- passreserve schema and is not touched by this script.
--
-- Strategy:
-- - enable RLS on legacy public tables
-- - add no policies, which defaults anon/authenticated access to deny-all
-- - avoid destructive changes, drops, or blanket allow policies

BEGIN;

ALTER TABLE public."BikeType" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EmailTemplate" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AdminLoginAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SuperAdmin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RateLimit" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."EventLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SystemSettings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."SignupRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."AboutPageContent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BookingItem" ENABLE ROW LEVEL SECURITY;

COMMIT;
