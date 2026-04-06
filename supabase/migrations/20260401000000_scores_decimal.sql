-- Change score column to support decimal values (50.0–100.0 range)
ALTER TABLE scores ALTER COLUMN score TYPE numeric(5,2);
