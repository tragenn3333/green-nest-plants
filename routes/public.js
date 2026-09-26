const express = require('express');
const router = express.Router();
const db = require('../db/database');

function getSettings() {
  const rows = db.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  return settings;
}

// ---------- HOME ----------
router.get('/', (req, res) => {
  const featured = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC LIMIT 8').all();
  const locations = db.prepare('SELECT * FROM locations WHERE is_active = 1').all();
  res.render('home', {
    settings: getSettings(),
    featured,
    locations,
    pageTitle: 'Green Nest Plants | Online Plant Nursery & Plantation Service in Lucknow',
    metaDescription: 'Buy indoor, outdoor, flowering & fruit plants online in Lucknow, Kakori, Malihabad and Maal. Home plantation service and doorstep delivery across Uttar Pradesh.'
  });
});

// ---------- PRODUCT LISTING ----------
router.get('/plants', (req, res) => {
  const { category, search } = req.query;
  let query = 'SELECT * FROM products WHERE is_active = 1';
  const params = [];
  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND name LIKE ?';
    params.push('%' + search + '%');
  }
  query += ' ORDER BY created_at DESC';
  const products = db.prepare(query).all(...params);
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.render('plants', {
    settings: getSettings(),
    products,
    categories,
    activeCategory: category || '',
    search: search || '',
    pageTitle: 'Buy Plants Online in Lucknow | Indoor, Outdoor & Fruit Plants - Green Nest Plants',
    metaDescription: 'Shop a wide variety of plants online with delivery across Lucknow, Kakori, Malihabad and Maal, Uttar Pradesh.'
  });
});

// ---------- PRODUCT DETAIL ----------
router.get('/plants/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!product) return res.status(404).render('404', { settings: getSettings(), pageTitle: 'Plant Not Found' });
  const related = db.prepare('SELECT * FROM products WHERE category = ? AND id != ? AND is_active = 1 LIMIT 4').all(product.category, product.id);
  const locations = db.prepare('SELECT * FROM locations WHERE is_active = 1').all();
  res.render('product-detail', {
    settings: getSettings(),
    product,
    related,
    locations,
    pageTitle: `${product.name} - Buy Online in Lucknow | Green Nest Plants`,
    metaDescription: `Buy ${product.name} online. Home delivery and plantation service available across Lucknow, Kakori, Malihabad and Maal.`
  });
});

// ---------- SERVICES (Delivery + Plantation charges) ----------
router.get('/services', (req, res) => {
  const locations = db.prepare('SELECT * FROM locations WHERE is_active = 1 ORDER BY city, area').all();
  res.render('services', {
    settings: getSettings(),
    locations,
    pageTitle: 'Plant Delivery & Plantation Service Charges in Lucknow, Kakori, Malihabad, Maal',
    metaDescription: 'Check plant delivery charges and professional plantation service charges for Lucknow, Kakori, Malihabad, Maal and other parts of Uttar Pradesh.'
  });
});

// ---------- SEO CITY / AREA LANDING PAGES ----------
router.get('/locations/:area', (req, res) => {
  const areaSlug = req.params.area.toLowerCase();
  const location = db.prepare('SELECT * FROM locations WHERE is_active = 1 AND LOWER(area) = ?').get(areaSlug.replace(/-/g, ' '));
  if (!location) return res.status(404).render('404', { settings: getSettings(), pageTitle: 'Location Not Found' });
  const featured = db.prepare('SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC LIMIT 6').all();
  res.render('location-landing', {
    settings: getSettings(),
    location,
    featured,
    pageTitle: `Plant Nursery & Delivery in ${location.area}, ${location.city} | Green Nest Plants`,
    metaDescription: `Order plants online with doorstep delivery in ${location.area}, ${location.city}. Professional plantation service also available. Best plant nursery serving ${location.area}.`
  });
});

// ---------- CART & CHECKOUT (client-rendered, server validates on submit) ----------
router.get('/cart', (req, res) => {
  res.render('cart', {
    settings: getSettings(),
    pageTitle: 'Your Cart | Green Nest Plants',
    metaDescription: 'Review your plant order before checkout.'
  });
});

router.get('/checkout', (req, res) => {
  const locations = db.prepare('SELECT * FROM locations WHERE is_active = 1 ORDER BY city, area').all();
  res.render('checkout', {
    settings: getSettings(),
    locations,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || '',
    pageTitle: 'Checkout | Green Nest Plants',
    metaDescription: 'Secure checkout for your plant order.'
  });
});

router.get('/order-success/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
  if (!order) return res.status(404).render('404', { settings: getSettings(), pageTitle: 'Order Not Found' });
  res.render('order-success', {
    settings: getSettings(),
    order,
    pageTitle: 'Order Confirmed | Green Nest Plants',
    metaDescription: 'Your plant order has been placed successfully.'
  });
});

// ---------- SEO FILES ----------
router.get('/sitemap.xml', (req, res) => {
  const products = db.prepare('SELECT id FROM products WHERE is_active = 1').all();
  const locations = db.prepare('SELECT area FROM locations WHERE is_active = 1').all();
  const base = `${req.protocol}://${req.get('host')}`;
  let urls = [
    `${base}/`,
    `${base}/plants`,
    `${base}/services`
  ];
  products.forEach(p => urls.push(`${base}/plants/${p.id}`));
  locations.forEach(l => urls.push(`${base}/locations/${encodeURIComponent(l.area.toLowerCase().replace(/\s+/g, '-'))}`));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url><loc>${u}</loc></url>`).join('\n')}
</urlset>`;
  res.type('application/xml').send(xml);
});

router.get('/robots.txt', (req, res) => {
  const base = `${req.protocol}://${req.get('host')}`;
  res.type('text/plain').send(`User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${base}/sitemap.xml`);
});

module.exports = router;
