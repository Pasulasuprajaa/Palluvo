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

function formatCategoryTitle(slug) {
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
    const categoryName = params.category ? formatCategoryTitle(params.category) : null;
    title = categoryName
      ? `${categoryName} | PALLUVO Luxury Sarees`
      : 'Explore Luxury Handloom Sarees | PALLUVO';
    description = `Browse authentic handcrafted Indian sarees${categoryName ? ` in our ${categoryName} edit` : ''}. Curated luxury drapes with insured nationwide delivery.`;
    url = params.category
      ? `${BASE_URL}/sarees?category=${encodeURIComponent(params.category)}`
      : `${BASE_URL}/sarees`;
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

  // Set robots directive on every route update to reset properly when navigating away from 404
  const isNoIndex = page === 'not-found' || page === '404' || page === 'admin';
  setMetaTag('name', 'robots', isNoIndex ? 'noindex, nofollow' : 'index, follow');

  // Update browser document title
  document.title = title;

  // Primary meta
  setMetaTag('name', 'title', title);
  setMetaTag('name', 'description', description);

  // Open Graph / Facebook
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
}
