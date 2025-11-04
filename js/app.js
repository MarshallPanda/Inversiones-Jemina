
// --- Config
const LATEST_URL = 'productos/latest.json';
const COMUNICADOS_URL = 'comunicados/config.json';
const EFFECTS_URL = 'effects/config.json';
const CART_KEY = 'cjemina_cart'; // localStorage solo para carrito

// --- Estado
let DATASET = [];
let FILTERS = { q: '', cats: new Set(), min: 0, max: Infinity, sort: 'relevancia' };
let PRICE_LIMITS = { min: 0, max: 0 };

// --- Utiles
const fmtS = v => 'S/ ' + (Math.round(v*100)/100).toFixed(2);
const byId = id => document.getElementById(id);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html !== undefined) n.innerHTML = html;
  return n;
};

// --------- Boot
document.addEventListener('DOMContentLoaded', async () => {
  await loadDataset();
  initPriceRange();
  renderCategories();
  bindSearchSort();
  renderProducts();
  initCart();
  initDrawer();
  await initComunicados();
  await initEffects();

// ---- Mobile filters sheet: move sidebar into sheet
const sheet = document.getElementById('filtersSheet');
const filtersBox = document.getElementById('filtersBox');
const sidebar = document.querySelector('.sidebar');
let sidebarPlaceholder = document.createElement('div');
sidebarPlaceholder.id = 'sidebar-placeholder';

document.getElementById('open-filters')?.addEventListener('click', ()=>{
  // make sidebar visible inside sheet
  sidebar.style.display = 'block'; sidebar.style.width='100%';
  if (!sidebar.isConnected) return;
  sidebar.parentNode.insertBefore(sidebarPlaceholder, sidebar);
  filtersBox.appendChild(sidebar);
  document.getElementById('overlay').classList.add('show');
  sheet.classList.add('open');
});
document.getElementById('closeFilters')?.addEventListener('click', closeFilters);
document.getElementById('applyFilters')?.addEventListener('click', closeFilters);
function closeFilters(){
  // restore sidebar display so media query can hide it on mobile
  sidebar.style.display = ''; sidebar.style.width='';
  sheet.classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  if (sidebarPlaceholder && sidebarPlaceholder.parentNode){
    sidebarPlaceholder.parentNode.replaceChild(sidebar, sidebarPlaceholder);
  }
}

});

// --------- Cargar dataset versionado
async function loadDataset() {
  const latest = await fetch(LATEST_URL).then(r=>r.json());
  const list = await fetch('productos/' + latest.file).then(r=>r.json());
  DATASET = list;
  // Limites de precio
  const prices = list.map(p => p.precio);
  PRICE_LIMITS.min = Math.floor(Math.min(...prices));
  PRICE_LIMITS.max = Math.ceil(Math.max(...prices));
}

// --------- Precio (dual range + inputs)
function initPriceRange() {
  const minRange = byId('minRange'), maxRange = byId('maxRange');
  const minPrice = byId('minPrice'), maxPrice = byId('maxPrice');
  const fill = byId('range-fill');
  const track = byId('price-range');

  const clamp = () => {
    const min = Math.min(PRICE_LIMITS.min, PRICE_LIMITS.max);
    const max = Math.max(PRICE_LIMITS.min, PRICE_LIMITS.max);
    minRange.min = minPrice.min = min;
    maxRange.max = maxPrice.max = max;
    minRange.max = max;
    maxRange.min = min;
    if (!minPrice.value) minPrice.value = min;
    if (!maxPrice.value) maxPrice.value = max;
  };
  clamp();

  const setFill = () => {
    const min = Number(minRange.value);
    const max = Number(maxRange.value);
    const percMin = ((min - PRICE_LIMITS.min) / (PRICE_LIMITS.max - PRICE_LIMITS.min)) * 100;
    const percMax = ((max - PRICE_LIMITS.min) / (PRICE_LIMITS.max - PRICE_LIMITS.min)) * 100;
    fill.style.left = percMin + '%';
    fill.style.right = (100 - percMax) + '%';
  };

  const syncFromRange = () => {
    let a = Number(minRange.value), b = Number(maxRange.value);
    if (a > b) [a,b] = [b,a];
    minRange.value = a; maxRange.value = b;
    minPrice.value = a; maxPrice.value = b;
    FILTERS.min = a; FILTERS.max = b;
    setFill();
    renderProductsDebounced();
  };

  const syncFromNumber = () => {
    let a = Number(minPrice.value || PRICE_LIMITS.min);
    let b = Number(maxPrice.value || PRICE_LIMITS.max);
    if (a < PRICE_LIMITS.min) a = PRICE_LIMITS.min;
    if (b > PRICE_LIMITS.max) b = PRICE_LIMITS.max;
    if (a > b) [a,b] = [b,a];
    minRange.value = a; maxRange.value = b;
    FILTERS.min = a; FILTERS.max = b;
    setFill();
    renderProductsDebounced();
  };

  minRange.value = PRICE_LIMITS.min;
  maxRange.value = PRICE_LIMITS.max;
  minPrice.value = PRICE_LIMITS.min;
  maxPrice.value = PRICE_LIMITS.max;
  setFill();

  ['input','change'].forEach(ev=>{
    minRange.addEventListener(ev, syncFromRange);
    maxRange.addEventListener(ev, syncFromRange);
    minPrice.addEventListener(ev, syncFromNumber);
    maxPrice.addEventListener(ev, syncFromNumber);
  });

  // teclado accesible
  [minRange, maxRange].forEach(r => r.addEventListener('keydown', (e)=>{
    let step = (e.shiftKey ? 10 : 1);
    if (e.key === 'ArrowLeft') { r.value = Number(r.value) - step; syncFromRange(); }
    if (e.key === 'ArrowRight') { r.value = Number(r.value) + step; syncFromRange(); }
  }));
}

let debounceTimer;
function renderProductsDebounced(){ clearTimeout(debounceTimer); debounceTimer = setTimeout(renderProducts, 120); }

// --------- Categorías auto
function renderCategories() {
  const elList = byId('catList');
  elList.innerHTML='';
  const set = new Map();
  DATASET.forEach(p => set.set(p.categoria, 0));
  // contadores (globales iniciales)
  DATASET.forEach(p => set.set(p.categoria, (set.get(p.categoria)||0)+1));
  const entries = Array.from(set.entries()).sort((a,b)=>b[1]-a[1]);
  entries.forEach(([cat, count])=>{
    const row = el('label','cat-item');
    const id = 'cat-' + cat.replace(/\s+/g,'-').toLowerCase();
    row.innerHTML = `<span><input type="checkbox" id="${id}" data-cat="${cat}"> ${cat}</span><span>${count}</span>`;
    elList.appendChild(row);
  });

  elList.addEventListener('change', (e)=>{
    if (e.target && e.target.matches('input[type=checkbox][data-cat]')){
      const c = e.target.getAttribute('data-cat');
      if (e.target.checked) FILTERS.cats.add(c); else FILTERS.cats.delete(c);
      renderChips();
      renderProducts();
    }
  });

  // Buscador de categorías
  byId('catSearch').addEventListener('input', e=>{
    const q = e.target.value.toLowerCase();
    Array.from(elList.children).forEach(row => {
      const txt = row.textContent.toLowerCase();
      row.style.display = txt.includes(q) ? '' : 'none';
    });
  });
}

function renderChips(){
  const box = byId('chips');
  box.innerHTML='';
  FILTERS.cats.forEach(c=>{
    const chip = el('span','chip', c + ' ×');
    chip.style.cursor='pointer';
    chip.addEventListener('click', ()=>{
      FILTERS.cats.delete(c);
      const id = 'cat-' + c.replace(/\s+/g,'-').toLowerCase();
      const cb = byId(id); if (cb) cb.checked = false;
      renderChips(); renderProducts();
    });
    box.appendChild(chip);
  });
}

// --------- Búsqueda y orden
function bindSearchSort(){
  byId('search').addEventListener('input', e=>{ FILTERS.q = e.target.value.toLowerCase(); renderProductsDebounced(); });
  byId('sort').addEventListener('change', e=>{ FILTERS.sort = e.target.value; renderProducts(); });
}

// --------- Filtrado + Render grid
function getFiltered(){
  let list = DATASET.filter(p => p.precio >= (FILTERS.min||0) && p.precio <= (FILTERS.max||Infinity));
  if (FILTERS.cats.size) list = list.filter(p => FILTERS.cats.has(p.categoria));
  if (FILTERS.q) list = list.filter(p => (p.nombre + ' ' + (p.descripcion_corta||'')).toLowerCase().includes(FILTERS.q));
  switch(FILTERS.sort){
    case 'precio-asc': list.sort((a,b)=>a.precio-b.precio); break;
    case 'precio-desc': list.sort((a,b)=>b.precio-a.precio); break;
    case 'nuevos': list.sort((a,b)=> new Date(b.fecha_publicacion) - new Date(a.fecha_publicacion)); break;
    default: break;
  }
  return list;
}

function renderProducts(){
  const grid = byId('grid'); grid.innerHTML='';
  const list = getFiltered();
  list.forEach(p => grid.appendChild(renderCard(p)));
  // actualizar contadores de categorías post-filtro
  updateCategoryCounts(list);
}

function updateCategoryCounts(currentList){
  const elList = byId('catList');
  const counts = {};
  currentList.forEach(p => counts[p.categoria] = (counts[p.categoria]||0)+1);
  Array.from(elList.children).forEach(row=>{
    const cat = row.querySelector('input').getAttribute('data-cat');
    const n = counts[cat] || 0;
    row.lastElementChild.textContent = n;
    // disable if zero (pero visible para transparencia)
    row.style.opacity = n ? 1 : 0.5;
  });
}

function renderCard(p){
  const card = el('article','product card');
  const hasDiscount = p.precio_anterior && p.precio_anterior > p.precio;
  const ribbon = hasDiscount ? `<div class="ribbon">-${Math.round((1 - p.precio/p.precio_anterior)*100)}%</div>` : '';
  const envio = p.envio_gratis ? `<div class="badge">ENVÍO GRATIS</div>` : '';
  card.innerHTML = `
    ${ribbon}${envio}
    <img loading="lazy" src="${p.imagenes?.[0]||''}" alt="${p.nombre}"/>
    <div class="brand">${p.vendedor || p.marca || ''}</div>
    <div class="title">${p.nombre}</div>
    <div class="price">
      <span class="current">${fmtS(p.precio)}</span>
      ${hasDiscount ? `<span class="old">${fmtS(p.precio_anterior)}</span>`:''}
    </div>
    <button class="btn">Agregar al carrito</button>
  `;
  card.querySelector('.btn').addEventListener('click', (e)=>{
    e.stopPropagation();
    addToCart(p.id, 1);
  });
  card.addEventListener('click', ()=> openDetail(p));
  return card;
}

// --------- Detalle de producto (overlay)

function openDetail(p){
  const overlay = byId('overlay'), modal = byId('modal'), box = byId('detail');
  const imgs = Array.isArray(p.imagenes) && p.imagenes.length ? p.imagenes : ['img/placeholder.svg'];
  box.innerHTML = `
    <div class="detail-left">
      <button class="nav prev" id="navPrev" aria-label="Anterior">‹</button>
      <img id="mainImg" src="${imgs[0]}" alt="${p.nombre}" onerror="this.onerror=null;this.src='img/placeholder.svg'"/>
      <button class="nav next" id="navNext" aria-label="Siguiente">›</button>
      ${imgs.length>1 ? `<div class="thumbs">${imgs.map((src,i)=>`<img data-idx="${i}" src="${src}" alt="thumb"/>`).join('')}</div>` : ''}
    </div>
    <div class="detail-right">
      <div class="brand">${p.vendedor || p.marca || ''}</div>
      <div class="title">${p.nombre}</div>
      <div class="price" style="margin:10px 0">
        <span class="current">${fmtS(p.precio)}</span>
        ${p.precio_anterior ? `<span class="old">${fmtS(p.precio_anterior)}</span>`:''}
      </div>
      <p style="color:var(--muted)">${p.descripcion_corta || ''}</p>
      <div class="sticky-add">
        <button id="minus" class="qty">−</button>
        <span id="qty">1</span>
        <button id="plus" class="qty">+</button>
        <button id="add" class="btn-add">Agregar al carrito</button>
      </div>
      <hr/>
      <h3>Descripción del producto</h3>
      <p>${p.descripcion_larga || ''}</p>
      <div class="sku muted">SKU: ${p.sku || ''}</div>
    </div>`;
  // interactions
  let cur = 0;
  const gallery = imgs.slice();
  const main = document.getElementById('mainImg');
  const thumbs = box.querySelectorAll('img[data-idx]');
  function show(i){
    if(!gallery.length) return;
    cur = (i + gallery.length) % gallery.length;
    main.src = gallery[cur] || 'img/placeholder.svg';
  }
  thumbs.forEach(t=> t.addEventListener('click', ()=> show(parseInt(t.dataset.idx,10)) ));
  byId('navPrev')?.addEventListener('click', ()=> show(cur-1));
  byId('navNext')?.addEventListener('click', ()=> show(cur+1));
  let q = 1;
  box.querySelector('#minus').onclick = ()=>{ q = Math.max(1, q-1); box.querySelector('#qty').textContent = q; };
  box.querySelector('#plus').onclick = ()=>{ q = Math.min(99, q+1); box.querySelector('#qty').textContent = q; };
  box.querySelector('#add').onclick = ()=> addToCart(p.id, q);

  // show modal
  overlay.classList.add('show'); modal.classList.add('show');
  overlay.onclick = closeDetail;
  const closeBtn = document.getElementById('closeDetailBtn');
  if(closeBtn){ closeBtn.onclick = closeDetail; closeBtn.style.display='flex'; }
  document.addEventListener('keydown', escClose);
  function escClose(ev){ if (ev.key === 'Escape') closeDetail(); }
  function closeDetail(){
    overlay.classList.remove('show'); modal.classList.remove('show');
    document.removeEventListener('keydown', escClose);
  }
}


// --------- Carrito (localStorage solo aquí)
function initCart(){
  updateCartBadge();
  renderCart();
  byId('open-cart').addEventListener('click', ()=> byId('drawer').classList.add('open'));
  byId('close-cart').addEventListener('click', ()=> byId('drawer').classList.remove('open'));
}

function getCart(){ try{ return JSON.parse(localStorage.getItem(CART_KEY) || '[]'); }catch{ return [] } }
function setCart(list){ localStorage.setItem(CART_KEY, JSON.stringify(list)); updateCartBadge(); renderCart(); }

function addToCart(id, qty){
  // validar que producto exista en dataset actual
  const exists = DATASET.find(p => p.id === id);
  if (!exists){ alert('Este producto ya no está disponible.'); return; }
  const cart = getCart();
  const item = cart.find(i => i.id === id);
  if (item) item.qty = Math.min(99, item.qty + qty);
  else cart.push({ id, qty });
  setCart(cart);
  // toast simple
  const c = document.createElement('div');
  c.textContent = 'Añadido al carrito'; c.style.cssText='position:fixed;bottom:16px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:8px 12px;border-radius:999px;z-index:140';
  document.body.appendChild(c); setTimeout(()=>c.remove(), 1200);
}

function removeFromCart(id){ setCart(getCart().filter(i=>i.id!==id)); }
function setQty(id, qty){
  const cart = getCart(); const it = cart.find(i=>i.id===id); if (!it) return;
  it.qty = Math.max(1, Math.min(99, qty)); setCart(cart);
}

function updateCartBadge(){
  const n = getCart().reduce((s,i)=>s+i.qty,0);
  byId('cart-count').textContent = n;
}

function renderCart(){
  const body = byId('cart-body'); body.innerHTML='';
  const map = new Map(DATASET.map(p=>[p.id,p]));
  let subtotal = 0;
  getCart().forEach(item => {
    const p = map.get(item.id);
    if (!p){
      // producto ya no existe
      const row = el('div','cart-item');
      row.innerHTML = `<div style="width:64px;height:64px;background:#eee;border-radius:8px"></div>
        <div><div style="font-weight:700">Producto no disponible</div><div style="color:var(--muted);font-size:12px">${item.id}</div></div>
        <button class="iconbtn" aria-label="Eliminar">🗑</button>`;
      row.querySelector('button').onclick = ()=> removeFromCart(item.id);
      body.appendChild(row);
      return;
    }
    subtotal += p.precio * item.qty;
    const row = el('div','cart-item');
    row.innerHTML = `<img src="${p.imagenes?.[0]||''}" alt="" style="width:64px;height:64px;border-radius:8px;object-fit:cover"/>
      <div><div style="font-weight:700">${p.nombre}</div><div style="color:var(--muted)">${fmtS(p.precio)}</div></div>
      <div>
        <div class="qty">
          <button aria-label="Restar">−</button>
          <span>${item.qty}</span>
          <button aria-label="Sumar">+</button>
        </div>
        <div style="text-align:right;margin-top:6px"><button class="iconbtn" title="Eliminar">🗑</button></div>
      </div>`;
    const [minus, plus] = row.querySelectorAll('.qty button');
    minus.onclick = ()=> setQty(item.id, item.qty-1);
    plus.onclick = ()=> setQty(item.id, item.qty+1);
    row.querySelector('button.iconbtn').onclick = ()=> removeFromCart(item.id);
    body.appendChild(row);
  });
  byId('subtotal').textContent = fmtS(subtotal);
}

// Drawer
function initDrawer(){
  const drawer = byId('drawer');
  document.addEventListener('keydown', (e)=>{ if(e.key==='Escape') drawer.classList.remove('open'); });
}

// --------- Comunicados (support: floating | modal). Banner deshabilitado
async function initComunicados(){
  try{
    const cfg = await fetch(COMUNICADOS_URL).then(r=>r.json());
    if(!cfg.activo) return; // no mostrar en PC ni móvil si está desactivado
    if(cfg.modo === 'floating'){
      const wrap = document.createElement('div');
      wrap.id = 'floating-promo';
      wrap.className = (cfg.posicion || 'br');
      wrap.style.maxWidth = (cfg.width ? cfg.width+'px' : '260px');
      wrap.innerHTML = `<div class="card" style="position:relative"><button class="close" aria-label="Cerrar">✕</button><a href="${cfg.enlace||'#'}" target="_blank" rel="noopener"><img src="comunicados/${cfg.imagen}" alt="Comunicado"></a></div>`;
      document.body.appendChild(wrap);
      wrap.querySelector('.close').onclick = ()=> wrap.remove();
    } else if (cfg.modo === 'modal'){
      const overlay = byId('overlay'), modal = byId('modal');
      const box = byId('detail');
      box.innerHTML = `<img src="comunicados/${cfg.imagen}" alt="Comunicado">`;
      overlay.classList.add('show'); modal.classList.add('show');
      overlay.onclick = ()=>{ overlay.classList.remove('show'); modal.classList.remove('show'); };
      document.addEventListener('keydown', (e)=>{ if(e.key==='Escape'){ overlay.classList.remove('show'); modal.classList.remove('show'); } });
    }
  }catch(e){ /* silencioso */ }
}

// --------- Effects (nieve)
async function initEffects(){
  try{
    const cfg = await fetch(EFFECTS_URL).then(r=>r.json());
    if(!cfg.enabled) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if(cfg.effect === 'snow') startSnow(cfg.intensity||0.6);
  }catch(e){}
}

function startSnow(intensity){
  const c = byId('effects-canvas'); const ctx = c.getContext('2d');
  let w, h, flakes = [];
  function resize(){ w = c.width = window.innerWidth; h = c.height = window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  const N = Math.floor((w*h)/22000 * intensity);
  for(let i=0;i<N;i++){ flakes.push({x:Math.random()*w, y:Math.random()*h, r:1+Math.random()*2, s:0.5+Math.random()}); }
  let raf;
  function tick(){
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='rgba(255,255,255,.95)';
    flakes.forEach(f=>{
      f.y += f.s; f.x += Math.sin(f.y*0.01)*0.3;
      if (f.y > h){ f.y = -5; f.x = Math.random()*w; }
      ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, Math.PI*2); ctx.fill();
    });
    raf = requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', ()=>{
    if(document.hidden) cancelAnimationFrame(raf); else tick();
  });
  tick();
}

// --------- Effects (SVG background)
async function initEffects(){
  try{
    const cfg = await fetch(EFFECTS_URL).then(r=>r.json());
    if(!cfg.enabled) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const layer = document.getElementById('effects-layer');
    layer.style.opacity = (cfg.opacity ?? 0.85);
    const url = cfg.svg ? ('effects/' + cfg.svg) : null;
    if(!url) return;
    layer.style.backgroundImage = `url('${url}')`;
    const mode = cfg.mode || 'cover';
    if(mode === 'tile'){
      layer.style.backgroundRepeat = 'repeat';
      layer.style.backgroundSize = cfg.size || '120px';
      layer.style.backgroundPosition = 'top left';
    }else if(mode === 'contain'){
      layer.style.backgroundRepeat = 'no-repeat';
      layer.style.backgroundSize = cfg.size || 'contain';
      layer.style.backgroundPosition = 'center';
    }else{ // cover
      layer.style.backgroundRepeat = 'no-repeat';
      layer.style.backgroundSize = cfg.size || 'cover';
      layer.style.backgroundPosition = 'center';
    }
  }catch(e){}
}
