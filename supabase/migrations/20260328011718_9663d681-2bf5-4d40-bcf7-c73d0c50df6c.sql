INSERT INTO billing_products (code, name, description) 
VALUES ('avanzado', 'Avanzado', 'Up to 500 animals')
ON CONFLICT (code) DO NOTHING;