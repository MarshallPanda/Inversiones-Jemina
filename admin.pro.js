
const NOIMG = "https://via.placeholder.com/600x400?text=Producto";

let DATA = [];
let view = []; // filtered/sorted view for list
let idx = 0;   // index in DATA
let filter = { q:"", mode:"all" };

const $ = s => document.querySelector(s);
const fmt = n => "S/ " + (Math.round(n*100)/100).toFixed(2);
const eff = p => (p.discountPct ? (p.price||0)*(1 - p.discountPct/100) : (p.price||0));

function load(){
  const ov = localStorage.getItem("products_data_override");
  if(ov){ DATA = JSON.parse(ov); prepare(); return; }
  fetch("products.json").then(r=>r.json()).then(js=>{ DATA=js; prepare(); });
}

function prepare(){
  // ensure minimal fields
  DATA.forEach(p=>{
    p.images = p.images || [];
    if(typeof p.active === "undefined") p.active = true;
  });
  applyFilter();
  select(0);
}

function applyFilter(){
  view = DATA.map((p,i)=>({p, i}));
  if(filter.mode==="on") view = view.filter(x=>x.p.active);
  if(filter.mode==="off") view = view.filter(x=>!x.p.active);
  if(filter.q){
    const q = filter.q.toLowerCase();
    view = view.filter(x=>(x.p.name+x.p.brand+x.p.category).toLowerCase().includes(q));
  }
  // render list
  const box = $("#list"); box.innerHTML="";
  view.forEach((x,vi)=>{
    const it = document.createElement("div");
    it.className = "item";
    const img = (x.p.images[0]||NOIMG);
    it.innerHTML = `
      <img src="${img}" onerror="this.src='${NOIMG}'">
      <div>
        <div class="name">${x.p.name||"Sin nombre"}</div>
        <div class="note">${x.p.brand||""} · ${x.p.category||"—"}</div>
        <div style="font-weight:900">${fmt(eff(x.p))}</div>
      </div>
      <div class="chip ${x.p.active?'on':'off'}">${x.p.active?'Activo':'Desactivado'}</div>`;
    it.onclick = ()=> select(x.i, vi);
    box.appendChild(it);
  });
}

function select(i, vi=0){
  idx = i;
  const p = DATA[idx];
  // Fields
  $("#f_id").value = p.id??"";
  $("#f_brand").value = p.brand??"";
  $("#f_name").value = p.name??"";
  $("#f_category").value = p.category??"";
  $("#f_price").value = p.price??0;
  $("#f_discount").value = p.discountPct??0;
  $("#f_state").textContent = p.active? "Activo":"Desactivado";
  $("#f_toggle").classList.toggle("on", !!p.active);

  // Images
  const list = $("#f_thumbs"); list.innerHTML="";
  const imgs = (p.images && p.images.length ? p.images : [NOIMG]);
  $("#f_hero").src = imgs[0];
  (p.images||[]).forEach((u,idxImg)=>{
    const t = document.createElement("img");
    t.src = u; t.style.width="100%"; t.style.height="80px"; t.style.objectFit="cover"; t.style.borderRadius="8px";
    t.onclick = ()=>{ // make principal
      p.images.splice(0,0, ...p.images.splice(idxImg,1));
      select(idx);
    };
    const wrap = document.createElement("div");
    wrap.style.position="relative"; wrap.appendChild(t);
    const rm = document.createElement("button"); rm.textContent="×"; rm.className="btn"; rm.style.position="absolute"; rm.style.top="4px"; rm.style.right="4px"; rm.onclick=(e)=>{e.stopPropagation(); p.images.splice(idxImg,1); select(idx);};
    wrap.appendChild(rm);
    list.appendChild(wrap);
  });

  // Desc + preview
  $("#f_desc").value = p.description||"";
  preview(p);
  bindFieldHandlers();
  highlightInList(vi);
}

function preview(p){
  $("#p_img").src = (p.images[0]||NOIMG);
  $("#p_brand").textContent = p.brand||"";
  $("#p_title").textContent = p.name||"";
  $("#p_price").textContent = fmt(eff(p));
  $("#p_old").textContent = p.priceOld? fmt(p.priceOld):"";
  const b = $("#p_badge");
  if(p.discountPct){ b.style.display="inline-block"; b.textContent = `-${p.discountPct}%`; } else b.style.display="none";
  $("#p_cat").textContent = p.category||"Sin categoría";
}

function bindFieldHandlers(){
  const p = DATA[idx];
  $("#f_id").oninput = e=>{ p.id = e.target.value; };
  $("#f_brand").oninput = e=>{ p.brand = e.target.value; $("#p_brand").textContent=p.brand||""; };
  $("#f_name").oninput = e=>{ p.name = e.target.value; $("#p_title").textContent=p.name||""; };
  $("#f_category").oninput = e=>{ p.category = e.target.value; $("#p_cat").textContent=p.category||"Sin categoría"; };
  $("#f_price").oninput = e=>{ p.price = Number(e.target.value||0); $("#p_price").textContent=fmt(eff(p)); };
  $("#f_discount").oninput = e=>{ p.discountPct = Number(e.target.value||0); preview(p); };

  $("#f_toggle").onclick = ()=>{ p.active = !p.active; $("#f_toggle").classList.toggle("on",p.active); $("#f_state").textContent = p.active? "Activo":"Desactivado"; applyFilter(); };

  $("#f_addImg").onclick = ()=>{
    const u = $("#f_imgUrl").value.trim(); if(!u) return;
    p.images = p.images || []; p.images.push(u); $("#f_imgUrl").value=""; select(idx);
  };
  $("#f_desc").oninput = e=>{ p.description = e.target.value; };
  $("#f_dup").onclick = ()=>{ const copy = JSON.parse(JSON.stringify(p)); copy.id = Date.now(); DATA.splice(idx+1,0,copy); applyFilter(); };
  $("#f_del").onclick = ()=>{ if(confirm("¿Eliminar producto?")){ DATA.splice(idx,1); if(!DATA.length){ DATA=[{id:Date.now(),name:"Nuevo",active:false,images:[]}]; } applyFilter(); select(0); } };
}

function highlightInList(vi){
  const list = document.querySelectorAll(".master-list .item");
  list.forEach(el=>el.style.outline="0");
  if(list[vi]) list[vi].style.outline="2px solid #0B5BD3";
}

function saveDraft(){ localStorage.setItem("products_data_override", JSON.stringify(DATA)); alert("Borrador guardado."); }
function publish(){
  localStorage.setItem("products_data_override", JSON.stringify(DATA));
  alert("Publicado en este navegador. El catálogo usará estos datos.");
  const blob = new Blob([JSON.stringify(DATA, null, 2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = $("#btnDownload"); a.href=url; a.download="products.json"; a.style.display="inline-block"; a.textContent="Descargar JSON";
}

$("#btnNew").onclick = ()=>{ DATA.unshift({id:Date.now(), name:"Nuevo producto", brand:"", category:"", price:0, discountPct:0, images:[], description:"", active:false}); applyFilter(); select(0); };
$("#btnAll").onclick = ()=>{ filter.mode="all"; applyFilter(); };
$("#btnOn").onclick  = ()=>{ filter.mode="on"; applyFilter(); };
$("#btnOff").onclick = ()=>{ filter.mode="off"; applyFilter(); };
$("#btnSave").onclick = saveDraft;
$("#btnPublish").onclick = publish;
$("#btnImport").onclick = ()=>$("#filePick").click();
$("#filePick").addEventListener("change",(e)=>{
  const f = e.target.files[0]; if(!f) return;
  const rd = new FileReader();
  rd.onload = ()=>{ try{ DATA = JSON.parse(rd.result); applyFilter(); select(0); }catch(ex){ alert("JSON inválido"); } };
  rd.readAsText(f);
});
$("#q").oninput = e=>{ filter.q = e.target.value; applyFilter(); };

load();
