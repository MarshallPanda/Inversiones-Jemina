let ALL = [];
let FILTER = { q:'', min:0, max:Infinity, favsOnly:false, sort:'relevance' };
const FKEY = 'favorites';

function priceEffective(p, sizeName){
  const base = Number(p.price || 0);
  const disc = Number(p.discount || 0);
  return Math.round((base * (1 - disc)) * 100)/100;
}

function minMaxPrice(p){
  if (p?.variants?.sizes?.length){
    const vals = p.variants.sizes.map(s => priceEffective(p, s.name));
    return [Math.min(...vals), Math.max(...vals)];
  }
  const v = priceEffective(p);
  return [v, v];
}

async function loadData(){
  try{
    const metaRes = await fetch('Productos/latest.json', { cache: 'no-store' });
    if (metaRes.ok){
      const meta = await metaRes.json();
      const dataRes = await fetch(meta.url, { cache: 'no-store' });
      if (dataRes.ok){ ALL = await dataRes.json(); return; }
    }
  }catch(e){}
  try{
    const fb = await fetch('products.json', { cache: 'no-store' });
    if (fb.ok){ ALL = await fb.json(); return; }
  }catch(e){}
  ALL = [];
}

function getFavs(){ try{return new Set(JSON.parse(localStorage.getItem(FKEY)||'[]'));}catch(_){return new Set()} }
function setFavs(set){ localStorage.setItem(FKEY, JSON.stringify([...set])); }

function render(){
  const favs = getFavs();
  const q = (FILTER.q||'').toLowerCase().trim();
  let items = ALL.filter(p => p.active!==false);

  if (q) items = items.filter(p => (p.name+p.brand+p.category).toLowerCase().includes(q));
  items = items.filter(p => {
    const [mn,mx] = minMaxPrice(p);
    return (mx >= FILTER.min && mn <= FILTER.max);
  });
  if (FILTER.favsOnly) items = items.filter(p => favs.has(p.id));

  if (FILTER.sort==='price_asc') items.sort((a,b)=>priceEffective(a)-priceEffective(b));
  else if (FILTER.sort==='price_desc') items.sort((a,b)=>priceEffective(b)-priceEffective(a));

  document.getElementById('count').textContent = `Se muestran ${items.length} producto(s)`;
  const grid = document.getElementById('grid');
  grid.innerHTML = items.map(p => card(p, favs)).join('');
  bindHearts();
}

function card(p, favs){
  const price = priceEffective(p).toFixed(2);
  const old = Number(p.price||0).toFixed(2);
  const off = Math.round((Number(p.discount||0))*100);
  const badge = off? `<span class='badge'>-${off}%</span>` : '';
  const heart = favs.has(p.id) ? '♥' : '♡';
  return `<article class="card">
    <a href="product.html?id=${encodeURIComponent(p.id)}">
      <img src="${p.image||'https://via.placeholder.com/600x400?text=Producto'}" alt="${p.name}"/>
    </a>
    <div class="body">
      ${badge}
      <div class="title">${p.name}</div>
      <div class="price-row"><span class="price">S/ ${price}</span> <span class="old">S/ ${old}</span></div>
      <div class="actions">
        <a class="btn" href="product.html?id=${encodeURIComponent(p.id)}">Ver</a>
        <button class="heart" data-id="${p.id}">${heart}</button>
      </div>
    </div>
  </article>`;
}

function bindHearts(){
  const favs = getFavs();
  document.querySelectorAll('.heart').forEach(b=>{
    b.onclick = ()=>{
      const id = b.dataset.id;
      if (favs.has(id)) favs.delete(id); else favs.add(id);
      setFavs(favs);
      render();
    };
  });
}

function setupFilters(){
  const minR = document.getElementById('minRange');
  const maxR = document.getElementById('maxRange');
  const minV = document.getElementById('minVal');
  const maxV = document.getElementById('maxVal');

  // Rango global basado en todo el catálogo
  let gmin = Infinity, gmax = 0;
  for (const p of ALL){
    const [mn, mx] = minMaxPrice(p);
    if (mn < gmin) gmin = mn;
    if (mx > gmax) gmax = mx;
  }
  if (!isFinite(gmin)) gmin = 0;
  if (!isFinite(gmax)) gmax = 0;
  minR.min = 0; maxR.min = 0;
  minR.max = Math.ceil(gmax); maxR.max = Math.ceil(gmax);
  minR.value = Math.floor(gmin); maxR.value = Math.ceil(gmax);
  minV.textContent = Number(minR.value).toFixed(2);
  maxV.textContent = Number(maxR.value).toFixed(2);

  document.getElementById('apply').onclick = ()=>{
    FILTER.min = Number(minR.value);
    FILTER.max = Number(maxR.value);
    render();
  };
  document.getElementById('reset').onclick = ()=>{
    FILTER = { q:'', min:0, max:Infinity, favsOnly:false, sort: document.getElementById('sort').value };
    minR.value = Math.floor(gmin); maxR.value = Math.ceil(gmax);
    minV.textContent = Number(minR.value).toFixed(2);
    maxV.textContent = Number(maxR.value).toFixed(2);
    document.getElementById('q').value = '';
    document.getElementById('btnFavs').classList.remove('on');
    render();
  };
  minR.oninput = ()=>{ minV.textContent = Number(minR.value).toFixed(2); };
  maxR.oninput = ()=>{ maxV.textContent = Number(maxR.value).toFixed(2); };
}

function bindUI(){
  document.getElementById('q').addEventListener('input', e=>{ FILTER.q = e.target.value; render(); });
  document.getElementById('sort').addEventListener('change', e=>{ FILTER.sort = e.target.value; render(); });
  document.getElementById('btnFavs').addEventListener('click', e=>{
    FILTER.favsOnly = !FILTER.favsOnly;
    e.currentTarget.classList.toggle('on', FILTER.favsOnly);
    render();
  });
}

(async function init(){
  await loadData();
  bindUI();
  setupFilters();
  render();
})();
