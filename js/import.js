// Import des commandes Squarespace (export CSV : Commerce > Commandes > Télécharger CSV).
// Le fichier est lu dans le navigateur, relu et corrigé à l'écran, puis seulement envoyé à la base.
const norm=s=>String(s||"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/\s+/g," ").trim();
const MONTHS={janv:1,jan:1,fevr:2,fev:2,feb:2,mars:3,mar:3,avr:4,apr:4,mai:5,may:5,juin:6,jun:6,juil:7,jul:7,aout:8,aug:8,sept:9,sep:9,oct:10,nov:11,dec:12};

// Trouve les semaines citées dans un texte : dates (5 juillet, 05.07, 5/7), « semaine 3 », « Pâques ».
function weeksInText(txt){
 const t=norm(txt),found=new Set();
 const re=/(\d{1,2})(?:er)?\s*(?:[./-]\s*(\d{1,2})(?![\d])|\s*(janv|jan|fevr|fev|feb|mars|mar|avr|apr|mai|may|juin|jun|juil|jul|aout|aug|sept|sep|oct|nov|dec)[a-z]*)/g;
 let m;while((m=re.exec(t))){
  const d=+m[1],mo=m[2]?+m[2]:MONTHS[m[3]];if(!mo||d>31)continue;
  WEEKS.forEach(w=>{const y=w.start.getFullYear(),dt=new Date(y,mo-1,d),end=new Date(w.start.getTime()+6*864e5);if(dt>=w.start&&dt<end)found.add(w.n)});
 }
 const sw=t.match(/semaine\s*(\d)/g)||[];
 if(!found.size)sw.forEach(x=>{const n=+x.replace(/\D/g,"");const w=WEEKS.filter(w=>!/paques/.test(norm(w.period)))[n-1];if(w)found.add(w.n)});
 if(/paques/.test(t)&&!found.size)WEEKS.filter(w=>/paques/.test(norm(w.period))).forEach(w=>found.add(w.n));
 return [...found];
}
function lieuInText(txt){const t=norm(txt);return LIEUX.find(l=>t.includes(norm(l)))||LIEUX.find(l=>norm(l).includes("geneve")&&/geneve|gen[eè]ve/.test(t))||""}
function dateIso(v){
 const t=String(v||"").trim();let m=t.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
 m=t.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);if(!m)return "";
 const y=m[3].length===2?(+m[3]>30?"19":"20")+m[3]:m[3];return `${y}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
}
// Champs « Label: valeur » des formulaires de produit Squarespace.
function formFields(txt){const out={};String(txt||"").split(/\n|\r|;|\|/).forEach(p=>{const i=p.indexOf(":");if(i>0)out[norm(p.slice(0,i))]=p.slice(i+1).trim()});return out}

function parseOrders(text){
 const data=Papa.parse(text,{header:true,skipEmptyLines:true}).data;
 if(!data.length)return {rows:[],note:"Le fichier est vide."};
 const H=Object.keys(data[0]),find=re=>H.find(h=>re.test(norm(h)));
 const cOrder=find(/^(order (id|number|#)|n.? ?de commande|numero de commande|commande|order)$/)||find(/order|commande/);
 const cEmail=find(/^e-?mail/)||find(/mail/);
 const cName=find(/billing name|nom de facturation|^nom du client|^customer/)||find(/^name$/);
 const cText=H.filter(h=>/lineitem name|lineitem variant|product|produit|variant|form|formulaire|article/.test(norm(h)));
 const cPrenom=H.find(h=>/prenom/.test(norm(h))),cNom=H.find(h=>/^nom( de famille)?( de l.enfant)?$/.test(norm(h))),cNaiss=H.find(h=>/naissance|birth/.test(norm(h)));
 if(!cOrder||!cEmail)return {rows:[],note:"Colonnes « numéro de commande » et « e-mail » introuvables. Est-ce bien l'export des commandes Squarespace ?"};
 const last={},byKey=new Map();
 data.forEach(r=>{
  const order=String(r[cOrder]||"").replace(/[#\s]/g,"").replace(/^0+(?=\d)/,"");if(!order)return;
  const prev=last[order]||{};const email=(r[cEmail]||prev.email||"").trim().toLowerCase(),parent=(cName&&r[cName]||prev.parent||"").trim();
  last[order]={email,parent};
  const txt=cText.map(h=>r[h]).join("\n"),ff=formFields(cText.filter(h=>/form/.test(norm(h))).map(h=>r[h]).join("\n"));
  const fk=(re,not)=>{const k=Object.keys(ff).find(k=>re.test(k)&&!(not&&not.test(k)));return k?ff[k]:""};
  const prenom=(cPrenom&&r[cPrenom]||fk(/prenom/)||"").trim(),nom=(cNom&&r[cNom]||fk(/nom/,/prenom/)||"").trim();
  const naissance=dateIso(cNaiss&&r[cNaiss]||fk(/naissance|ne le|nee le/));
  const key=order+"|"+norm(prenom);
  const cur=byKey.get(key)||{commande:order,email,parent,prenom,nom,naissance,lieu:"",semaines:[]};
  cur.lieu=cur.lieu||lieuInText(txt);cur.semaines=[...new Set([...cur.semaines,...weeksInText(txt)])];
  cur.nom=cur.nom||nom;cur.naissance=cur.naissance||naissance;cur.email=cur.email||email;cur.parent=cur.parent||parent;
  byKey.set(key,cur);
 });
 const rows=[...byKey.values()];
 rows.forEach(r=>{r.semaines.sort((a,b)=>W(a).start-W(b).start);if(!r.nom&&r.parent)r.nom=r.parent.split(" ").slice(-1)[0]});
 return {rows,note:""};
}
const impProblem=r=>!r.commande||!r.email?"commande ou e-mail manquant":!r.prenom?"prénom manquant":!r.lieu?"lieu à choisir":!r.semaines.length?"semaine à indiquer":"";
const codesOf=ws=>ws.map(n=>W(n)?.code).filter(Boolean).join(", ");
const weeksOfCodes=t=>[...new Set(String(t).toUpperCase().split(/[\s,;]+/).map(c=>WEEKS.find(w=>w.code===c)?.n).filter(Boolean))];

function adminImport(){
 const im=S.imp;
 const known=new Set(kids.map(k=>k.order+"|"+norm(k.prenom)));
 return `<div class="section">
 <div class="section-head"><div><span class="eyebrow">Inscriptions</span><h1>Importer les commandes</h1></div><button class="btn small ghost" data-atab="semaines">Retour</button></div>
 <div class="card plain" style="display:grid;gap:8px">
  <p><b>1.</b> Dans Squarespace : <b>Commerce › Commandes › Télécharger CSV</b>.</p>
  <p><b>2.</b> Déposez le fichier ci-dessous. Rien n'est enregistré avant l'étape 3.</p>
  <p><b>3.</b> Vérifiez chaque ligne (lieu, semaines, prénom), puis importez. Vous pouvez réimporter le même fichier plus tard : les enfants déjà présents sont complétés, jamais dédoublés.</p>
 </div>
 <label class="upload" for="impFile"><b>${im?.file?esc(im.file):"Choisir le fichier CSV"}</b><span class="hint">Le fichier reste sur votre appareil jusqu'à l'import</span><input type="file" id="impFile" accept=".csv,text/csv"></label>
 ${im?.note?`<div class="notice">${esc(im.note)}</div>`:""}
 ${im?`
 <div class="table-wrap"><table class="imp-table"><thead><tr><th>Commande</th><th>E-mail</th><th>Parent</th><th>Prénom</th><th>Nom</th><th>Naissance</th><th>Lieu</th><th>Semaines <span class="hint">(${WEEKS.map(w=>w.code).join(", ")})</span></th><th></th></tr></thead><tbody>
 ${im.rows.map((r,i)=>{const pb=impProblem(r);return `<tr class="${pb?"bad-row":""}">
  <td><input class="input" data-imp="${i}:commande" value="${esc(r.commande)}" aria-label="Commande"></td>
  <td><input class="input" data-imp="${i}:email" value="${esc(r.email)}" aria-label="E-mail"></td>
  <td><input class="input" data-imp="${i}:parent" value="${esc(r.parent)}" aria-label="Parent"></td>
  <td><input class="input" data-imp="${i}:prenom" value="${esc(r.prenom)}" aria-label="Prénom"></td>
  <td><input class="input" data-imp="${i}:nom" value="${esc(r.nom)}" aria-label="Nom"></td>
  <td><input class="input" type="date" data-imp="${i}:naissance" value="${esc(r.naissance)}" aria-label="Naissance"></td>
  <td><select class="input" data-imp="${i}:lieu" aria-label="Lieu"><option value="">À choisir</option>${LIEUX.map(l=>`<option ${r.lieu===l?"selected":""}>${esc(l)}</option>`).join("")}</select></td>
  <td><input class="input" data-imp="${i}:semaines" value="${esc(codesOf(r.semaines))}" placeholder="S1, S3" aria-label="Semaines"></td>
  <td>${pb?`<span class="chip bad">${pb}</span>`:known.has(r.commande+"|"+norm(r.prenom))?'<span class="chip">Déjà là</span>':'<span class="chip ok">Nouveau</span>'}<button class="iconbtn" data-act="impDel" data-i="${i}" aria-label="Retirer la ligne">✕</button></td>
 </tr>`}).join("")}
 </tbody></table></div>
 <div class="toolbar">
  <button class="btn small ghost" data-act="impAdd">+ Ajouter une ligne à la main</button>
  <span class="hint" style="flex:1">${im.rows.length} enfant${im.rows.length>1?"s":""} · ${im.rows.filter(impProblem).length} à corriger</span>
  <button class="btn primary" data-act="impGo" ${im.rows.length?"":"disabled"}>Importer</button>
 </div>`:`<button class="btn small ghost" data-act="impAdd" style="justify-self:start">Ou ajouter une inscription à la main</button>`}
 </div>`;
}
document.addEventListener("change",e=>{
 if(e.target.id==="impFile"){const f=e.target.files[0];if(!f)return;
  Promise.all([loadScript("vendor/papaparse-5.4.1.min.js"),f.text()]).then(([,txt])=>{const r=parseOrders(txt);S.imp={file:f.name,...r};render()},()=>toast("Lecture du fichier impossible"));}
 const di=e.target.dataset.imp;if(di)setImp(e.target,di,true);
});
document.addEventListener("input",e=>{const di=e.target.dataset.imp;if(di)setImp(e.target,di,false)});
function setImp(el,di,rerender){
 const [i,f]=di.split(":"),r=S.imp.rows[+i];
 r[f]=f==="semaines"?weeksOfCodes(el.value):f==="email"?el.value.trim().toLowerCase():el.value.trim();
 if(rerender&&f!=="semaines")render();
}
document.addEventListener("click",e=>{
 const t=e.target.closest("[data-act]");if(!t)return;const a=t.dataset.act;
 if(a==="impAdd"){S.imp=S.imp||{file:"",rows:[],note:""};S.imp.rows.push({commande:"",email:"",parent:"",prenom:"",nom:"",naissance:"",lieu:"",semaines:[]});render()}
 if(a==="impDel"){S.imp.rows.splice(+t.dataset.i,1);render()}
 if(a==="impGo"){
  const bad=S.imp.rows.filter(r=>!r.commande||!r.email||!r.prenom);
  if(bad.length)return toast(`${bad.length} ligne${bad.length>1?"s":""} sans commande, e-mail ou prénom : corrigez ou retirez-les`);
  t.disabled=true;t.textContent="Import…";
  API.importOrders(S.imp.rows).then(res=>{S.imp=null;toast(`Import terminé : ${res.nouveaux} nouvel${res.nouveaux>1?"s":""} enfant${res.nouveaux>1?"s":""}, ${res.mis_a_jour} mis à jour`);if(!API.demo)return enter(S.profile).then(()=>{S.atab="semaines";render()});S.atab="semaines";render()},
   er=>{t.disabled=false;t.textContent="Importer";toast("Import impossible : "+er.message)});
 }
});
