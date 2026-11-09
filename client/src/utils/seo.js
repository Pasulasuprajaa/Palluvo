const BASE_URL = 'https://palluvo.com';
const DEFAULT_IMAGE = `${BASE_URL}/images/occasions/wedding_collection.jpg`;

function setMetaTag(attribute, value, content) {
  let element = document.querySelector(`meta[${attribute}="${value}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, value);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonicalUrl(url) {
  let link = document.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', url);
}

export const CATEGORY_CATALOG = {
  'banarasi-sarees': {
    name: 'Banarasi Sarees',
    description: 'Timeless Varanasi heritage woven with pure gold and silver zari on luscious mulberry silk.',
    image_url: '/images/categories/banarasi.jpg'
  },
  'kanjivaram-sarees': {
    name: 'Kanjivaram Sarees',
    description: 'Royal temple borders and rich korvai weaving from the ancient holy town of Kanchipuram.',
    image_url: '/images/categories/kanjivaram.jpg'
  },
  'silk-sarees': {
    name: 'Silk Sarees',
    description: 'Lustrous mulberry, raw tussar, chanderi, and tissue silk weaves for regal occasions.',
    image_url: '/images/categories/silk.jpg'
  },
  'organza-sarees': {
    name: 'Organza Sarees',
    description: 'Whisper-light translucent drapes adorned with delicate floral hand embroidery and scalloped borders.',
    image_url: '/images/categories/organza.jpg'
  },
  'cotton-sarees': {
    name: 'Cotton & Handloom',
    description: 'Breathable handcrafted mulmul, linen, and jamdani sarees for breezy effortless grace.',
    image_url: '/images/categories/cotton.jpg'
  },
  'designer-sarees': {
    name: 'Designer Sarees',
    description: 'Contemporary silhouettes, sequins, metallic sheen, and modern cocktail drapes.',
    image_url: '/images/categories/designer.jpg'
  },
  'party-wear': {
    name: 'Party Wear',
    description: 'Glamorous shimmer georgettes, velvet trims, and pre-draped luxury for evening celebrations.',
    image_url: '/images/categories/partywear.jpg'
  },
  'bridal-collection': {
    name: 'Bridal Collection',
    description: 'Heirloom trousseau masterworks handcrafted for weddings and lifetime memories.',
    image_url: '/images/categories/bridal.jpg'
  }
};

export function getCategoryRecord(slugOrAlias) {
  if (!slugOrAlias) return null;
  const key = String(slugOrAlias).toLowerCase().trim();
  if (CATEGORY_CATALOG[key]) return CATEGORY_CATALOG[key];
  if (CATEGORY_CATALOG[`${key}-sarees`]) return CATEGORY_CATALOG[`${key}-sarees`];
  if (key === 'bridal' || key === 'wedding') return CATEGORY_CATALOG['bridal-collection'];
  return null;
}

export function formatCategoryTitle(slug) {
  const cat = getCategoryRecord(slug);
  if (cat) return cat.name;
  if (!slug) return 'Luxury Saree Collection';
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function toAbsoluteUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return DEFAULT_IMAGE;
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    return rawUrl;
  }
  const cleanPath = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
  return `${BASE_URL}${cleanPath}`;
}

export function updatePageMeta(page, params = {}) {
  let title = 'PALLUVO | Luxury Indian Sarees & Fashion — Every drape, a little magic';
  let description = 'Discover pure Banarasi, Kanjivaram, Chanderi, and designer silk sarees handwoven for weddings, festivals, and unforgettable occasions.';
  let url = `${BASE_URL}/`;
  let image = DEFAULT_IMAGE;
  let imageAlt = 'PALLUVO Luxury Indian Handloom Sarees Collection';

  if (params.image || params.primary_image) {
    image = toAbsoluteUrl(params.image || params.primary_image);
  }

  if (page === 'shop') {
    const rawCategory = params.category || '';
    const catRecord = getCategoryRecord(rawCategory);
    if (catRecord) {
      title = `${catRecord.name} Collection | PALLUVO`;
      description = catRecord.description || `Explore authentic ${catRecord.name} handcrafted by master weavers across India.`;
      url = `${BASE_URL}/sarees?category=${encodeURIComponent(rawCategory)}`;
      image = toAbsoluteUrl(catRecord.image_url);
      imageAlt = `${catRecord.name} - Luxury Handloom Sarees | PALLUVO`;
    } else if (rawCategory) {
      const categoryName = formatCategoryTitle(rawCategory);
      title = `${categoryName} | PALLUVO Luxury Sarees`;
      description = `Browse authentic handcrafted Indian sarees in our ${categoryName} edit. Curated luxury drapes with insured nationwide delivery.`;
      url = `${BASE_URL}/sarees?category=${encodeURIComponent(rawCategory)}`;
    } else {
      title = 'Explore Luxury Handloom Sarees | PALLUVO';
      description = 'Browse authentic handcrafted Indian sarees. Curated luxury drapes with insured nationwide delivery.';
      url = `${BASE_URL}/sarees`;
    }
  } else if (page === 'product' && (params.slug || params.product)) {
    const rawSlug = params.slug || params.product?.slug || '';
    const formattedName = (params.name || params.product?.name || rawSlug)
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
    title = `${formattedName} | PALLUVO`;
    description = params.description || params.product?.short_desc || params.product?.tagline || `Shop authentic ${formattedName}. Handcrafted by master artisans with signature detailing and insured delivery.`;
    url = `${BASE_URL}/sarees/${rawSlug}`;

    const productImage = params.image || params.primary_image || params.product?.primary_image || (params.product?.images && params.product.images[0]);
    if (productImage) {
      image = toAbsoluteUrl(productImage);
    }
    imageAlt = `${formattedName} - PALLUVO Luxury Handcrafted Saree`;
  } else if (page === 'cart') {
    title = 'Shopping Bag | PALLUVO';
    description = 'Review your curated luxury saree selections in your PALLUVO bag.';
    url = `${BASE_URL}/cart`;
  } else if (page === 'checkout') {
    title = 'Secure Checkout | PALLUVO';
    description = 'Complete your order with secure payments and express insured shipping.';
    url = `${BASE_URL}/checkout`;
  } else if (page === 'order-success') {
    title = 'Order Confirmed | PALLUVO';
    description = 'Thank you for your order with PALLUVO. Your heirloom drape is being prepared.';
    url = `${BASE_URL}/order-success`;
  } else if (page === 'track-order') {
    title = 'Track Your Order | PALLUVO';
    description = 'Live milestone tracking for your handcrafted PALLUVO saree shipment.';
    url = `${BASE_URL}/track-order`;
  } else if (page === 'account') {
    title = 'Customer Account | PALLUVO';
    description = 'Manage your PALLUVO profile, order history, and saved addresses.';
    url = `${BASE_URL}/account`;
  } else if (page === 'wishlist') {
    title = 'My Wishlist | PALLUVO';
    description = 'Your curated wishlist of luxury handloom sarees and festive drapes.';
    url = `${BASE_URL}/wishlist`;
  } else if (page === 'offers') {
    title = 'Exclusive Festive Offers & Promos | PALLUVO';
    description = 'Discover special festive curations and exclusive savings on heirloom sarees.';
    url = `${BASE_URL}/offers`;
  } else if (page === 'admin') {
    title = 'Admin Management Console | PALLUVO';
    description = 'PALLUVO administration portal for orders, inventory, and fulfillment.';
    url = `${BASE_URL}/admin`;
  } else if (page === 'about') {
    const tabName = params.tab === 'artisans'
      ? 'Artisans & Master Weavers'
      : params.tab === 'care'
      ? 'Saree Care Guide'
      : params.tab === 'sustainability'
      ? 'Sustainable Silk Pledge'
      : 'Handloom Heritage';
    title = `${tabName} | PALLUVO`;
    description = 'Learn about PALLUVO’s heritage weaving clusters across Varanasi, Kanchipuram, and Chanderi.';
    url = `${BASE_URL}/about${params.tab ? `?tab=${params.tab}` : ''}`;
  } else if (page === 'policy') {
    const tabName = params.tab === 'shipping'
      ? 'Shipping & Delivery Policy'
      : params.tab === 'refund'
      ? 'Returns & Exchanges Policy'
      : params.tab === 'terms'
      ? 'Terms of Service'
      : 'Privacy Policy';
    title = `${tabName} | PALLUVO`;
    description = 'Learn about PALLUVO’s transparent policies, 7-day returns, and insured delivery.';
    url = `${BASE_URL}/${params.tab || 'privacy'}`;
  } else if (page === 'not-found' || page === '404') {
    title = 'Page Not Found | PALLUVO Luxury Sarees';
    description = 'The requested luxury drape, collection, or boutique page could not be found.';
    url = `${BASE_URL}/404`;
  }

  // Set robots directive on every route update to reset properly when navigating away from transactional/noindex pages
  const isNoIndex = page === 'not-found' || page === '404' || page === 'admin' || page === 'cart' || page === 'checkout' || page === 'order-success' || page === 'track-order' || page === 'account' || page === 'wishlist';
  setMetaTag('name', 'robots', isNoIndex ? 'noindex, nofollow' : 'index, follow');

  // Update browser document title
  document.title = title;

  // Primary meta
  setMetaTag('name', 'title', title);
  setMetaTag('name', 'description', description);

  // Open Graph / Facebook
  setMetaTag('property', 'og:type', page === 'product' ? 'product' : 'website');
  setMetaTag('property', 'og:title', title);
  setMetaTag('property', 'og:description', description);
  setMetaTag('property', 'og:url', url);
  setMetaTag('property', 'og:image', image);
  setMetaTag('property', 'og:image:alt', imageAlt);

  // Twitter
  setMetaTag('name', 'twitter:title', title);
  setMetaTag('name', 'twitter:description', description);
  setMetaTag('name', 'twitter:url', url);
  setMetaTag('name', 'twitter:image', image);
  setMetaTag('name', 'twitter:image:alt', imageAlt);

  // Canonical Link
  setCanonicalUrl(url);

  // Manage JSON-LD Structured Data
  // Clear any existing application/ld+json script tags before updating
  if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
    const existingLdScripts = document.querySelectorAll('script[type="application/ld+json"], script[data-schema="product-jsonld"]');
    if (existingLdScripts && typeof existingLdScripts.forEach === 'function') {
      existingLdScripts.forEach(el => {
        if (el && typeof el.remove === 'function') {
          el.remove();
        }
      });
    }
  }

  if (page === 'product' && (params.product || params.slug)) {
    const prod = params.product || {};
    const prodName = params.name || prod.name || 'PALLUVO Saree';

    const productSchema = {
      '@context': 'https://schema.org/',
      '@type': 'Product',
      name: prodName,
      image: [image],
      description: description,
      sku: prod.sku || `PAL-${prod.id || params.slug}`,
      brand: {
        '@type': 'Brand',
        name: 'PALLUVO'
      }
    };

    // Only emit offers when price is verified and > 0
    const rawPrice = prod.price !== undefined ? prod.price : (prod.offers && prod.offers.price);
    const numericPrice = typeof rawPrice === 'number' ? rawPrice : parseFloat(rawPrice);
    if (!isNaN(numericPrice) && numericPrice > 0) {
      const offer = {
        '@type': 'Offer',
        url: url,
        priceCurrency: 'INR',
        price: numericPrice,
        priceValidUntil: '2027-12-31',
        itemCondition: 'https://schema.org/NewCondition',
        seller: {
          '@type': 'Organization',
          name: 'PALLUVO'
        }
      };
      if (prod.stock_quantity !== undefined && prod.stock_quantity !== null) {
        const numericStock = typeof prod.stock_quantity === 'number' ? prod.stock_quantity : parseInt(prod.stock_quantity, 10);
        if (!isNaN(numericStock)) {
          offer.availability = numericStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock';
        }
      }
      productSchema.offers = offer;
    }

    // Only emit aggregateRating when BOTH rating and review count are verified and > 0
    const rawRating = prod.rating;
    const numericRating = typeof rawRating === 'number' ? rawRating : parseFloat(rawRating);
    const rawReviewCount = prod.review_count || prod.reviews_count;
    const numericReviewCount = typeof rawReviewCount === 'number' ? rawReviewCount : parseInt(rawReviewCount, 10);

    if (!isNaN(numericRating) && numericRating > 0 && !isNaN(numericReviewCount) && numericReviewCount > 0) {
      productSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: numericRating,
        reviewCount: numericReviewCount,
        bestRating: 5,
        worstRating: 1
      };
    }

    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
        { '@type': 'ListItem', position: 2, name: 'Sarees', item: `${BASE_URL}/sarees` },
        { '@type': 'ListItem', position: 3, name: prodName, item: url }
      ]
    };

    if (typeof document !== 'undefined' && typeof document.createElement === 'function' && document.head && typeof document.head.appendChild === 'function') {
      const ldJsonScript = document.createElement('script');
      ldJsonScript.setAttribute('type', 'application/ld+json');
      ldJsonScript.setAttribute('data-schema', 'product-jsonld');
      ldJsonScript.textContent = JSON.stringify([productSchema, breadcrumbSchema], null, 2);
      document.head.appendChild(ldJsonScript);
    }
  }
}
