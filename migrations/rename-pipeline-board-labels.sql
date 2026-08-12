-- Display names only — slugs stay payments / expenses for API and sync.

UPDATE pipeline_boards
SET name = 'Rent Payment',
    description = 'Rent chase and tenant payment verification',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'payments';

UPDATE pipeline_boards
SET name = 'Building Electricity, Water and Expense',
    description = 'Electricity, water, and other building expense follow-up',
    updated_at = CURRENT_TIMESTAMP
WHERE slug = 'expenses';
