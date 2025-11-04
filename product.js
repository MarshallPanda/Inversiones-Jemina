let DATA = [];

async function loadData(){
  try{
    const metaRes = await fetch('Productos/latest.json', { cache: 'no-store' });
    if (metaRes.ok){
      const meta = await metaRes.json();
      const dataRes = await fetch(meta.url, { cache: 'no-store' });
      if (dataRes.ok){ DATA = await dataRes.json(); return; }
    }
  }catch(e){}
  try{
    const fb = await fetch('products.json', { cache: 'no-store' });
    if (fb.ok){ DATA = await fb.json(); return; }
  }catch(e){}
  DATA = [];
}

function priceEffective(p){
  const base = Number(p.price||0);
  const disc = Number(p.discount||0);
  return Math.round((base*(1-disc))*100)/100;
}

function qs(name){ const u=new URL(location.href); return u.searchParams.get(name); }

function renderPdp(p){
  const price = priceEffective(p).toFixed(2);
  const old = Number(p.price||0).toFixed(2);
  const html = `<article class="card" style="max-width:1024px;margin:auto;padding:16px">
    <img src="${p.image||'https://via.placeholder.com/800x500?text=Producto'}" alt="${p.name}"/>
    <div class="body">
      <h2>${p.name}</h2>
      <div><strong>Marca:</strong> ${p.brand||''}</div>
      <div class="price-row"><span class="price">S/ ${price}</span> <span class="old">S/ ${old}</span></div>
      <p>${p.description||''}</p>
      <a class="btn" href="index.html">Volver</a>
    </div>
  </article>`;
  document.getElementById('pdp').innerHTML = html;
}

(async function init(){
  await loadData();
  const id = qs('id');
  const p = DATA.find(x => String(x.id) === String(id));
  if (!p){ document.getElementById('pdp').innerHTML = '<p>No encontrado.</p>'; return; }
  renderPdp(p);
})();
