
let DATA = [];
let FILTER = 'all';
let CUR = null;

const el = s => document.querySelector(s);

function loadData(){
  const override = localStorage.getItem('products_data_override');
  if(override){ DATA = JSON.parse(override); return Promise.resolve(); }
  return fetch('products.json').then(r=>r.json()).then(js=>{ DATA = js; });
}

function persistDraft(){
  localStorage.setItem('products_data_override', JSON.stringify(DATA));
}

function refreshList(){
  const list = el('#list'); list.innerHTML='';
  const q = el('#search').value.toLowerCase();
  DATA.filter(p=> FILTER==='all' || (FILTER==='act' ? p.active : !p.active))
      .filter(p=> (p.name+p.brand+p.category).toLowerCase().includes(q))
      .forEach(p=>{
        const item = document.createElement('div'); item.className='item';
        const img = (p.images&&p.images[0]) || 'https://via.placeholder.com/100x80?text=IMG';
        item.innerHTML = `<img src="${img}"><div><div class="name">${p.name}</div><div class="brand-txt">${p.brand||''}</div></div><div class="chip ${p.active?'on':'off'}">${p.active?'Activo':'Inactivo'}</div>`;
        item.addEventListener('click',()=> edit(p.id));
        list.appendChild(item);
      });
}

function edit(id){
  CUR = DATA.find(x=>String(x.id)===String(id));
  if(!CUR){ return; }
  el('#f_id').value = CUR.id;
  el('#f_name').value = CUR.name||'';
  el('#f_brand').value = CUR.brand||'';
  el('#f_price').value = CUR.price||0;
  el('#f_disc').value = CUR.discountPct||0;
  el('#f_cat').value = CUR.category||'';
  el('#f_desc').value = CUR.description||'';
  el('#stateTxt').textContent = CUR.active?'Activo':'Inactivo';
  el('#f_active').classList.toggle('on', !!CUR.active);
  renderGallery();
  renderPreview();
}

function renderPreview(){
  if(!CUR) return;
  const price = CUR.discountPct ? CUR.price*(1-CUR.discountPct/100) : CUR.price;
  el('#p_img').src = (CUR.images && CUR.images[0]) || 'https://via.placeholder.com/600x400?text=IMG';
  el('#p_brand').textContent = CUR.brand||'';
  el('#p_name').textContent = CUR.name||'';
  el('#p_price').textContent = 'S/ '+(Math.round(price*100)/100).toFixed(2);
  el('#p_old').textContent = CUR.discountPct ? 'S/ '+CUR.price.toFixed(2) : '';
}

function renderGallery(){
  const g = el('#gallery'); g.innerHTML='';
  (CUR.images||[]).forEach((u,i)=>{
    const t = document.createElement('div'); t.className='thumb';
    t.innerHTML = `<img src="${u}"><button data-i="${i}">×</button>`;
    t.querySelector('button').onclick=(e)=>{ CUR.images.splice(i,1); renderGallery(); renderPreview(); persistDraft(); };
    g.appendChild(t);
  });
}

function bindForm(){
  const set = (key, val)=>{ CUR[key]=val; renderPreview(); persistDraft(); refreshList(); };
  el('#f_id').oninput=e=>set('id', e.target.value);
  el('#f_name').oninput=e=>set('name', e.target.value);
  el('#f_brand').oninput=e=>set('brand', e.target.value);
  el('#f_price').oninput=e=>set('price', parseFloat(e.target.value||0));
  el('#f_disc').oninput=e=>set('discountPct', parseFloat(e.target.value||0));
  el('#f_cat').oninput=e=>set('category', e.target.value);
  el('#f_desc').oninput=e=>set('description', e.target.value);
  el('#f_active').onclick=()=>{ CUR.active = !CUR.active; el('#f_active').classList.toggle('on', CUR.active); el('#stateTxt').textContent = CUR.active?'Activo':'Inactivo'; persistDraft(); refreshList(); };
  el('#btnAddImg').onclick=()=>{
    if(!CUR.images) CUR.images=[];
    const u = el('#f_img').value.trim(); if(!u) return;
    CUR.images.push(u); el('#f_img').value=''; renderGallery(); renderPreview(); persistDraft();
  };
  el('#btnDup').onclick=()=>{
    const copy = JSON.parse(JSON.stringify(CUR));
    copy.id = (Date.now()%100000).toString();
    copy.name = copy.name+' (copia)';
    DATA.push(copy); persistDraft(); refreshList();
  };
  el('#btnDel').onclick=()=>{
    const i = DATA.findIndex(x=>x===CUR); if(i>=0){ DATA.splice(i,1); CUR=null; persistDraft(); refreshList(); }
  };
}

function bindTopbar(){
  el('#btnNew').onclick=()=>{
    const p = {id: (Date.now()%100000).toString(), name:'Nuevo producto', brand:'', price:0, discountPct:0, priceOld:0, category:'', images:[], active:true, description:''};
    DATA.unshift(p); persistDraft(); refreshList(); edit(p.id);
  };
  el('#btnAct').onclick=()=>{ FILTER='act'; refreshList(); };
  el('#btnInact').onclick=()=>{ FILTER='inact'; refreshList(); };
  el('#btnAll').onclick=()=>{ FILTER='all'; refreshList(); };
  el('#search').oninput=refreshList;

  el('#btnSaveDraft').onclick=()=>{ persistDraft(); alert('Guardado en este navegador.'); };
  el('#btnPublish').onclick=()=>{ persistDraft(); alert('Publicado para este navegador. Sube products.json a tu hosting si lo necesitas.'); };

  el('#btnDownload').onclick=()=>{
    const blob = new Blob([JSON.stringify(DATA,null,2)],{type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='products.json'; a.click();
  };
  el('#btnLoad').onclick=()=> el('#file').click();
  el('#file').onchange=(e)=>{
    const f = e.target.files[0]; if(!f) return;
    const rd = new FileReader();
    rd.onload = ()=>{ try{ DATA = JSON.parse(rd.result); persistDraft(); refreshList(); if(DATA[0]) edit(DATA[0].id); }catch(err){ alert('JSON inválido'); } };
    rd.readAsText(f);
  };
}

(async function(){
  try{
    await loadData();
  }catch(e){ DATA=[]; }
  if(DATA.length===0){
    // seed
    DATA = [
      {id:"1", name:"Mouse Gamer VX500", brand:"HyperTech", price:79, discountPct:5, category:"Computación", images:["https://i.imgur.com/JiQK0FJ.jpeg"], active:true, description:"Mouse ergonómico con 7 botones."},
      {id:"2", name:"Parlante Strudel EV 500 BT", brand:"Eversound", price:94, discountPct:0, category:"Audio", images:["https://i.imgur.com/1B6mJ0b.jpeg"], active:true, description:"Sonido potente, luces RGB."}
    ];
  }
  refreshList();
  if(DATA[0]) edit(DATA[0].id);
  bindForm();
  bindTopbar();
})();
