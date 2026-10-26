const LOGO_LIME="assets/logo-lime.png";
const LOGO_BLACK="assets/logo-black.png";

/* ---------------- Données (remplies au chargement par API.load) ---------------- */
let WEEKS=[],PERIODS=[],kids=[],recipes=[],media={},LIEUX=[],PRICES={},LIEU_INFO={},SLUG={},REF={};
const W=n=>WEEKS.find(w=>w.n===n);
const wLabel=n=>{const w=W(n);return w?w.period.split(" ")[0]+" · semaine "+w.code.slice(1):""};
const periodWeeks=pr=>WEEKS.filter(w=>w.period===pr).map(w=>w.n);
const mk=(l,n)=>l+"|"+n;
const SHARED=["parent","tel","adresse","parent2","tel2","contacts","pickup","rc"];
const familyOf=k=>kids.filter(x=>x.email.toLowerCase()===k.email.toLowerCase()).sort((a,b)=>(a.naissance||"9").localeCompare(b.naissance||"9"));
function syncFamily(k){familyOf(k).forEach(x=>{if(x!==k)SHARED.forEach(f=>x[f]=f==="contacts"?k.contacts.map(c=>({...c})):k[f])})}
function applyData(d){
 WEEKS=d.weeks.slice().sort((a,b)=>a.start-b.start);
 PERIODS=[...new Set(WEEKS.map(w=>w.period))];
 kids=d.kids;kids.forEach(k=>k.weeks=k.weeks.filter(W).sort((a,b)=>W(a).start-W(b).start));
 recipes=d.recipes;media=d.media||{};REF=d.refs;
 LIEUX=d.lieux.map(l=>l.nom);
 d.lieux.forEach(l=>{PRICES[l.nom]=l.prix||0;LIEU_INFO[l.nom]={nom:l.salle||"",adresse:l.adresse||""};SLUG[l.nom]=l.slug});
}

/* ---------------- État ---------------- */
const S={view:"login",me:null,ptab:"accueil",step:0,pweek:null,atab:"semaines",aweek:1,afilter:"tous",aq:"",amode:"liste",mweek:1,msel:new Set(),sheet:null,lieu:null,period:"Été 2027",gweek:1,prweek:1,prgroup:true,prcols:new Set(["age","paye","allergies","regime","meds","photos","presence"])};
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// Âge au 1er juillet de l'année du camp ; null tant que la date de naissance manque.
const ageOf=k=>{if(!k.naissance)return null;const b=new Date(k.naissance),r=new Date((W(k.weeks[0])?.start||new Date()).getFullYear()+"-07-01");let a=r.getFullYear()-b.getFullYear();if(r<new Date(r.getFullYear(),b.getMonth(),b.getDate()))a--;return a};
const ageTxt=k=>ageOf(k)===null?"âge ?":ageOf(k)+" ans";
const ageSort=k=>ageOf(k)??99;
const groupOf=a=>a===null?"Âge à compléter":a<=8?"6–8 ans":"9–12 ans";
const GROUPS=["6–8 ans","9–12 ans","Âge à compléter"];
const kidName=k=>k.prenom+" "+k.nom;
const obsAll=k=>[k.obs&&"Parents : "+k.obs,k.obsEquipe&&"Équipe : "+k.obsEquipe].filter(Boolean).join(" · ");
function toast(msg){const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),3200)}

const I={
 kid:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="7" r="4"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/></svg>',
 cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
 cam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
 pot:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18v3a7 7 0 0 1-7 7h-4a7 7 0 0 1-7-7z"/><path d="M8 7c0-2 2-2 2-4M12 7c0-2 2-2 2-4M16 7c0-2 2-2 2-4"/></svg>',
 list:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
 out:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
 play:'<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4v16l13-8z"/></svg>',
 dl:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>',
 warn:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3 2 21h20zM12 10v4M12 18h.01"/></svg>',
 pill:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="2" y="8" width="20" height="8" rx="4" transform="rotate(-35 12 12)"/><path d="m9 9 6 6" /></svg>',
 nocam:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="m2 2 20 20M9 4h6l2 3h4a2 2 0 0 1 2 2v9M3 7h1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h15"/></svg>',
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
 check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5 9-10"/></svg>',
 doc:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>',
 lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
 mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
 info:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-5M12 8h.01"/></svg>',
 print:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
 sprout:'<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 56V30"/><path d="M32 34c-10 0-16-6-16-16 10 0 16 6 16 16zM32 30c0-10 6-16 16-16 0 10-6 16-16 16z"/></svg>'
};

/* ---------------- Statut d'un enfant (chips) ---------------- */
function statusChips(k,{withPay=true}={}){
 const c=[];
 if(withPay)c.push(k.paid?'<span class="chip ok">Payé</span>':'<span class="chip bad">Non payé</span>');
 if(!k.done)c.push('<span class="chip warn">Fiche à compléter</span>');
 if(k.allergies)c.push(`<span class="chip ${k.severe?"bad":"warn"}">${I.warn}${esc(k.allergies)}</span>`);
 if(k.meds.length)c.push(`<span class="chip info">${I.pill}${k.meds.length>1?k.meds.length+" médicaments":"Médicament"}</span>`);
 if(k.patho)c.push(`<span class="chip info">${esc(k.patho)}</span>`);
 k.diet.forEach(d=>c.push(`<span class="chip">${esc(d.length>36?d.slice(0,34)+"…":d)}</span>`));
 c.push(k.photos?'<span class="chip ok">Photos OK</span>':`<span class="chip bad">${I.nocam}Pas de photos</span>`);
 if(k.seul)c.push('<span class="chip info">Rentre seul</span>');
 if(k.nage===false)c.push('<span class="chip warn">Ne sait pas nager</span>');
 if(k.obs||k.obsEquipe)c.push('<span class="chip">Observation</span>');
 if(k.reminded&&(!k.paid||!k.done))c.push(`<span class="chip">${I.mail}Relancé le ${k.reminded}</span>`);
 return c.join("");
}

/* ---------------- Rendu global ---------------- */
function render(){
 const r=$("#root");
 if(S.view==="login")r.innerHTML=loginView();
 else if(S.view==="loading")r.innerHTML=`<section id="login" class="wrap"><div class="login-card" style="text-align:center"><img class="login-logo" src="${LOGO_BLACK}" alt="Croc'n'Mouv" style="margin:auto;height:60px"><p class="hint">Chargement…</p></div></section>`;
 else if(S.view==="parent")r.innerHTML=parentView();
 else r.innerHTML=adminView();
 if(S.sheet)r.insertAdjacentHTML("beforeend",S.sheet());
}

/* ---------------- Pictos ---------------- */
const L=d=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ILL={
 food:L('<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 21V3c-2.5 1-4 4-4 8h4"/>'),
 move:L('<path d="M3 12h4l3-8 4 16 3-8h4"/>'),
 leaf:L('<path d="M5 21c0-9 5-16 15-17 0 10-6 16-15 17z"/><path d="M5 21 15 10"/>'),
 sun:L('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>')
};
const RECIPE_ILL=[ILL.food,ILL.leaf,ILL.sun];
const WEEK_START=n=>W(n).start;
const refOf=(lieu,n)=>REF[lieu+"|"+n]||{nom:"",tel:""};
const priceOf=k=>PRICES[k.lieu]||0;
const orderTotal=o=>kids.filter(x=>x.order===o).reduce((t,x)=>t+priceOf(x)*x.weeks.length,0);
const IBAN="CH51 8080 8001 6377 4728 3";
const chf=n=>n?"CHF "+n.toLocaleString("fr-CH")+".–":"tarif à définir";
const PACK=["Crème solaire","Maillot de bain","Gourde","Casquette","Affaires de rechange","K-way","Tablier"];

/* ---------------- Connexion ---------------- */
// Parents : numéro de commande + e-mail, puis code à 6 chiffres reçu par e-mail. Équipe : e-mail puis code.
const LG={mode:"parent",step:"form",email:"",order:"",err:"",busy:false};
function loginView(){
 const team=LG.mode==="equipe";
 const form=LG.step==="code"?`
  <form class="card form" id="codeForm" novalidate>
   <p>Nous avons envoyé un code à 6 chiffres à <b>${esc(LG.email)}</b>. Il arrive en général en moins d'une minute (pensez à regarder dans les spams).</p>
   <label class="f" for="lgCode">Code reçu par e-mail
    <input class="input code-input" id="lgCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="••••••" required>
   </label>
   <p class="err" id="lgErr" ${LG.err?"":"hidden"}>${esc(LG.err)}</p>
   <button class="btn primary" type="submit" ${LG.busy?"disabled":""}>${LG.busy?"Vérification…":"Entrer"}</button>
   <button class="link" type="button" data-act="lgBack">Changer d'e-mail ou renvoyer un code</button>
  </form>`:`
  <form class="card form" id="loginForm" novalidate>
   ${team?"":`<label class="f" for="lgOrder">Numéro de commande
    <input class="input" id="lgOrder" placeholder="Ex. 14817" inputmode="numeric" autocomplete="off" required value="${esc(LG.order)}">
   </label>`}
   <label class="f" for="lgEmail">${team?"Votre e-mail":"E-mail utilisé lors de l'inscription"}
    <input class="input" id="lgEmail" type="email" placeholder="vous@exemple.ch" autocomplete="email" required value="${esc(LG.email)}">
   </label>
   ${team?'<p class="hint">Accès réservé à la direction et aux référent·es des camps.</p>':'<p class="hint">Le numéro se trouve dans l\'e-mail de confirmation de commande reçu après l\'inscription sur crocnmouv.ch.</p>'}
   <p class="err" id="lgErr" ${LG.err?"":"hidden"}>${esc(LG.err)}</p>
   <button class="btn primary" type="submit" ${LG.busy?"disabled":""}>${LG.busy?"Envoi du code…":"Recevoir mon code par e-mail"}</button>
  </form>`;
 return `
<section id="login" class="wrap">
 <div class="login-card">
  <div class="login-hero">
   <img class="login-logo" src="${LOGO_LIME}" alt="Croc'n'Mouv">
   <h1>${team?"Espace équipe":"Bienvenue dans l'espace familles"}</h1>
   <p>${team?"Listes des enfants, photos et programme.":"Vous y retrouverez la fiche de votre enfant, le programme et d'autres jolies surprises."}</p>
   <span class="deco" aria-hidden="true"></span>
  </div>
  ${form}
  ${LG.step==="form"?`<button class="link" type="button" data-act="lgMode" style="justify-self:center">${team?"Je suis un parent":"Accès équipe Croc'n'Mouv"}</button>`:""}
  ${API.demo?`<div class="demo-box">
   <b>Mode démo : données fictives</b>
   <span>Essayez les trois espaces :</span>
   <div class="row">
    <button class="btn small" data-act="demoParent">Parent (commande 14817)</button>
    <button class="btn small" data-act="demoAdmin">Direction</button>
    <button class="btn small" data-act="demoResp">Responsable de camp</button>
   </div>
  </div>`:""}
 </div>
</section>`}

// Après connexion : rôle, chargement des données, puis bon espace.
async function enter(profile){
 S.view="loading";render();
 try{applyData(await API.load(profile))}
 catch(e){console.error(e);S.view="login";LG.step="form";LG.err="Le chargement a échoué. Vérifiez votre connexion et réessayez.";return render()}
 S.profile=profile;S.sheet=null;S.imp=null;scrollTo(0,0);
 if(profile.role==="parent"){
  const mine=kids.filter(k=>k.email===profile.email);
  if(!mine.length){S.view="login";LG.err="Aucun enfant n'est encore lié à cette commande. Contactez Caroline au 079 195 76 33.";await API.logout();return render()}
  S.me=mine.find(x=>!x.done)||mine[0];Object.assign(S,{view:"parent",ptab:"accueil",step:0});
 }else if(profile.role==="resp"){
  S.respSlots=profile.creneaux;
  const first=S.respSlots.map(c=>({...c,w:W(c.semaine)})).filter(c=>c.w).sort((a,b)=>a.w.start-b.w.start)[0];
  Object.assign(S,{view:"admin",role:"resp",respName:profile.nom||profile.email,lieu:first?.lieu||null,period:first?.w.period||PERIODS[0],atab:"semaines",afilter:"tous"});
  const f=myWeeks()[0];Object.assign(S,{aweek:f,mweek:f,prweek:f,gweek:f});
 }else{
  const p=PERIODS.find(p=>periodWeeks(p).some(n=>W(n).start>=new Date(Date.now()-6*864e5)))||PERIODS[0];
  Object.assign(S,{view:"admin",role:"direction",lieu:null,period:p,atab:"semaines",afilter:"tous"});
  const f=periodWeeks(p)[0];Object.assign(S,{aweek:f,mweek:f,prweek:f,gweek:f});
 }
 render();
}
async function boot(){
 if(API.demo||!(await API.hasSession().catch(()=>false))){S.view="login";return render()}
 try{await enter(await API.profile())}catch(e){console.error(e);S.view="login";render()}
}

/* ---------------- Espace parent ---------------- */
function parentView(){
 const k=S.me,fam=familyOf(k);
 const switcher=fam.length>1&&["accueil","enfant","programme","photos","facture"].includes(S.ptab)?`<div class="kid-switch" role="group" aria-label="Choisir l'enfant">${fam.map(x=>`<button aria-pressed="${x===k}" data-pkid="${x.id}"><span class="avatar">${esc(x.prenom[0])}</span>${esc(x.prenom)}${x.done?"":'<span class="mini-dot" aria-label="fiche à compléter"></span>'}</button>`).join("")}</div>`:"";
 const tabs=[["accueil","Accueil",I.home],["enfant","Fiche",I.kid],["programme","Programme",I.cal],["photos","Photos",I.cam],["recettes","Recettes",I.pot]];
 let body="";
 if(S.ptab==="accueil")body=parentHome(k);
 if(S.ptab==="enfant")body=parentKid(k);
 const noWeek=`<div class="section"><div class="card plain empty"><span class="empty-ill">${ILL.sun}</span><p>Les semaines de ${esc(k.prenom)} sont en cours de confirmation. Contactez-nous au 079 195 76 33 si besoin.</p></div></div>`;
 if(S.ptab==="programme")body=k.weeks.length?parentProgram(k):noWeek;
 if(S.ptab==="photos")body=k.weeks.length?parentPhotos(k):noWeek;
 if(S.ptab==="recettes")body=recipesList(false);
 if(S.ptab==="infos")body=`<div class="section">${reglementHTML()}</div>`;
 if(S.ptab==="facture")body=parentBill(k);
 return `<div class="app">
 <header class="topbar"><div class="wrap">
  <img class="logo-img logo-black" src="${LOGO_BLACK}" alt="Croc'n'Mouv">
  <div class="who"><b>${esc(k.parent)}</b>${fam.length>1?fam.length+" enfants":"Commande "+esc(k.order)}</div>
  <button class="iconbtn" data-ptab="infos" aria-label="Infos pratiques et règlement">${I.info}</button>
  <button class="iconbtn" data-act="logout" aria-label="Se déconnecter">${I.out}</button>
 </div></header>
 <main><div class="wrap">${switcher}${body}</div></main>
 <nav class="tabs" aria-label="Navigation"><div class="wrap" role="tablist">
  ${tabs.map(([id,l,ic])=>`<button class="tab" role="tab" aria-selected="${S.ptab===id}" data-ptab="${id}">${ic}${l}</button>`).join("")}
 </div></nav></div>`;
}
function completion(k){
 if(k.done)return 100;
 let n=0;const t=6;
 if(k.prenom&&k.naissance)n++; if(k.tel)n++; if(k.contacts&&k.contacts.length)n++; if(k.diet.length||k.allergies)n++;
 return Math.round(n/t*100);
}
function countdown(k){
 const n=k.weeks[0];if(!n)return {num:"",txt:"Semaines en cours de confirmation"};const start=WEEK_START(n),today=new Date();today.setHours(0,0,0,0);
 const d=Math.round((start-today)/864e5);
 if(d>0)return {num:d,txt:`jour${d>1?"s":""} avant le camp`};
 if(d>-5)return {num:"",txt:`${esc(k.prenom)} est au camp cette semaine !`};
 return {num:"",txt:"Merci pour ce bel été !"};
}
function parentHome(k){
 const c=countdown(k),pct=completion(k),w=W(k.weeks[0]);
 const fam=familyOf(k),orders=[...new Set(fam.map(x=>x.order))];
 const todo=[
  ...fam.map(x=>{const p=completion(x);return {ok:x.done,t:`Fiche de ${esc(x.prenom)}`,s:x.done?"Complète, merci !":`Complétée à ${p} %. Il reste quelques questions.`,a:x.done?"":`<button class="btn small primary" data-kidfiche="${x.id}">Compléter</button>`}}),
  {ok:fam.every(x=>x.cgv),t:"Règlement général",s:fam.every(x=>x.cgv)?"Lu et accepté":"À lire et accepter dans la fiche",a:fam.every(x=>x.cgv)?"":`<button class="btn small" data-act="readRules">Lire</button>`},
  ...orders.map(o=>{const pd=fam.filter(x=>x.order===o).every(x=>x.paid);return {ok:pd,t:`Paiement${orders.length>1?" · commande "+o:""}`,s:pd?"Reçu, merci !":"Virement bancaire dans les 10 jours après l'inscription",a:""}})
 ];
 return `<div class="section">
 <div class="hero-home">
  <span class="eyebrow">Bonjour ${esc(k.parent.split(" ")[0])} !${fam.length>1?" · "+esc(k.prenom):""}</span>
  <div class="count-line">${c.num!==""?`<span class="count">${c.num}</span>`:""}<span class="count-txt">${c.txt}</span></div>
  <div class="chips"><span class="chip">${esc(k.lieu)}</span>${k.weeks.map(n=>`<span class="chip">${W(n).code} · ${W(n).from} au ${W(n).to}</span>`).join("")}</div>
  ${w?`<p class="hero-theme">Première semaine : <b>${esc(w.theme)}</b></p>`:""}
  <span class="deco" aria-hidden="true"></span>
 </div>

 <div class="card where">
  <h2>Lieu et référent</h2>
  <dl class="kv">
   <dt>Lieu</dt><dd><b>${esc(LIEU_INFO[k.lieu]?.nom||"Croc'n'Mouv "+k.lieu)}</b><br>${esc(LIEU_INFO[k.lieu]?.adresse)||'<span class="hint">Adresse communiquée prochainement</span>'}</dd>
   ${k.weeks.map(n=>{const r=refOf(k.lieu,n);return `<dt>${W(n).code} · ${W(n).from}</dt><dd>${r.nom?`Référent·e : <b>${esc(r.nom)}</b><br><span style="font-variant-numeric:tabular-nums">${esc(r.tel)}</span>`:'<span class="hint">Référent·e communiqué·e avant le camp</span>'}</dd>`}).join("")}
  </dl>
 </div>

 <div class="card todo">
  <h2>À faire avant le camp</h2>
  ${todo.map(x=>`<div class="todo-row"><span class="dot ${x.ok?"ok":"warn"}" aria-hidden="true">${x.ok?I.check:"!"}</span><div><b>${x.t}</b><p class="hint">${x.s}</p></div>${x.a}</div>`).join("")}
 </div>

 <div class="card bill">
  <span class="pm-ill">${k.paid?I.doc:I.lock}</span>
  <div><h2>Facturation</h2><p class="hint">${k.paid?"Votre attestation de paiement pour les impôts est disponible.":`Montant : ${chf(priceOf(k)*k.weeks.length)}. L'attestation pour les impôts se débloque dès réception du paiement.`}</p></div>
  <button class="btn small ${k.paid?"primary":""}" data-ptab="facture">${k.paid?"Télécharger":"Détails"}</button>
 </div>

 <div class="card bag">
  <div class="section-head"><h2>À mettre dans mon sac :</h2><span class="hint">Cochez en préparant le sac</span></div>
  <div class="checks">${PACK.map((x,i)=>`<label for="bag${i}"><input type="checkbox" id="bag${i}">${x}</label>`).join("")}</div>
 </div>

 <div class="section-head"><h2>Ce qui l'attend</h2><button class="link" data-ptab="programme">Voir le programme</button></div>
 <div class="pillar-mini">
  <button class="pm" data-ptab="programme"><span class="pm-ill">${ILL.food}</span><b>Alimentation</b><span class="hint">Cuisiner, goûter, découvrir</span></button>
  <button class="pm" data-ptab="programme"><span class="pm-ill">${ILL.move}</span><b>Mouvement</b><span class="hint">Sport, jeux, relaxation</span></button>
  <button class="pm" data-ptab="programme"><span class="pm-ill">${ILL.leaf}</span><b>Nature</b><span class="hint">Ferme, potager, cueillette</span></button>
 </div>

  <div class="card info-card">
   <h2>Infos pratiques</h2>
   <div class="times"><div><span class="t">8h–9h</span><span class="hint">Accueil du matin</span></div><div><span class="t">16h45–17h</span><span class="hint">Retour des enfants</span></div></div>
   <p class="hint">Du lundi au vendredi.</p>
   <div class="friday"><span class="t">Vendredi 17h00–17h45</span><p>Rendez-vous avec les parents pour récupérer les enfants autour d'un apéritif qu'ils ont préparé, suivi du film qui retrace la semaine.</p></div>
   <button class="btn small ghost" data-ptab="infos" style="justify-self:start">Règlement et contact</button>
  </div>
 </div>`;
}
function parentBill(k){
 const total=priceOf(k)*k.weeks.length,yr=2027;
 const rows=k.weeks.map(n=>`<tr><td>${wLabel(n)} · du ${W(n).from} au ${W(n).to} ${yr}</td><td class="num">${chf(priceOf(k))}</td></tr>`).join("");
 const head=`<div class="section-head"><div><span class="eyebrow">Commande ${esc(k.order)}</span><h1>Facturation</h1></div></div>`;
 if(!k.paid)return `<div class="section">${head}
  <div class="card locked"><span class="pm-ill">${I.lock}</span><div><h2>Attestation pour les impôts</h2><p>Elle sera disponible ici dès que nous aurons reçu votre paiement. Vous recevrez un e-mail à ce moment-là.</p></div></div>
  <div class="card plain" style="display:grid;gap:10px"><h3>Montant à régler</h3>
   <div class="table-wrap"><table style="min-width:0"><tbody>${rows}<tr><th>Total</th><th class="num">${chf(total)}</th></tr></tbody></table></div>
   <p class="hint">Par virement bancaire dans les 10 jours après l'inscription, avec le numéro de commande en communication.</p></div>
  <div class="card plain" style="display:grid;gap:10px"><h3>Coordonnées pour le virement</h3>
   <div class="table-wrap"><table style="min-width:0"><tbody>
    <tr><th>Titulaire</th><td>Global Nutrition Sàrl, Caroline Berney<br>Chemin de Vuillonnex 36, 1232 Confignon</td></tr>
    <tr><th>IBAN</th><td style="white-space:normal">${IBAN}</td></tr>
    <tr><th>Montant</th><td>${chf(total)}</td></tr>
    <tr><th>Communication</th><td><b>Commande ${esc(k.order)}</b></td></tr>
   </tbody></table></div>
   <div class="toolbar"><button class="btn" data-act="copyIban">${I.check}Copier l'IBAN</button></div>
   <p class="hint">Nous validons votre paiement à sa réception sur notre compte (quelques jours). L'attestation apparaît alors ici.</p></div>
 </div>`;
 return `<div class="section">${head}
 <div class="card bill"><span class="pm-ill">${I.check}</span><div><h2>Paiement reçu, merci !</h2><p class="hint">Vous pouvez joindre cette attestation à votre déclaration d'impôts (frais de garde des enfants).</p></div></div>
 <div class="toolbar"><button class="btn primary" data-act="dlBill">${I.dl}Télécharger l'attestation (PDF)</button></div>
 <div class="paper">
  <div class="paper-head"><div><h2>Attestation de paiement ${yr}</h2><p class="sub">Frais de garde · centre aéré Croc'n'Mouv</p></div><img src="${LOGO_BLACK}" alt="Croc'n'Mouv"></div>
  <table style="min-width:0"><tbody>
   <tr><th>Lieu</th><td>Centre aéré de ${esc(k.lieu)}</td></tr>
   <tr><th>Organisateur</th><td>Global Nutrition Sàrl · Croc'n'Mouv<br>Chemin de Vuillonnex 36, 1232 Confignon<br>Caroline Berney, 079 195 76 33</td></tr>
   <tr><th>Parent</th><td>${esc(k.parent)}<br>${esc(k.adresse)}</td></tr>
   <tr><th>Enfant</th><td>${esc(kidName(k))}, né·e le ${new Date(k.naissance).toLocaleDateString("fr-CH")}</td></tr>
  </tbody></table>
  <table style="min-width:0"><thead><tr><th>Prestation</th><th>Montant</th></tr></thead><tbody>${rows}<tr><th>Total payé</th><th class="num">${chf(total)}</th></tr></tbody></table>
  <p class="sub">Paiement reçu par virement bancaire. Commande n° ${esc(k.order)}. Document établi le ${new Date().toLocaleDateString("fr-CH")}.</p>
 </div>
 </div>`;
}
const STEPS=["Enfant et parents","Alimentation et santé","Retour et assurances","Photos et règlement"];
function parentKid(k){
 const pct=completion(k),st=S.step||0;
 const panel=(i,html)=>`<div class="step-panel" data-panel="${i}" ${i===st?"":"hidden"}>${html}</div>`;
 return `<div class="section">
 <div class="section-head"><div><span class="eyebrow">${k.done?"Fiche complète":"Fiche complétée à "+pct+" %"}</span><h1>Fiche de ${esc(k.prenom)}</h1></div></div>
 <nav class="stepper" aria-label="Étapes de la fiche">${STEPS.map((s,i)=>`<button type="button" class="step ${i<st?"done":""}" data-step="${i}" ${i===st?'aria-current="step"':""}><i></i><span>${i+1}. ${s}</span></button>`).join("")}</nav>
 <form class="card form" id="kidForm" novalidate>
 ${panel(0,`
  <fieldset>
   <legend>Enfant</legend>
   <div class="grid g2">
    <label class="f" for="fPrenom">Prénom<input class="input" id="fPrenom" value="${esc(k.prenom)}"></label>
    <label class="f" for="fNom">Nom<input class="input" id="fNom" value="${esc(k.nom)}"></label>
    <label class="f" for="fNaiss">Date de naissance<input class="input" id="fNaiss" type="date" value="${esc(k.naissance)}"></label>
   </div>
  </fieldset>
  <fieldset>
   <legend>Parents</legend>
   ${familyOf(k).length>1?`<p class="shared-note">${I.check}Ces informations sont communes à ${familyOf(k).map(x=>esc(x.prenom)).join(", ")}. Remplies une fois, elles sont reprises pour tous vos enfants.</p>`:""}
   <div class="grid g2">
    <label class="f" for="fParent">Nom du parent<input class="input" id="fParent" value="${esc(k.parent)}"></label>
    <label class="f" for="fTel">Téléphone<input class="input" id="fTel" type="tel" value="${esc(k.tel)}"></label>
    <label class="f" for="fEmail">E-mail de connexion<input class="input" id="fEmail" type="email" value="${esc(k.email)}" readonly aria-readonly="true"></label>
    <label class="f" for="fAdr">Adresse (rue, NPA, localité)<input class="input" id="fAdr" value="${esc(k.adresse)}"></label>
   </div>
   <div class="grid g2">
    <label class="f" for="fP2">Nom du parent 2<input class="input" id="fP2" placeholder="Facultatif" value="${esc(k.parent2)}"></label>
    <label class="f" for="fTel2">Téléphone du parent 2<input class="input" id="fTel2" type="tel" placeholder="Facultatif" value="${esc(k.tel2)}"></label>
   </div>
   <div class="f" style="display:grid;gap:8px">
    <div id="contacts" style="display:grid;gap:8px">${k.contacts.map((c,i)=>contactRow(c,i)).join("")}</div>
    <button type="button" class="btn ghost small" data-act="addContact" style="justify-self:start">+ Ajouter une personne à contacter</button>
   </div>
  </fieldset>`)}
 ${panel(1,`
  <fieldset>
   <legend>Alimentation</legend>
   <label class="f" for="fRegime">Régime alimentaire particulier<textarea class="input" id="fRegime" placeholder="Décrivez ici ce que votre enfant mange ou ne mange pas">${esc(k.diet.join(", "))}</textarea></label>
   <label class="f" for="fAll">Allergies ou intolérances alimentaires<input class="input" id="fAll" placeholder="Ex. arachides, lactose…" value="${esc(k.allergies)}"></label>
   <div class="checks"><label for="fSev"><input type="checkbox" id="fSev" ${k.severe?"checked":""}>Allergie sévère (risque de choc anaphylactique)</label></div>
  </fieldset>
  <fieldset>
   <legend>Santé</legend>
   <label class="f" for="fPatho">Maladie chronique, besoin particulier ou restriction<textarea class="input" id="fPatho" placeholder="Ex. asthme, diabète, TDAH, port de lunettes…">${esc(k.patho)}</textarea></label>
   <div class="f" style="display:grid;gap:8px">
    <span style="font-weight:500;font-size:.9rem">Médicaments à donner pendant la journée</span>
    <div id="meds" style="display:grid;gap:8px">${(k.meds.length?k.meds:[{name:"",dose:"",when:""}]).map((m,i)=>medRow(m,i)).join("")}</div>
    <button type="button" class="btn ghost small" data-act="addMed" style="justify-self:start">+ Ajouter un médicament</button>
   </div>
   <span style="font-weight:500;font-size:.9rem">Mon enfant sait nager</span>
   <div class="checks">
    <label for="fNageY"><input type="radio" name="nage" id="fNageY" ${k.nage===true?"checked":""}>Oui</label>
    <label for="fNageN"><input type="radio" name="nage" id="fNageN" ${k.nage===false?"checked":""}>Non</label>
   </div>
  </fieldset>`)}
 ${panel(2,`
  <fieldset>
   <legend>Retour à la maison</legend>
   <span style="font-weight:500;font-size:.9rem">Mon enfant peut rentrer seul</span>
   <div class="checks">
    <label for="fSeulY"><input type="radio" name="seul" id="fSeulY" ${k.seul?"checked":""}>Oui</label>
    <label for="fSeulN"><input type="radio" name="seul" id="fSeulN" ${!k.seul?"checked":""}>Non</label>
   </div>
   <label class="f" for="fPick">Personnes autorisées à venir chercher l'enfant<input class="input" id="fPick" placeholder="Nom, lien, téléphone" value="${esc(k.pickup)}"></label>
   <p class="hint">Une pièce d'identité pourra être demandée à une personne que l'équipe ne connaît pas.</p>
  </fieldset>
  <fieldset>
   <legend>Assurances</legend>
   <div class="grid g2">
    <label class="f" for="fAM">Assurance maladie<input class="input" id="fAM" value="${esc(k.assMaladie)}"></label>
    <label class="f" for="fAA">Assurance accident<input class="input" id="fAA" value="${esc(k.assAccident)}"></label>
   </div>
   <label class="f" for="fRC">Responsabilité civile (RC) des parents<input class="input" id="fRC" value="${esc(k.rc)}"></label>
  </fieldset>`)}
 ${panel(3,`
  <fieldset>
   <legend>Droit à l'image</legend>
   <p>Pendant la semaine de camp, notre équipe prend des photos et des vidéos des activités. Elles sont partagées sur cet espace avec les familles de la semaine et projetées lors de l'apéritif de fin de camp.</p>
   <p>Si vous préférez ne pas donner votre accord, nous veillons à ce que votre enfant n'apparaisse sur aucune photo ni vidéo diffusée. Il participe bien sûr à toutes les activités, comme les autres.</p>
   <div class="checks">
    <label for="fPhY"><input type="radio" name="photos" id="fPhY" value="1" ${k.photos?"checked":""}>J'autorise Croc'n'Mouv à utiliser les photos et vidéos de mon enfant</label>
    <label for="fPhN"><input type="radio" name="photos" id="fPhN" value="0" ${!k.photos&&k.done?"checked":""}>Je refuse</label>
   </div>
   <p class="hint">Les photos restent visibles uniquement par les familles inscrites la même semaine.</p>
  </fieldset>
  <fieldset>
   <legend>Autre chose à nous dire ?</legend>
   <label class="f" for="fObs"><span class="hint">Habitudes, peurs, informations utiles à l'équipe…</span><textarea class="input" id="fObs">${esc(k.obs)}</textarea></label>
  </fieldset>
  <fieldset>
   <legend>Règlement général</legend>
   <button type="button" class="btn ghost small" data-act="readRules" style="justify-self:start">Lire le règlement général</button>
   <div class="checks"><label for="fCgv"><input type="checkbox" id="fCgv" ${k.cgv?"checked":""}>J'ai lu et j'accepte le règlement général de Croc'n'Mouv</label></div>
  </fieldset>`)}
  <p class="err" id="kErr" hidden></p>
  <div class="step-nav">
   <button type="button" class="btn ghost" data-act="stepPrev" ${st===0?"hidden":""}>Retour</button>
   <button type="button" class="btn primary" data-act="stepNext" ${st===3?"hidden":""}>Continuer</button>
   <button type="submit" class="btn primary" ${st===3?"":"hidden"}>Enregistrer la fiche</button>
  </div>
 </form>
 <p class="hint" style="text-align:center">Vous pouvez revenir modifier la fiche à tout moment avant le camp.</p>
 </div>`;
}
function goStep(n){
 S.step=Math.max(0,Math.min(3,n));
 document.querySelectorAll(".step-panel").forEach(p=>p.hidden=+p.dataset.panel!==S.step);
 document.querySelectorAll(".step").forEach((b,i)=>{b.classList.toggle("done",i<S.step);if(i===S.step)b.setAttribute("aria-current","step");else b.removeAttribute("aria-current")});
 const nav=document.querySelector(".step-nav");
 nav.querySelector('[data-act="stepPrev"]').hidden=S.step===0;
 nav.querySelector('[data-act="stepNext"]').hidden=S.step===3;
 nav.querySelector('[type="submit"]').hidden=S.step!==3;
 document.querySelector(".stepper").scrollIntoView({block:"start",behavior:"smooth"});
}
function contactRow(c,i){return `<div class="contact-row">
 <input class="input" id="cN${i}" placeholder="Nom et lien (ex. grand-maman)" value="${esc(c.name)}" aria-label="Nom et lien">
 <input class="input" id="cT${i}" type="tel" placeholder="Téléphone" value="${esc(c.tel)}" aria-label="Téléphone">
 <button type="button" class="iconbtn" data-act="delRow" aria-label="Retirer">✕</button></div>`}
function medRow(m,i){return `<div class="med-row">
 <input class="input" id="mN${i}" placeholder="Médicament" value="${esc(m.name)}" aria-label="Médicament">
 <input class="input" id="mD${i}" placeholder="Dose" value="${esc(m.dose)}" aria-label="Dose">
 <input class="input" id="mW${i}" placeholder="Quand ?" value="${esc(m.when)}" aria-label="Quand le donner">
 <button type="button" class="iconbtn" data-act="delMed" data-i="${i}" aria-label="Retirer">✕</button></div>`}
function weekSeg(list,cur,attr){return `<div class="seg" role="group" aria-label="Semaine">${list.map(n=>`<button aria-pressed="${cur===n}" data-${attr}="${n}">${W(n).code} · ${W(n).from}</button>`).join("")}</div>`}
function parentProgram(k){
 const n=S.pweek&&k.weeks.includes(S.pweek)?S.pweek:k.weeks[0];const w=W(n);
 const pill=(t,ill,list)=>`<div class="pillar"><span class="pillar-ill">${ill}</span><h3>${t}</h3><ul>${list.map(x=>`<li>${x}</li>`).join("")}</ul></div>`;
 return `<div class="section">
 <div class="section-head"><div><span class="eyebrow">${wLabel(n)} · du ${w.from} au ${w.to}</span><h1>${esc(w.theme)}</h1></div></div>
 <p class="hint">${esc(LIEU_INFO[k.lieu]?.nom||"Croc'n'Mouv "+k.lieu)}${refOf(k.lieu,n).nom?" · Référent·e : "+esc(refOf(k.lieu,n).nom)+", "+esc(refOf(k.lieu,n).tel):""}</p>
 ${k.weeks.length>1?weekSeg(k.weeks,n,"pweek"):""}
 <div class="pillars">
  ${pill("Alimentation",ILL.food,w.program.alimentation)}
  ${pill("Mouvement",ILL.move,w.program.mouvement)}
  ${pill("Nature",ILL.leaf,w.program.nature)}
 </div>
 <h2>Jour par jour</h2>
 <ol class="timeline">${w.days.map(([d,t])=>`<li><b>${d}</b><span>${t}</span></li>`).join("")}</ol>
 </div>`;
}
// Photos chargées à la demande par lieu + semaine ; les liens sont temporaires (1 h), on recharge après 50 min.
const mediaLoading=new Set();
function mediaList(lieu,n){
 const key=mk(lieu,n),cur=media[key];
 if(cur&&(API.demo||Date.now()-(cur.at||0)<50*60e3))return cur;
 if(API.demo)return media[key]=[];
 if(!mediaLoading.has(key)){mediaLoading.add(key);
  API.listMedia(lieu,SLUG[lieu],n).then(l=>{l.at=Date.now();media[key]=l},()=>{media[key]=Object.assign([],{at:Date.now()});toast("Les photos n'ont pas pu être chargées")}).finally(()=>{mediaLoading.delete(key);render()})}
 return cur||null;
}
const loadingCard=`<div class="card plain"><p class="hint">Chargement des photos…</p></div>`;
function mediaTile(m,selectable){
 const inner=m.src?(m.type==="video"?`<video src="${esc(m.src)}#t=0.5" preload="metadata" muted playsinline></video>`:`<img src="${esc(m.src)}" alt="${esc(m.cap)}" loading="lazy">`):`<span class="ph-ill">${I.cam}</span>`;
 const link=!selectable&&m.src;
 const tag=selectable?"button":link?"a":"div";
 return `<${tag} class="ph" style="background-color:${m.hue}" ${selectable?`aria-pressed="${S.msel.has(m.id)}" data-msel="${m.id}"`:""} ${link?`href="${esc(m.src)}" target="_blank" rel="noopener"`:""}>
  ${inner}${m.type==="video"?`<span class="type">${I.play}Vidéo</span>`:""}${selectable?'<span class="sel" aria-hidden="true"></span>':""}<span class="cap">${esc(m.cap)}</span></${tag}>`;
}
function parentPhotos(k){
 const n=S.pweek&&k.weeks.includes(S.pweek)?S.pweek:k.weeks[0];const list=mediaList(k.lieu,n);
 const full={Lun:"Lundi",Mar:"Mardi",Mer:"Mercredi",Jeu:"Jeudi",Ven:"Vendredi"};
 const byDay=list?[...W(n).days.map(([d],i)=>[full[d]||d,list.filter(m=>m.day===i+1)]),["Autres moments",list.filter(m=>!(m.day>=1&&m.day<=W(n).days.length))]].filter(x=>x[1].length):[];
 return `<div class="section">
 <div class="section-head"><div><span class="eyebrow">${wLabel(n)} · ${W(n).from} au ${W(n).to}</span><h1>Les photos de la semaine</h1></div></div>
 ${k.weeks.length>1?weekSeg(k.weeks,n,"pweek"):""}
 ${!list?loadingCard:list.length?byDay.map(([d,l])=>`<h3>${d}</h3><div class="gallery feature">${l.map(m=>mediaTile(m,false)).join("")}</div>`).join("")+'<p class="hint">Touchez une photo pour l\'ouvrir en grand et l\'enregistrer.</p>':`<div class="card plain empty"><span class="empty-ill">${ILL.sun}</span><p>Les photos de cette semaine seront publiées chaque soir pendant le camp.</p></div>`}
 </div>`;
}
function recipesList(admin){
 return `<div class="section">
 <div class="section-head"><div><span class="eyebrow">À refaire à la maison</span><h1>Nos recettes</h1></div>
 ${admin?'<button class="btn primary" data-act="newRecipe">+ Nouvelle recette</button>':""}</div>
 <div class="recipes">${recipes.map(r=>`<button class="recipe" data-recipe="${r.id}">
  <div class="art" style="background-color:${r.hue}">${r.img?`<img src="${r.img}" alt="">`:`<span class="art-ill">${RECIPE_ILL[r.id%3]}</span>`}</div>
  <div class="body"><span class="hand">${esc(r.title)}</span><span class="meta">${esc(r.time)} · ${esc(r.level)} · ${wLabel(r.week)}</span><div class="chips">${r.tags.map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div></div>
 </button>`).join("")}</div></div>`;
}
function recipeSheet(r){return ()=>`<div class="sheet-bg" data-act="closeSheet"><div class="sheet recipe-detail" role="dialog" aria-modal="true" aria-label="${esc(r.title)}">
 <div class="grab"></div>
 <div class="recipe"><div class="art" style="background-color:${r.hue};border-radius:var(--r)">${r.img?`<img src="${r.img}" alt="">`:`<span class="art-ill">${RECIPE_ILL[r.id%3]}</span>`}</div></div>
 <div><span class="hand" style="font-size:2rem">${esc(r.title)}</span><p class="hint">${esc(r.time)} · ${esc(r.level)} · cuisinée en ${wLabel(r.week).toLowerCase()}</p></div>
 <div class="chips">${r.tags.map(t=>`<span class="chip">${esc(t)}</span>`).join("")}</div>
 <h3>Ingrédients</h3><ul>${r.ing.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>
 <h3>Préparation</h3><ol>${r.steps.map(x=>`<li>${esc(x)}</li>`).join("")}</ol>
 <button class="btn" data-act="closeSheet">Fermer</button></div></div>`}

/* ---------------- Espace équipe ---------------- */
function adminView(){
 const tabs=isResp()?[["semaines","Enfants",I.list],["medias","Photos",I.cam],["imprimer","Imprimer",I.print]]:[["semaines","Semaines",I.list],["programme","Programme",I.cal],["medias","Photos",I.cam],["recettes","Recettes",I.pot],["imprimer","Imprimer",I.print]];
 let body="";
 if(S.atab==="semaines")body=adminWeeks();
 if(S.atab==="medias")body=adminMedia();
 if(S.atab==="recettes")body=recipesList(true);
 if(S.atab==="imprimer")body=adminPrint();
 if(S.atab==="programme")body=adminProgram();
 if(S.atab==="import"&&!isResp())body=adminImport();
 return `<div class="app">
 <header class="topbar"><div class="wrap">
  <img class="logo-img logo-black" src="${LOGO_BLACK}" alt="Croc'n'Mouv">
  <div class="who">${isResp()?`<b>${esc(S.respName)}</b>Responsable · ${esc(S.lieu)}`:`<b>${esc(S.profile?.nom||"Direction")}</b>Espace équipe`}</div>
  <button class="iconbtn" data-act="logout" aria-label="Se déconnecter">${I.out}</button>
 </div></header>
 <main><div class="wrap">${body}</div></main>
 <nav class="tabs" aria-label="Navigation"><div class="wrap" role="tablist">
  ${tabs.map(([id,l,ic])=>`<button class="tab" role="tab" aria-selected="${S.atab===id}" data-atab="${id}">${ic}${l}</button>`).join("")}
 </div></nav></div>`;
}
const FILTERS=[["tous","Tous"],["impayes","Non payés"],["fiche","Fiche à compléter"],["allergies","Allergies"],["meds","Médicaments"],["nophoto","Pas de photos"],["obs","Observations"]];
const isResp=()=>S.role==="resp";
const respWeeks=()=>(S.respSlots||[]).filter(c=>c.lieu===S.lieu&&W(c.semaine)).map(c=>c.semaine).sort((a,b)=>W(a).start-W(b).start);
const respLieux=()=>[...new Set((S.respSlots||[]).map(c=>c.lieu))];
const myWeeks=()=>isResp()?respWeeks().filter(n=>W(n).period===S.period):periodWeeks(S.period);
function periodSeg(){const ps=isResp()?PERIODS.filter(p=>respWeeks().some(n=>W(n).period===p)):PERIODS;if(ps.length<2)return "";return `<div class="seg" role="group" aria-label="Période">${ps.map(p=>`<button aria-pressed="${S.period===p}" data-period="${p}">${p}</button>`).join("")}</div>`}
function periodSegOld(){return `<div class="seg" role="group" aria-label="Période">${PERIODS.map(p=>`<button aria-pressed="${S.period===p}" data-period="${p}">${p}</button>`).join("")}</div>`}
function adminProgram(){
 const pw=periodWeeks(S.period),n=pw.includes(S.gweek)?S.gweek:pw[0],w=W(n);
 const ta=(id,arr)=>`<textarea class="input" id="${id}" style="min-height:120px">${esc(arr.join("\n"))}</textarea>`;
 return `<div class="section">
 <div class="section-head"><div><span class="eyebrow">Visible par les familles inscrites</span><h1>Programme</h1></div></div>
 ${periodSeg()}
 ${weekSeg(pw,n,"gweek")}
 <div class="card form">
  <h2>${isResp()?"Lieu et référent":"Lieu, prix et référent"}</h2>
  ${lieuSeg()}
  ${S.lieu?`<form class="form" id="placeForm" data-week="${n}" data-place="${esc(S.lieu)}" novalidate>
   <div class="grid g2">
    <label class="f" for="plNom">Nom du lieu<input class="input" id="plNom" placeholder="Ex. salle communale" value="${esc(LIEU_INFO[S.lieu].nom)}"></label>
    <label class="f" for="plAdr">Adresse complète<input class="input" id="plAdr" placeholder="Rue, NPA, localité" value="${esc(LIEU_INFO[S.lieu].adresse)}"></label>
    ${isResp()?"":`<label class="f" for="plPrix">Prix d'une semaine (CHF)<input class="input" id="plPrix" type="number" min="0" step="1" inputmode="numeric" placeholder="À compléter après la négociation" value="${PRICES[S.lieu]||""}"></label>`}
    <label class="f" for="rfNom">Référent·e de la semaine ${W(n).code}<input class="input" id="rfNom" placeholder="Prénom et nom" value="${esc(refOf(S.lieu,n).nom)}"></label>
    <label class="f" for="rfTel">Téléphone du référent·e<input class="input" id="rfTel" type="tel" value="${esc(refOf(S.lieu,n).tel)}"></label>
    <label class="f" for="rfMail">E-mail du référent·e<input class="input" id="rfMail" type="email" placeholder="Pour lui donner son accès" value="${esc(refOf(S.lieu,n).email||"")}"></label>
   </div>
   <p class="hint">Le référent reçoit un accès « Responsable de camp » : il voit les enfants de sa semaine dans ce lieu et peut publier les photos. Il ne voit ni les paiements, ni les autres lieux.</p>
   <p class="hint">Le lieu, l'adresse et le prix valent pour toutes les semaines. Tant que le prix est vide, les familles voient « tarif à définir ». Le référent se remplit semaine par semaine, même après les inscriptions.</p>
   <button class="btn primary" type="submit" style="justify-self:start">Enregistrer</button>
  </form>`:'<p class="hint">Choisissez un lieu pour renseigner son adresse et le référent de la semaine.</p>'}
 </div>
 <form class="card form" id="progForm" data-week="${n}" novalidate>
  <label class="f" for="gTheme">Thème de la semaine<input class="input" id="gTheme" value="${esc(w.theme)}"></label>
  <div class="grid g3">
   <label class="f" for="gA">Alimentation <span class="hint">(une activité par ligne)</span>${ta("gA",w.program.alimentation)}</label>
   <label class="f" for="gM">Mouvement <span class="hint">(une activité par ligne)</span>${ta("gM",w.program.mouvement)}</label>
   <label class="f" for="gN">Nature <span class="hint">(une activité par ligne)</span>${ta("gN",w.program.nature)}</label>
  </div>
  <fieldset><legend>Jour par jour</legend>
   ${w.days.map(([d,t],i)=>`<label class="f" for="gD${i}">${({Lun:"Lundi",Mar:"Mardi",Mer:"Mercredi",Jeu:"Jeudi",Ven:"Vendredi"})[d]}<input class="input" id="gD${i}" value="${esc(t)}"></label>`).join("")}
  </fieldset>
  <button class="btn primary" type="submit">Publier pour les familles</button>
 </form>
 </div>`;
}
function lieuSeg(){if(isResp()){const ls=respLieux();return ls.length<2?"":`<div class="seg lieux" role="group" aria-label="Lieu">${ls.map(l=>`<button aria-pressed="${S.lieu===l}" data-lieu="${esc(l)}">${esc(l)}</button>`).join("")}</div>`}return `<div class="seg lieux" role="group" aria-label="Lieu"><button aria-pressed="${!S.lieu}" data-lieu="">Tous les lieux</button>${LIEUX.map(l=>`<button aria-pressed="${S.lieu===l}" data-lieu="${l}">${l} <span class="hint">(${kids.filter(k=>k.lieu===l).length})</span></button>`).join("")}</div>`}
function applyFilter(list){
 const f=S.afilter,q=S.aq.trim().toLowerCase();
 return list.filter(k=>(f==="tous"||(f==="impayes"&&!k.paid)||(f==="fiche"&&!k.done)||(f==="allergies"&&k.allergies)||(f==="meds"&&k.meds.length)||(f==="nophoto"&&!k.photos)||(f==="obs"&&(k.obs||k.obsEquipe)))
  &&(!q||(kidName(k)+" "+k.parent+" "+k.order).toLowerCase().includes(q)));
}
function adminWeeks(){
 const wk=S.aweek, w=wk?W(wk):null;
 const inLieu=kids.filter(k=>!S.lieu||k.lieu===S.lieu);
 const inWeek=inLieu.filter(k=>wk?k.weeks.includes(wk):k.weeks.some(n=>W(n).period===S.period));
 const list=applyFilter(inWeek).sort((a,b)=>ageSort(a)-ageSort(b)||a.prenom.localeCompare(b.prenom));
 const cnt=fn=>inWeek.filter(fn).length;
 const stat=(id,n,l,alert)=>`<button class="stat ${alert&&n?"alert":""}" aria-pressed="${S.afilter===id}" data-filter="${id}"><span class="n">${n}</span><span class="l">${l}</span></button>`;
 let content;
 if(S.amode==="tableau"){
  content=`<div class="table-wrap"><table><thead><tr><th>Enfant</th><th>Âge</th><th>Groupe</th><th>Paiement</th><th>Allergies</th><th>Régime</th><th>Médicaments</th><th>Photos</th><th>Observations</th></tr></thead><tbody>
  ${list.map(k=>`<tr><td><b>${esc(kidName(k))}</b><br><span class="hint">${esc(k.order)}</span></td><td class="num">${ageOf(k)??"?"}</td><td>${groupOf(ageOf(k))}</td><td>${k.paid?'<span class="chip ok">Payé</span>':'<span class="chip bad">Non payé</span>'}</td><td>${k.allergies?`<span class="chip ${k.severe?"bad":"warn"}">${esc(k.allergies)}</span>`:"–"}</td><td>${esc(k.diet.join(", "))||"–"}</td><td>${k.meds.map(m=>esc(m.name+" "+m.dose+" ("+m.when+")")).join("<br>")||"–"}</td><td>${k.photos?"Oui":'<span class="chip bad">Non</span>'}</td><td>${esc(obsAll(k))||"–"}</td></tr>`).join("")}
  </tbody></table></div>`;
 } else {
  content=GROUPS.map(g=>{const gl=list.filter(k=>groupOf(ageOf(k))===g);if(!gl.length)return"";
   return `<div class="group"><div class="group-head"><h3>${g}</h3><span>${gl.length} enfant${gl.length>1?"s":""}</span></div>
   ${gl.map(k=>`<button class="kid-row" data-kid="${k.id}"><span class="avatar">${esc(k.prenom[0]+k.nom[0])}</span>
    <span class="name">${esc(kidName(k))}<small>${ageTxt(k)} · ${esc(k.lieu)} · ${esc(k.parent)}</small></span>
    ${isResp()?"<span></span>":`<span class="pay-dot chip ${k.paid?"ok":"bad"}">${k.paid?"Payé":"Non payé"}</span>`}
    <span class="chips">${statusChips(k,{withPay:false})}</span></button>`).join("")}</div>`}).join("")||`<div class="card plain"><p>Aucun enfant ne correspond à ce filtre.</p></div>`;
 }
 return `<div class="section">
 <div class="section-head"><div><span class="eyebrow">${w?`${wLabel(wk)} · du ${w.from} au ${w.to}`:`${S.period} · ${periodWeeks(S.period).length} semaines`}</span><h1>${w?esc(w.theme):"Toutes les semaines"}</h1></div>${isResp()?"":`<button class="btn small ghost" data-atab="import">Importer des commandes</button>`}</div>
 ${periodSeg()}
 ${lieuSeg()}
 <div class="seg" role="group" aria-label="Semaine">
  ${myWeeks().map(n=>W(n)).map(x=>`<button aria-pressed="${wk===x.n}" data-aweek="${x.n}">${x.code} · ${x.from} <span class="hint">(${inLieu.filter(k=>k.weeks.includes(x.n)).length})</span></button>`).join("")}
  ${isResp()?"":`<button aria-pressed="${!wk}" data-aweek="0">Toute la période</button>`}
 </div>
 <div class="stats">
  ${stat("tous",inWeek.length,"Inscrits")}
  ${isResp()?"":stat("impayes",cnt(k=>!k.paid),"Non payés",true)}
  ${stat("fiche",cnt(k=>!k.done),"Fiches à compléter",true)}
  ${stat("allergies",cnt(k=>k.allergies),"Allergies")}
  ${stat("meds",cnt(k=>k.meds.length),"Médicaments")}
  ${stat("nophoto",cnt(k=>!k.photos),"Sans photos")}
 </div>
 <div class="toolbar">
  <input class="input search" id="aSearch" placeholder="Rechercher un enfant, un parent, une commande" value="${esc(S.aq)}">
  <div class="seg" role="group" aria-label="Affichage"><button aria-pressed="${S.amode==="liste"}" data-amode="liste">Par âge</button><button aria-pressed="${S.amode==="tableau"}" data-amode="tableau">Tableau</button></div>
 </div>
 <div class="seg" role="group" aria-label="Filtre">${FILTERS.filter(f=>!isResp()||f[0]!=="impayes").map(([id,l])=>`<button aria-pressed="${S.afilter===id}" data-filter="${id}">${l}</button>`).join("")}</div>
 ${!isResp()&&(S.afilter==="impayes"||S.afilter==="fiche")&&list.length?`<div class="remind-bar"><span class="pm-ill">${I.mail}</span><div><b>${list.length} famille${list.length>1?"s":""} à relancer</b><p class="hint">${S.afilter==="impayes"?"Rappel du paiement":"Rappel pour compléter la fiche"}</p></div><button class="btn small primary" data-act="remind" data-type="${S.afilter==="impayes"?"pay":"form"}" data-ids="${list.map(k=>k.id).join(",")}">Envoyer un rappel</button></div>`:""}
 ${content}
 </div>`;
}
function kidSheet(id){return ()=>{const k=kids.find(x=>x.id===id);return `<div class="sheet-bg" data-act="closeSheet"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(kidName(k))}">
 <div class="grab"></div>
 <div style="display:flex;gap:12px;align-items:center"><span class="avatar" style="width:54px;height:54px;font-size:1.1rem">${esc(k.prenom[0]+k.nom[0])}</span>
  <div><h2>${esc(kidName(k))}</h2><p class="hint">${ageTxt(k)} · groupe ${groupOf(ageOf(k))} · ${esc(k.lieu)} · ${k.weeks.map(n=>W(n).code).join(", ")}</p></div></div>
 <div class="chips">${statusChips(k,{withPay:!isResp()})}</div>
 ${isResp()?"":`<div class="toggle"><div><b>Inscription payée</b><p class="hint">Commande ${esc(k.order)} · ${chf(orderTotal(k.order))}${kids.filter(x=>x.order===k.order).length>1?" (toute la commande)":""}. En cochant, la famille reçoit un e-mail et l'attestation pour les impôts se débloque.</p></div>
  <button class="switch" role="switch" aria-checked="${k.paid}" aria-label="Inscription payée" data-act="togglePaid" data-id="${k.id}"></button></div>`}
 ${k.allergies?`<div class="notice" style="${k.severe?"background:var(--bad-bg);color:var(--bad)":""}">${k.severe?"Allergie sévère : ":"Allergie : "}${esc(k.allergies)}</div>`:""}
 <dl class="kv">
  <dt>Retour</dt><dd>${k.seul?"<b>Rentre seul</b>":"Ne rentre pas seul"}${k.pickup?"<br>Autorisés : "+esc(k.pickup):""}</dd>
  ${familyOf(k).length>1?`<dt>Fratrie</dt><dd>${familyOf(k).filter(x=>x!==k).map(x=>esc(x.prenom)+" ("+ageTxt(x)+", "+x.weeks.map(n=>W(n).code).join(", ")+")").join("<br>")}</dd>`:""}
  <dt>Parent</dt><dd>${esc(k.parent)}</dd>
  <dt>Téléphone</dt><dd>${esc(k.tel)}</dd>
  <dt>E-mail</dt><dd>${esc(k.email)}</dd>
  <dt>Adresse</dt><dd>${esc(k.adresse)||"–"}</dd>
  <dt>Parent 2</dt><dd>${esc(k.parent2)||"–"}</dd>
  <dt>Tél. parent 2</dt><dd>${esc(k.tel2)||"–"}</dd>
  <dt>Autres contacts</dt><dd>${k.contacts.map(c=>esc(c.name)+" · "+esc(c.tel)).join("<br>")||"–"}</dd>
  <dt>Régime</dt><dd>${esc(k.diet.join(", "))||"Aucun"}</dd>
  <dt>Natation</dt><dd>${k.nage===null||k.nage===undefined?"Pas encore renseigné":k.nage?"Sait nager":"<b>Ne sait pas nager</b>"}</dd>
  <dt>Santé</dt><dd>${esc(k.patho)||"Rien de signalé"}</dd>
  <dt>Médicaments</dt><dd>${k.meds.length?k.meds.map(m=>`<b>${esc(m.name)}</b> · ${esc(m.dose)} · ${esc(m.when)}`).join("<br>"):"Aucun"}</dd>
  <dt>Photos</dt><dd>${k.photos?"Autorisées":"<b>Refusées</b>"}</dd>
  <dt>Assurances</dt><dd>Maladie : ${esc(k.assMaladie)||"–"}<br>Accident : ${esc(k.assAccident)||"–"}<br>RC : ${esc(k.rc)||"–"}</dd>
  <dt>Règlement</dt><dd>${k.cgv?"Accepté":"<b>Pas encore accepté</b>"}</dd>
 </dl>
 ${k.obs?`<div class="notice"><b>Message des parents :</b> ${esc(k.obs)}</div>`:""}
 <label class="f" for="aObs">Observations de l'équipe <span class="hint">(invisibles pour les parents)</span><textarea class="input" id="aObs">${esc(k.obsEquipe)}</textarea></label>
 ${!isResp()&&(!k.paid||!k.done)?`<div class="toolbar">${!k.paid?`<button class="btn small ghost" data-act="remind" data-type="pay" data-ids="${k.id}">${I.mail}Rappel paiement</button>`:""}${!k.done?`<button class="btn small ghost" data-act="remind" data-type="form" data-ids="${k.id}">${I.mail}Rappel fiche</button>`:""}</div>`:""}
 <div class="toolbar"><button class="btn primary" data-act="saveObs" data-id="${k.id}">Enregistrer</button><button class="btn" data-act="closeSheet">Fermer</button></div>
 </div></div>`}}
function adminMedia(){
 const n=S.mweek,raw=S.lieu&&n?mediaList(S.lieu,n):[],list=raw||[];const noPhoto=kids.filter(k=>k.weeks.includes(n)&&k.lieu===S.lieu&&!k.photos);
 if(!S.lieu||!n)return `<div class="section"><div class="section-head"><div><span class="eyebrow">${wLabel(n)}</span><h1>Photos & vidéos</h1></div></div>${periodSeg()}${lieuSeg()}<div class="card plain"><p>Choisissez un lieu pour voir et publier ses photos.</p></div></div>`;
 const nPh=list.filter(m=>m.type==="photo").length,nV=list.length-nPh;
 return `<div class="section">
 <div class="section-head"><div><span class="eyebrow">${wLabel(n)} · ${W(n).from} au ${W(n).to}</span><h1>Photos & vidéos</h1></div></div>
 ${periodSeg()}
 ${lieuSeg()}
 ${weekSeg(myWeeks(),n,"mweek")}
 ${noPhoto.length?`<div class="notice">${noPhoto.length} enfant${noPhoto.length>1?"s":""} sans autorisation photo cette semaine : ${noPhoto.map(k=>esc(kidName(k))).join(", ")}</div>`:""}
 <label class="upload" for="upMedia"><b>Ajouter des photos ou vidéos</b><span class="hint">Depuis la pellicule du téléphone. Uniquement des enfants qui ont l'autorisation photo.</span>
  <input type="file" id="upMedia" accept="image/*,video/*" multiple></label>
 <div class="toolbar">
  <span class="hint" style="flex:1">${nPh} photos · ${nV} vidéo${nV>1?"s":""}${S.msel.size?` · ${S.msel.size} sélectionnée${S.msel.size>1?"s":""}`:""}</span>
  ${S.msel.size?`<button class="btn small ghost" data-act="clearSel">Désélectionner</button><button class="btn small ghost" data-act="delSel">Supprimer</button><button class="btn small primary" data-act="dlSel">${I.dl}Télécharger la sélection</button>`:`<button class="btn small primary" data-act="dlAll" ${list.length?"":"disabled"}>${I.dl}Tout télécharger</button>`}
 </div>
 ${!raw?loadingCard:list.length?`<div class="gallery">${list.map(m=>mediaTile(m,true)).join("")}</div>`:`<div class="card plain"><p>Pas encore de photos pour cette semaine.</p></div>`}
 </div>`;
}
const PCOLS=[
 ["lieu","Lieu",k=>k.lieu],
 ["age","Âge",k=>ageTxt(k)],
 ["groupe","Groupe",k=>groupOf(ageOf(k))],
 ["paye","Paiement",k=>k.paid?"Payé":"NON PAYÉ"],
 ["allergies","Allergies",k=>k.allergies?(k.severe?"SÉVÈRE : ":"")+k.allergies:""],
 ["regime","Régime alimentaire",k=>k.diet.join(", ")],
 ["sante","Santé / pathologie",k=>k.patho],
 ["meds","Médicaments",k=>k.meds.map(m=>m.name+" "+m.dose+" ("+m.when+")").join(" ; ")],
 ["nage","Sait nager",k=>k.nage===null||k.nage===undefined?"?":k.nage?"Oui":"NON"],
 ["photos","Droit à l'image",k=>k.photos?"Oui":"NON"],
 ["retour","Retour à la maison",k=>k.seul?"Rentre seul":"Accompagné"+(k.pickup?" · autorisés : "+k.pickup:"")],
 ["parent","Parents et téléphones",k=>k.parent+" · "+k.tel+(k.tel2?" / "+(k.parent2?k.parent2+" · ":"")+k.tel2:"")],
 ["adresse","Adresse",k=>k.adresse],
 ["assurances","Assurances",k=>"Maladie : "+k.assMaladie+" · Accident : "+k.assAccident+" · RC : "+k.rc],
 ["contacts","Autres personnes de contact",k=>k.contacts.map(c=>c.name+" · "+c.tel).join(" ; ")],
 ["obs","Observations",obsAll],
 ["commande","N° de commande",k=>k.order],
 ["presence","Cases de présence (lun.–ven.)",null]
];
function printData(){
 const wk=S.prweek;
 const list=kids.filter(k=>k.weeks.includes(wk)&&(!S.lieu||k.lieu===S.lieu)).sort((a,b)=>ageSort(a)-ageSort(b)||a.nom.localeCompare(b.nom));
 const cols=PCOLS.filter(c=>S.prcols.has(c[0])&&!(isResp()&&["paye","commande"].includes(c[0])));
 const groups=S.prgroup?GROUPS.map(g=>[g,list.filter(k=>groupOf(ageOf(k))===g)]).filter(g=>g[1].length):[["",list]];
 return {wk,list,cols,groups};
}
function adminPrint(){
 const {wk,list,cols,groups}=printData();const w=W(wk);
 const days=["Lu","Ma","Me","Je","Ve"];
 const head=`<th>Enfant</th>${cols.map(c=>c[0]==="presence"?days.map(d=>`<th>${d}</th>`).join(""):`<th>${c[1]}</th>`).join("")}`;
 const cell=(c,k)=>{if(c[0]==="presence")return days.map(()=>'<td><span class="tick"></span></td>').join("");const v=c[2](k);const al=(c[0]==="paye"&&!k.paid)||(c[0]==="photos"&&!k.photos)||(c[0]==="nage"&&k.nage===false)||(c[0]==="allergies"&&k.severe);return `<td class="${al?"alert":""}">${esc(v)||"–"}</td>`};
 return `<div class="section">
 <div class="section-head"><div><span class="eyebrow">Fiches à imprimer</span><h1>Imprimer une semaine</h1></div></div>
 <div class="card print-opts">
  ${isResp()?"":"<div><b>Lieu</b></div>"}
  ${lieuSeg()}
  <div><b>Période et semaine</b></div>
  ${periodSeg()}
  ${weekSeg(myWeeks(),wk,"prweek")}
  <div><b>Informations à imprimer</b></div>
  <div class="checks">${PCOLS.map(([id,l])=>`<label for="pc_${id}"><input type="checkbox" id="pc_${id}" data-pcol="${id}" ${S.prcols.has(id)?"checked":""}>${l}</label>`).join("")}</div>
  <div class="checks"><label for="pcGroup"><input type="checkbox" id="pcGroup" data-pgroup="1" ${S.prgroup?"checked":""}>Une liste par groupe d'âge</label></div>
  <div class="toolbar">
   <button class="btn primary" data-act="doPrint">${I.print}Imprimer</button>
   <button class="btn" data-act="copyPrint">Copier pour Excel</button>
   <span class="hint">${list.length} enfant${list.length>1?"s":""} · ${cols.length} information${cols.length>1?"s":""}</span>
  </div>
 </div>
 <h2>Aperçu</h2>
 <div class="paper">
  <div class="paper-head"><div><h2>${S.lieu?esc(S.lieu)+" · ":""}${wLabel(wk)} · du ${w.from} au ${w.to} 2027</h2><p class="sub">${S.lieu&&refOf(S.lieu,wk).nom?"Référent·e : "+esc(refOf(S.lieu,wk).nom)+" · "+esc(refOf(S.lieu,wk).tel)+" · ":""}${esc(w.theme)} · ${list.length} enfants · imprimé le ${new Date().toLocaleDateString("fr-CH")}</p></div><img src="${LOGO_BLACK}" alt="Croc'n'Mouv"></div>
  ${groups.map(([g,gl])=>`${g?`<h3>${g} · ${gl.length} enfant${gl.length>1?"s":""}</h3>`:""}
  <table><thead><tr>${head}</tr></thead><tbody>${gl.map(k=>`<tr><td><b>${esc(k.nom.toUpperCase())}</b> ${esc(k.prenom)}</td>${cols.map(c=>cell(c,k)).join("")}</tr>`).join("")}</tbody></table>`).join("")}
 </div>
 </div>`;
}
function reglementHTML(){return `
 <div><span class="eyebrow">À lire attentivement et à conserver</span><h1>Règlement général</h1></div>
 <div class="kid-hero">
  <h2>Horaires</h2>
  <div style="display:grid;gap:4px">
   <span><b>Du lundi au vendredi, de 8h à 17h</b></span>
   <span>Accueil du matin : entre 8h et 9h</span>
   <span>Retour des enfants : entre 16h45 et 17h00</span>
   <span>Vendredi de 17h00 à 17h45 : apéritif préparé par les enfants et film de la semaine, avec les parents</span>
  </div>
 </div>
 <div class="card plain" style="display:grid;gap:10px">
  <h3>Conditions d'inscription</h3>
  <ol style="margin:0;padding-left:1.2em;display:grid;gap:6px">
   <li>Le formulaire d'inscription doit être complet.</li>
   <li>Le règlement de la facture se fait par virement bancaire dans les 10 jours.</li>
   <li>Une fois payée, l'inscription est définitive : aucun remboursement n'est possible, même si l'enfant ne vient pas.</li>
  </ol>
 </div>
 <div class="card plain" style="display:grid;gap:10px">
  <h3>Consignes aux parents</h3>
  <p>Merci de rappeler à votre enfant de bien écouter les consignes des animatrices. Si les règles de vie du groupe ne sont pas respectées, la responsabilité des parents et celle de l'enfant pourra être engagée.</p>
  <p>En cas d'urgence, le ou la responsable légal·e autorise les animatrices responsables à prendre toutes les mesures nécessaires à la santé de l'enfant, y compris celles préconisées par un médecin.</p>
  <p>Le ou la responsable légal·e s'acquitte des frais occasionnés pour les soins donnés à son enfant, y compris les frais de transport. Il ou elle déclare que son enfant est assuré contre la maladie et les accidents en Suisse.</p>
  <p>Croc'n'Mouv décline toute responsabilité concernant les effets personnels des enfants participants (vols, pertes, dégâts et autres).</p>
 </div>
 <div class="card plain" style="display:grid;gap:4px">
  <h3>Contact</h3>
  <p>Caroline Berney, directrice et diététicienne HES</p>
  <p style="font-variant-numeric:tabular-nums">079 195 76 33</p>
  <p class="hint">L'équipe d'animation Croc'n'Mouv</p>
 </div>`}
const REMIND={
 pay:{sub:"Rappel : paiement de l'inscription Croc'n'Mouv",body:"Bonjour,\n\nNous n'avons pas encore reçu le paiement de l'inscription de {enfant} ({semaines}). Merci d'effectuer le virement dès que possible.\n\nSi le paiement vient d'être fait, merci de ne pas tenir compte de ce message.\n\nÀ très vite,\nCaroline et l'équipe Croc'n'Mouv"},
 form:{sub:"Rappel : la fiche de votre enfant est à compléter",body:"Bonjour,\n\nIl manque encore quelques informations dans la fiche de {enfant}. Vous pouvez la compléter en quelques minutes sur votre espace familles, avec votre numéro de commande {commande}.\n\nMerci et à très vite,\nCaroline et l'équipe Croc'n'Mouv"}
};
function remindSheet(type,ids){return ()=>{const t=REMIND[type],ks=ids.map(i=>kids.find(k=>k.id===i));
 return `<div class="sheet-bg" data-act="closeSheet"><div class="sheet" role="dialog" aria-modal="true" aria-label="Envoyer un rappel"><div class="grab"></div>
 <h2>${type==="pay"?"Rappel de paiement":"Rappel pour la fiche"}</h2>
 <div><b>À :</b> <span class="hint">${ks.map(k=>esc(k.parent)+" ("+esc(k.prenom)+")").join(", ")}</span></div>
 <label class="f" for="rmSub">Objet<input class="input" id="rmSub" value="${esc(t.sub)}"></label>
 <label class="f" for="rmBody">Message<textarea class="input" id="rmBody" style="min-height:220px">${esc(t.body)}</textarea></label>
 <p class="hint">{enfant}, {semaines} et {commande} sont remplacés automatiquement pour chaque famille.</p>
 <div class="toolbar"><button class="btn primary" data-act="sendRemind" data-ids="${ids.join(",")}">${I.mail}Envoyer à ${ks.length} famille${ks.length>1?"s":""}</button><button class="btn" data-act="closeSheet">Annuler</button></div>
 </div></div>`}}
function recipeForm(){return `<div class="sheet-bg" data-act="closeSheet"><div class="sheet" role="dialog" aria-modal="true" aria-label="Nouvelle recette">
 <div class="grab"></div><h2>Nouvelle recette</h2>
 <form class="form" id="recipeForm" novalidate>
  <label class="f" for="rT">Nom de la recette<input class="input" id="rT" placeholder="Ex. Smoothie vert du jardin" required></label>
  <div class="grid g2">
   <label class="f" for="rTime">Temps<input class="input" id="rTime" placeholder="20 min"></label>
   <label class="f" for="rWeek">Cuisinée en<select class="input" id="rWeek">${WEEKS.map(w=>`<option value="${w.n}">${wLabel(w.n)}</option>`).join("")}</select></label>
  </div>
  <label class="upload" for="rImg"><b id="rImgLbl">Ajouter une photo du plat</b><span class="hint">Facultatif</span><input type="file" id="rImg" accept="image/*"></label>
  <label class="f" for="rTags">Étiquettes<input class="input" id="rTags" placeholder="Végétarien, Sans cuisson"></label>
  <label class="f" for="rIng">Ingrédients (un par ligne)<textarea class="input" id="rIng" placeholder="2 bananes&#10;1 poignée d'épinards"></textarea></label>
  <label class="f" for="rSteps">Étapes (une par ligne)<textarea class="input" id="rSteps" placeholder="Mettre tout dans le mixeur&#10;Mixer 1 minute"></textarea></label>
  <p class="err" id="rErr" hidden>Donnez un nom à la recette.</p>
  <div class="toolbar"><button class="btn primary" type="submit">Publier pour les familles</button><button class="btn" type="button" data-act="closeSheet">Annuler</button></div>
 </form></div></div>`}

/* ---------------- Interactions ---------------- */
let pendingImg="";
document.addEventListener("click",e=>{
 const t=e.target.closest("[data-act],[data-ptab],[data-atab],[data-pweek],[data-aweek],[data-mweek],[data-filter],[data-amode],[data-kid],[data-recipe],[data-msel],[data-prweek],[data-step],[data-lieu],[data-pkid],[data-kidfiche],[data-period],[data-gweek]");
 if(!t)return;
 const d=t.dataset;
 if(d.act==="closeSheet"){if(t.classList.contains("sheet-bg")&&e.target!==t)return;S.sheet=null;return render()}
 if(d.act==="demoParent"){return enter({role:"parent",email:"famille.martin@exemple.ch"})}
 if(d.act==="copyIban"){try{navigator.clipboard.writeText(IBAN.replace(/ /g,""))}catch(_){}return toast("IBAN copié")}
 if(d.act==="demoAdmin"){return enter({role:"direction",nom:"Caroline",email:""})}
 if(d.act==="demoResp"){return enter({role:"resp",nom:"Julie (exemple)",email:"julie@exemple.ch",creneaux:[{lieu:"Bernex",semaine:1},{lieu:"Bernex",semaine:8}]})}
 if(d.act==="logout"){API.logout();Object.assign(S,{view:"login",me:null,sheet:null,profile:null,role:"direction",lieu:null});Object.assign(LG,{step:"form",err:"",busy:false,code:""});return render()}
 if(d.act==="lgMode"){LG.mode=LG.mode==="parent"?"equipe":"parent";LG.err="";return render()}
 if(d.act==="lgBack"){LG.step="form";LG.err="";return render()}
 if(d.ptab){S.ptab=d.ptab;S.step=0;scrollTo(0,0);return render()}
 if(d.atab){S.atab=d.atab;scrollTo(0,0);return render()}
 if(d.pweek){S.pweek=+d.pweek;return render()}
 if(d.aweek!==undefined){S.aweek=+d.aweek||null;return render()}
 if(d.mweek){S.mweek=+d.mweek;S.msel.clear();return render()}
 if(d.filter){S.afilter=S.afilter===d.filter&&d.filter!=="tous"?"tous":d.filter;return render()}
 if(d.amode){S.amode=d.amode;return render()}
 if(d.kid){S.sheet=kidSheet(+d.kid);return render()}
 if(d.recipe){S.sheet=recipeSheet(recipes.find(r=>r.id===+d.recipe));return render()}
 if(d.msel){S.msel.has(d.msel)?S.msel.delete(d.msel):S.msel.add(d.msel);return render()}
 if(d.act==="remind"){S.sheet=remindSheet(d.type,d.ids.split(",").map(Number));return render()}
 if(d.act==="sendRemind"){const ids=d.ids.split(",").map(Number),sub=$("#rmSub").value.trim(),body=$("#rmBody").value.trim();if(!sub||!body)return toast("Objet et message obligatoires");
  t.disabled=true;t.textContent="Envoi…";
  API.sendReminder(d.type,sub,body,ids).then(n=>{const today=new Date().toLocaleDateString("fr-CH",{day:"2-digit",month:"2-digit"});ids.forEach(i=>kids.find(k=>k.id===i).reminded=today);S.sheet=null;render();toast(`Rappel envoyé à ${n} famille${n>1?"s":""}`)},er=>{t.disabled=false;t.textContent="Réessayer";toast(er.message)});return}
 if(d.act==="togglePaid"){const k=kids.find(x=>x.id===+d.id),paid=!k.paid,same=kids.filter(x=>x.order===k.order);t.disabled=true;
  API.setPaid(k.order,paid).then(()=>{same.forEach(x=>{x.paid=paid;x.paidOn=paid?new Date().toISOString().slice(0,10):""});render();toast(paid?`Commande ${k.order} : paiement reçu, la famille est prévenue par e-mail`:`Commande ${k.order} : marquée non payée`)},()=>{t.disabled=false;toast("Enregistrement impossible. Réessayez.")});return}
 if(d.act==="saveObs"){const k=kids.find(x=>x.id===+d.id),v=$("#aObs").value.trim();API.saveObs({...k,obsEquipe:v}).then(()=>{k.obsEquipe=v;S.sheet=null;render();toast("Observation enregistrée")},()=>toast("Enregistrement impossible. Réessayez."));return}
 if(d.act==="addMed"){const box=$("#meds");box.insertAdjacentHTML("beforeend",medRow({name:"",dose:"",when:""},box.children.length));return}
 if(d.act==="delMed"||d.act==="delRow"){t.parentElement.remove();return}
 if(d.act==="addContact"){const box=$("#contacts");box.insertAdjacentHTML("beforeend",contactRow({name:"",tel:""},box.children.length+Date.now()%1000));box.lastElementChild.querySelector("input").focus();return}
 if(d.act==="readRules"){$("#root").insertAdjacentHTML("beforeend",`<div class="sheet-bg" id="rulesSheet" data-act="closeRules"><div class="sheet" role="dialog" aria-modal="true" aria-label="Règlement général"><div class="grab"></div>${reglementHTML()}<button type="button" class="btn" data-act="closeRules">Fermer</button></div></div>`);return}
 if(d.act==="closeRules"){if(t.classList.contains("sheet-bg")&&e.target!==t)return;$("#rulesSheet")?.remove();return}
 if(d.act==="clearSel"){S.msel.clear();return render()}
 if(d.act==="dlAll"){return downloadZip(mediaList(S.lieu,S.mweek)||[])}
 if(d.act==="dlSel"){return downloadZip((mediaList(S.lieu,S.mweek)||[]).filter(m=>S.msel.has(m.id)))}
 if(d.act==="delSel"){const all=mediaList(S.lieu,S.mweek)||[],sel=all.filter(m=>S.msel.has(m.id));if(!sel.length||!confirm(`Supprimer ${sel.length} fichier${sel.length>1?"s":""} ? Les familles ne les verront plus.`))return;
  API.deleteMedia(sel).then(()=>{media[mk(S.lieu,S.mweek)]=Object.assign(all.filter(m=>!S.msel.has(m.id)),{at:all.at});S.msel.clear();render();toast("Supprimé")},()=>toast("Suppression impossible. Réessayez."));return}
 if(d.period){S.period=d.period;const f=myWeeks()[0];S.aweek=f;S.mweek=f;S.prweek=f;S.gweek=f;S.msel.clear();return render()}
 if(d.gweek){S.gweek=+d.gweek;return render()}
 if(d.pkid){S.me=kids.find(x=>x.id===+d.pkid);S.step=0;return render()}
 if(d.kidfiche){S.me=kids.find(x=>x.id===+d.kidfiche);S.ptab="enfant";S.step=0;scrollTo(0,0);return render()}
 if(d.lieu!==undefined){S.lieu=d.lieu||null;if(isResp()){const ps=PERIODS.filter(p=>respWeeks().some(n=>W(n).period===p));if(!ps.includes(S.period))S.period=ps[0];const f=myWeeks()[0];Object.assign(S,{aweek:f,mweek:f,prweek:f,gweek:f})}S.msel.clear();return render()}
 if(d.step!==undefined){return goStep(+d.step)}
 if(d.act==="stepNext"){return goStep(S.step+1)}
 if(d.act==="stepPrev"){return goStep(S.step-1)}
 if(d.prweek){S.prweek=+d.prweek;return render()}
 if(d.act==="doPrint"){window.print();return}
 if(d.act==="copyPrint"){const {list,cols}=printData();const rows=[["Enfant",...cols.filter(c=>c[2]).map(c=>c[1])].join("\t"),...list.map(k=>[kidName(k),...cols.filter(c=>c[2]).map(c=>c[2](k))].join("\t"))].join("\n");
  navigator.clipboard?.writeText(rows).then(()=>toast("Tableau copié, collez-le dans Excel ou Word"),()=>toast("Copie impossible dans cet affichage"));return}
 if(d.act==="dlBill"){t.disabled=true;attestationPDF(S.me).catch(er=>{console.error(er);toast("Le PDF n'a pas pu être créé. Réessayez.")}).finally(()=>t.disabled=false);return}
 if(d.act==="newRecipe"){pendingImg="";S.sheet=recipeForm;return render()}
});
document.addEventListener("input",e=>{
 if(e.target.id==="aSearch"){S.aq=e.target.value;const pos=e.target.selectionStart;render();const i=$("#aSearch");i.focus();i.setSelectionRange(pos,pos)}
});
document.addEventListener("change",e=>{
 if(e.target.dataset.pcol){const id=e.target.dataset.pcol;e.target.checked?S.prcols.add(id):S.prcols.delete(id);return render()}
 if(e.target.dataset.pgroup){S.prgroup=e.target.checked;return render()}
 if(e.target.id==="upMedia"){
  const files=[...e.target.files];if(!files.length)return;
  const key=mk(S.lieu,S.mweek),lieu=S.lieu,n=S.mweek;let done=0,fail=0;
  const lbl=document.querySelector('label[for="upMedia"] b');
  (async()=>{for(const f of files){
    if(lbl)lbl.textContent=`Envoi ${done+fail+1} sur ${files.length}…`;
    try{const m=await API.uploadMedia(lieu,SLUG[lieu],n,f,S.profile?.email);media[key]=Object.assign([m,...(media[key]||[])],{at:media[key]?.at||Date.now()});done++}catch(er){console.error(er);fail++}
   }
   render();toast(`${done} fichier${done>1?"s":""} publié${done>1?"s":""}`+(fail?` · ${fail} en échec`:""));
  })();
  return;
 }
 if(e.target.id==="rImg"){const f=e.target.files[0];if(!f)return;pendingImg=f;$("#rImgLbl").textContent="Photo ajoutée : "+f.name}
});
document.addEventListener("submit",e=>{
 e.preventDefault();
 if(e.target.id==="loginForm"){
  LG.email=$("#lgEmail").value.trim().toLowerCase();LG.order=LG.mode==="parent"?$("#lgOrder").value.replace(/[#\s]/g,"").replace(/^0+(?=\d)/,""):"";
  if(LG.mode==="parent"&&!LG.order){LG.err="Indiquez le numéro de commande.";return render()}
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(LG.email)){LG.err="Indiquez une adresse e-mail valide.";return render()}
  if(API.demo){const k=demoData().kids.find(x=>x.order===LG.order);if(!k){LG.err="Mode démo : essayez la commande 14817 ou les boutons ci-dessous.";return render()}return enter({role:"parent",email:k.email})}
  LG.busy=true;LG.err="";render();
  API.sendCode(LG.email,LG.order).then(()=>{LG.step="code"},er=>{LG.err=er.message}).finally(()=>{LG.busy=false;render();$("#lgCode")?.focus()});
  return;
 }
 if(e.target.id==="codeForm"){
  const code=$("#lgCode").value.replace(/\D/g,"");
  if(code.length!==6){LG.err="Le code a 6 chiffres.";return render()}
  LG.busy=true;LG.err="";render();
  API.verifyCode(LG.email,code).then(()=>API.profile()).then(p=>{LG.busy=false;LG.step="form";return enter(p)},er=>{LG.busy=false;LG.err=er.message;render()});
  return;
 }
 if(e.target.id==="kidForm"){
  const k=S.me,er=$("#kErr"),miss=(step,msg)=>{er.textContent=msg;er.hidden=false;if(S.step!==step)goStep(step);setTimeout(()=>er.scrollIntoView({block:"center"}),50)};
  if(!$("#fNageY").checked&&!$("#fNageN").checked)return miss(1,"Merci d'indiquer si votre enfant sait nager (étape 2).");
  if(!$("#fPhY").checked&&!$("#fPhN").checked)return miss(3,"Merci de choisir oui ou non pour les photos.");
  if(!$("#fCgv").checked)return miss(3,"Merci d'accepter le règlement général pour enregistrer la fiche.");
  const rg=$("#fRegime").value.trim(),all=$("#fAll").value.trim();
  const f={...k,cgv:true,parent:$("#fParent").value.trim()||k.parent,adresse:$("#fAdr").value.trim(),parent2:$("#fP2").value.trim(),tel2:$("#fTel2").value.trim(),
   seul:$("#fSeulY").checked,nage:$("#fNageY").checked,pickup:$("#fPick").value.trim(),assMaladie:$("#fAM").value.trim(),assAccident:$("#fAA").value.trim(),rc:$("#fRC").value.trim(),
   prenom:$("#fPrenom").value.trim()||k.prenom,nom:$("#fNom").value.trim()||k.nom,naissance:$("#fNaiss").value||k.naissance,tel:$("#fTel").value.trim(),
   contacts:[...document.querySelectorAll(".contact-row")].map(r=>{const [n,t]=r.querySelectorAll("input");return {name:n.value.trim(),tel:t.value.trim()}}).filter(c=>c.name||c.tel),
   diet:rg?[rg]:[],allergies:all,severe:$("#fSev").checked&&!!all,patho:$("#fPatho").value.trim(),obs:$("#fObs").value.trim(),photos:$("#fPhY").checked,
   meds:[...document.querySelectorAll(".med-row")].map(r=>{const [n,d,w]=r.querySelectorAll("input");return {name:n.value.trim(),dose:d.value.trim(),when:w.value.trim()}}).filter(m=>m.name),done:true};
  const btn=e.target.querySelector('[type="submit"]');btn.disabled=true;btn.textContent="Enregistrement…";
  API.saveFiche(f).then(()=>{Object.assign(k,f);syncFamily(k);S.step=0;S.ptab="accueil";render();scrollTo(0,0);toast("Fiche enregistrée. Merci !")},
   ()=>{btn.disabled=false;btn.textContent="Enregistrer la fiche";toast("L'enregistrement a échoué. Vérifiez votre connexion et réessayez.")});
  return;
 }
 if(e.target.id==="placeForm"){
  const l=e.target.dataset.place,n=+e.target.dataset.week,btn=e.target.querySelector('[type="submit"]');
  const info={nom:$("#plNom").value.trim(),adresse:$("#plAdr").value.trim()},prix=$("#plPrix")?Math.max(0,parseInt($("#plPrix").value,10)||0):PRICES[l];
  const ref={nom:$("#rfNom").value.trim(),tel:$("#rfTel").value.trim(),email:$("#rfMail").value.trim().toLowerCase()};
  btn.disabled=true;
  Promise.all([API.savePlace(l,{salle:info.nom,adresse:info.adresse,prix}),API.saveRef(l,n,ref)])
   .then(()=>{LIEU_INFO[l]=info;PRICES[l]=prix;REF[l+"|"+n]=ref;render();toast("Enregistré, visible par les familles")},()=>{btn.disabled=false;toast("Enregistrement impossible. Réessayez.")});
  return;
 }
 if(e.target.id==="progForm"){
  const w=W(+e.target.dataset.week),lines=id=>$("#"+id).value.split("\n").map(x=>x.trim()).filter(Boolean),btn=e.target.querySelector('[type="submit"]');
  const nw={...w,theme:$("#gTheme").value.trim()||w.theme,program:{alimentation:lines("gA"),mouvement:lines("gM"),nature:lines("gN")},days:w.days.map(([d],i)=>[d,$("#gD"+i).value.trim()])};
  btn.disabled=true;
  API.saveProgram(nw).then(()=>{Object.assign(w,nw);render();toast("Programme publié, les familles le voient déjà")},()=>{btn.disabled=false;toast("Publication impossible. Réessayez.")});
  return;
 }
 if(e.target.id==="recipeForm"){
  const title=$("#rT").value.trim();if(!title){$("#rErr").hidden=false;return}
  const lines=s=>s.split("\n").map(x=>x.trim()).filter(Boolean),btn=e.target.querySelector('[type="submit"]');
  const r={title,time:$("#rTime").value.trim()||"–",level:"Facile",week:+$("#rWeek").value,tags:$("#rTags").value.split(",").map(x=>x.trim()).filter(Boolean),ing:lines($("#rIng").value),steps:lines($("#rSteps").value),hue:"#CDDF70",img:""};
  btn.disabled=true;btn.textContent="Publication…";
  const file=pendingImg;
  API.addRecipe(API.demo?{...r,id:Date.now(),img:file?URL.createObjectURL(file):""}:r,file||null)
   .then(saved=>{recipes.unshift(saved);pendingImg="";S.sheet=null;render();toast("Recette publiée, les familles la voient déjà")},()=>{btn.disabled=false;btn.textContent="Publier pour les familles";toast("Publication impossible. Réessayez.")});
  return;
 }
});
document.addEventListener("keydown",e=>{if(e.key!=="Escape")return;if($("#rulesSheet")){$("#rulesSheet").remove();return}if(S.sheet){S.sheet=null;render()}});
/* ---------------- Téléchargements ---------------- */
async function downloadZip(list){
 if(!list.length)return;
 if(API.demo&&!list.some(m=>m.src))return toast(`Mode démo : un fichier .zip avec les ${list.length} fichiers se télécharge.`);
 toast(`Préparation de ${list.length} fichier${list.length>1?"s":""}…`);
 try{
  await loadScript("vendor/jszip-3.10.1.min.js");
  const zip=new JSZip(),used=new Set();
  for(const m of list){if(!m.src)continue;const b=await (await fetch(m.src)).blob();const ext=(m.chemin||"").split(".").pop()||(m.type==="video"?"mp4":"jpg");
   let name=(m.cap||"photo").replace(/[\\/:*?"<>|]/g,"_"),i=1;while(used.has(name+"."+ext))name=name.replace(/ \(\d+\)$/,"")+` (${++i})`;used.add(name+"."+ext);zip.file(name+"."+ext,b)}
  const blob=await zip.generateAsync({type:"blob"});
  saveBlob(blob,`crocnmouv-${SLUG[S.lieu]||"photos"}-${W(S.mweek).code}.zip`);
 }catch(e){console.error(e);toast("Le téléchargement a échoué. Réessayez avec moins de fichiers.")}
}
function saveBlob(blob,name){const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
async function imgData(src){const b=await (await fetch(src)).blob();return await new Promise(r=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.readAsDataURL(b)})}

// Attestation de paiement pour les impôts (seul document qui nomme Global Nutrition Sàrl).
async function attestationPDF(k){
 await loadScript("vendor/jspdf-4.2.1.min.js");
 const {jsPDF}=window.jspdf,doc=new jsPDF({unit:"mm",format:"a4"}),yr=W(k.weeks[0])?.start.getFullYear()||new Date().getFullYear();
 const logo=await imgData(LOGO_BLACK).catch(()=>null);
 if(logo){const p=doc.getImageProperties(logo),h=18;doc.addImage(logo,"PNG",190-h*p.width/p.height,16,h*p.width/p.height,h)}
 let y=24;doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text("Attestation de paiement",20,y);
 y+=7;doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(90);doc.text(`Frais de garde · centre aéré Croc'n'Mouv ${yr}`,20,y);doc.setTextColor(0);
 const row=(label,lines)=>{y+=9;doc.setFont("helvetica","bold");doc.text(label,20,y);doc.setFont("helvetica","normal");lines.filter(Boolean).forEach((l,i)=>doc.text(String(l),62,y+i*5.5));y+=(lines.filter(Boolean).length-1)*5.5};
 y+=6;
 row("Organisateur",["Global Nutrition Sàrl · Croc'n'Mouv","Chemin de Vuillonnex 36, 1232 Confignon","Caroline Berney, 079 195 76 33"]);
 row("Parent",[k.parent,k.adresse]);
 row("Enfant",[kidName(k)+(k.naissance?", né·e le "+new Date(k.naissance).toLocaleDateString("fr-CH"):"")]);
 row("Lieu",["Centre aéré de "+k.lieu]);
 y+=12;doc.setDrawColor(205,223,112);doc.setLineWidth(.6);doc.line(20,y,190,y);
 y+=7;doc.setFont("helvetica","bold");doc.text("Prestation",20,y);doc.text("Montant",190,y,{align:"right"});doc.setFont("helvetica","normal");
 k.weeks.forEach(n=>{const w=W(n);y+=7;doc.text(`${wLabel(n)} · du ${w.from} au ${w.to} ${yr}`,20,y);doc.text(chf(priceOf(k)),190,y,{align:"right"})});
 y+=4;doc.line(20,y,190,y);y+=7;doc.setFont("helvetica","bold");doc.text("Total payé",20,y);doc.text(chf(priceOf(k)*k.weeks.length),190,y,{align:"right"});
 y+=14;doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(90);
 doc.text(`Paiement reçu${k.paidOn?" le "+new Date(k.paidOn+"T12:00:00").toLocaleDateString("fr-CH"):""} par virement bancaire. Commande n° ${k.order}. Document établi le ${new Date().toLocaleDateString("fr-CH")}.`,20,y);
 doc.save(`attestation-crocnmouv-${yr}-${(k.prenom||"enfant").toLowerCase()}.pdf`);
}

boot();
