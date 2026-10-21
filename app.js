(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const config = window.BABA_SITE_CONFIG || {};
  const products = Array.isArray(window.BABA_PRODUCTS) ? window.BABA_PRODUCTS : [];
  const waDigits = String(config.whatsappNumber || '+919519608505').replace(/\D/g, '');
  const photoStatus = Object.create(null);
  let activeCategory = 'All';
  let query = '';
  let visibleCount = 24;
  let cart = readStore('baba_astro_gems_enquiry_cart');
  let wishlist = readStore('baba_astro_gems_wishlist');
  let toastTimer;

  function readStore(key) {
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
    catch (_) { return []; }
  }
  function store() {
    try {
      localStorage.setItem('baba_astro_gems_enquiry_cart', JSON.stringify(cart));
      localStorage.setItem('baba_astro_gems_wishlist', JSON.stringify(wishlist));
    } catch (_) { /* Storage is optional; core catalogue remains usable. */ }
  }
  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function productById(id) { return products.find(p => p.id === id); }
  function toast(message) {
    const node = $('#toast'); if (!node) return;
    node.textContent = message; node.style.display = 'block';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { node.style.display = 'none'; }, 2800);
  }
  function publicSite() {
    const host = location.hostname;
    return ['http:', 'https:'].includes(location.protocol) && Boolean(host) && !['localhost','127.0.0.1'].includes(host);
  }
  function productPageLink(p) {
    if (!publicSite()) return 'Publish the website to create a public product link.';
    const u = new URL(location.href); u.hash = ''; u.searchParams.set('product', p.id); return u.href;
  }
  function productPhotoLink(p) {
    if (!publicSite() || photoStatus[p.id] !== true) return '';
    return new URL(p.image, location.href).href;
  }
  function openWhatsApp(message) {
    const url = `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`;
    const win = window.open(url, '_blank');
    if (win) win.opener = null; else location.href = url;
  }
  function productMessage(p, qty = 1) {
    const lines = [
      'Namaste BABA ASTRO GEMS, I would like to enquire about this item.',
      `Product: ${p.name}`, `SKU: ${p.sku || p.id}`, `Category: ${p.category || 'Catalogue'}`,
      `Quantity: ${Math.max(1, Number(qty) || 1)}`,
      'Please confirm the current price and availability.',
      `Product page: ${productPageLink(p)}`
    ];
    const photo = productPhotoLink(p);
    lines.push(photo ? `Actual product photo (PNG): ${photo}` : 'Please send me the actual product photo on WhatsApp.');
    lines.push('Please confirm weight/dimensions, actual origin, treatment status, certificate/report (if any), shipping and final total before payment.');
    return lines.join('\n');
  }
  function bindPhotoImages(root = document) {
    $$('img[data-product-photo]', root).forEach(img => {
      const onLoad = () => {
        if (img.naturalWidth > 0) {
          img.closest('.product-image, .detail-photo-wrap, .cart-photo-wrap')?.classList.add('has-photo');
          photoStatus[img.dataset.productPhoto] = true;
        }
      };
      const onError = () => {
        photoStatus[img.dataset.productPhoto] = false;
        img.closest('.product-image, .detail-photo-wrap, .cart-photo-wrap')?.classList.remove('has-photo');
        img.hidden = true;
      };
      img.addEventListener('load', onLoad, {once:true});
      img.addEventListener('error', onError, {once:true});
      if (img.complete) img.naturalWidth > 0 ? onLoad() : onError();
    });
  }
  function imageMarkup(p, className = 'product-image') {
    const id = esc(p.id), name = esc(p.name), image = esc(p.image);
    return `<div class="${className}"><img data-product-photo="${id}" src="${image}" alt="Actual product photograph: ${name}" loading="lazy"><div class="photo-placeholder"><strong>Actual photo not uploaded yet</strong><small>Ask our team for the real item photograph.</small></div></div>`;
  }
  function updateCartCount() {
    const count = cart.reduce((sum, item) => sum + Math.max(1, Number(item.qty) || 1), 0);
    const node = $('#cartCount'); if (node) node.textContent = String(count);
    store();
  }
  function renderNavratna() {
    const grid = $('#navratnaGrid'); if (!grid) return;
    const stones = Array.isArray(window.BABA_NAVRATNA) ? window.BABA_NAVRATNA : [];
    grid.innerHTML = stones.map(([name, hindi, imagePath]) => `
      <button class="navratna-card" type="button" data-search="${esc(name)}" aria-label="Browse ${esc(name)}">
        <span class="navratna-photo-wrap"><img class="navratna-photo" src="${esc(imagePath)}" alt="Actual ${esc(name)} photograph" loading="lazy"><span class="navratna-photo-placeholder">Actual photo not uploaded yet</span></span>
        <strong>${esc(name.toUpperCase())}</strong><small>${esc(hindi)}</small>
      </button>`).join('');
    $$('.navratna-photo', grid).forEach(img => {
      const loaded = () => { if (img.naturalWidth) { img.parentElement.classList.add('has-photo'); } };
      const failed = () => { img.hidden = true; img.parentElement.classList.remove('has-photo'); };
      img.addEventListener('load', loaded, {once:true}); img.addEventListener('error', failed, {once:true});
      if (img.complete) img.naturalWidth ? loaded() : failed();
    });
  }
  function renderChips() {
    const host = $('#categoryChips'); if (!host) return;
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))].sort((a,b) => a.localeCompare(b));
    host.innerHTML = ['All', ...cats].map(cat => `<button class="chip ${cat === activeCategory ? 'active' : ''}" type="button" data-category="${esc(cat)}">${esc(cat)}</button>`).join('');
  }
  function filteredProducts() {
    let list = products.filter(p => {
      const categoryMatch = activeCategory === 'All' || p.category === activeCategory;
      const searchable = [p.name, p.stone, p.category, p.sku, p.id].filter(Boolean).join(' ').toLowerCase();
      return categoryMatch && (!query || searchable.includes(query.toLowerCase()));
    });
    if ($('#sort')?.value === 'az') list.sort((a,b) => String(a.name).localeCompare(String(b.name)));
    return list;
  }
  function renderProducts() {
    const list = filteredProducts();
    const count = $('#resultCount');
    if (count) count.textContent = `Showing ${Math.min(visibleCount, list.length)} of ${list.length} catalogue listings`;
    const grid = $('#productGrid'); if (!grid) return;
    grid.innerHTML = list.slice(0, visibleCount).map(p => {
      const id = esc(p.id), name = esc(p.name), category = esc(p.category || 'Catalogue'), sku = esc(p.sku || p.id);
      return `<article class="product-card">
        <button class="heart" type="button" data-wish="${id}" aria-label="${wishlist.includes(p.id) ? 'Remove from' : 'Add to'} wishlist">${wishlist.includes(p.id) ? '♥' : '♡'}</button>
        <div class="product-image" data-detail="${id}" role="button" tabindex="0" aria-label="View details for ${name}">
          <span class="badge">${category.toUpperCase()}</span>
          <img data-product-photo="${id}" src="${esc(p.image)}" alt="Actual product photograph: ${name}" loading="lazy">
          <div class="photo-placeholder"><strong>Actual photo not uploaded yet</strong><small>Ask our team for the real item photograph.</small></div>
        </div>
        <div class="product-info"><div class="product-name">${name}</div>
          <div class="product-meta">SKU: ${sku}</div>
          <div class="product-price">Price & availability on WhatsApp</div>
          <div class="product-actions"><button type="button" data-add="${id}">Add to Enquiry</button><button type="button" data-detail="${id}">Details</button></div>
        </div></article>`;
    }).join('') || '<div class="empty">No listings found. Try another search or category.</div>';
    const loadMore = $('#loadMore'); if (loadMore) loadMore.style.display = visibleCount < list.length ? 'inline-flex' : 'none';
    bindPhotoImages(grid); updateCartCount();
  }
  function openModal(content) {
    const host = $('#modalContent'); if (!host) return;
    host.innerHTML = content; $('#modalBackdrop')?.classList.add('open'); $('#modalClose')?.focus();
    bindPhotoImages(host);
  }
  function closeModal() { $('#modalBackdrop')?.classList.remove('open'); }
  function addToCart(id) {
    if (!productById(id)) return;
    const found = cart.find(item => item.id === id);
    if (found) found.qty = Math.max(1, Number(found.qty) || 1) + 1; else cart.push({id, qty:1});
    updateCartCount(); renderProducts(); toast('Added to your enquiry list');
  }
  function showCart() {
    const items = cart.map(item => ({...item, product: productById(item.id)})).filter(item => item.product);
    const rows = items.map(({product:p, qty}) => `<div class="cart-row cart-product-row">
      <div class="cart-photo-wrap"><img data-product-photo="${esc(p.id)}" src="${esc(p.image)}" alt="Actual photo: ${esc(p.name)}" loading="lazy"><div class="photo-placeholder"><small>Photo pending</small></div></div>
      <span><b>${esc(p.name)}</b><br><small>SKU: ${esc(p.sku || p.id)} · Qty: ${Math.max(1, Number(qty)||1)}</small><br><em>Price to be confirmed</em></span>
      <span><button type="button" data-add="${esc(p.id)}">+ Qty</button><button type="button" data-remove="${esc(p.id)}">Remove</button></span></div>`).join('');
    openModal(`<h2 id="modalTitle">Your Enquiry List</h2>${rows || '<div class="empty">Your enquiry list is empty. Add products from the catalogue first.</div>'}
      ${rows ? '<p class="checkout-note">No payment is collected on this website. Our team will confirm current price, real item photos, stock, specifications and shipping on WhatsApp.</p><button class="btn gold" id="whatsappCheckoutBtn" type="button">Send enquiry on WhatsApp</button>' : ''}`);
  }
  function showWishlist() {
    const items = wishlist.map(productById).filter(Boolean);
    const rows = items.map(p => `<div class="cart-row"><span><b>${esc(p.name)}</b><br><small>SKU: ${esc(p.sku || p.id)}</small></span><span><button type="button" data-whatsapp-product="${esc(p.id)}">Ask on WhatsApp</button><button type="button" data-wish="${esc(p.id)}">Remove</button></span></div>`).join('');
    openModal(`<h2 id="modalTitle">Your Wishlist</h2>${rows || '<div class="empty">Your wishlist is empty.</div>'}`);
  }
  function showDetail(id) {
    const p = productById(id); if (!p) return;
    openModal(`<p class="eyebrow">${esc(p.category || 'CATALOGUE')}</p><div class="detail-layout">
      ${imageMarkup(p, 'detail-photo-wrap')}<div><h2 id="modalTitle">${esc(p.name)}</h2><p class="product-price">Price & availability on WhatsApp</p><p><b>SKU:</b> ${esc(p.sku || p.id)}</p><p>${esc(p.description || 'Ask our team to confirm the product details.')}</p><p class="checkout-note"><b>Before ordering:</b> confirm the actual item photo, stock, weight/dimensions, origin, treatment status and any certificate/report.</p><div class="product-actions detail-actions"><button type="button" data-add="${esc(p.id)}" data-detail-add="true">Add to Enquiry</button><button type="button" data-whatsapp-product="${esc(p.id)}">Enquire on WhatsApp</button></div></div></div>`);
  }
  function sendCartToWhatsApp() {
    const items = cart.map(item => ({...item, product: productById(item.id)})).filter(item => item.product);
    if (!items.length) { toast('Your enquiry list is empty'); return; }
    const lines = ['Namaste BABA ASTRO GEMS, I would like to enquire about these items:', ''];
    items.forEach(({product:p, qty}, i) => {
      lines.push(`${i+1}. ${p.name}`, `   SKU: ${p.sku || p.id}`, `   Category: ${p.category || 'Catalogue'}`, `   Quantity: ${Math.max(1,Number(qty)||1)}`, '   Price: Please confirm current price', `   Product page: ${productPageLink(p)}`);
      const photo = productPhotoLink(p);
      lines.push(photo ? `   Actual product photo (PNG): ${photo}` : '   Please send the actual product photo on WhatsApp.', '');
    });
    lines.push('Please confirm current availability, specifications, origin, treatment, certificate/report (if any), shipping and final total. This is an enquiry; the order is not confirmed until details are agreed.');
    openWhatsApp(lines.join('\n'));
  }
  function applyConfig() {
    const brand = config.brandName || 'BABA ASTRO GEMS';
    $$('[data-brand-name]').forEach(node => node.textContent = brand);
    $$('[data-brand-logo]').forEach(img => {
      img.src = config.logo || 'assets/branding/logo.png';
      img.addEventListener('load', () => { if (img.naturalWidth) { img.style.display = 'block'; if (img.nextElementSibling) img.nextElementSibling.style.display = 'none'; } }, {once:true});
      img.addEventListener('error', () => { img.style.display = 'none'; if (img.nextElementSibling) img.nextElementSibling.style.display = 'flex'; }, {once:true});
      if (img.complete) img.naturalWidth ? (img.style.display = 'block', img.nextElementSibling.style.display = 'none') : (img.style.display='none', img.nextElementSibling.style.display='flex');
    });
    const heroImg = $('[data-brand-banner]');
    if (heroImg) {
      heroImg.src = config.banner || 'assets/branding/banner.png';
      heroImg.addEventListener('load', () => { if (heroImg.naturalWidth) { heroImg.style.display = 'block'; $('#heroPhotoPanel')?.removeAttribute('hidden'); $('.hero')?.classList.add('has-photo'); const panelImg = $('[data-hero-photo]'); if (panelImg) panelImg.src = heroImg.src; } }, {once:true});
      heroImg.addEventListener('error', () => { heroImg.style.display='none'; }, {once:true});
      if (heroImg.complete && !heroImg.naturalWidth) heroImg.style.display='none';
    }
    const emailLinks = $$('[data-contact-email]');
    emailLinks.forEach(a => { if (config.email) { a.href = 'mailto:' + config.email; if (a.textContent.toLowerCase().includes('email:')) a.textContent = '✉ Email: ' + config.email; } });
    $$('[data-contact-whatsapp]').forEach(a => { a.href = 'https://wa.me/' + waDigits; });
    [['[data-contact-instagram]',config.instagram],['[data-contact-facebook]',config.facebook],['[data-contact-youtube]',config.youtube]].forEach(([sel,url]) => { const a=$(sel); if(a&&url) a.href=url; });
    const navImg = $('[data-navratna-image]');
    if (navImg) {
      navImg.src = config.navratnaImage || 'assets/branding/navratna.png';
      navImg.addEventListener('load', () => { if (navImg.naturalWidth) { $('#navratnaBannerSlot')?.removeAttribute('hidden'); navImg.style.display='block'; } }, {once:true});
      navImg.addEventListener('error', () => { navImg.style.display='none'; $('#navratnaBannerSlot')?.setAttribute('hidden',''); }, {once:true});
      if (navImg.complete && !navImg.naturalWidth) $('#navratnaBannerSlot')?.setAttribute('hidden','');
    }
  }
  document.addEventListener('click', event => {
    const category = event.target.closest('[data-category]');
    if (category) {
      event.preventDefault(); activeCategory=category.dataset.category||'All'; query=''; visibleCount=24;
      if ($('#searchInput')) $('#searchInput').value=''; renderChips(); renderProducts();
      $('#catalog')?.scrollIntoView({behavior:'smooth'}); $('#nav')?.classList.remove('open'); $('.nav-dropdown')?.classList.remove('expanded'); $('#mobileMenu')?.setAttribute('aria-expanded','false'); return;
    }
    const search = event.target.closest('[data-search]');
    if (search) { event.preventDefault(); query=search.dataset.search||''; activeCategory='All'; visibleCount=24; if ($('#searchInput')) $('#searchInput').value=query; renderChips(); renderProducts(); $('#catalog')?.scrollIntoView({behavior:'smooth'}); $('#nav')?.classList.remove('open'); return; }
    const add = event.target.closest('[data-add]');
    if (add) { const closeDetail=add.hasAttribute('data-detail-add'); addToCart(add.dataset.add); if (closeDetail) closeModal(); else if ($('#modalTitle')?.textContent==='Your Enquiry List') showCart(); return; }
    const wish = event.target.closest('[data-wish]');
    if (wish) { const id=wish.dataset.wish; wishlist=wishlist.includes(id)?wishlist.filter(x=>x!==id):[...wishlist,id]; store(); renderProducts(); if ($('#modalBackdrop')?.classList.contains('open') && $('#modalTitle')?.textContent==='Your Wishlist') showWishlist(); else toast(wishlist.includes(id)?'Added to wishlist':'Removed from wishlist'); return; }
    const waProduct=event.target.closest('[data-whatsapp-product]');
    if (waProduct) { const p=productById(waProduct.dataset.whatsappProduct); if(p) openWhatsApp(productMessage(p)); return; }
    const detail=event.target.closest('[data-detail]');
    if (detail) { showDetail(detail.dataset.detail); return; }
    const remove=event.target.closest('[data-remove]'); if(remove) { cart=cart.filter(x=>x.id!==remove.dataset.remove); updateCartCount(); showCart(); renderProducts(); return; }
    if (event.target.closest('#cartBtn')) { showCart(); return; }
    if (event.target.closest('#wishlistBtn')) { showWishlist(); return; }
    if (event.target.closest('#whatsappCheckoutBtn')) { sendCartToWhatsApp(); return; }
    if (event.target.closest('#modalClose') || event.target.id==='modalBackdrop') { closeModal(); return; }
    if (event.target.closest('#privacyLink')) { event.preventDefault(); openModal('<h2 id="modalTitle">Website privacy note</h2><p>This static website does not store contact form details on a website server. Enquiry details are placed into a WhatsApp message only when you choose to continue. The enquiry list and wishlist are saved locally in this browser.</p><p>Please add business-specific privacy terms and any legally required policies before launch.</p>'); return; }
    if (event.target.closest('#mobileMenu')) { const nav=$('#nav'); nav?.classList.toggle('open'); $('#mobileMenu')?.setAttribute('aria-expanded',String(nav?.classList.contains('open'))); return; }
  });
  $('#searchForm')?.addEventListener('submit', event => { event.preventDefault(); query=($('#searchInput')?.value||'').trim(); activeCategory='All'; visibleCount=24; renderChips(); renderProducts(); $('#catalog')?.scrollIntoView({behavior:'smooth'}); });
  $('#sort')?.addEventListener('change', () => { visibleCount=24; renderProducts(); });
  $('#loadMore')?.addEventListener('click', () => { visibleCount+=24; renderProducts(); });
  $('#enquiryForm')?.addEventListener('submit', event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const lines=['Namaste BABA ASTRO GEMS, I have a product enquiry.',`Name: ${form.get('name')||''}`,`Contact number: ${form.get('phone')||'Not provided'}`,`Product / SKU: ${form.get('interest')||''}`,`Message: ${form.get('message')||'Please share the current price and actual product photo.'}`,'Please confirm current availability, real photos, specifications, certificate/report (if any), shipping and final total.'];
    const status=$('#enquiryStatus'); if(status) status.textContent='WhatsApp is opening with your enquiry. Review the message and press Send in WhatsApp.'; openWhatsApp(lines.join('\n'));
  });
  $('#gemstonesMenuLink')?.addEventListener('click', event => { if (innerWidth <= 700) { event.preventDefault(); const dropdown=$('.nav-dropdown'); dropdown?.classList.toggle('expanded'); event.currentTarget.setAttribute('aria-expanded',String(dropdown?.classList.contains('expanded'))); } });
  document.addEventListener('keydown', event => { if(event.key==='Escape') closeModal(); if((event.key==='Enter'||event.key===' ')&&event.target.matches('.product-image[role="button"]')) { event.preventDefault(); showDetail(event.target.dataset.detail); } });
  const year=$('#year'); if(year) year.textContent=String(new Date().getFullYear());
  applyConfig(); renderNavratna(); renderChips(); renderProducts();
  const sharedProduct=new URLSearchParams(location.search).get('product'); if(sharedProduct&&productById(sharedProduct)) showDetail(sharedProduct);
})();
