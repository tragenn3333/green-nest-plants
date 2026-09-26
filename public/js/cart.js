// ---------- Simple client-side cart using localStorage ----------
const CART_KEY = 'greenNestCart';

function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartCount();
}

function addToCart(productId, name, price, image, qty) {
  qty = parseInt(qty) || 1;
  const cart = getCart();
  const existing = cart.find(item => item.productId === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({ productId, name, price, image, qty });
  }
  saveCart(cart);
  showToast(name + ' added to cart');
}

function removeFromCart(productId) {
  let cart = getCart();
  cart = cart.filter(item => item.productId !== productId);
  saveCart(cart);
  if (typeof renderCartPage === 'function') renderCartPage();
}

function updateQty(productId, qty) {
  qty = parseInt(qty) || 1;
  const cart = getCart();
  const item = cart.find(i => i.productId === productId);
  if (item) item.qty = Math.max(1, qty);
  saveCart(cart);
  if (typeof renderCartPage === 'function') renderCartPage();
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartCount();
}

function cartTotal() {
  return getCart().reduce((sum, item) => sum + item.price * item.qty, 0);
}

function updateCartCount() {
  const el = document.getElementById('cartCount');
  if (el) {
    const count = getCart().reduce((sum, item) => sum + item.qty, 0);
    el.textContent = count;
  }
}

function showToast(msg) {
  let toast = document.getElementById('gn-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'gn-toast';
    toast.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1b4332;color:#fff;padding:14px 22px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.2);z-index:9999;opacity:0;transition:opacity 0.3s;';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  clearTimeout(window._toastTimeout);
  window._toastTimeout = setTimeout(() => { toast.style.opacity = '0'; }, 2000);
}

// Mobile nav toggle
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }
});
