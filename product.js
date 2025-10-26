
const NOIMG = "https://via.placeholder.com/600x400?text=Producto";
let ALL = [];
let CART = [];
const el = s=>document.querySelector(s);
const fmt = n=>"S/ "+(Math.round(n*100)/100).toFixed(2);

function loadData(){
  const ov = localStorage.getItem('products_data_override');
  if(ov){ ALL = JSON.parse(ov); return Promise.resolve(); }
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

function addToCart(p, qty=1, size=null){
  let cart = JSON.parse(localStorage.getItem('cart')||"[]");
  const key = p.id+"__"+(size||"");
  const found = cart.find(it=>it.key===key);
  const price = priceEffective(p,size);
  if(found) found.qty+=qty; else cart.push({key,id:p.id,name:p.name,price,img:(p.images&&p.images[0])||NOIMG,qty,size});
  localStorage.setItem('cart', JSON.stringify(cart));
  renderCart();
  openCart();
}
function renderCart(){
  const box = el('#cartItems'); if(!box) return; box.innerHTML="";
  let cart = JSON.parse(localStorage.getItem('cart')||"[]");
  let subtotal=0;
  cart.forEach((it,idx)=>{
    subtotal+=it.price*it.qty;
    const row = document.createElement('div'); row.className='cart-item';
    row.innerHTML = `<img src="${it.img}" onerror="this.src='${NOIMG}'">
      <div><div style="font-weight:800">${it.name}</div><div class="note">${it.size?('Talla '+it.size):''}</div><div style="margin-top:6px;font-weight:900">${fmt(it.price)}</div></div>
      <div style="display:flex;flex-direction:column;align-items:end;gap:6px">
        <div class="qty"><button data-i="${idx}" class="m">-</button><span>${it.qty}</span><button data-i="${idx}" class="p">+</button></div>
        <button class="btn" data-i="${idx}" id="rm${idx}">🗑️</button>
      </div>`;
    row.querySelector('.m').onclick=(e)=>{const i=+e.target.dataset.i; cart[i].qty=Math.max(1,cart[i].qty-1); localStorage.setItem('cart',JSON.stringify(cart)); renderCart(); };
    row.querySelector('.p').onclick=(e)=>{const i=+e.target.dataset.i; cart[i].qty++; localStorage.setItem('cart',JSON.stringify(cart)); renderCart(); };
    row.querySelector('#rm'+idx).onclick=(e)=>{ cart.splice(+e.target.dataset.i,1); localStorage.setItem('cart',JSON.stringify(cart)); renderCart(); };
    box.appendChild(row);
  });
  el('#cartSubtotal').textContent = fmt(subtotal);
}
function openCart(){ el('#cartDrawer').classList.add('open'); }
el('#openCart').addEventListener('click',openCart);
el('#closeCart').addEventListener('click',()=>el('#cartDrawer').classList.remove('open'));

(async function(){
  await loadData();
  // get ID from query
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  const p = ALL.find(x=>String(x.id)===String(id));
  if(!p){ document.getElementById('pdp').innerHTML = "<p>No se encontró el producto.</p>"; return; }
  document.getElementById('bcCat').textContent = p.category || "Producto";

  const imgs = (p.images && p.images.length ? p.images : [NOIMG]);
  const thumbs = imgs.map((u,i)=>`<img src="${u}" data-i="${i}" class="${i===0?'active':''}" onerror="this.src='${NOIMG}'">`).join("");
  const hero = `<img id="heroImg" src="${imgs[0]}" onerror="this.src='${NOIMG}'">`;

  const sizes = (p.variants?.sizes || []).map(s=>`<button data-size="${s.name}">${s.name}</button>`).join("");
  const colors = (p.variants?.colors || []).map(c=>`<button data-color="${c}">${c}</button>`).join("");

  document.getElementById('pdp').innerHTML = `
    <div class="gallery">
      <div class="thumbs" id="thumbs">${thumbs}</div>
      <div class="hero">${hero}</div>
    </div>
    <div>
      <h1 class="pdp-title">${p.name}</h1>
      <div class="pdp-brand">${p.brand||''}</div>
      <div class="pdp-price" id="pdpPrice">${fmt(minMaxPrice(p)[0])}</div>
      <div class="pdp-controls">
        ${colors?('<div><div class="note">Color</div><div class="variant" id="colorBlock">'+colors+'</div></div>'):''}
        ${sizes?('<div><div class="note">Talla</div><div class="variant" id="sizeBlock">'+sizes+'</div></div>'):''}
        <div class="qty"><button id="minus">-</button><span id="qtyVal">1</span><button id="plus">+</button></div>
        <button class="cta" id="addPdp">Agregar al carrito</button>
      </div>

      <div class="section">
        <h4>Descripción del producto</h4>
        <div style="color:#475569">${p.description || "Sin descripción."}</div>
      </div>

      ${(p.specs && p.specs.length)?`<div class="section"><h4>Especificaciones</h4><div class="kv">${p.specs.map(s=>`<div>${s.label}</div><div>${s.value}</div>`).join("")}</div></div>`:""}
    </div>
  `;

  document.querySelectorAll('#thumbs img').forEach(img=>{
    img.addEventListener('click',e=>{
      document.querySelectorAll('#thumbs img').forEach(x=>x.classList.remove('active'));
      e.target.classList.add('active');
      document.getElementById('heroImg').src = imgs[Number(e.target.dataset.i)] || NOIMG;
    });
  });
  let qty=1, sizeSel=null;
  const updPrice = ()=>{ document.getElementById('pdpPrice').textContent = fmt(priceEffective(p, sizeSel)); }
  const sizeButtons = document.querySelectorAll('#sizeBlock button');
  sizeButtons.forEach(b=>b.addEventListener('click',()=>{
    sizeButtons.forEach(x=>x.classList.remove('active'));
    b.classList.add('active'); sizeSel=b.dataset.size; updPrice();
  }));
  document.getElementById('minus').onclick=()=>{qty=Math.max(1,qty-1); document.getElementById('qtyVal').textContent=qty;}
  document.getElementById('plus').onclick=()=>{qty++; document.getElementById('qtyVal').textContent=qty;}
  document.getElementById('addPdp').onclick=()=>{ addToCart(p, qty, sizeSel); };

  // search redirect
  document.getElementById('gobackSearch').addEventListener('keydown',e=>{
    if(e.key==='Enter'){ localStorage.setItem('q_prefill', e.target.value); location.href='index.html'; }
  });

  renderCart();
})();
