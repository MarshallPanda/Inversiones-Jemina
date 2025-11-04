
const LATEST_URL = '../productos/latest.json';
let DATASET = [];
let LATEST = null;
let EDIT_IDX = -1;

const fmtS = v => 'S/ ' + (Math.round(v*100)/100).toFixed(2);

document.addEventListener('DOMContentLoaded', async () => {
  LATEST = await fetch(LATEST_URL).then(r=>r.json());
  DATASET = await fetch('../productos/' + LATEST.file).then(r=>r.json());
  fillTable();
  buildImagesBox([]);
  bindForm();
});

function fillTable(){
  const tb = document.querySelector('#tbl tbody'); tb.innerHTML='';
  DATASET.forEach((p,idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${p.nombre}</td><td>${p.categoria}</td><td>${fmtS(p.precio)}</td><td>${p.sku}</td>`;
    tr.style.cursor = 'pointer';
    tr.onclick = ()=> loadIntoForm(idx);
    tb.appendChild(tr);
  });
}

function buildImagesBox(list){
  const box = document.getElementById('imgsBox');
  box.innerHTML = '';
  const images = (list && list.length) ? list.slice() : [''];
  images.forEach((src, i)=> addImageInput(box, src, i===images.length-1));
  if (!list || !list.length) addImageInput(box, '', true); // ensure at least one
}

function addImageInput(container, value='', autoAddNext=false){
  const wrap = document.createElement('div');
  wrap.className = 'row';
  wrap.style.alignItems = 'center';
  wrap.innerHTML = `
    <input class="img-input" placeholder="https://... o ruta local" value="${value||''}"/>
    <button class="btn btn-small" type="button">Quitar</button>
  `;
  const btn = wrap.querySelector('button');
  btn.style.padding = '10px';
  btn.onclick = ()=>{ wrap.remove(); };
  const inp = wrap.querySelector('input');
  if (autoAddNext){
    inp.addEventListener('input', (e)=>{
      const last = Array.from(document.querySelectorAll('.img-input')).pop();
      if (last === inp && e.target.value.trim().length>0){
        addImageInput(container, '', true);
      }
    });
  }
  container.appendChild(wrap);
}

function getImagesFromBox(){
  return Array.from(document.querySelectorAll('.img-input'))
    .map(i => i.value.trim())
    .filter(Boolean);
}

function bindForm(){
  const priceBase = document.getElementById('p_precio_base');
  const pct = document.getElementById('p_desc_pct');
  const finalBox = document.getElementById('p_precio_final');
  function updateFinal(){
    const base = parseFloat(priceBase.value||'0');
    const d = Math.max(0, Math.min(100, parseFloat(pct.value||'0')));
    const final = base * (1 - d/100);
    finalBox.textContent = fmtS(isNaN(final)?0:final);
  }
  priceBase.addEventListener('input', updateFinal);
  pct.addEventListener('input', updateFinal);
  updateFinal();
  livePreview();

  document.getElementById('btn-new').onclick = ()=> resetForm();
  document.getElementById('btn-preview').onclick = ()=>{
    const p = collectProduct();
    const grid = document.getElementById('preview'); grid.innerHTML='';
    grid.appendChild(renderCard(p));
  };
  document.getElementById('btn-add').onclick = ()=>{
    const p = collectProduct();
    DATASET.push(p);
    fillTable();
    alert('Producto añadido al dataset local.');
    resetForm();
    livePreview();
  };
  document.getElementById('btn-update').onclick = ()=>{
    if (EDIT_IDX<0) return;
    const p = collectProduct();
    DATASET[EDIT_IDX] = p;
    fillTable();
    alert('Producto actualizado en el dataset local.');
    resetForm();
    livePreview();
  };
  document.getElementById('btn-delete').onclick = ()=>{
    if (EDIT_IDX<0) return;
    if (!confirm('¿Eliminar este producto del dataset local?')) return;
    DATASET.splice(EDIT_IDX,1);
    fillTable();
    resetForm();
  };
  document.getElementById('btn-publish').onclick = publish;
  document.getElementById('btn-draft').onclick = saveDraft;
}

function resetForm(){
  EDIT_IDX = -1;
  ['p_nombre','p_sku','p_cat','p_desc_c','p_desc_l','p_stock','p_vendor','p_precio_base','p_desc_pct'].forEach(id=>{
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('p_envio').value = 'false';
  document.getElementById('p_dest').value = 'false';
  document.getElementById('p_precio_final').textContent = fmtS(0);
  buildImagesBox([]);
  document.getElementById('btn-update').disabled = true;
  document.getElementById('btn-delete').disabled = true;
}

function loadIntoForm(idx){
  const p = DATASET[idx];
  EDIT_IDX = idx;
  document.getElementById('p_nombre').value = p.nombre||'';
  document.getElementById('p_sku').value = p.sku||'';
  document.getElementById('p_cat').value = p.categoria||'';
  // Precios por porcentaje
  const base = (typeof p.precio_anterior === 'number' && p.precio_anterior>0) ? p.precio_anterior : (p.precio||0);
  const pct = (typeof p.precio === 'number' && base>0 && p.precio<base) ? Math.round((1 - p.precio/base)*100) : 0;
  document.getElementById('p_precio_base').value = base;
  document.getElementById('p_desc_pct').value = pct;
  document.getElementById('p_precio_final').textContent = fmtS(base * (1 - pct/100));
  document.getElementById('p_desc_c').value = p.descripcion_corta||'';
  document.getElementById('p_desc_l').value = p.descripcion_larga||'';
  document.getElementById('p_stock').value = p.stock||0;
  document.getElementById('p_vendor').value = p.vendedor||'';
  document.getElementById('p_envio').value = p.envio_gratis ? 'true' : 'false';
  document.getElementById('p_dest').value = p.destacado ? 'true' : 'false';
  buildImagesBox(p.imagenes||[]);
  document.getElementById('btn-update').disabled = false;
  document.getElementById('btn-delete').disabled = false;
  window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
}

function collectProduct(){
  const v = id => document.getElementById(id).value;
  const base = parseFloat(v('p_precio_base'));
  const pct = Math.max(0, Math.min(100, parseFloat(v('p_desc_pct')) || 0));
  const final = (isNaN(base)?0:base) * (1 - pct/100);
  const imgs = getImagesFromBox();
  const idBase = (v('p_sku') || (Date.now()+'')).toLowerCase();
  return {
    id: idBase,
    sku: v('p_sku') || ('SKU-' + Date.now()),
    nombre: v('p_nombre'),
    descripcion_corta: v('p_desc_c'),
    descripcion_larga: v('p_desc_l'),
    categoria: v('p_cat') || 'General',
    precio: Math.round((final + Number.EPSILON)*100)/100,
    precio_anterior: isNaN(base)?null:base,
    descuento: (pct>0) ? {tipo:'porcentaje', valor: Math.round(pct)} : null,
    imagenes: imgs.length? imgs : ['img/placeholder.svg'],
    variantes: [],
    stock: parseInt(v('p_stock')||'0',10),
    destacado: v('p_dest') === 'true',
    envio_gratis: v('p_envio') === 'true',
    vendedor: v('p_vendor') || '',
    fecha_publicacion: (new Date()).toISOString().slice(0,10)
  };
}

function renderCard(p){
  const card = document.createElement('article'); card.className='product card';
  const hasDiscount = p.precio_anterior && p.precio_anterior > p.precio;
  const ribbon = hasDiscount ? `<div class="ribbon">-${Math.round((1 - p.precio/p.precio_anterior)*100)}%</div>` : '';
  const envio = p.envio_gratis ? `<div class="badge">ENVÍO GRATIS</div>` : '';
  card.innerHTML = `
    ${ribbon}${envio}
    <img src="${p.imagenes?.[0]||''}" alt="${p.nombre}"/>
    <div class="brand">${p.vendedor||''}</div>
    <div class="title">${p.nombre}</div>
    <div class="price">
      <span class="current">${fmtS(p.precio)}</span>
      ${hasDiscount ? `<span class="old">${fmtS(p.precio_anterior)}</span>`:''}
    </div>
    <button class="btn" disabled>Agregar al carrito</button>
  `;
  return card;
}

// ---- Publicar (N+1): descarga o File System Access API
async function publish(){
  const nextVersion = (LATEST.version||1) + 1;
  const productosFile = `productos-${nextVersion}.json`;
  const latestPayload = { file: productosFile, version: nextVersion, updated_at: new Date().toISOString() };
  const dataset = JSON.stringify(DATASET, null, 2);
  const latestJson = JSON.stringify(latestPayload, null, 2);

  // Intentar escritura directa
  if ('showDirectoryPicker' in window){
    try{
      const dir = await window.showDirectoryPicker();
      const productosDir = await dir.getDirectoryHandle('productos', { create:true });
      const f1 = await productosDir.getFileHandle(productosFile, { create:true });
      const w1 = await f1.createWritable(); await w1.write(dataset); await w1.close();
      const f2 = await productosDir.getFileHandle('latest.json', { create:true });
      const w2 = await f2.createWritable(); await w2.write(latestJson); await w2.close();
      alert('Publicado como ' + productosFile + ' y actualizado latest.json en la carpeta elegida.');
      return;
    }catch(e){ console.warn('No se pudo escribir directo:', e); }
  }
  // Fallback: descarga productos-(N+1).json y latest.json listos para reemplazar manualmente
  downloadFile(productosFile, dataset);
  downloadFile('latest.json', latestJson);
  alert('Descargados '+productosFile+' y latest.json. Copia ambos a /productos/ (reemplaza el latest.json existente).');
}

async function saveDraft(){
  const draftName = `draft-${Date.now()}.json`;
  const payload = JSON.stringify(DATASET, null, 2);
  downloadFile(draftName, payload);
  alert('Borrador descargado: ' + draftName);
}

function downloadFile(filename, text){
  const blob = new Blob([text], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href), 1000);
}

// ---- Live Preview (card + detail)
function livePreview(){
  const p = collectProduct();
  // Card
  const grid = document.getElementById('preview'); grid.innerHTML='';
  grid.appendChild(renderCard(p));
  // Detail preview
  const det = document.createElement('div');
  det.className = 'card';
  const imgs = (p.imagenes && p.imagenes.length)? p.imagenes : ['img/placeholder.svg'];
  det.innerHTML = `<div style="display:flex;gap:12px;align-items:flex-start">
    <div style="flex:0 0 auto">
      <img src="${imgs[0]}" style="width:280px;height:200px;object-fit:contain;background:#f1f3f5;border-radius:10px" onerror="this.onerror=null;this.src='img/placeholder.svg'"/>
      ${imgs.length>1? `<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">${imgs.map(s=>`<img src="${s}" style="width:40px;height:40px;object-fit:cover;border:1px solid #eee;border-radius:6px" onerror="this.onerror=null;this.src='img/placeholder.svg'"/>`).join('')}</div>`:''}
    </div>
    <div style="flex:1">
      <div class="brand">${p.vendedor||''}</div>
      <div class="title" style="font-weight:800;margin:6px 0">${p.nombre||'Nombre del producto'}</div>
      <div class="price"><span class="current">${fmtS(p.precio||0)}</span> ${p.precio_anterior? `<span class="old" style="text-decoration:line-through;color:#9ca3af;margin-left:8px">${fmtS(p.precio_anterior)}</span>`:''}</div>
      <p class="muted">${p.descripcion_corta||''}</p>
    </div>
  </div>`;
  grid.appendChild(det);
}
// Bind inputs for live preview
['p_nombre','p_sku','p_cat','p_vendor','p_precio_base','p_desc_pct','p_stock','p_envio','p_dest','p_desc_c','p_desc_l'].forEach(id=>{
  const el = document.getElementById(id); if(el){ el.addEventListener('input', livePreview); el.addEventListener('change', livePreview); }
});
document.addEventListener('input', (e)=>{ if(e.target && e.target.classList.contains('img-input')) livePreview(); });
