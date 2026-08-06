-- Payments: link cards to invoices; keep Paid as a cycling (non-terminal) stage.
-- Maintenance: dedicated pipeline board fed from maintenance_requests.

ALTER TABLE pipeline_cards
  ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS maintenance_request_id UUID REFERENCES maintenance_requests(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_cards_invoice
  ON pipeline_cards (invoice_id)
  WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pipeline_cards_maintenance_request
  ON pipeline_cards (maintenance_request_id)
  WHERE maintenance_request_id IS NOT NULL;

-- Recurring rent tracker: Paid should not close the card
UPDATE pipeline_stages ps
SET is_won = false,
    is_terminal = false,
    updated_at = CURRENT_TIMESTAMP
FROM pipeline_boards pb
WHERE ps.board_id = pb.id
  AND pb.slug = 'payments'
  AND ps.slug = 'paid';

INSERT INTO pipeline_boards (slug, name, description, sort_order)
VALUES (
  'maintenance',
  'Maintenance',
  'Tenant work orders from portal submissions',
  5
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO pipeline_stages (board_id, slug, name, color, sort_order, is_won, is_lost, is_terminal)
SELECT b.id, s.slug, s.name, s.color, s.sort_order, s.is_won, s.is_lost, s.is_terminal
FROM pipeline_boards b
JOIN (
  VALUES
    ('maintenance', 'submitted', 'Submitted', '#7c3aed', 1, false, false, false),
    ('maintenance', 'in_progress', 'In progress', '#3b82f6', 2, false, false, false),
    ('maintenance', 'resolved', 'Resolved', '#22c55e', 3, true, false, true)
) AS s(board_slug, slug, name, color, sort_order, is_won, is_lost, is_terminal)
  ON b.slug = s.board_slug
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages ps
  WHERE ps.board_id = b.id AND ps.slug = s.slug
);

COMMENT ON COLUMN pipeline_cards.invoice_id IS 'Payments board: invoice driving current stage';
COMMENT ON COLUMN pipeline_cards.maintenance_request_id IS 'Maintenance board: source work order';
