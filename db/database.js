const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const db = new Database(path.join(__dirname, 'greennest.db'));
db.pragma('journal_mode = WAL');

// ---------- SCHEMA ----------
db.exec(`
CREATE TABLE IF NOT EXISTS admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  image TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city TEXT NOT NULL,
  area TEXT NOT NULL,
  delivery_charge REAL NOT NULL DEFAULT 0,
  plantation_charge REAL NOT NULL DEFAULT 0,
  same_day_available INTEGER DEFAULT 0,
  notes TEXT,
  is_active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS delivery_partners (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  partner_type TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  api_key TEXT,
  coverage_area TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  location_id INTEGER,
  items_json TEXT NOT NULL,
  wants_plantation INTEGER DEFAULT 0,
  items_total REAL NOT NULL,
  delivery_charge REAL DEFAULT 0,
  plantation_charge REAL DEFAULT 0,
  grand_total REAL NOT NULL,
  payment_status TEXT DEFAULT 'pending',
  payment_id TEXT,
  razorpay_order_id TEXT,
  assigned_partner_id INTEGER,
  order_status TEXT DEFAULT 'placed',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
`);

// ---------- SEED (only if empty) ----------
const adminCount = db.prepare('SELECT COUNT(*) AS c FROM admins').get().c;
if (adminCount === 0) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('Seeded default admin -> username: admin | password: admin123 (CHANGE THIS IMMEDIATELY)');
}

const catCount = db.prepare('SELECT COUNT(*) AS c FROM categories').get().c;
if (catCount === 0) {
  const cats = ['Indoor Plants', 'Outdoor Plants', 'Flowering Plants', 'Fruit Plants', 'Succulents & Cacti', 'Air Purifying Plants', 'Bonsai', 'Seeds & Fertilizers'];
  const ins = db.prepare('INSERT INTO categories (name) VALUES (?)');
  cats.forEach(c => ins.run(c));
}

const productCount = db.prepare('SELECT COUNT(*) AS c FROM products').get().c;
if (productCount === 0) {
  const sample = [
    ['Money Plant (Golden Pothos)', 'Indoor Plants', 'Easy to grow indoor plant, purifies air and brings good luck. Ideal for home and office desks.', 149, 50],
    ['Snake Plant (Sansevieria)', 'Air Purifying Plants', 'Low maintenance, releases oxygen at night. Great for bedrooms.', 249, 40],
    ['Areca Palm', 'Indoor Plants', 'Popular air-purifying palm, adds a tropical look to any room.', 599, 25],
    ['Rose Plant (Mixed Colors)', 'Flowering Plants', 'Healthy rose sapling, blooms in 2-3 months with proper care.', 199, 60],
    ['Hibiscus Plant', 'Flowering Plants', 'Vibrant flowering shrub, great for Lucknow gardens and balconies.', 179, 45],
    ['Mango Plant (Grafted)', 'Fruit Plants', 'Grafted mango sapling, fruits within 2-3 years.', 399, 30],
    ['Lemon Plant', 'Fruit Plants', 'Grafted lemon plant, ideal for home gardens in UP climate.', 249, 35],
    ['Jade Plant', 'Succulents & Cacti', 'Succulent believed to bring prosperity, very low maintenance.', 129, 55],
    ['Aloe Vera', 'Succulents & Cacti', 'Medicinal plant, easy care, thrives in Lucknow weather.', 99, 70],
    ['Ficus Bonsai', 'Bonsai', 'Hand-trained bonsai, 3 years old, comes in ceramic pot.', 899, 12],
    ['Tulsi (Holy Basil)', 'Outdoor Plants', 'Sacred plant for every Indian household, easy to maintain.', 79, 100],
    ['Organic Vermicompost (5kg)', 'Seeds & Fertilizers', 'Nutrient-rich organic fertilizer for all plant types.', 249, 80]
  ];
  const ins = db.prepare('INSERT INTO products (name, category, description, price, stock, image) VALUES (?, ?, ?, ?, ?, ?)');
  sample.forEach(p => ins.run(p[0], p[1], p[2], p[3], p[4], '/uploads/default-plant.svg'));
}

const locCount = db.prepare('SELECT COUNT(*) AS c FROM locations').get().c;
if (locCount === 0) {
  const locs = [
    ['Lucknow', 'Gomti Nagar', 49, 199, 1, 'Same day delivery available'],
    ['Lucknow', 'Hazratganj', 49, 199, 1, 'Same day delivery available'],
    ['Lucknow', 'Alambagh', 59, 199, 1, ''],
    ['Lucknow', 'Indira Nagar', 49, 199, 1, ''],
    ['Lucknow', 'Aliganj', 59, 199, 0, ''],
    ['Lucknow', 'Kakori', 99, 249, 0, 'Delivery within 24-48 hrs'],
    ['Lucknow', 'Malihabad', 129, 249, 0, 'Famous mango belt - fruit plant specialists'],
    ['Lucknow', 'Maal', 129, 249, 0, 'Delivery within 24-48 hrs'],
    ['Uttar Pradesh', 'Other UP Cities', 199, 299, 0, 'Delivery in 3-5 working days, contact for bulk/plantation orders']
  ];
  const ins = db.prepare('INSERT INTO locations (city, area, delivery_charge, plantation_charge, same_day_available, notes) VALUES (?, ?, ?, ?, ?, ?)');
  locs.forEach(l => ins.run(...l));
}

const partnerCount = db.prepare('SELECT COUNT(*) AS c FROM delivery_partners').get().c;
if (partnerCount === 0) {
  db.prepare(`INSERT INTO delivery_partners (name, partner_type, contact_number, coverage_area, status)
              VALUES (?, ?, ?, ?, ?)`).run('In-House Delivery Team', 'in-house', '+91-9999999999', 'Lucknow, Kakori, Malihabad, Maal', 'active');
}

const settingsCount = db.prepare('SELECT COUNT(*) AS c FROM site_settings').get().c;
if (settingsCount === 0) {
  const defaults = {
    site_name: 'Green Nest Plants',
    tagline: 'Lucknow\'s Trusted Online Plant Nursery & Plantation Service',
    phone: '+91-9999999999',
    email: 'contact@greennestplants.in',
    address: 'Gomti Nagar, Lucknow, Uttar Pradesh, India',
    whatsapp: '919999999999'
  };
  const ins = db.prepare('INSERT INTO site_settings (key, value) VALUES (?, ?)');
  Object.entries(defaults).forEach(([k, v]) => ins.run(k, v));
}

module.exports = db;
