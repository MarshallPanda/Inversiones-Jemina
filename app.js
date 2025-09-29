/* ======================================================
   Lógica del catálogo (datos en products.js)
   - Splash con audio interno auto (sin botones)
   - Filtros (precio + categorías), búsqueda, modal, carrito, WhatsApp
   - Contador de carrito = productos únicos (no cantidades)
   ====================================================== */

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const money = n => `S/ ${Number(n).toFixed(2)}`;
const storage = {
  get(k, def){ try{ return JSON.parse(localStorage.getItem(k)) ?? def } catch{ return def } },
  set(k, v){ localStorage.setItem(k, JSON.stringify(v)); }
};

/* --------- Filtros / taxonomías --------- */
function normalizeFilters(f){
  const obj = f ?? {};
  return {
    min: Number(obj.min) || 0,
    max: Number(obj.max) || 9999,
    cats: obj.cats instanceof Set ? obj.cats : new Set(obj.cats || []),
    q: (obj.q || "").toString()
  };
}
function getAllCategories(products){ return [...new Set(products.map(p => p.category))].sort(); }
function getMaxPossiblePrice(products){
  let max = 0;
  for(const p of products){
    const maxDelta = Math.max(0, ...p.variants.flatMap(v => (v.sizes||[]).map(s => s.delta||0)));
    max = Math.max(max, (p.basePrice || 0) + maxDelta);
  }
  return max;
}

/* --------- Estado --------- */
const state = {
  products: PRODUCTS,
  cart: storage.get('cart', []),
  filters: normalizeFilters(storage.get('filters', { min:0, max:9999, cats:[], q:"" })),
  modal: { id:null, color:null, size:null, qty:1 },
  taxonomies: { cats: [] }
};

/* --------- Contador de carrito (productos únicos) --------- */
function uniqueProductCount(){
  // cuenta por ID de producto (ignora cantidad/variantes).
  return new Set(state.cart.map(it => it.id)).size;
}
function updateCartCount(){
  const el = document.getElementById('cartCount');
  if(el) el.textContent = uniqueProductCount();
}

/* --------- Splash + Audio (interno, sin controles) --------- */
const SPLASH_MS = 4400;
const splash = $('#splash');
const skipSplash = $('#skipSplash');
const splashAudio = $('#splashAudio');

function stopSplashAudio(){
  if(!splashAudio) return;
  try{ splashAudio.pause(); splashAudio.currentTime = 0; }catch{}
}
function closeSplash(){
  if(!splash) return;
  stopSplashAudio();
  splash.style.transition='opacity .5s ease';
  splash.style.opacity='0';
  setTimeout(()=> splash.remove(), 520);
}
async function startAudioAuto(){
  if(!splashAudio) return;
  splashAudio.volume = 0.0;     // fade-in suave
  splashAudio.muted  = false;   // intentar desmutear
  try{
    await splashAudio.play();
    const target = 0.6, steps = 6; let i=0;
    const iv = setInterval(()=>{
      i++; splashAudio.volume = Math.min(target, i*(target/steps));
      if(i>=steps) clearInterval(iv);
    }, 120);
  }catch{
    // si el autoplay con sonido es bloqueado, se activa en el primer gesto
    const resume = ()=>{
      try{
        splashAudio.muted=false;
        splashAudio.volume=0.6;
        splashAudio.play().catch(()=>{});
      }catch{}
      document.removeEventListener('pointerdown', resume, {capture:true});
      document.removeEventListener('keydown', resume, {capture:true});
    };
    document.addEventListener('pointerdown', resume, {capture:true, once:true});
    document.addEventListener('keydown', resume, {capture:true, once:true});
  }
}
let splashTimer = setTimeout(closeSplash, SPLASH_MS);
skipSplash?.addEventListener('click', ()=>{ clearTimeout(splashTimer); closeSplash(); });
window.addEventListener('DOMContentLoaded', ()=>{ startAudioAuto(); });

/* --------- Chips / Filtros --------- */
function paintChips(container, items, activeSet){
  container.innerHTML = "";
  items.forEach(txt=>{
    const b = document.createElement('button');
    b.type='button';
    b.className='chip' + (activeSet.has(txt)?' active':'');
    b.textContent = txt;
    b.addEventListener('click',()=>{
      if(activeSet.has(txt)) activeSet.delete(txt); else activeSet.add(txt);
      b.classList.toggle('active');
    });
    container.appendChild(b);
  });
}
function refreshTaxonomies(){
  const cats = getAllCategories(state.products);
  state.taxonomies.cats = cats;
  state.filters.cats = new Set([...state.filters.cats].filter(c => cats.includes(c)));
  paintChips($('#categoryFilters'), cats, state.filters.cats);
}
function setupPriceRangeUI(){
  const maxPossible = getMaxPossiblePrice(state.products);
  const maxInput = $('#maxPrice'); const hint = $('#priceHint');
  if(maxInput){
    maxInput.placeholder = `${maxPossible}`;
    if(!state.filters.max || state.filters.max === 9999) {
      maxInput.value = maxPossible; state.filters.max = maxPossible;
    }
  }
  if(hint){ hint.textContent = `Máximo sugerido: ${money(maxPossible)} (precio más alto en catálogo)`; }
}
function persistFilters(){
  storage.set('filters', {
    min: Number($('#minPrice').value)||0,
    max: Number($('#maxPrice').value)||9999,
    cats: [...state.filters.cats],
    q: $('#searchInput').value.trim()
  });
  state.filters = normalizeFilters(storage.get('filters'));
}

/* --------- Listado --------- */
const grid = $('#productsGrid');
function firstVariant(p){ return p.variants?.[0]; }
function firstImageOf(p){ return firstVariant(p)?.images?.[0] || NOIMG; }

function productCard(p){
  const el = document.createElement('article');
  el.className = 'card';
  el.innerHTML = `
    <img src="${firstImageOf(p)}" alt="${p.name}" onerror="this.onerror=null;this.src='${NOIMG}'">
    <div class="content">
      <span class="badge">${p.category}</span>
      <h3>${p.name}</h3>
      <div class="muted">${p.brand}</div>
      <div class="price">${money(p.basePrice)}</div>
      <div class="actions">
        <button class="btn more">Ver</button>
        <button class="btn" data-id="${p.id}">Agregar</button>
      </div>
    </div>`;
  el.querySelector('.more').addEventListener('click',()=>openModal(p.id));
  el.querySelector('[data-id]').addEventListener('click',()=>openModal(p.id));
  return el;
}
function applyFilters(list){
  const f = state.filters;
  const q = (f.q||"").toLowerCase();
  return list.filter(p=>{
    const byPrice = (p.basePrice||0) >= f.min && (p.basePrice||0) <= f.max;
    const byCat   = f.cats.size ? f.cats.has(p.category) : true;
    const searchable = [p.name,p.brand,p.category,...p.variants.map(v=>v.color)].join(" ").toLowerCase();
    const byQ = searchable.includes(q);
    return byPrice && byCat && byQ;
  });
}
function render(){
  state.filters.min = Number($('#minPrice').value)||0;
  state.filters.max = Number($('#maxPrice').value)||9999;
  state.filters.q   = $('#searchInput').value.trim();

  const filtered = applyFilters(state.products);
  grid.innerHTML = "";
  filtered.forEach(p=> grid.appendChild(productCard(p)));
  updateCartCount();                 // << contador por productos únicos
  storage.set('cart', state.cart);
}

/* --------- Búsqueda / Filtros --------- */
$('#searchInput').addEventListener('input',()=>{ persistFilters(); render(); });
$('#applyFilters').addEventListener('click', ()=>{
  state.filters.cats = new Set([...document.querySelectorAll('#categoryFilters .chip.active')].map(el=>el.textContent.trim()));
  state.filters.min = Number($('#minPrice').value)||0;
  state.filters.max = Number($('#maxPrice').value)||0;
  persistFilters(); render();
});
$('#clearFilters').addEventListener('click',()=>{
  state.filters.cats.clear();
  $('#minPrice').value = 0;
  $('#maxPrice').value = getMaxPossiblePrice(state.products);
  $('#searchInput').value = "";
  persistFilters(); refreshTaxonomies(); render();
});

/* --------- Modal (variantes por color + tallas) --------- */
const modal = $('#productModal');
const galleryMain = $('#galleryMain');
const galleryThumbs = $('#galleryThumbs');
const modalColors = $('#modalColors');
const modalSizes = $('#modalSizes');

function getProduct(id){ return state.products.find(x=>x.id===id); }
function getVariant(p,color){ return p.variants.find(v=>v.color===color); }

function openModal(id){
  const p = getProduct(id); if(!p) return;
  const initialVariant = p.variants.find(v=>v.sizes.some(s=>s.stock>0)) || p.variants[0];
  const firstSize = initialVariant.sizes.find(s=>s.stock>0)?.label || initialVariant.sizes?.[0]?.label || null;
  state.modal = { id:p.id, color:initialVariant.color, size:firstSize, qty:1 };

  $('#modalName').textContent = p.name;
  $('#modalBrand').textContent = ` ${p.brand}`;
  $('#modalDesc').textContent  = p.description ?? "";
  $('#qtyValue').textContent = 1;

  paintVariantUI(p);
  modal.showModal();
}
function paintVariantUI(p){
  const v = getVariant(p,state.modal.color);

  // Galería
  const imgs = (v.images && v.images.length)? v.images : [NOIMG];
  galleryMain.src = imgs[0];
  galleryMain.onerror = ()=>{ galleryMain.onerror=null; galleryMain.src=NOIMG; };
  galleryThumbs.innerHTML = "";
  imgs.forEach((src,i)=>{
    const t=document.createElement('img'); t.src=src; t.onerror=()=>{t.onerror=null;t.src=NOIMG};
    if(i===0) t.classList.add('active');
    t.addEventListener('click',()=>{ $$('#galleryThumbs img').forEach(x=>x.classList.remove('active')); t.classList.add('active'); galleryMain.src=src; });
    galleryThumbs.appendChild(t);
  });

  // Colores
  modalColors.innerHTML = "";
  p.variants.forEach(variant=>{
    const b=document.createElement('button'); b.type='button'; b.className='chip'+(variant.color===state.modal.color?' active':'');
    b.textContent=variant.color;
    b.addEventListener('click',()=>{
      state.modal.color=variant.color;
      state.modal.size = variant.sizes.find(s=>s.stock>0)?.label || variant.sizes?.[0]?.label || null;
      paintVariantUI(p);
    });
    modalColors.appendChild(b);
  });

  // Tallas
  modalSizes.innerHTML = "";
  if(!v.sizes.length){
    $('#modalPrice').textContent = money(p.basePrice);
  }else{
    v.sizes.forEach(s=>{
      const b=document.createElement('button'); b.type='button'; b.className='chip'; b.textContent=s.label;
      if(s.stock<=0){ b.disabled=true; b.style.opacity=.5; b.title='Agotado'; }
      if(s.label===state.modal.size) b.classList.add('active');
      b.addEventListener('click',()=>{ if(s.stock<=0) return; state.modal.size=s.label; $$('#modalSizes .chip').forEach(x=>x.classList.remove('active')); b.classList.add('active'); updateModalPrice(); });
      modalSizes.appendChild(b);
    });
    if(!v.sizes.some(s=>s.label===state.modal.size)){
      state.modal.size = v.sizes.find(s=>s.stock>0)?.label || v.sizes?.[0]?.label || null;
    }
    updateModalPrice();
  }
}
function currentPrice(prod){
  const v=getVariant(prod,state.modal.color);
  if(!v || !v.sizes.length) return prod.basePrice;
  const s=v.sizes.find(x=>x.label===state.modal.size);
  return prod.basePrice + (s?.delta ?? 0);
}
function updateModalPrice(){
  const p=getProduct(state.modal.id);
  $('#modalPrice').textContent = money(currentPrice(p));
}
$('#qtyMinus').addEventListener('click',()=>{ if(state.modal.qty>1){ state.modal.qty--; $('#qtyValue').textContent=state.modal.qty }});
$('#qtyPlus').addEventListener('click',()=>{ state.modal.qty++; $('#qtyValue').textContent=state.modal.qty });
$('#closeModal').addEventListener('click',()=>modal.close());
$('#addToCart').addEventListener('click',()=>{
  const p=getProduct(state.modal.id); const price=currentPrice(p);
  const key=it=>[it.id,it.color,it.size].join('|');
  const idx=state.cart.findIndex(it=> key(it)===key({id:p.id,color:state.modal.color,size:state.modal.size}));
  if(idx>-1){ state.cart[idx].qty += state.modal.qty; }
  else{
    const v=getVariant(p,state.modal.color);
    state.cart.push({ id:p.id, name:p.name, img:(v.images?.[0]||NOIMG), color:state.modal.color, size:state.modal.size, unitPrice:price, qty:state.modal.qty });
  }
  storage.set('cart',state.cart); render(); modal.close(); openCart();
});

/* --------- Carrito --------- */
const cartDrawer = $('#cartDrawer');
$('#openCart').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
function openCart(){ cartDrawer.classList.add('open'); paintCart(); }
function closeCart(){ cartDrawer.classList.remove('open'); }

$('#clearCart').addEventListener('click',()=>{ state.cart=[]; storage.set('cart',state.cart); paintCart(); render(); });
function paintCart(){
  const box=$('#cartItems'); box.innerHTML=""; let subtotal=0;
  state.cart.forEach((it,i)=>{
    subtotal += it.unitPrice*it.qty;
    const row=document.createElement('div'); row.className='cart-item';
    row.innerHTML=`
      <img src="${it.img}" alt="" onerror="this.onerror=null;this.src='${NOIMG}'">
      <div>
        <strong>${it.name}</strong>
        <div class="muted">${[it.color?`Color: ${it.color}`:null,it.size?`Talla: ${it.size}`:null].filter(Boolean).join(" · ")}</div>
        <div class="muted">${money(it.unitPrice)} c/u</div>
        <div class="chips" style="margin-top:6px;">
          <button class="btn sm" data-act="minus">−</button>
          <span style="min-width:28px;text-align:center;font-weight:900">${it.qty}</span>
          <button class="btn sm" data-act="plus">+</button>
          <button class="btn sm btn-outline" data-act="remove">Quitar</button>
        </div>
      </div>
      <div style="display:grid;place-items:center;font-weight:900">${money(it.unitPrice*it.qty)}</div>`;
    row.addEventListener('click',(e)=>{
      const act=e.target.dataset.act; if(!act) return;
      if(act==='minus' && it.qty>1) it.qty--;
      if(act==='plus') it.qty++;
      if(act==='remove') state.cart.splice(i,1);
      storage.set('cart',state.cart); paintCart(); render();
    });
    box.appendChild(row);
  });
  $('#subTotal').textContent = money(subtotal);
  updateCartCount();               // << contador por productos únicos
}

/* --------- WhatsApp --------- */
$('#quoteBtn').addEventListener('click',()=>{
  if(!state.cart.length) return alert('Tu carrito está vacío.');
  const lines=state.cart.map(it=>{
    const opts=[it.color?`Color: ${it.color}`:null,it.size?`Talla: ${it.size}`:null].filter(Boolean).join(' | ');
    return `• ${it.name} (${opts}) — ${it.qty} x ${money(it.unitPrice)} = ${money(it.unitPrice*it.qty)}`;
  });
  const total=state.cart.reduce((s,i)=>s+i.unitPrice*i.qty,0);
  const text=['Hola, quisiera una cotización:',...lines,`Subtotal: ${money(total)}`,'Enviado desde el catálogo web.'].join('\n');
  const url=`https://api.whatsapp.com/send?phone=51935319092&text=${encodeURIComponent(text)}`;
  window.open(url,'_blank');
});

/* --------- Init --------- */
(function init(){
  $('#minPrice').value = state.filters.min;
  $('#maxPrice').value = state.filters.max;
  refreshTaxonomies();
  setupPriceRangeUI();
  persistFilters();
  render();

  // Filtros colapsados en móvil
  const fw = document.getElementById('filtersWrap');
  if (window.matchMedia('(max-width: 640px)').matches && fw) fw.open = false;
})();
