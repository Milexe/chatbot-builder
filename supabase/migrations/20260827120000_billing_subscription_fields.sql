-- Billing fields for Stripe subscriptions (Checkout + Portal + webhooks).
alter table public.profiles
  add column if not exists stripe_subscription_id text unique,
  add column if not exists subscription_status text,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_end timestamptz;

comment on column public.profiles.stripe_subscription_id is 'Stripe subscription id (sub_…).';
comment on column public.profiles.subscription_status is 'Stripe subscription status (active, canceled, …).';
comment on column public.profiles.cancel_at_period_end is 'True when cancel is scheduled for period end.';
comment on column public.profiles.current_period_end is 'UTC end of the current Stripe billing period.';
