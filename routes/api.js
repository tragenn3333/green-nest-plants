const express = require('express');
const router = express.Router();
const db = require('../db/database');

let razorpayInstance = null;
function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) return null;
  const Razorpay = require('razorpay');
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  return razorpayInstance;
}

// Get all active locations (for dynamic charge lookup on frontend)
router.get('/locations', (req, res) => {
  const locations = db.prepare('SELECT * FROM locations WHERE is_active = 1 ORDER BY city, area').all();
  res.json(locations);
});

// Get products (JSON, for cart price re-validation)
router.get('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(req.params.id);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
});

// Calculate order total server-side (source of truth, never trust client math)
function calculateOrder(items, locationId, wantsPlantation) {
  let itemsTotal = 0;
  const validatedItems = [];
  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ? AND is_active = 1').get(item.productId);
    if (!product) continue;
    const qty = Math.max(1, parseInt(item.qty) || 1);
    itemsTotal += product.price * qty;
    validatedItems.push({ productId: product.id, name: product.name, price: product.price, qty });
  }
  const location = db.prepare('SELECT * FROM locations WHERE id = ? AND is_active = 1').get(locationId);
  const deliveryCharge = location ? location.delivery_charge : 0;
  const plantationCharge = (wantsPlantation && location) ? location.plantation_charge : 0;
  const grandTotal = itemsTotal + deliveryCharge + plantationCharge;
  return { validatedItems, itemsTotal, deliveryCharge, plantationCharge, grandTotal, location };
}

router.post('/quote', (req, res) => {
  const { items, locationId, wantsPlantation } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'Cart is empty' });
  const calc = calculateOrder(items, locationId, wantsPlantation);
  res.json(calc);
});

// Create order + Razorpay order (if configured)
router.post('/checkout', async (req, res) => {
  try {
    const { customerName, phone, address, locationId, items, wantsPlantation } = req.body;
    if (!customerName || !phone || !address || !locationId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    const calc = calculateOrder(items, locationId, wantsPlantation);
    if (calc.validatedItems.length === 0) return res.status(400).json({ error: 'No valid items in cart' });

    const insert = db.prepare(`INSERT INTO orders
      (customer_name, phone, address, location_id, items_json, wants_plantation, items_total, delivery_charge, plantation_charge, grand_total, payment_status, order_status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'placed')`);

    const result = insert.run(
      customerName, phone, address, locationId,
      JSON.stringify(calc.validatedItems),
      wantsPlantation ? 1 : 0,
      calc.itemsTotal, calc.deliveryCharge, calc.plantationCharge, calc.grandTotal
    );

    const orderId = result.lastInsertRowid;
    const rp = getRazorpay();

    if (rp) {
      const rpOrder = await rp.orders.create({
        amount: Math.round(calc.grandTotal * 100), // paise
        currency: 'INR',
        receipt: 'order_' + orderId
      });
      db.prepare('UPDATE orders SET razorpay_order_id = ? WHERE id = ?').run(rpOrder.id, orderId);
      return res.json({ orderId, razorpayOrderId: rpOrder.id, amount: rpOrder.amount, currency: rpOrder.currency, keyId: process.env.RAZORPAY_KEY_ID });
    }

    // No payment gateway configured -> Cash on Delivery fallback
    db.prepare("UPDATE orders SET payment_status = 'cod' WHERE id = ?").run(orderId);
    res.json({ orderId, codMode: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong while placing your order' });
  }
});

// Verify Razorpay payment signature and mark order paid
router.post('/verify-payment', (req, res) => {
  const crypto = require('crypto');
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!process.env.RAZORPAY_KEY_SECRET) {
    return res.status(400).json({ error: 'Payment gateway not configured' });
  }

  const body = razorpay_order_id + '|' + razorpay_payment_id;
  const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

  if (expectedSignature === razorpay_signature) {
    db.prepare("UPDATE orders SET payment_status = 'paid', payment_id = ? WHERE id = ?").run(razorpay_payment_id, orderId);
    return res.json({ success: true });
  }
  res.status(400).json({ success: false, error: 'Payment verification failed' });
});

module.exports = router;
