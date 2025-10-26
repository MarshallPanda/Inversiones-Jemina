
const NOIMG = "https://via.placeholder.com/600x400?text=Producto";

let ALL = [];
let FILTERS = { q:"", cats:new Set(), min:0, max:0 };
let CART = [];

const el = sel => document.querySelector(sel);
const fmt = n => "S/ " + (Math.round(n*100)/100).toFixed(2);

function loadData(){
  const override = localStorage.getItem('products_data_override');
  if(override){ ALL = JSON.parse(override); return Promise.resolve(); }
  try{ ALL = JSON.parse(document.getElementById('embeddedProducts').textContent||"[]"); }catch(e){ ALL=[]; }
  return Promise.resolve();
}

function priceEffective(p, sizeName=null){
  const base = p.price ?? 0;
  const delta = (p.variants?.sizes && sizeName) ? (p.variants.sizes.find(s=>s.name===sizeName)?.deltaPrice || 0) : 0;
  const subtotal = base + delta;
  const off = p.discountPct ? subtotal*(1 - p.discountPct/100) : subtotal;
  return off;
}
function minMaxPrice(p){
  if(p.variants?.sizes?.length){
    let vals = p.variants.sizes.map(s=>priceEffective(p,s.name));
    return [Math.min(...vals), Math.max(...vals)];
  }
  const v = priceEffective(p);
  return [v,v];
}

function sliderBounds(){
  let max = 0, min = Infinity;
  ALL.filter(p=>p.active).forEach(p=>{
    const [mi,ma] = minMaxPrice(p);
    max = Math.max(max, ma);
    min = Math.min(min, mi);
  });
  if(!isFinite(min)) min = 0;
  if(max===0){ max = 1000; }
  return {min: Math.floor(min), max: Math.ceil(max)};
}

function buildFilters(){
  const b = sliderBounds();
  FILTERS.min = 0;
  FILTERS.max = b.max;
  el('#minLabel').textContent = fmt(FILTERS.min);
  el('#maxLabel').textContent = fmt(FILTERS.max);
  ['#rangeMin','#rangeMax'].forEach(s=>{
    el(s).min = 0; el(s).max = b.max;
  });
  el('#rangeMin').value = 0;
  el('#rangeMax').value = b.max;
  updateFill();

  const map = new Map();
  ALL.filter(p=>p.active).forEach(p=> map.set(p.category || "Sin categoría",(map.get(p.category||"Sin categoría")||0)+1));
  const cats = Array.from(map.entries()).sort((a,b)=>b[1]-a[1]);
  const list = el('#catList'); list.innerHTML = "";
  cats.forEach(([name,count])=>{
    const row = document.createElement('label'); row.className='cat-item';
    row.innerHTML = `<div><input type="checkbox" data-cat="${name}"> ${name}</div><span>(${count})</span>`;
    list.appendChild(row);
  });
}

function updateFill(){
  const min = Number(el('#rangeMin').value);
  const max = Number(el('#rangeMax').value);
  const limit = Number(el('#rangeMax').max);
  const left = (min/limit)*100;
  const right = 100 - (max/limit)*100;
  el('#rangeFill').style.left = left+'%';
  el('#rangeFill').style.right = right+'%';
  el('#minLabel').textContent = fmt(Math.min(min,max));
  el('#maxLabel').textContent = fmt(Math.max(min,max));
}

function applyFilters(){
  const q = FILTERS.q.trim().toLowerCase();
  const cats = Array.from(FILTERS.cats);
  let rmin = Number(el('#rangeMin').value || 0);
  let rmax = Number(el('#rangeMax').value || sliderBounds().max);
  if(rmin>rmax){ const t=rmin; rmin=rmax; rmax=t; }
  const sort = el('#sortSelect').value;

  let arr = ALL.filter(p=>p.active);
  if(q) arr = arr.filter(p => (p.name+p.brand+p.category).toLowerCase().includes(q));
  if(cats.length) arr = arr.filter(p=> cats.includes(p.category||"Sin categoría"));
  arr = arr.filter(p=>{
    const [mi,ma] = minMaxPrice(p);
    return ma >= rmin && mi <= rmax;
  });

  if(sort==='pricelow') arr.sort((a,b)=>minMaxPrice(a)[0]-minMaxPrice(b)[0]);
  else if(sort==='pricehigh') arr.sort((a,b)=>minMaxPrice(b)[0]-minMaxPrice(a)[0]);
  else if(sort==='discount') arr.sort((a,b)=>(b.discountPct||0)-(a.discountPct||0));

  renderGrid(arr);
}

function renderGrid(arr){
  const g = el('#grid'); g.innerHTML="";
  el('#countInfo').textContent = `Se muestran ${arr.length} producto(s)`;
  arr.forEach(p=>{
    const [mi,ma] = minMaxPrice(p);
    const priceTxt = mi===ma ? `<span class="price">${fmt(mi)}</span>` : `<span class="range-price">${fmt(mi)} – ${fmt(ma)}</span>`;
    const old = p.priceOld ? `<span class="price-old">${fmt(p.priceOld)}</span>` : "";
    const badge = p.discountPct ? `<div class="badge">-${p.discountPct}%</div>` : "";
    const img = (p.images && p.images[0]) || NOIMG;
    const card = document.createElement('div');
    card.className = "card";
    card.innerHTML = `
      <a class="imgwrap link" href="product.html?id=${encodeURIComponent(p.id)}">
        ${badge}
        <img src="${img}" onerror="this.src='${NOIMG}'">
      </a>
      <div class="content">
        <div class="brand-txt">${p.brand||''}</div>
        <a class="title link" href="product.html?id=${encodeURIComponent(p.id)}">${p.name}</a>
        <div>${priceTxt} ${old}</div>
        <div class="card-actions">
          <button class="cta">Agregar al carrito</button>
          <button class="fav">♡</button>
        </div>
      </div>`;
    card.querySelector('.cta').addEventListener('click',()=> addToCart(p) );
    g.appendChild(card);
  });
}

function addToCart(p, qty=1, size=null){
  const key = p.id+"__"+(size||"");
  const found = CART.find(it=>it.key===key);
  const price = priceEffective(p,size);
  if(found) found.qty+=qty; else CART.push({key,id:p.id,name:p.name,price,img:(p.images&&p.images[0])||NOIMG,qty,size});
  saveCart();
  openCart();
}
function saveCart(){ localStorage.setItem('cart', JSON.stringify(CART)); renderCart(); }
function loadCart(){ CART = JSON.parse(localStorage.getItem('cart')||"[]"); renderCart(); }
function renderCart(){
  const box = el('#cartItems'); box.innerHTML="";
  let subtotal=0;
  CART.forEach((it,idx)=>{
    subtotal += it.price*it.qty;
    const row = document.createElement('div'); row.className='cart-item';
    row.innerHTML = `
      <img src="${it.img}" onerror="this.src='${NOIMG}'">
      <div>
        <div style="font-weight:800">${it.name}</div>
        <div class="note">${it.size?('Talla '+it.size):''}</div>
        <div style="margin-top:6px;font-weight:900">${fmt(it.price)}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:end;gap:6px">
        <div class="qty"><button data-i="${idx}" class="m">-</button><span>${it.qty}</span><button data-i="${idx}" class="p">+</button></div>
        <button class="btn" data-i="${idx}" id="rm${idx}">🗑️</button>
      </div>`;
    row.querySelector('.m').onclick=(e)=>{const i=+e.target.dataset.i; CART[i].qty=Math.max(1,CART[i].qty-1); saveCart();};
    row.querySelector('.p').onclick=(e)=>{const i=+e.target.dataset.i; CART[i].qty++; saveCart();};
    row.querySelector('#rm'+idx).onclick=(e)=>{ CART.splice(+e.target.dataset.i,1); saveCart(); };
    box.appendChild(row);
  });
  el('#cartSubtotal').textContent = fmt(subtotal);
}
function openCart(){ el('#cartDrawer').classList.add('open'); }
el('#openCart').addEventListener('click',openCart);
el('#closeCart').addEventListener('click',()=>el('#cartDrawer').classList.remove('open'));

function bindUI(){
  el('#doSearch').addEventListener('click',()=>{FILTERS.q=el('#searchInput').value; applyFilters();});
  el('#searchInput').addEventListener('keydown',e=>{ if(e.key==='Enter'){FILTERS.q=e.target.value; applyFilters();}});
  el('#sortSelect').addEventListener('change',applyFilters);
  el('#applyPrice').addEventListener('click',applyFilters);
  el('#resetFilters').addEventListener('click',()=>{ buildFilters(); FILTERS.cats.clear(); applyFilters(); });
  el('#catList').addEventListener('change',e=>{
    if(e.target.matches('input[type=checkbox]')){
      const c = e.target.dataset.cat;
      if(e.target.checked) FILTERS.cats.add(c); else FILTERS.cats.delete(c);
      applyFilters();
    }
  });
  ['#rangeMin','#rangeMax'].forEach(s=> el(s).addEventListener('input', ()=>{ updateFill(); }));
  el('#gotoCheckout').addEventListener('click',()=>alert('Flujo de checkout no implementado en esta demo.'));
}

(async function(){
  await loadData();
  buildFilters();
  bindUI();
  loadCart();
  applyFilters();
})();
