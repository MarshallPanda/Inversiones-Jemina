
const NOIMG = "https://via.placeholder.com/600x400?text=Producto";
let DATA = [];
let CART = [];

const el = s => document.querySelector(s);
const fmt = n => "S/ " + (Math.round(n*100)/100).toFixed(2);

function loadData(){
  const override = localStorage.getItem('products_data_override');
  if(override){ DATA = JSON.parse(override); return Promise.resolve(); }
  try{ DATA = JSON.parse(document.getElementById('embeddedProducts').textContent||"[]"); }catch(e){ DATA=[]; }
  return Promise.resolve();
}

function getParam(name){
  const url = new URL(location.href);
  return url.searchParams.get(name);
}
function priceEffective(p, sizeName=null){
  const base = p.price ?? 0;
  const delta = (p.variants?.sizes && sizeName) ? (p.variants.sizes.find(s=>s.name===sizeName)?.deltaPrice || 0) : 0;
  const subtotal = base + delta;
  return p.discountPct ? subtotal*(1 - p.discountPct/100) : subtotal;
}

function renderPdp(p){
  const sizes = p.variants?.sizes || [];
  const imgs = p.images?.length ? p.images : [NOIMG];
  const first = imgs[0];

  el('#bcCat').textContent = p.category || "Producto";

  const shell = document.getElementById('pdp');
  shell.innerHTML = `
    <div class="gallery">
      <div class="thumbs" id="thumbs"></div>
      <div class="hero"><img id="heroImg" src="${first}" onerror="this.src='${NOIMG}'"></div>
    </div>
    <div>
      <h1 class="pdp-title">${p.name}</h1>
      <div class="pdp-brand">${p.brand||''}</div>
      <div class="pdp-price" id="priceBox">${fmt(priceEffective(p))}</div>
      <div class="pdp-controls">
        ${sizes.length?`<div class="variant" id="sizes">${sizes.map(s=>`<button data-size="${s.name}">${s.name}</button>`).join('')}</div>`:''}
        <button class="fullbtn" id="addCart">Agregar al carrito</button>
      </div>
      <div class="section">
        <h4>Descripción</h4>
        <div>${p.description||'Sin descripción.'}</div>
      </div>
    </div>`;

  // thumbs
  const box = el('#thumbs');
  imgs.forEach((u,i)=>{
    const t = document.createElement('img');
    t.src = u; t.onerror=()=>{t.src=NOIMG};
    if(i===0) t.classList.add('active');
    t.addEventListener('click',()=>{
      document.querySelectorAll('#thumbs img').forEach(n=>n.classList.remove('active'));
      t.classList.add('active');
      el('#heroImg').src = u;
    });
    box.appendChild(t);
  });

  // sizes
  let selSize = null;
  if(sizes.length){
    const btns = Array.from(document.querySelectorAll('#sizes button'));
    btns[0].classList.add('active'); selSize = btns[0].dataset.size;
    el('#priceBox').textContent = fmt(priceEffective(p, selSize));
    btns.forEach(b=>b.addEventListener('click',()=>{
      btns.forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      selSize = b.dataset.size;
      el('#priceBox').textContent = fmt(priceEffective(p, selSize));
    }));
  }

  el('#addCart').addEventListener('click',()=> addToCart(p,1,selSize));
}

function addToCart(p, qty=1, size=null){
  const key = p.id+"__"+(size||"");
  const found = CART.find(it=>it.key===key);
  const price = priceEffective(p,size);
  if(found) found.qty+=qty; else CART.push({key,id:p.id,name:p.name,price,img:(p.images&&p.images[0])||NOIMG,qty,size});
  localStorage.setItem('cart', JSON.stringify(CART));
  alert('Producto agregado');
}

(async function(){
  await loadData();
  CART = JSON.parse(localStorage.getItem('cart')||"[]");
  const id = getParam('id');
  const p = DATA.find(x=> String(x.id)===String(id));
  if(!p){ document.getElementById('pdp').innerHTML="<p>No encontrado.</p>"; return; }
  renderPdp(p);
})();
