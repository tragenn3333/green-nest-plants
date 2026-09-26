const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAdmin } = require('../middleware/auth');
const upload = require('../middleware/upload');

// ---------- LOGIN ----------
router.get('/login', (req, res) => {
  if (req.session.adminId) return res.redirect('/admin/dashboard');
  res.render('admin/login', { error: null, pageTitle: 'Admin Login' });
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
  if (!admin || !bcrypt.compareSync(password, admin.password_hash)) {
    return res.render('admin/login', { error: 'Invalid username or password', pageTitle: 'Admin Login' });
  }
  req.session.adminId = admin.id;
  req.session.username = admin.username;
  res.redirect('/admin/dashboard');
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ---------- DASHBOARD ----------
router.get('/dashboard', requireAdmin, (req, res) => {
  const productCount = db.prepare('SELECT COUNT(*) c FROM products').get().c;
  const orderCount = db.prepare('SELECT COUNT(*) c FROM orders').get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) c FROM orders WHERE order_status != 'delivered'").get().c;
  const revenue = db.prepare("SELECT COALESCE(SUM(grand_total),0) t FROM orders WHERE payment_status IN ('paid','cod')").get().t;
  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 8').all();
  res.render('admin/dashboard', {
    username: req.session.username,
    productCount, orderCount, pendingOrders, revenue, recentOrders,
    pageTitle: 'Admin Dashboard'
  });
});

// ---------- PRODUCTS ----------
router.get('/products', requireAdmin, (req, res) => {
  const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.render('admin/products', { username: req.session.username, products, categories, pageTitle: 'Manage Products' });
});

router.post('/products', requireAdmin, upload.single('image'), (req, res) => {
  const { name, category, description, price, stock } = req.body;
  const image = req.file ? '/uploads/' + req.file.filename : '/uploads/default-plant.svg';
  db.prepare(`INSERT INTO products (name, category, description, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(name, category, description, parseFloat(price) || 0, parseInt(stock) || 0, image);
  res.redirect('/admin/products');
});

router.post('/products/:id/update', requireAdmin, upload.single('image'), (req, res) => {
  const { name, category, description, price, stock, is_active } = req.body;
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
  if (!existing) return res.redirect('/admin/products');
  const image = req.file ? '/uploads/' + req.file.filename : existing.image;
  db.prepare(`UPDATE products SET name=?, category=?, description=?, price=?, stock=?, image=?, is_active=? WHERE id=?`)
    .run(name, category, description, parseFloat(price) || 0, parseInt(stock) || 0, image, is_active ? 1 : 0, req.params.id);
  res.redirect('/admin/products');
});

router.post('/products/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.redirect('/admin/products');
});

// ---------- CATEGORIES ----------
router.post('/categories', requireAdmin, (req, res) => {
  const { name } = req.body;
  if (name && name.trim()) {
    try { db.prepare('INSERT INTO categories (name) VALUES (?)').run(name.trim()); } catch (e) {}
  }
  res.redirect('/admin/products');
});

// ---------- LOCATIONS / CHARGES ----------
router.get('/locations', requireAdmin, (req, res) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY city, area').all();
  res.render('admin/locations', { username: req.session.username, locations, pageTitle: 'Manage Delivery & Plantation Charges' });
});

router.post('/locations', requireAdmin, (req, res) => {
  const { city, area, delivery_charge, plantation_charge, same_day_available, notes } = req.body;
  db.prepare(`INSERT INTO locations (city, area, delivery_charge, plantation_charge, same_day_available, notes) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(city, area, parseFloat(delivery_charge) || 0, parseFloat(plantation_charge) || 0, same_day_available ? 1 : 0, notes || '');
  res.redirect('/admin/locations');
});

router.post('/locations/:id/update', requireAdmin, (req, res) => {
  const { city, area, delivery_charge, plantation_charge, same_day_available, notes, is_active } = req.body;
  db.prepare(`UPDATE locations SET city=?, area=?, delivery_charge=?, plantation_charge=?, same_day_available=?, notes=?, is_active=? WHERE id=?`)
    .run(city, area, parseFloat(delivery_charge) || 0, parseFloat(plantation_charge) || 0, same_day_available ? 1 : 0, notes || '', is_active ? 1 : 0, req.params.id);
  res.redirect('/admin/locations');
});

router.post('/locations/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM locations WHERE id = ?').run(req.params.id);
  res.redirect('/admin/locations');
});

// ---------- DELIVERY PARTNERS ----------
router.get('/delivery-partners', requireAdmin, (req, res) => {
  const partners = db.prepare('SELECT * FROM delivery_partners ORDER BY created_at DESC').all();
  res.render('admin/delivery-partners', { username: req.session.username, partners, pageTitle: 'Delivery Partners' });
});

router.post('/delivery-partners', requireAdmin, (req, res) => {
  const { name, partner_type, contact_number, email, api_key, coverage_area } = req.body;
  db.prepare(`INSERT INTO delivery_partners (name, partner_type, contact_number, email, api_key, coverage_area) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(name, partner_type, contact_number, email, api_key, coverage_area);
  res.redirect('/admin/delivery-partners');
});

router.post('/delivery-partners/:id/update', requireAdmin, (req, res) => {
  const { name, partner_type, contact_number, email, api_key, coverage_area, status } = req.body;
  db.prepare(`UPDATE delivery_partners SET name=?, partner_type=?, contact_number=?, email=?, api_key=?, coverage_area=?, status=? WHERE id=?`)
    .run(name, partner_type, contact_number, email, api_key, coverage_area, status, req.params.id);
  res.redirect('/admin/delivery-partners');
});

router.post('/delivery-partners/:id/delete', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM delivery_partners WHERE id = ?').run(req.params.id);
  res.redirect('/admin/delivery-partners');
});

// ---------- ORDERS ----------
router.get('/orders', requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  const partners = db.prepare("SELECT * FROM delivery_partners WHERE status = 'active'").all();
  const locations = db.prepare('SELECT * FROM locations').all();
  const locationMap = {};
  locations.forEach(l => locationMap[l.id] = l);
  res.render('admin/orders', { username: req.session.username, orders, partners, locationMap, pageTitle: 'Orders' });
});

router.post('/orders/:id/assign', requireAdmin, (req, res) => {
  const { partner_id } = req.body;
  db.prepare('UPDATE orders SET assigned_partner_id = ? WHERE id = ?').run(partner_id, req.params.id);
  res.redirect('/admin/orders');
});

router.post('/orders/:id/status', requireAdmin, (req, res) => {
  const { order_status } = req.body;
  db.prepare('UPDATE orders SET order_status = ? WHERE id = ?').run(order_status, req.params.id);
  res.redirect('/admin/orders');
});

// ---------- SITE SETTINGS ----------
router.get('/settings', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT * FROM site_settings').all();
  const settings = {};
  rows.forEach(r => settings[r.key] = r.value);
  res.render('admin/settings', { username: req.session.username, settings, pageTitle: 'Site Settings' });
});

router.post('/settings', requireAdmin, (req, res) => {
  const upsert = db.prepare(`INSERT INTO site_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value`);
  Object.entries(req.body).forEach(([k, v]) => upsert.run(k, v));
  res.redirect('/admin/settings');
});

// ---------- CHANGE PASSWORD ----------
router.post('/change-password', requireAdmin, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);
  if (!bcrypt.compareSync(currentPassword, admin.password_hash)) {
    return res.redirect('/admin/settings?error=wrongpassword');
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE admins SET password_hash = ? WHERE id = ?').run(newHash, req.session.adminId);
  res.redirect('/admin/settings');
});

module.exports = router;
