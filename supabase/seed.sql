-- ============================================================================
-- Optional starter data for SRK Flowers.
-- Run AFTER schema.sql. You can edit/delete all of this inside the app later.
-- ============================================================================

-- Flower categories (English + Tamil)
insert into public.flower_categories (name_en, name_ta, color, sort_order) values
  ('Rose',     'ரோஜா',   '#e91e63', 1),
  ('Jasmine',  'மல்லி',   '#9c27b0', 2),
  ('Marigold', 'சாமந்தி', '#fb8c00', 3),
  ('Chrysanthemum', 'சாமந்திப்பூ', '#ffb300', 4),
  ('Lotus',    'தாமரை',   '#ec407a', 5),
  ('Others',   'மற்றவை',  '#43a047', 6)
on conflict do nothing;

-- A few common flowers with stock 0 to start (admin edits names/stock in app)
insert into public.flowers (category_id, name_en, name_ta, stock_kg, low_stock_threshold, default_rate)
select c.id, v.name_en, v.name_ta, 0, 5, v.rate
from (values
  ('Rose',     'Rose',        'ரோஜா',        0),
  ('Jasmine',  'Jasmine',     'மல்லிப்பூ',    0),
  ('Jasmine',  'Mullai',      'முல்லை',       0),
  ('Marigold', 'Marigold',    'சாமந்திப்பூ',  0),
  ('Marigold', 'Sevvanthi',   'செவ்வந்தி',    0),
  ('Lotus',    'Lotus',       'தாமரை',        0)
) as v(cat, name_en, name_ta, rate)
join public.flower_categories c on c.name_en = v.cat
on conflict do nothing;

-- Places we deliver to
insert into public.places (name_en, name_ta, sort_order) values
  ('Cuddalore',     'கடலூர்',        1),
  ('Virudhachalam', 'விருத்தாசலம்',  2),
  ('Panruti',       'பனருட்டி',      3)
on conflict do nothing;
