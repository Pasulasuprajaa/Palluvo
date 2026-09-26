const db = require('./database');
const bcrypt = require('bcryptjs');

function seedDatabase() {
  console.log('--- Starting PALLUVO Database Seeding ---');

  // Clear old data for fresh seed
  db.exec(`
    DELETE FROM payments;
    DELETE FROM order_items;
    DELETE FROM orders;
    DELETE FROM reviews;
    DELETE FROM cart_items;
    DELETE FROM wishlist_items;
    DELETE FROM product_variants;
    DELETE FROM product_images;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM coupons;
    DELETE FROM addresses;
    DELETE FROM users;
  `);

  // 1. Seed Users (Admin & Customers)
  const passwordHashAdmin = bcrypt.hashSync('admin123', 10);
  const passwordHashUser = bcrypt.hashSync('password123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, phone, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  const adminResult = insertUser.run(
    'PALLUVO Concierge Admin',
    'admin@palluvo.com',
    passwordHashAdmin,
    '+91 98765 43210',
    'admin'
  );

  const user1Result = insertUser.run(
    'Priya Sharma',
    'priya@example.com',
    passwordHashUser,
    '+91 98123 45678',
    'user'
  );

  const user2Result = insertUser.run(
    'Ananya Iyer',
    'ananya@example.com',
    passwordHashUser,
    '+91 99887 76655',
    'user'
  );

  // 2. Seed Addresses for User 1
  const insertAddress = db.prepare(`
    INSERT INTO addresses (user_id, name, phone, pincode, house_flat, area, city, state, landmark, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertAddress.run(
    user1Result.lastInsertRowid,
    'Priya Sharma',
    '+91 98123 45678',
    '560001',
    'Flat 402, Royal Palms Residency',
    'Lavelle Road, Shanthala Nagar',
    'Bengaluru',
    'Karnataka',
    'Near UB City Mall',
    1
  );

  insertAddress.run(
    user1Result.lastInsertRowid,
    'Priya Sharma (Work)',
    '+91 98123 45678',
    '560103',
    'Tower B, 7th Floor, EcoWorld Tech Park',
    'Outer Ring Road, Bellandur',
    'Bengaluru',
    'Karnataka',
    'Opposite Central Mall',
    0
  );

  // 3. Seed Categories with 100% authentic local luxury saree images
  const insertCategory = db.prepare(`
    INSERT INTO categories (name, slug, description, image_url, display_order)
    VALUES (?, ?, ?, ?, ?)
  `);

  const categoriesData = [
    {
      name: 'Banarasi Sarees',
      slug: 'banarasi-sarees',
      description: 'Timeless Varanasi heritage woven with pure gold and silver zari on luscious mulberry silk.',
      image_url: '/images/categories/banarasi.jpg',
      display_order: 1
    },
    {
      name: 'Kanjivaram Sarees',
      slug: 'kanjivaram-sarees',
      description: 'Royal temple borders and rich korvai weaving from the ancient holy town of Kanchipuram.',
      image_url: '/images/categories/kanjivaram.jpg',
      display_order: 2
    },
    {
      name: 'Silk Sarees',
      slug: 'silk-sarees',
      description: 'Lustrous mulberry, raw tussar, chanderi, and tissue silk weaves for regal occasions.',
      image_url: '/images/categories/silk.jpg',
      display_order: 3
    },
    {
      name: 'Organza Sarees',
      slug: 'organza-sarees',
      description: 'Whisper-light translucent drapes adorned with delicate floral hand embroidery and scalloped borders.',
      image_url: '/images/categories/organza.jpg',
      display_order: 4
    },
    {
      name: 'Cotton & Handloom',
      slug: 'cotton-sarees',
      description: 'Breathable handcrafted mulmul, linen, and jamdani sarees for breezy effortless grace.',
      image_url: '/images/categories/cotton.jpg',
      display_order: 5
    },
    {
      name: 'Designer Sarees',
      slug: 'designer-sarees',
      description: 'Contemporary silhouettes, sequins, metallic sheen, and modern cocktail drapes.',
      image_url: '/images/categories/designer.jpg',
      display_order: 6
    },
    {
      name: 'Party Wear',
      slug: 'party-wear',
      description: 'Glamorous shimmer georgettes, velvet trims, and pre-draped luxury for evening celebrations.',
      image_url: '/images/categories/partywear.jpg',
      display_order: 7
    },
    {
      name: 'Bridal Collection',
      slug: 'bridal-collection',
      description: 'Heirloom trousseau masterworks handcrafted for weddings and lifetime memories.',
      image_url: '/images/categories/bridal.jpg',
      display_order: 8
    }
  ];

  const categoryMap = {};
  for (const cat of categoriesData) {
    const res = insertCategory.run(cat.name, cat.slug, cat.description, cat.image_url, cat.display_order);
    categoryMap[cat.slug] = res.lastInsertRowid;
  }

  // 4. Seed Products with authentic saree images
  const insertProduct = db.prepare(`
    INSERT INTO products (
      name, slug, tagline, description, short_desc, category_id, fabric, occasion, pattern,
      saree_length, blouse_length, care_instructions, price, mrp, discount_percent, rating,
      review_count, stock_quantity, sku, is_featured, is_new_arrival, is_best_seller,
      color_name, color_hex
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertImage = db.prepare(`
    INSERT INTO product_images (product_id, image_url, is_primary, display_order)
    VALUES (?, ?, ?, ?)
  `);

  const insertVariant = db.prepare(`
    INSERT INTO product_variants (product_id, color_name, color_hex, stock_quantity, sku)
    VALUES (?, ?, ?, ?, ?)
  `);

  const productsData = [
    {
      name: 'Royal Crimson Banarasi Katan Silk Saree',
      slug: 'royal-crimson-banarasi-katan-silk-saree',
      tagline: 'Woven with pure gold Kadwa zari flora and royal scalloped border.',
      short_desc: 'Heirloom Banarasi silk draped in regal crimson wine red with intricate gold floral jaal.',
      description: 'Drape yourself in royal majesty with this authentic Banarasi Katan Silk Saree. Handcrafted by master weavers in Varanasi using pure mulberry silk threads and electroplated antique gold zari, this masterpiece features exquisite floral jaal (Kadwa technique) across the body and a commanding pallu. Ideal for weddings, receptions, and grand festivities.',
      category_slug: 'banarasi-sarees',
      fabric: 'Pure Katan Silk',
      occasion: 'Wedding',
      pattern: 'Kadwa Zari Weave',
      price: 12999,
      mrp: 18999,
      discount_percent: 32,
      rating: 4.9,
      review_count: 148,
      stock_quantity: 18,
      sku: 'PAL-BAN-001',
      is_featured: 1,
      is_new_arrival: 0,
      is_best_seller: 1,
      color_name: 'Royal Crimson Wine',
      color_hex: '#5B1425',
      images: [
        '/images/sarees/banarasi_crimson.jpg',
        '/images/occasions/wedding_edit.jpg',
        '/images/categories/banarasi.jpg'
      ],
      variants: [
        { color_name: 'Royal Crimson Wine', color_hex: '#5B1425', stock: 10, sku: 'PAL-BAN-001-CR' },
        { color_name: 'Emerald Peacock', color_hex: '#0D4734', stock: 5, sku: 'PAL-BAN-001-EM' },
        { color_name: 'Imperial Plum', color_hex: '#4A154B', stock: 3, sku: 'PAL-BAN-001-PL' }
      ]
    },
    {
      name: 'Vaidarbhi Pure Kanjivaram Bridal Gold Silk Saree',
      slug: 'vaidarbhi-pure-kanjivaram-bridal-gold-silk-saree',
      tagline: 'Heavy gold brocade with temple korvai border and annapakshi motifs.',
      short_desc: 'Majestic Kanchipuram silk with authentic silver-gold dipped zari and contrasting pallu.',
      description: 'The crowning glory of bridal heritage. This authentic Kanjivaram silk saree is woven with double-warp 3-ply silk and rich 24K gold dipped silver zari. The traditional Korvai weaving connects the contrasting border seamlessly, showcasing regal elephant and Annapakshi mythological bird motifs along the magnificent pallu.',
      category_slug: 'kanjivaram-sarees',
      fabric: 'Pure Mulberry Kanjivaram Silk',
      occasion: 'Wedding',
      pattern: 'Korvai Temple Weave',
      price: 18499,
      mrp: 26999,
      discount_percent: 31,
      rating: 4.95,
      review_count: 92,
      stock_quantity: 12,
      sku: 'PAL-KAN-002',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 1,
      color_name: 'Sunlit Ochre Gold',
      color_hex: '#C5A059',
      images: [
        '/images/sarees/kanjivaram_gold.jpg',
        '/images/occasions/wedding_edit.jpg',
        '/images/categories/kanjivaram.jpg'
      ],
      variants: [
        { color_name: 'Sunlit Ochre Gold', color_hex: '#C5A059', stock: 7, sku: 'PAL-KAN-002-GL' },
        { color_name: 'Sindoor Scarlet', color_hex: '#9E1B32', stock: 5, sku: 'PAL-KAN-002-SC' }
      ]
    },
    {
      name: 'Mayura Peacock Blue & Magenta Korvai Kanjivaram Saree',
      slug: 'mayura-peacock-blue-magenta-korvai-kanjivaram-saree',
      tagline: 'Vibrant peacock teal body with contrasting rani pink gold brocade border.',
      short_desc: 'Royal Kanchipuram weave featuring auspicious peacock butis and grand floral pallu.',
      description: 'Handcrafted by master silk weavers in Kanchipuram, the Mayura drape features rich 3-ply mulberry silk yarns in luminous teal blue. The hand-linked Korvai weaving connects the rani magenta pink border flawlessly, enriched with gilded gold zari peacocks and temple spires.',
      category_slug: 'kanjivaram-sarees',
      fabric: 'Pure Kanchipuram Silk',
      occasion: 'Festive',
      pattern: 'Temple Korvai Zari',
      price: 14299,
      mrp: 20999,
      discount_percent: 32,
      rating: 4.92,
      review_count: 84,
      stock_quantity: 15,
      sku: 'PAL-KAN-009',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 1,
      color_name: 'Peacock Teal Blue',
      color_hex: '#007A87',
      images: [
        '/images/sarees/kanjivaram_peacock_blue.jpg',
        '/images/categories/kanjivaram.jpg',
        '/images/occasions/festive_glow.jpg'
      ],
      variants: [
        { color_name: 'Peacock Teal Blue', color_hex: '#007A87', stock: 10, sku: 'PAL-KAN-009-TL' },
        { color_name: 'Rani Magenta', color_hex: '#A31D58', stock: 5, sku: 'PAL-KAN-009-MG' }
      ]
    },
    {
      name: 'Noor Rose Gold Embroidered Organza Saree',
      slug: 'noor-rose-gold-embroidered-organza-saree',
      tagline: 'Feather-light sheer organza with hand-cutwork scalloped border and sequins.',
      short_desc: 'Delicate blush pink sheer organza saree with glistening floral zari threadwork.',
      description: 'Ethereal and mesmerizing, the Noor Organza Saree is crafted from featherlight sheer silk organza in a romantic blush tone. Detailed with meticulous floral bullion embroidery, matte micro-sequins, and a delicate scalloped edge, this saree is a favorite for destination cocktail soirees and engagement celebrations.',
      category_slug: 'organza-sarees',
      fabric: 'Pure Silk Organza',
      occasion: 'Party',
      pattern: 'Hand Embroidered Floral Cutwork',
      price: 6499,
      mrp: 9999,
      discount_percent: 35,
      rating: 4.8,
      review_count: 76,
      stock_quantity: 24,
      sku: 'PAL-ORG-003',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Blush Rose Gold',
      color_hex: '#E0B5B2',
      images: [
        '/images/sarees/organza_rose.jpg',
        '/images/categories/organza.jpg',
        '/images/categories/silk.jpg'
      ],
      variants: [
        { color_name: 'Blush Rose Gold', color_hex: '#E0B5B2', stock: 14, sku: 'PAL-ORG-003-BL' },
        { color_name: 'Pistachio Mint', color_hex: '#B2D8C8', stock: 10, sku: 'PAL-ORG-003-MN' }
      ]
    },
    {
      name: 'Maharani Pure Paithani Silk Saree with Peacock Pallu',
      slug: 'maharani-pure-paithani-silk-saree-with-peacock-pallu',
      tagline: 'Regal Maharashtra heritage handwoven with tapestry Asawali peacock motifs.',
      short_desc: 'Opulent royal purple Paithani saree woven with pure silk and kaleidoscope gold zari.',
      description: 'Step into royal heritage. This heirloom Paithani silk saree took 60 days on the handloom in Yeola. Featuring intricate multi-color tapestry Asawali floral vines along the body and an awe-inspiring royal peacock pallu with pure electroplated gold zari threads.',
      category_slug: 'silk-sarees',
      fabric: 'Pure Paithani Silk',
      occasion: 'Festive',
      pattern: 'Asawali Peacock Tapestry Weave',
      price: 16999,
      mrp: 24999,
      discount_percent: 32,
      rating: 4.95,
      review_count: 62,
      stock_quantity: 10,
      sku: 'PAL-PAI-011',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 1,
      color_name: 'Royal Imperial Purple',
      color_hex: '#5E227F',
      images: [
        '/images/sarees/paithani_purple.jpg',
        '/images/categories/silk.jpg',
        '/images/occasions/festive_glow.jpg'
      ],
      variants: [
        { color_name: 'Royal Imperial Purple', color_hex: '#5E227F', stock: 6, sku: 'PAL-PAI-011-PR' },
        { color_name: 'Emerald Peacock', color_hex: '#0D4734', stock: 4, sku: 'PAL-PAI-011-EM' }
      ]
    },
    {
      name: 'Midnight Velvet Sequined Cocktail Saree',
      slug: 'midnight-velvet-sequined-cocktail-saree',
      tagline: 'Sculptural georgette with micro-shimmer sequins and plush velvet border.',
      short_desc: 'Sleek midnight black georgette saree featuring dark starry sequin work for evening glam.',
      description: 'Turn heads at every gala and cocktail party. This designer georgette drape features high-density micro-sequins embedded into luxurious flowy fabric, finished with an opulent midnight velvet border. Comes with an unstitched heavy designer blouse piece with sweetheart neckline work.',
      category_slug: 'party-wear',
      fabric: 'Fluid Georgette & Velvet',
      occasion: 'Party',
      pattern: 'Sequin & Stone Sheen',
      price: 4999,
      mrp: 7499,
      discount_percent: 33,
      rating: 4.88,
      review_count: 110,
      stock_quantity: 22,
      sku: 'PAL-DES-005',
      is_featured: 1,
      is_new_arrival: 0,
      is_best_seller: 1,
      color_name: 'Midnight Onyx Black',
      color_hex: '#161413',
      images: [
        '/images/sarees/designer_black.jpg',
        '/images/categories/partywear.jpg',
        '/images/occasions/evening_glam.jpg'
      ],
      variants: [
        { color_name: 'Midnight Onyx Black', color_hex: '#161413', stock: 15, sku: 'PAL-DES-005-BK' },
        { color_name: 'Deep Sapphire Navy', color_hex: '#121F45', stock: 7, sku: 'PAL-DES-005-NV' }
      ]
    },
    {
      name: 'Rajkumari Heritage Sindoor Bridal Banarasi Saree',
      slug: 'rajkumari-heritage-sindoor-bridal-banarasi-saree',
      tagline: 'The ultimate royal trousseau with pure 24k gold zari shikargah motifs.',
      short_desc: 'Heirloom heavy Banarasi bridal saree in deep sindoor red with rich shikargah hunting scene zari.',
      description: 'Created for the bride who desires an eternal heirloom. This exquisite masterpiece took over 90 days on the handloom. Featuring traditional Shikargah forest animal motifs woven in pure gilded zari across the body, a dense bridal kadiyal pallu, and heavy brocade unstitched blouse.',
      category_slug: 'bridal-collection',
      fabric: 'Pure Mulberry Katan Silk',
      occasion: 'Wedding',
      pattern: 'Shikargah Heavy Zari Weave',
      price: 22999,
      mrp: 34999,
      discount_percent: 34,
      rating: 5.0,
      review_count: 42,
      stock_quantity: 8,
      sku: 'PAL-BRI-008',
      is_featured: 1,
      is_new_arrival: 0,
      is_best_seller: 1,
      color_name: 'Deep Sindoor Crimson',
      color_hex: '#800C1F',
      images: [
        '/images/sarees/bridal_sindoor.jpg',
        '/images/categories/bridal.jpg',
        '/images/occasions/wedding_edit.jpg'
      ],
      variants: [
        { color_name: 'Deep Sindoor Crimson', color_hex: '#800C1F', stock: 5, sku: 'PAL-BRI-008-RD' },
        { color_name: 'Rani Magenta Pink', color_hex: '#981855', stock: 3, sku: 'PAL-BRI-008-PK' }
      ]
    },
    {
      name: 'Aarya Hand-Block Printed Mulberry Mulmul Cotton Saree',
      slug: 'aarya-hand-block-printed-mulberry-mulmul-cotton-saree',
      tagline: 'Featherlight 100-count pure cotton with botanical Bagru vegetable dye prints.',
      short_desc: 'Ultra-soft handspun mulmul cotton saree crafted for breathable all-day office comfort.',
      description: 'The epitome of understated elegance. Made from superfine 100s count cotton yarn, this saree breathes easily through long workdays and humid afternoons. Hand-block printed by master artisans in Bagru using natural plant-derived indigo and madder dyes, finished with hand-knotted pom-pom tassels.',
      category_slug: 'cotton-sarees',
      fabric: '100s Count Superfine Mulmul Cotton',
      occasion: 'Workwear',
      pattern: 'Hand Block Botanical Print',
      price: 2499,
      mrp: 3999,
      discount_percent: 37,
      rating: 4.7,
      review_count: 88,
      stock_quantity: 35,
      sku: 'PAL-COT-007',
      is_featured: 0,
      is_new_arrival: 1,
      is_best_seller: 1,
      color_name: 'Indigo & Sage',
      color_hex: '#2B4263',
      images: [
        '/images/sarees/cotton_mulmul.jpg',
        '/images/categories/cotton.jpg',
        '/images/occasions/office_elegance.jpg'
      ],
      variants: [
        { color_name: 'Indigo & Sage', color_hex: '#2B4263', stock: 20, sku: 'PAL-COT-007-IN' },
        { color_name: 'Madder Terra Cotta', color_hex: '#C05A46', stock: 15, sku: 'PAL-COT-007-TC' }
      ]
    },
    {
      name: 'Chandni Handwoven Chanderi Tissue Silk Saree',
      slug: 'chandni-handwoven-chanderi-tissue-silk-saree',
      tagline: 'Moonlit metallic sheen with delicate meenakari butis and zari border.',
      short_desc: 'Sheer golden-ivory Chanderi tissue silk saree woven with subtle metallic threads.',
      description: 'Woven with gossamer-fine cotton and silk yarns interwoven with shimmering gold tissue, the Chandni Chanderi Saree captures the radiance of the full moon. Subtle gold zari butas with minute meenakari enamel highlights illuminate the drape, making it effortless for festive dinners and day pujas.',
      category_slug: 'silk-sarees',
      fabric: 'Chanderi Tissue Silk',
      occasion: 'Festive',
      pattern: 'Meenakari Zari Buta',
      price: 5499,
      mrp: 7999,
      discount_percent: 31,
      rating: 4.75,
      review_count: 53,
      stock_quantity: 20,
      sku: 'PAL-CHA-004',
      is_featured: 0,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Ivory Champagne',
      color_hex: '#F0E6D2',
      images: [
        '/images/categories/silk.jpg',
        '/images/sarees/organza_rose.jpg'
      ],
      variants: [
        { color_name: 'Ivory Champagne', color_hex: '#F0E6D2', stock: 12, sku: 'PAL-CHA-004-IV' },
        { color_name: 'Soft Lavender', color_hex: '#C3B1E1', stock: 8, sku: 'PAL-CHA-004-LV' }
      ]
    },
    {
      name: 'Sitara Gota Patti Embroidered Georgette Saree',
      slug: 'sitara-gota-patti-embroidered-georgette-saree',
      tagline: 'Authentic Rajasthani hand-stitched Gota Patti craft in sunburst marigold yellow.',
      short_desc: 'Festive marigold yellow georgette saree embellished with dazzling hand-cut gota motifs.',
      description: 'Radiate joy at haldi ceremonies and festive pujas. Crafted from premium 60-gram viscose georgette with genuine hand-stitched Rajasthani gota patti applique work, mirror accents, and a rich scalloped border.',
      category_slug: 'designer-sarees',
      fabric: 'Viscose Georgette',
      occasion: 'Festive',
      pattern: 'Rajasthani Gota Patti & Mirror Work',
      price: 7299,
      mrp: 10999,
      discount_percent: 33,
      rating: 4.85,
      review_count: 67,
      stock_quantity: 19,
      sku: 'PAL-GOT-010',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Marigold Sunshine Yellow',
      color_hex: '#F2A900',
      images: [
        '/images/categories/designer.jpg',
        '/images/occasions/festive_glow.jpg'
      ],
      variants: [
        { color_name: 'Marigold Sunshine Yellow', color_hex: '#F2A900', stock: 10, sku: 'PAL-GOT-010-YL' },
        { color_name: 'Coral Papaya', color_hex: '#F06D53', stock: 9, sku: 'PAL-GOT-010-CR' }
      ]
    },
    {
      name: 'Padmavati Antique Gold Zari Jangla Banarasi Saree',
      slug: 'padmavati-antique-gold-zari-jangla-banarasi-saree',
      tagline: 'Dense all-over antique gold floral jaal on pure handspun katan silk.',
      short_desc: 'Regal Varanasi Jangla weave showcasing royal mughal floral vine lattices.',
      description: 'An ode to timeless royalty. The Padmavati Banarasi features an uninterrupted floral Jangla jaal hand-loomed with electroplated antique matte gold zari. The heavyweight pallu displays detailed kalga motifs, draping with imperial stature.',
      category_slug: 'banarasi-sarees',
      fabric: 'Pure Katan Silk & Antique Zari',
      occasion: 'Wedding',
      pattern: 'Jangla Floral Lattice',
      price: 15499,
      mrp: 22999,
      discount_percent: 33,
      rating: 4.93,
      review_count: 58,
      stock_quantity: 14,
      sku: 'PAL-BAN-012',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Royal Mustard Gold',
      color_hex: '#C5A059',
      images: [
        '/images/sarees/banarasi_crimson.jpg',
        '/images/categories/banarasi.jpg'
      ],
      variants: [
        { color_name: 'Royal Mustard Gold', color_hex: '#C5A059', stock: 8, sku: 'PAL-BAN-012-MG' },
        { color_name: 'Forest Emerald', color_hex: '#134D37', stock: 6, sku: 'PAL-BAN-012-FE' }
      ]
    },
    {
      name: 'Arundhati Pure Silver Tissue Muhurtham Kanjivaram',
      slug: 'arundhati-pure-silver-tissue-muhurtham-kanjivaram',
      tagline: 'Liquid metallic silver-gold sheen with double-sided korvai border.',
      short_desc: 'Breathtaking silver tissue silk saree designed for modern South Indian brides.',
      description: 'Woven with glistening silver dipped threads interwoven with fine mulberry silk yarn. The Arundhati Kanjivaram reflects light like liquid silver, framed with an antique rose-gold temple korvai border and a rich elephant-peacock pallu.',
      category_slug: 'kanjivaram-sarees',
      fabric: 'Pure Silver-Gold Tissue Silk',
      occasion: 'Wedding',
      pattern: 'Tissue Korvai Brocade',
      price: 21999,
      mrp: 31999,
      discount_percent: 31,
      rating: 4.98,
      review_count: 36,
      stock_quantity: 9,
      sku: 'PAL-KAN-013',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 1,
      color_name: 'Shimmer Silver Champagne',
      color_hex: '#D9D2C7',
      images: [
        '/images/sarees/chanderi_tissue.jpg',
        '/images/sarees/chanderi_tissue_detail.jpg'
      ],
      variants: [
        { color_name: 'Shimmer Silver Champagne', color_hex: '#D9D2C7', stock: 5, sku: 'PAL-KAN-013-SV' },
        { color_name: 'Rose Gold Metallic', color_hex: '#C9A097', stock: 4, sku: 'PAL-KAN-013-RG' }
      ]
    },
    {
      name: 'Bengal Jamdani Handloom Muslin Cotton Saree',
      slug: 'bengal-jamdani-handloom-muslin-cotton-saree',
      tagline: 'Gossamer fine translucent handloom muslin with supplementary weft gold motifs.',
      short_desc: 'Heirloom Dhaka Jamdani weave in pristine off-white with delicate gold zari butis.',
      description: 'Masterfully woven on manual pit looms in Bengal using 200s count superfine muslin yarn. Each geometric floral buti is placed by hand with a supplementary bamboo spool, creating a whisper-light drape that floats effortlessly.',
      category_slug: 'cotton-sarees',
      fabric: 'Pure Muslin Cotton',
      occasion: 'Festive',
      pattern: 'Handwoven Jamdani Weft',
      price: 3299,
      mrp: 4999,
      discount_percent: 34,
      rating: 4.8,
      review_count: 51,
      stock_quantity: 26,
      sku: 'PAL-COT-014',
      is_featured: 0,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Off-White Dhakai Gold',
      color_hex: '#FAF6EE',
      images: [
        '/images/sarees/cotton_mulmul.jpg',
        '/images/categories/cotton.jpg'
      ],
      variants: [
        { color_name: 'Off-White Dhakai Gold', color_hex: '#FAF6EE', stock: 16, sku: 'PAL-COT-014-OW' },
        { color_name: 'Midnight Navy', color_hex: '#1B263B', stock: 10, sku: 'PAL-COT-014-NV' }
      ]
    },
    {
      name: 'Celeste Metallic Ombre Liquid Satin Saree',
      slug: 'celeste-metallic-ombre-liquid-satin-saree',
      tagline: 'Flowy sunset ombre gradient with crystal fringe border detailing.',
      short_desc: 'Sleek luxury drape transitioning seamlessly from wine to blush rose gold.',
      description: 'Made for modern cocktail soirees and sangeet nights. Crafted from high-sheen liquid satin georgette that cascades with high fluid elasticity, detailed with shimmering micro-crystal tassels along the pallu edge.',
      category_slug: 'party-wear',
      fabric: 'Liquid Satin Georgette',
      occasion: 'Party',
      pattern: 'Ombre Colorwash & Crystal Fringe',
      price: 4499,
      mrp: 6799,
      discount_percent: 34,
      rating: 4.82,
      review_count: 64,
      stock_quantity: 28,
      sku: 'PAL-DES-015',
      is_featured: 0,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Wine to Rose Ombre',
      color_hex: '#7A1C30',
      images: [
        '/images/sarees/designer_black.jpg',
        '/images/categories/partywear.jpg'
      ],
      variants: [
        { color_name: 'Wine to Rose Ombre', color_hex: '#7A1C30', stock: 18, sku: 'PAL-DES-015-WN' },
        { color_name: 'Emerald to Mint', color_hex: '#0F4D3A', stock: 10, sku: 'PAL-DES-015-EM' }
      ]
    },
    {
      name: 'Samrajni Grand Muhurtham 24K Gold Korvai Kanjivaram',
      slug: 'samrajni-grand-muhurtham-24k-gold-korvai-kanjivaram',
      tagline: 'The ultimate royal South Indian bridal masterpiece with pure gold zari.',
      short_desc: 'Heavy 3-ply mulberry silk Kanchipuram with dense wedding kalyanam motifs and heavy gold pallu.',
      description: 'The pinnacle of traditional South Indian bridal artistry. Handcrafted by 5th generation weaver families in Kanchipuram with 24K gold dipped silver zari threads, featuring traditional gopuram temple borders and magnificent Annapakshi swans across the commanding 1.2-meter pallu.',
      category_slug: 'bridal-collection',
      fabric: '3-Ply Pure Mulberry Kanjivaram Silk',
      occasion: 'Wedding',
      pattern: 'Gopuram Temple Korvai Weave',
      price: 27999,
      mrp: 39999,
      discount_percent: 30,
      rating: 5.0,
      review_count: 31,
      stock_quantity: 6,
      sku: 'PAL-BRI-016',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 1,
      color_name: '24K Royal Gilded Gold',
      color_hex: '#C5A059',
      images: [
        '/images/sarees/kanjivaram_gold.jpg',
        '/images/categories/bridal.jpg',
        '/images/occasions/wedding_edit.jpg'
      ],
      variants: [
        { color_name: '24K Royal Gilded Gold', color_hex: '#C5A059', stock: 4, sku: 'PAL-BRI-016-GL' },
        { color_name: 'Bridal Vermillion', color_hex: '#A31C24', stock: 2, sku: 'PAL-BRI-016-VM' }
      ]
    },
    {
      name: 'Varanasi Gulab Meenakari Buta Katan Silk Saree',
      slug: 'varanasi-gulab-meenakari-buta-katan-silk-saree',
      tagline: 'Delicate handwoven rose meenakari motifs with antique kadiyal border.',
      short_desc: 'Classic Banarasi silk draped in imperial ruby magenta with colorful meenakari flowers.',
      description: 'A prized masterpiece from Varanasi. Woven on pit-looms using pure 20/22 denier katan silk and antique gold zari threads highlighted with intricate rose enamel meenakari needlework.',
      category_slug: 'banarasi-sarees',
      fabric: 'Pure Katan Silk',
      occasion: 'Festive',
      pattern: 'Meenakari Floral Buta',
      price: 13799,
      mrp: 19999,
      discount_percent: 31,
      rating: 4.88,
      review_count: 47,
      stock_quantity: 16,
      sku: 'PAL-BAN-017',
      is_featured: 0,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Ruby Rose Magenta',
      color_hex: '#981855',
      images: [
        '/images/sarees/banarasi_crimson.jpg',
        '/images/categories/banarasi.jpg'
      ],
      variants: [
        { color_name: 'Ruby Rose Magenta', color_hex: '#981855', stock: 10, sku: 'PAL-BAN-017-MG' },
        { color_name: 'Midnight Teal', color_hex: '#0D4734', stock: 6, sku: 'PAL-BAN-017-TL' }
      ]
    },
    {
      name: 'Kamakshi Traditional Temple Korvai Bottle Green Saree',
      slug: 'kamakshi-traditional-temple-korvai-bottle-green-saree',
      tagline: 'Deep emerald bottle green body with contrasting fiery kumkum red border.',
      short_desc: 'Heirloom Kanchipuram silk with authentic silver-gold dipped zari and contrasting temple border.',
      description: 'Woven with high-twist 3-ply mulberry silk, the Kamakshi saree celebrates ancient Dravidian temple architecture with sacred temple spire korvai interlocks along the pallu.',
      category_slug: 'kanjivaram-sarees',
      fabric: 'Pure Mulberry Kanjivaram Silk',
      occasion: 'Festive',
      pattern: 'Temple Korvai Zari',
      price: 11899,
      mrp: 17499,
      discount_percent: 32,
      rating: 4.9,
      review_count: 53,
      stock_quantity: 12,
      sku: 'PAL-KAN-018',
      is_featured: 0,
      is_new_arrival: 1,
      is_best_seller: 1,
      color_name: 'Emerald Bottle Green',
      color_hex: '#0E4D34',
      images: [
        '/images/sarees/kanjivaram_peacock_blue.jpg',
        '/images/categories/kanjivaram.jpg'
      ],
      variants: [
        { color_name: 'Emerald Bottle Green', color_hex: '#0E4D34', stock: 8, sku: 'PAL-KAN-018-GR' },
        { color_name: 'Deep Maroon Crimson', color_hex: '#5B1425', stock: 4, sku: 'PAL-KAN-018-MR' }
      ]
    },
    {
      name: 'Mysore Royal Crepe Silk Saree with Pure Gold Zari',
      slug: 'mysore-royal-crepe-silk-saree-with-pure-gold-zari',
      tagline: 'Featherlight 100% pure crepe silk with electroplated gold zari kasuti border.',
      short_desc: 'Signature royal Mysore drape offering buttery fluid pleats and effortless luxury.',
      description: 'The pride of Karnataka silk heritage. Made from authentic high-twist mulberry crepe silk threads with certified pure gold zari borders that glide like water over the silhouette.',
      category_slug: 'silk-sarees',
      fabric: 'Pure Mysore Crepe Silk',
      occasion: 'Workwear',
      pattern: 'Kasuti Gold Border',
      price: 9499,
      mrp: 13999,
      discount_percent: 32,
      rating: 4.86,
      review_count: 73,
      stock_quantity: 20,
      sku: 'PAL-MYS-019',
      is_featured: 1,
      is_new_arrival: 0,
      is_best_seller: 1,
      color_name: 'Turmeric Saffron Gold',
      color_hex: '#E09F3E',
      images: [
        '/images/sarees/chanderi_tissue.jpg',
        '/images/categories/silk.jpg'
      ],
      variants: [
        { color_name: 'Turmeric Saffron Gold', color_hex: '#E09F3E', stock: 12, sku: 'PAL-MYS-019-SF' },
        { color_name: 'Rani Rose Pink', color_hex: '#C0386B', stock: 8, sku: 'PAL-MYS-019-PK' }
      ]
    },
    {
      name: 'Zohra Pearl White Hand-Painted Botanical Organza Saree',
      slug: 'zohra-pearl-white-hand-painted-botanical-organza-saree',
      tagline: 'Artisanal watercolor botanical florals on translucent pure silk organza.',
      short_desc: 'Ethereal pearl white organza saree hand-painted by master Kalamkari artists.',
      description: 'A canvas of floral poetry. Crafted from whisper-light translucent silk organza, hand-painted with pastel watercolor peonies and finished with a delicate micro-pearl scalloped border.',
      category_slug: 'organza-sarees',
      fabric: 'Pure Silk Organza',
      occasion: 'Party',
      pattern: 'Hand Painted Watercolor Florals',
      price: 5899,
      mrp: 8999,
      discount_percent: 34,
      rating: 4.79,
      review_count: 44,
      stock_quantity: 18,
      sku: 'PAL-ORG-020',
      is_featured: 0,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Pearl White Flora',
      color_hex: '#FAF9F6',
      images: [
        '/images/sarees/organza_rose.jpg',
        '/images/categories/organza.jpg'
      ],
      variants: [
        { color_name: 'Pearl White Flora', color_hex: '#FAF9F6', stock: 10, sku: 'PAL-ORG-020-PW' },
        { color_name: 'Powder Sky Blue', color_hex: '#A0C4E2', stock: 8, sku: 'PAL-ORG-020-BL' }
      ]
    },
    {
      name: 'Kutch Organic Handspun Linen Zari Saree',
      slug: 'kutch-organic-handspun-linen-zari-saree',
      tagline: 'Organic 80-lea Belgian flax linen hand-spun in Kutch with silver tissue pallu.',
      short_desc: 'Textured earthy luxury linen saree tailored for breathable all-day summer grace.',
      description: 'Crafted from 100% organic long-staple linen yarn. Breathable, sweat-wicking, and naturally structured, finished with delicate silver zari temple border and tassels.',
      category_slug: 'cotton-sarees',
      fabric: 'Organic Pure Linen',
      occasion: 'Workwear',
      pattern: 'Handspun Textured Zari Border',
      price: 2999,
      mrp: 4499,
      discount_percent: 33,
      rating: 4.74,
      review_count: 65,
      stock_quantity: 25,
      sku: 'PAL-COT-021',
      is_featured: 0,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Natural Sand Beige',
      color_hex: '#D8C3A5',
      images: [
        '/images/sarees/cotton_mulmul.jpg',
        '/images/categories/cotton.jpg'
      ],
      variants: [
        { color_name: 'Natural Sand Beige', color_hex: '#D8C3A5', stock: 15, sku: 'PAL-COT-021-BG' },
        { color_name: 'Sage Olive Green', color_hex: '#8D99AE', stock: 10, sku: 'PAL-COT-021-OL' }
      ]
    },
    {
      name: 'Alizeh Shimmer Metallic Pre-Pleated Cocktail Saree',
      slug: 'alizeh-shimmer-metallic-pre-pleated-cocktail-saree',
      tagline: 'Modern 1-minute ready-to-wear pre-draped silhouette in radiant metallic bronze.',
      short_desc: 'Glamorous pre-pleated designer saree with embellished designer belt for cocktail evenings.',
      description: 'Slip into red-carpet elegance in 60 seconds. Featuring precision factory-stitched pleats, high-shimmer micro-lamé fabric, and an embroidered crystal belt piece.',
      category_slug: 'designer-sarees',
      fabric: 'Metallic Lurex Shimmer',
      occasion: 'Party',
      pattern: 'Pre-Pleated Ready to Wear',
      price: 5999,
      mrp: 8999,
      discount_percent: 33,
      rating: 4.85,
      review_count: 59,
      stock_quantity: 20,
      sku: 'PAL-DES-022',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 1,
      color_name: 'Metallic Bronze Gold',
      color_hex: '#8C6239',
      images: [
        '/images/sarees/designer_marigold.jpg',
        '/images/categories/designer.jpg'
      ],
      variants: [
        { color_name: 'Metallic Bronze Gold', color_hex: '#8C6239', stock: 12, sku: 'PAL-DES-022-BZ' },
        { color_name: 'Platinum Silver', color_hex: '#C0C0C0', stock: 8, sku: 'PAL-DES-022-PL' }
      ]
    },
    {
      name: 'Shimmer Crimson Wine Georgette Ruffle Saree',
      slug: 'shimmer-crimson-wine-georgette-ruffle-saree',
      tagline: 'Tiered multi-layer organza ruffles along the pallu and border for evening flair.',
      short_desc: 'Modern Bollywood-style ruffle saree in rich crimson wine red with mirror belt.',
      description: 'Designed for sangeet nights and reception parties. The tiered ruffles add dramatic movement to every step, crafted from fluid 60g georgette with a matching unstitched blouse piece.',
      category_slug: 'party-wear',
      fabric: 'Fluid Georgette & Organza Ruffle',
      occasion: 'Party',
      pattern: 'Tiered Ruffle Border',
      price: 5199,
      mrp: 7799,
      discount_percent: 33,
      rating: 4.8,
      review_count: 70,
      stock_quantity: 22,
      sku: 'PAL-DES-023',
      is_featured: 0,
      is_new_arrival: 1,
      is_best_seller: 0,
      color_name: 'Crimson Wine Red',
      color_hex: '#5B1425',
      images: [
        '/images/sarees/designer_black.jpg',
        '/images/categories/partywear.jpg'
      ],
      variants: [
        { color_name: 'Crimson Wine Red', color_hex: '#5B1425', stock: 14, sku: 'PAL-DES-023-CR' },
        { color_name: 'Emerald Green', color_hex: '#0D4734', stock: 8, sku: 'PAL-DES-023-EM' }
      ]
    },
    {
      name: 'Jahanara Royal Velvet Zardozi Bridal Masterpiece',
      slug: 'jahanara-royal-velvet-zardozi-bridal-masterpiece',
      tagline: 'Plush mulberry silk velvet with real bullion zardozi and dabka hand embroidery.',
      short_desc: 'Heirloom winter wedding bridal saree in imperial maroon velvet with heavy zardozi border.',
      description: 'Fit for Mughal queens. Made from rich 9000-grade micro-velvet, embellished by master zardozi craftsmen in Lucknow using gold bullion coils, dabka, and Swarovski crystals over 120 artisan hours.',
      category_slug: 'bridal-collection',
      fabric: 'Royal Micro-Velvet & Mulberry Silk',
      occasion: 'Wedding',
      pattern: 'Handcrafted Zardozi & Dabka Weave',
      price: 25499,
      mrp: 37999,
      discount_percent: 33,
      rating: 5.0,
      review_count: 28,
      stock_quantity: 5,
      sku: 'PAL-BRI-024',
      is_featured: 1,
      is_new_arrival: 1,
      is_best_seller: 1,
      color_name: 'Imperial Maroon Velvet',
      color_hex: '#4A0E17',
      images: [
        '/images/sarees/velvet_zardozi.jpg',
        '/images/sarees/velvet_zardozi_detail.jpg'
      ],
      variants: [
        { color_name: 'Imperial Maroon Velvet', color_hex: '#4A0E17', stock: 3, sku: 'PAL-BRI-024-MR' },
        { color_name: 'Plum Aubergine', color_hex: '#3D1331', stock: 2, sku: 'PAL-BRI-024-PL' }
      ]
    }
  ];

  const productMap = {};
  for (const prod of productsData) {
    const categoryId = categoryMap[prod.category_slug] || 1;
    const res = insertProduct.run(
      prod.name,
      prod.slug,
      prod.tagline,
      prod.description,
      prod.short_desc,
      categoryId,
      prod.fabric,
      prod.occasion,
      prod.pattern,
      prod.saree_length || '5.5 Meters',
      prod.blouse_length || '0.8 Meter Unstitched Piece Included',
      prod.care_instructions || 'Dry Clean Only. Store wrapped in muslin cloth.',
      prod.price,
      prod.mrp,
      prod.discount_percent,
      prod.rating,
      prod.review_count,
      prod.stock_quantity,
      prod.sku,
      prod.is_featured,
      prod.is_new_arrival,
      prod.is_best_seller,
      prod.color_name,
      prod.color_hex
    );
    const prodId = res.lastInsertRowid;
    productMap[prod.slug] = prodId;

    // Insert Images
    prod.images.forEach((imgUrl, idx) => {
      insertImage.run(prodId, imgUrl, idx === 0 ? 1 : 0, idx + 1);
    });

    // Insert Variants
    prod.variants.forEach((v) => {
      insertVariant.run(prodId, v.color_name, v.color_hex, v.stock, v.sku);
    });
  }

  // 5. Seed Reviews
  const insertReview = db.prepare(`
    INSERT INTO reviews (product_id, user_id, user_name, rating, title, comment, verified_purchase)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const reviewsData = [
    {
      product_slug: 'royal-crimson-banarasi-katan-silk-saree',
      user_id: user1Result.lastInsertRowid,
      user_name: 'Priya Sharma',
      rating: 5,
      title: 'Breathtaking quality & royal packaging!',
      comment: 'I ordered this for my sister’s wedding reception. The moment I unboxed it, the scent of fresh silk and the soft glow of the antique gold zari took my breath away. It draped like a dream all evening without feeling stiff. PALLUVO is now my go-to saree brand!',
      verified_purchase: 1
    },
    {
      product_slug: 'royal-crimson-banarasi-katan-silk-saree',
      user_id: user2Result.lastInsertRowid,
      user_name: 'Ananya Iyer',
      rating: 5,
      title: 'Worth every rupee. Pure heritage.',
      comment: 'The weave quality is immaculate. True Varanasi handloom feel with a heavy pallu that stays put. The blouse piece included had ample fabric for custom embroidery. Highly recommend!',
      verified_purchase: 1
    },
    {
      product_slug: 'vaidarbhi-pure-kanjivaram-bridal-gold-silk-saree',
      user_id: user1Result.lastInsertRowid,
      user_name: 'Divya Venkat',
      rating: 5,
      title: 'Grandest bridal saree in my trousseau',
      comment: 'The gold luster on this Kanjivaram is unmatched. Wore it for my muhurtham ceremony and received countless compliments from all elders. Seamless delivery in Bengaluru within 2 days.',
      verified_purchase: 1
    },
    {
      product_slug: 'noor-rose-gold-embroidered-organza-saree',
      user_id: user2Result.lastInsertRowid,
      user_name: 'Kritika Roy',
      rating: 5,
      title: 'Ethereal drape and featherlight weight',
      comment: 'Organza sarees can sometimes be stiff, but this one is incredibly soft and drapes cleanly. The rose gold scalloped embroidery is so delicate and photogenic.',
      verified_purchase: 1
    },
    {
      product_slug: 'midnight-velvet-sequined-cocktail-saree',
      user_id: user1Result.lastInsertRowid,
      user_name: 'Rhea Kapoor',
      rating: 5,
      title: 'Showstopper for evening parties',
      comment: 'Gave a Bollywood red carpet vibe! The sequins do not poke or snag, and the velvet edge gives it a very structured fall. Paired with a sleeveless blouse, it looked stellar.',
      verified_purchase: 1
    }
  ];

  for (const rev of reviewsData) {
    const prodId = productMap[rev.product_slug];
    if (prodId) {
      insertReview.run(prodId, rev.user_id, rev.user_name, rev.rating, rev.title, rev.comment, rev.verified_purchase);
    }
  }

  // 6. Seed Coupons
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (code, title, description, discount_percent, max_discount_amount, min_order_amount, expiry_date, usage_limit, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const couponsData = [
    {
      code: 'WELCOME10',
      title: 'Welcome to PALLUVO',
      description: 'Flat 10% OFF on your first luxury drape purchase.',
      discount_percent: 10,
      max_discount_amount: 1500,
      min_order_amount: 1999,
      expiry_date: '2027-12-31',
      usage_limit: 5000,
      is_active: 1
    },
    {
      code: 'FESTIVE20',
      title: 'Festive Radiance Offer',
      description: 'Flat 20% OFF on Festive & Wedding Collections above ₹4,999.',
      discount_percent: 20,
      max_discount_amount: 3000,
      min_order_amount: 4999,
      expiry_date: '2027-12-31',
      usage_limit: 1000,
      is_active: 1
    },
    {
      code: 'MAGIC15',
      title: 'Drape Magic Special',
      description: 'Flat 15% OFF across all handloom and silk collections.',
      discount_percent: 15,
      max_discount_amount: 2500,
      min_order_amount: 2999,
      expiry_date: '2027-12-31',
      usage_limit: 2000,
      is_active: 1
    },
    {
      code: 'BRIDAL500',
      title: 'Bridal Trousseau Privilage',
      description: 'Flat ₹500 OFF extra on purchases above ₹9,999.',
      discount_percent: 5,
      max_discount_amount: 2000,
      min_order_amount: 9999,
      expiry_date: '2027-12-31',
      usage_limit: 1000,
      is_active: 1
    }
  ];

  for (const c of couponsData) {
    insertCoupon.run(c.code, c.title, c.description, c.discount_percent, c.max_discount_amount, c.min_order_amount, c.expiry_date, c.usage_limit, c.is_active);
  }

  // 7. Seed Sample Orders for Priya Sharma
  const insertOrder = db.prepare(`
    INSERT INTO orders (
      order_number, user_id, address_data, subtotal, discount_amount, coupon_code,
      delivery_fee, tax_amount, total_amount, status, payment_status, payment_method,
      razorpay_order_id, razorpay_payment_id, tracking_number, courier_partner, estimated_delivery, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, variant_name, color_hex, price, quantity, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertPayment = db.prepare(`
    INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Sample Order 1: Shipped
  const order1Address = JSON.stringify({
    name: 'Priya Sharma',
    phone: '+91 98123 45678',
    pincode: '560001',
    house_flat: 'Flat 402, Royal Palms Residency',
    area: 'Lavelle Road, Shanthala Nagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    landmark: 'Near UB City Mall'
  });

  const order1Res = insertOrder.run(
    'PAL-2026-98124',
    user1Result.lastInsertRowid,
    order1Address,
    12999,
    1299,
    'WELCOME10',
    0,
    0,
    11700,
    'Shipped',
    'Paid',
    'Razorpay (UPI / GooglePay)',
    'order_PAL_seed_001',
    'pay_PAL_seed_001',
    'BLR-BD-889921',
    'BlueDart Luxury Express',
    'Tomorrow, by 4:00 PM',
    '2026-09-22 14:30:00'
  );

  insertOrderItem.run(
    order1Res.lastInsertRowid,
    productMap['royal-crimson-banarasi-katan-silk-saree'],
    'Royal Crimson Banarasi Katan Silk Saree',
    'Royal Crimson Wine',
    '#5B1425',
    12999,
    1,
    '/images/categories/banarasi.jpg'
  );

  insertPayment.run(
    order1Res.lastInsertRowid,
    'order_PAL_seed_001',
    'pay_PAL_seed_001',
    'mock_verified_signature_001',
    1170000,
    'INR',
    'Captured',
    'UPI'
  );

  // 8. Seed Product Questions & Answers (Q&A)
  try {
    db.exec(`DELETE FROM product_qa;`);
    const insertQA = db.prepare(`
      INSERT INTO product_qa (product_id, user_name, question, answer, answered_by, helpful_votes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const qas = [
      {
        slug: 'royal-crimson-banarasi-katan-silk-saree',
        user_name: 'Meera Deshmukh',
        question: 'Is this 100% pure silk and does it come with a Silk Mark certification tag?',
        answer: 'Namaste Meera! Yes, all PALLUVO Katan Silk Sarees are 100% pure mulberry silk authenticated with the official Silk Mark Organization of India tag attached with tamper-proof seal.',
        answered_by: 'PALLUVO Master Weaver Concierge',
        helpful_votes: 28
      },
      {
        slug: 'royal-crimson-banarasi-katan-silk-saree',
        user_name: 'Sneha Kulkarni',
        question: 'Does the blouse piece match the body or the pallu?',
        answer: 'It includes an unstitched 0.8 meter pure katan silk blouse piece matching the royal crimson body with an intricate antique gold zari border for the sleeves and back neck.',
        answered_by: 'PALLUVO Master Weaver Concierge',
        helpful_votes: 19
      },
      {
        slug: 'vaidarbhi-pure-kanjivaram-bridal-gold-silk-saree',
        user_name: 'Kavitha R.',
        question: 'What is the approximate weight of this bridal Kanjivaram saree?',
        answer: 'This heirloom piece weighs approximately 850 - 920 grams owing to its heavy 3-ply pure mulberry silk yarn and rich gold-dipped silver zari korvai border.',
        answered_by: 'PALLUVO Master Weaver Concierge',
        helpful_votes: 35
      },
      {
        slug: 'noor-rose-gold-embroidered-organza-saree',
        user_name: 'Tanvi Agarwal',
        question: 'Is the organza fabric scratchy or stiff on sensitive skin?',
        answer: 'Not at all! We use whisper-soft, high-grade silk organza that has a fluid drape and featherlight touch, carefully treated to remain soft and non-irritating.',
        answered_by: 'PALLUVO Master Weaver Concierge',
        helpful_votes: 14
      },
      {
        slug: 'midnight-velvet-sequined-cocktail-saree',
        user_name: 'Pooja Malhotra',
        question: 'Are fall and pico pre-stitched on this saree?',
        answer: 'Yes! All PALLUVO ready-to-wear sarees come complimentary with high-grade micro-cotton fall and precision laser pico pre-done at no extra charge.',
        answered_by: 'PALLUVO Master Weaver Concierge',
        helpful_votes: 42
      }
    ];

    for (const q of qas) {
      const prodId = productMap[q.slug];
      if (prodId) {
        insertQA.run(prodId, q.user_name, q.question, q.answer, q.answered_by, q.helpful_votes);
      }
    }
  } catch (e) {
    console.error('QA seed note:', e.message);
  }

  console.log('--- PALLUVO Database Seeding Completed Successfully! ---');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
