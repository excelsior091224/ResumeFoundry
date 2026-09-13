-- Add self_pr, considerations, as_of_date to profiles table
ALTER TABLE profiles ADD COLUMN self_pr TEXT;
ALTER TABLE profiles ADD COLUMN considerations TEXT;
ALTER TABLE profiles ADD COLUMN as_of_date TEXT;
