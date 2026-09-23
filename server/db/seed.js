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
        '/images/categories/banarasi.jpg',
        '/images/occasions/wedding_edit.jpg',
        '/images/categories/bridal.jpg'
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
        '/images/categories/kanjivaram.jpg',
        '/images/occasions/wedding_edit.jpg',
        '/images/categories/banarasi.jpg'
      ],
      variants: [
        { color_name: 'Sunlit Ochre Gold', color_hex: '#C5A059', stock: 7, sku: 'PAL-KAN-002-GL' },
        { color_name: 'Sindoor Scarlet', color_hex: '#9E1B32', stock: 5, sku: 'PAL-KAN-002-SC' }
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
        '/images/categories/organza.jpg',
        '/images/categories/silk.jpg',
        '/images/categories/designer.jpg'
      ],
      variants: [
        { color_name: 'Blush Rose Gold', color_hex: '#E0B5B2', stock: 14, sku: 'PAL-ORG-003-BL' },
        { color_name: 'Pistachio Mint', color_hex: '#B2D8C8', stock: 10, sku: 'PAL-ORG-003-MN' }
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
        '/images/categories/organza.jpg'
      ],
      variants: [
        { color_name: 'Ivory Champagne', color_hex: '#F0E6D2', stock: 12, sku: 'PAL-CHA-004-IV' },
        { color_name: 'Soft Lavender', color_hex: '#C3B1E1', stock: 8, sku: 'PAL-CHA-004-LV' }
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
        '/images/categories/partywear.jpg',
        '/images/occasions/evening_glam.jpg'
      ],
      variants: [
        { color_name: 'Midnight Onyx Black', color_hex: '#161413', stock: 15, sku: 'PAL-DES-005-BK' },
        { color_name: 'Deep Sapphire Navy', color_hex: '#121F45', stock: 7, sku: 'PAL-DES-005-NV' }
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
        '/images/categories/silk.jpg'
      ],
      variants: [
        { color_name: 'Marigold Sunshine Yellow', color_hex: '#F2A900', stock: 10, sku: 'PAL-GOT-010-YL' },
        { color_name: 'Coral Papaya', color_hex: '#F06D53', stock: 9, sku: 'PAL-GOT-010-CR' }
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
        '/images/categories/cotton.jpg',
        '/images/categories/silk.jpg'
      ],
      variants: [
        { color_name: 'Indigo & Sage', color_hex: '#2B4263', stock: 20, sku: 'PAL-COT-007-IN' },
        { color_name: 'Madder Terra Cotta', color_hex: '#C05A46', stock: 15, sku: 'PAL-COT-007-TC' }
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
        '/images/categories/bridal.jpg',
        '/images/occasions/wedding_edit.jpg',
        '/images/categories/banarasi.jpg'
      ],
      variants: [
        { color_name: 'Deep Sindoor Crimson', color_hex: '#800C1F', stock: 5, sku: 'PAL-BRI-008-RD' },
        { color_name: 'Rani Magenta Pink', color_hex: '#981855', stock: 3, sku: 'PAL-BRI-008-PK' }
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

  console.log('--- PALLUVO Database Seeding Completed Successfully! ---');
}

if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;
