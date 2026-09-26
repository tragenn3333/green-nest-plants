# 🌿 Green Nest Plants — Plant E-Commerce Website with Admin Panel

A complete, working e-commerce website for selling plants online, with:
- Product catalog (plants) with categories, images, prices, stock
- **Admin panel** to add/edit/delete products, upload images, set prices
- **Location-based delivery & plantation charges** (fully editable by admin — set different charges for Lucknow, Kakori, Malihabad, Maal, or any area)
- **Delivery partner management** (add your own team or third-party partners like Porter)
- **Online payment integration** (Razorpay — supports UPI, cards, netbanking) with Cash-on-Delivery fallback
- **SEO-optimized** for Lucknow, Kakori, Malihabad, Maal and Uttar Pradesh (meta tags, sitemap, per-area landing pages, structured data)
- Cart & checkout system
- Order management dashboard

Built with **Node.js + Express + EJS + SQLite** — no external database server required. Runs immediately after `npm install`.

---

## 1. Running It Locally

You need **Node.js** installed (v18 or higher). That's the only requirement — the database is a self-contained SQLite file, no separate DB server needed.

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env

# 3. Start the server
npm start
```

Visit: **http://localhost:3000**

Admin panel: **http://localhost:3000/admin/login**
- Username: `admin`
- Password: `admin123`

**⚠️ Change this password immediately** after your first login, from Admin → Site Settings → Change Password.

---

## 2. What You Can Manage from the Admin Panel

| Page | What it does |
|---|---|
| **Products** | Add/edit/delete plants — name, category, description, price, stock, and upload a photo for each |
| **Delivery & Plantation Charges** | Add any city/area (Lucknow, Kakori, Malihabad, Maal, etc.) with its own delivery charge, plantation service charge, and same-day availability. This automatically updates the Services page and checkout calculations site-wide. |
| **Delivery Partners** | Add your in-house delivery team or third-party partners (Porter, Dunzo, Shadowfax). Assign any order to any active partner. |
| **Orders** | View every order, its items, customer details, and update status (placed → confirmed → out for delivery → delivered). |
| **Site Settings** | Update business name, phone, email, address, WhatsApp number, and change your admin password. |

All of this is stored in a real SQLite database (`db/greennest.db`) — nothing is hardcoded.

---

## 3. Connecting a Payment Gateway (Razorpay)

The site works in **Cash-on-Delivery mode by default** — no setup needed to test it end-to-end.

To accept real online payments:
1. Create a free account at [razorpay.com](https://razorpay.com)
2. Get your **Key ID** and **Key Secret** from Settings → API Keys (use Test Mode keys first)
3. Open `.env` and fill in:
   ```
   RAZORPAY_KEY_ID=rzp_test_xxxxxxxx
   RAZORPAY_KEY_SECRET=your_secret_here
   ```
4. Restart the server. The checkout page will now show "Pay Online" as an option automatically.

Razorpay supports UPI, cards, netbanking and wallets — ideal for Indian customers.

---

## 4. Connecting a Real Delivery Partner (Porter, etc.)

Go to **Admin → Delivery Partners → Add Delivery Partner**, select the partner type (e.g. Porter), and paste their API key once you have a Porter Business account. The panel stores the key securely against that partner record.

**Important:** Actually auto-booking a Porter delivery requires calling Porter's Partner API from the server when an order is assigned — this needs Porter's business API documentation and approval, which is a separate step outside of this codebase (Porter's integration terms and endpoints differ by business agreement). Until then, you can:
1. Assign the order to "Porter" in the admin Orders page
2. Manually book that delivery using the customer's address (shown in the order details) via Porter's business app or website

If you get access to Porter's API docs later, the booking call can be added to the `POST /admin/orders/:id/assign` route in `routes/admin.js`.

---

## 5. SEO Setup

The site already includes:
- Per-page meta titles & descriptions targeting Lucknow, Kakori, Malihabad, Maal, Uttar Pradesh
- Individual **SEO landing pages** per area at `/locations/kakori`, `/locations/malihabad`, `/locations/maal`, `/locations/gomti-nagar`, etc. (auto-generated from whatever areas you add in the admin panel)
- `sitemap.xml` and `robots.txt` (auto-generated, always up to date with your live products/areas)
- JSON-LD **LocalBusiness structured data** for Google

**To get found on Google search**, after deploying:
1. Go to [Google Search Console](https://search.google.com/search-console), add your domain
2. Submit your sitemap: `https://yourdomain.com/sitemap.xml`
3. Fill out your Google Business Profile with the same address/phone as in Admin → Settings — this is what actually gets you into Google Maps results for "plant nursery near me" searches in Lucknow

---

## 6. Deploying Online (Free Tier Options)

### Option A — Render.com (recommended, simplest)
1. Push this project to a GitHub repository (see Section 7 below)
2. Go to [render.com](https://render.com) → New → Web Service → connect your GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables (from your `.env`) in Render's dashboard under "Environment"
6. Deploy — Render gives you a free `https://yourapp.onrender.com` URL

**Note on SQLite + Render free tier:** Render's free tier has an ephemeral filesystem — the SQLite database resets on redeploy. For a real production store, either:
- Upgrade to Render's paid tier with a persistent disk, or
- Migrate to a hosted database like **MongoDB Atlas** or **Supabase Postgres** (free tiers available) — ask your developer, or ask me, to convert the `db/database.js` layer if you want to go this route later.

### Option B — Railway.app
Same process as Render — connect GitHub repo, set environment variables, deploy.

### Domain
Buy a domain (e.g. from Namecheap, GoDaddy) for ~₹700-1000/year, and point its DNS to your Render/Railway URL. Cloudflare (free) can sit in front for SSL + speed.

---

## 7. Pushing This to GitHub

```bash
cd plant-ecommerce
git init
git add .
git commit -m "Initial commit - Green Nest Plants e-commerce site"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

The `.env` file (with your real secrets) and `node_modules/` and the database file are already excluded via `.gitignore` — they will NOT be pushed to GitHub. This is intentional and correct: never commit real passwords or API keys.

When you deploy to Render/Railway, you'll re-enter those same environment variables directly in their dashboard (not in the code).

---

## 8. Project Structure

```
plant-ecommerce/
├── server.js              # Main app entry point
├── db/database.js         # Database schema + auto-seeding
├── routes/
│   ├── public.js           # Homepage, plant listing, product pages, SEO pages
│   ├── api.js               # Cart pricing, checkout, payment verification
│   └── admin.js             # Everything in the admin panel
├── middleware/
│   ├── auth.js               # Protects admin routes
│   └── upload.js             # Handles product image uploads
├── views/                  # All EJS templates (pages)
│   └── admin/                # Admin panel pages
├── public/
│   ├── css/style.css        # All site styling
│   ├── js/cart.js            # Client-side cart logic
│   └── uploads/               # Uploaded product images land here
└── .env.example             # Copy to .env and fill in your secrets
```

---

## 9. Adding More Areas (Kakori, Malihabad, Maal are already seeded)

The database already comes pre-loaded with sample charges for:
- Lucknow (Gomti Nagar, Hazratganj, Alambagh, Indira Nagar, Aliganj, Kakori, Malihabad, Maal)
- Other UP Cities (generic fallback rate)

Add more from **Admin → Delivery & Plantation Charges → Add New Area** — no code changes needed, and each new area automatically gets its own SEO landing page at `/locations/area-name`.

---

Questions about extending this (adding a wishlist, reviews, coupon codes, WhatsApp order notifications, or migrating to MongoDB for larger scale)? Just ask.
