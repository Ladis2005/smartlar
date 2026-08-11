-- ============================================================================
-- SmartLar — catálogo de arranque
-- Execute depois de schema.sql. Os preços estão em centavos (2.099 MT = 209900).
-- As fotografias devem ser carregadas em /admin/produtos; enquanto não existirem,
-- a loja mostra um marcador neutro em vez de uma imagem partida.
-- ============================================================================

insert into categories (name, slug, description, position) values
  ('Eletrodomésticos', 'eletrodomesticos', 'Aparelhos que poupam tempo no dia a dia.', 1),
  ('Cozinha', 'cozinha', 'Utensílios e acessórios para cozinhar melhor.', 2),
  ('Organização', 'organizacao', 'Arrumação inteligente para cada divisão.', 3),
  ('Decoração', 'decoracao', 'Detalhes que dão personalidade ao lar.', 4),
  ('Limpeza', 'limpeza', 'Tudo para manter a casa impecável.', 5),
  ('Utilidades domésticas', 'utilidades-domesticas', 'Os pequenos objectos que resolvem o dia.', 6)
on conflict (slug) do nothing;

insert into products (name, slug, sku, short_description, description, category_id,
                      price_cents, compare_at_price_cents, stock, is_active, is_featured, is_new)
values
  ('Irrigador Oral Elétrico', 'irrigador-oral-eletrico', 'SL-IRR-001',
   'Limpeza profunda entre os dentes, com 4 modos e depósito de 300 ml.',
   'Irrigador oral recarregável com 4 modos de jacto e depósito de 300 ml. Remove restos de alimentos onde a escova não chega e é indicado para quem usa aparelho ou implantes. Autonomia até 20 dias por carga. Inclui 4 bicos e cabo USB.',
   (select id from categories where slug = 'utilidades-domesticas'),
   209900, 259900, 25, true, true, true),

  ('Liquidificadora 1500W com Jarro de Vidro', 'liquidificadora-1500w', 'SL-LIQ-002',
   'Motor de 1500W, jarro de vidro de 1,5 L e lâminas em aço inox.',
   'Liquidificadora potente para triturar gelo, fazer sumos, papas e molhos. Jarro de vidro térmico de 1,5 litros, 5 velocidades mais função pulsar, lâminas de 6 pontas em aço inoxidável e base antiderrapante.',
   (select id from categories where slug = 'eletrodomesticos'),
   389900, 449900, 12, true, true, false),

  ('Air Fryer 5,5 L Digital', 'air-fryer-55l-digital', 'SL-AIR-003',
   'Frita com pouco óleo, 8 programas e cesto antiaderente de 5,5 L.',
   'Fritadeira sem óleo com painel digital, 8 programas pré-definidos e temporizador até 60 minutos. Cesto antiaderente de 5,5 litros, suficiente para uma família de 5 pessoas. Desliga automaticamente no fim do ciclo.',
   (select id from categories where slug = 'eletrodomesticos'),
   749900, 899900, 8, true, true, true),

  ('Conjunto de Panelas Antiaderentes (5 peças)', 'conjunto-panelas-5-pecas', 'SL-PAN-004',
   'Cinco peças com revestimento antiaderente e fundo reforçado.',
   'Conjunto com três panelas, um tacho e uma frigideira. Revestimento antiaderente que dispensa excesso de óleo, fundo reforçado para aquecimento uniforme e pegas que não aquecem. Compatível com fogão a gás e elétrico.',
   (select id from categories where slug = 'cozinha'),
   329900, null, 18, true, true, false),

  ('Garrafa Térmica Inox 1 L', 'garrafa-termica-inox-1l', 'SL-GAR-005',
   'Mantém quente 12 horas e frio 24 horas.',
   'Garrafa térmica em aço inoxidável de parede dupla, com 1 litro de capacidade. Mantém bebidas quentes até 12 horas e frias até 24 horas. Tampa com vedação total, sem fugas dentro da mala.',
   (select id from categories where slug = 'cozinha'),
   119900, 149900, 40, true, false, true),

  ('Organizador de Guarda-Roupa (6 divisórias)', 'organizador-guarda-roupa', 'SL-ORG-006',
   'Seis compartimentos dobráveis para roupa interior e meias.',
   'Caixa organizadora dobrável com seis divisórias, em tecido resistente e lavável. Encaixa em gavetas padrão e mantém roupa interior, meias e acessórios sempre à vista.',
   (select id from categories where slug = 'organizacao'),
   49900, 69900, 60, true, false, false),

  ('Prateleira de Canto para Casa de Banho', 'prateleira-canto-casa-banho', 'SL-ORG-007',
   'Três níveis, montagem sem furos, alumínio resistente à humidade.',
   'Prateleira de canto com três níveis em alumínio anodizado, resistente à ferrugem. Fixa com adesivo de alta aderência — não precisa de furar azulejos. Suporta até 5 kg por nível.',
   (select id from categories where slug = 'organizacao'),
   89900, null, 30, true, false, false),

  ('Aspirador Vertical Sem Fios 2 em 1', 'aspirador-vertical-sem-fios', 'SL-ASP-008',
   'Leve, sem fios e transforma-se em aspirador de mão.',
   'Aspirador vertical com bateria recarregável e 35 minutos de autonomia. Converte-se em aspirador de mão para o carro e sofás. Filtro HEPA lavável e depósito sem saco de 1,2 L.',
   (select id from categories where slug = 'limpeza'),
   649900, 799900, 10, true, true, true),

  ('Esfregona Giratória com Balde', 'esfregona-giratoria-balde', 'SL-LIM-009',
   'Sistema de centrifugação com pedal, seca sem tocar no pano.',
   'Conjunto de esfregona com balde de centrifugação por pedal. A cabeça gira 360°, alcança cantos e fica quase seca depois da centrifugação. Inclui duas cabeças de microfibra laváveis.',
   (select id from categories where slug = 'limpeza'),
   139900, 179900, 35, true, false, false),

  ('Candeeiro de Mesa LED com Carregamento Sem Fios', 'candeeiro-led-carregamento', 'SL-DEC-010',
   'Três temperaturas de luz e base que carrega o telemóvel.',
   'Candeeiro de mesa com LED regulável em três temperaturas e cinco níveis de intensidade. A base tem carregamento sem fios para telemóveis compatíveis e uma porta USB extra.',
   (select id from categories where slug = 'decoracao'),
   259900, null, 15, true, false, true),

  ('Tapete de Entrada Antiderrapante', 'tapete-entrada-antiderrapante', 'SL-DEC-011',
   'Retém pó e água à porta, com base de borracha.',
   'Tapete de entrada com fibras de alta densidade que retêm pó e humidade, e base de borracha que não desliza no chão. Lavável à máquina, 60 × 40 cm.',
   (select id from categories where slug = 'decoracao'),
   59900, 79900, 50, true, false, false),

  ('Dispensador Automático de Sabão', 'dispensador-automatico-sabao', 'SL-UTL-012',
   'Sensor de aproximação, 350 ml, sem contacto com as mãos.',
   'Dispensador com sensor infravermelho que liberta a dose ao aproximar a mão. Depósito de 350 ml, à prova de gotas, funciona com 4 pilhas AAA (não incluídas).',
   (select id from categories where slug = 'utilidades-domesticas'),
   79900, 99900, 45, true, false, true)
on conflict (slug) do nothing;
