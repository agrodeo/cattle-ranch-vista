-- Seed price data for billing system
INSERT INTO public.billing_prices (product_code, provider, currency, amount_cents, external_sku) VALUES
('personal', 'mp', 'ARS', 2490000, 'personal_monthly_ars'),
('productor', 'mp', 'ARS', 6990000, 'productor_monthly_ars'),
('cabana', 'mp', 'ARS', 14900000, 'cabana_monthly_ars'),
('corporativo', 'mp', 'ARS', 15900000, 'corporativo_monthly_ars'),
('personal', 'app_store', 'USD', 2999, 'personal_monthly'),
('productor', 'app_store', 'USD', 6999, 'productor_monthly'),
('cabana', 'app_store', 'USD', 14999, 'cabana_monthly'),
('corporativo', 'app_store', 'USD', 15999, 'corporativo_monthly'),
('personal', 'play', 'USD', 2999, 'personal_monthly'),
('productor', 'play', 'USD', 6999, 'productor_monthly'),
('cabana', 'play', 'USD', 14999, 'cabana_monthly'),
('corporativo', 'play', 'USD', 15999, 'corporativo_monthly')
ON CONFLICT DO NOTHING;