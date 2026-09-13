-- Preserve all company fields and custom link/project discriminator values.

ALTER TABLE companies ADD COLUMN industry TEXT;
ALTER TABLE companies ADD COLUMN established TEXT;
ALTER TABLE companies ADD COLUMN capital TEXT;
ALTER TABLE companies ADD COLUMN employees TEXT;

ALTER TABLE projects ADD COLUMN role_custom TEXT;

ALTER TABLE links ADD COLUMN link_type TEXT;
ALTER TABLE links ADD COLUMN link_type_custom TEXT;
