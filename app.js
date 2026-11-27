const cfg = window.STORE_CONFIG || {};
const $ = (id) => document.getElementById(id);
let products = [];
let cart = JSON.parse(localStorage.getItem("catalog-cart") || "[]");
let activeCategory = "همه";

const fa = (value) => Number(value || 0).toLocaleString("fa-IR");
const money = (value) => `${fa(value)} ${cfg.currency || ""}`;

document.documentElement.style.setProperty("--primary", cfg.primaryColor || "#263746");
document.documentElement.style.setProperty("--accent", cfg.accentColor || "#d6a85f");
$("store-name").textContent = cfg.storeName || "فروشگاه من";
$("footer-store-name").textContent = cfg.storeName || "فروشگاه من";
$("store-description").textContent = cfg.description || "";
$("hero-title").textContent = cfg.heroTitle || "به فروشگاه ما خوش آمدید";
$("hero-description").textContent = cfg.heroDescription || "";
document.title = cfg.storeName || "فروشگاه من";
if (cfg.logo) { $("store-logo").src = cfg.logo; $("store-logo").hidden = false; }

async function loadProducts() {
  try {
    const response = await fetch("data/products.json");
    products = await response.json();
    if (!Array.isArray(products)) products = [];
  } catch (error) {
    products = [];
  }
  renderCategories();
  renderProducts();
  renderCart();
}

function renderCategories() {
  const categories = ["همه", ...new Set(products.map(p => p.category).filter(Boolean))];
  $("categories").innerHTML = "";
  categories.forEach(category => {
    const button = document.createElement("button");
    button.className = `category-button ${activeCategory === category ? "active" : ""}`;
    button.textContent = category;
    button.type = "button";
    button.addEventListener("click", () => { activeCategory = category; renderCategories(); renderProducts(); });
    $("categories").appendChild(button);
  });
}

function renderProducts() {
  const query = $("search").value.trim().toLowerCase();
  const visible = products.filter(p => {
    const matchesCategory = activeCategory === "همه" || p.category === activeCategory;
    const haystack = [p.name, p.category, p.brand, p.description].join(" ").toLowerCase();
    return matchesCategory && haystack.includes(query) && p.available !== false;
  });
  $("products").innerHTML = "";
  if (!visible.length) {
    $("products").innerHTML = `<div class="empty-state">${products.length ? "محصولی با این مشخصات پیدا نشد." : "هنوز محصولی اضافه نشده است. از پنل مدیریت، محصولات فروشگاه را وارد کنید."}</div>`;
    return;
  }
  visible.forEach(product => {
    const card = document.createElement("article");
    card.className = "product-card";
    const image = product.image
      ? `<img class="product-image" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name || "")}" loading="lazy">`
      : `<div class="image-placeholder">تصویر محصول</div>`;
    card.innerHTML = `${image}<div class="product-info"><h2>${escapeHtml(product.name || "")}</h2>
      ${product.category ? `<p class="product-category">${escapeHtml(product.category)}</p>` : ""}
      ${product.description ? `<p class="product-description">${escapeHtml(product.description)}</p>` : ""}
      <div class="product-bottom"><span class="price">${money(product.price)}</span><button class="add-button" type="button">افزودن</button></div></div>`;
    card.querySelector("button").addEventListener("click", () => addToCart(product.id));
    $("products").appendChild(card);
  });
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function saveCart() { localStorage.setItem("catalog-cart", JSON.stringify(cart)); renderCart(); }
function addToCart(id) {
  const item = cart.find(x => String(x.id) === String(id));
  if (item) item.quantity += 1; else cart.push({ id, quantity: 1 });
  saveCart();
}
function renderCart() {
  $("cart-count").textContent = fa(cart.reduce((sum, x) => sum + x.quantity, 0));
  $("cart-items").innerHTML = "";
  let total = 0;
  cart.forEach(item => {
    const product = products.find(p => String(p.id) === String(item.id));
    if (!product) return;
    total += Number(product.price || 0) * item.quantity;
    const line = document.createElement("div");
    line.className = "cart-line";
    line.innerHTML = `<span>${escapeHtml(product.name)}<br><small>${money(product.price)}</small></span>
      <span class="qty-controls"><button type="button" aria-label="کم کردن">−</button>${fa(item.quantity)}<button type="button" aria-label="زیاد کردن">+</button></span>`;
    const buttons = line.querySelectorAll("button");
    buttons[0].addEventListener("click", () => changeQty(item.id, -1));
    buttons[1].addEventListener("click", () => changeQty(item.id, 1));
    $("cart-items").appendChild(line);
  });
  $("cart-total").textContent = money(total);
}
function changeQty(id, delta) {
  const item = cart.find(x => String(x.id) === String(id));
  if (!item) return;
  item.quantity += delta;
  cart = cart.filter(x => x.quantity > 0);
  saveCart();
}
$("search").addEventListener("input", renderProducts);
$("cart-toggle").addEventListener("click", () => $("cart-panel").hidden = false);
$("cart-close").addEventListener("click", () => $("cart-panel").hidden = true);
$("checkout").addEventListener("click", () => {
  if (!cart.length) { alert("سبد خرید خالی است."); return; }
  const lines = cart.map(item => {
    const p = products.find(x => String(x.id) === String(item.id));
    return p ? `• ${p.name} × ${item.quantity} — ${money(Number(p.price || 0) * item.quantity)}` : "";
  }).filter(Boolean);
  const total = cart.reduce((sum, item) => {
    const p = products.find(x => String(x.id) === String(item.id));
    return sum + (p ? Number(p.price || 0) * item.quantity : 0);
  }, 0);
  const message = `سلام، سفارش جدید دارم:\n${lines.join("\n")}\nجمع کل: ${money(total)}`;
  const username = String(cfg.telegramUsername || "").replace(/^@/, "");
  if (!username || username === "YOUR_TELEGRAM_USERNAME") {
    alert("ابتدا شناسه تلگرام فروشگاه را در assets/js/config.js وارد کنید.");
    return;
  }
  window.open(`https://t.me/${encodeURIComponent(username)}?text=${encodeURIComponent(message)}`, "_blank");
});
loadProducts();
