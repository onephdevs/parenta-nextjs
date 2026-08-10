-- Seed default utility vendors from Alfonso client discovery
-- (Angeles Electric Corp. / Balibago WaterWorks System).
-- Idempotent: skips when a VENDOR contact with the same first_name already exists.

INSERT INTO contacts (first_name, last_name, notes, is_active)
SELECT v.first_name, v.last_name, v.notes, true
FROM (
  VALUES
    ('Angeles Electric Corp.', '-', 'Electric utility provider (Alfonso / Angeles area)'),
    ('Balibago WaterWorks System', '-', 'Water utility provider')
) AS v(first_name, last_name, notes)
WHERE NOT EXISTS (
  SELECT 1
  FROM contacts c
  INNER JOIN contact_roles cr ON cr.contact_id = c.id AND cr.role = 'VENDOR'
  WHERE lower(trim(c.first_name)) = lower(trim(v.first_name))
);

INSERT INTO contact_roles (contact_id, role)
SELECT c.id, 'VENDOR'
FROM contacts c
WHERE lower(trim(c.first_name)) IN (
  lower('Angeles Electric Corp.'),
  lower('Balibago WaterWorks System')
)
AND NOT EXISTS (
  SELECT 1 FROM contact_roles cr
  WHERE cr.contact_id = c.id AND cr.role = 'VENDOR'
);
