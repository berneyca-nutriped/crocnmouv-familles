// Accès aux données : Supabase en vrai, données fictives en mode démo (index.html?demo ou config.js vide).
const CFG=window.CNM_CONFIG||{};
const DEMO=!CFG.supabaseUrl||new URLSearchParams(location.search).has("demo");
const sb=DEMO?null:supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey);
const ENFANT_COLS="id,commande,email,prenom,nom,naissance,lieu,semaines,regime,allergies,allergie_severe,sante,medicaments,sait_nager,rentre_seul,ass_maladie,ass_accident,photos,remarques,reglement,fiche_complete,relance_le";
const MEDIA_HUES=["#CDDF70","#F0F2BC","#A9C94F","#E9EFA0","#D8E88A","#BFD45F"];

const ok=({data,error})=>{if(error){console.error(error);throw new Error(error.message||"Erreur")}return data};
const dayLabel=d=>d.toLocaleDateString("fr-CH",{day:"numeric",month:"short"});
const dateFr=iso=>iso?new Date(iso+"T12:00:00").toLocaleDateString("fr-CH",{day:"2-digit",month:"2-digit"}):"";

function weekFromRow(r){
 const start=new Date(r.debut+"T00:00:00"),end=new Date(r.fin+"T00:00:00");
 return {n:r.n,from:dayLabel(start),to:dayLabel(end),theme:r.theme,period:r.periode,code:r.code,start,program:r.programme,days:r.jours};
}
function kidFromRows(e,fam,cmd,obs){
 fam=fam||{};
 return {id:e.id,prenom:e.prenom,nom:e.nom,naissance:e.naissance||"",weeks:e.semaines||[],paid:!!cmd?.paye,paidOn:cmd?.paye_le||"",order:e.commande,email:e.email,
  parent:fam.parent||cmd?.parent||"",tel:fam.tel||"",adresse:fam.adresse||"",parent2:fam.parent2||"",tel2:fam.tel2||"",contacts:fam.contacts||[],pickup:fam.pickup||"",rc:fam.rc||"",
  diet:e.regime?[e.regime]:[],allergies:e.allergies,severe:e.allergie_severe,patho:e.sante,meds:e.medicaments||[],nage:e.sait_nager,seul:e.rentre_seul,
  assMaladie:e.ass_maladie,assAccident:e.ass_accident,photos:e.photos,obs:e.remarques,obsEquipe:obs||"",done:e.fiche_complete,cgv:e.reglement,lieu:e.lieu||"",reminded:dateFr(e.relance_le)};
}
// Réduit les photos avant l'envoi (2000 px, JPEG) : plus rapide en 4G et moins de stockage.
async function shrinkImage(file){
 if(!/^image\/(jpeg|png|webp|heic|heif)$/i.test(file.type))return file;
 try{
  const bmp=await createImageBitmap(file),max=2000,sc=Math.min(1,max/Math.max(bmp.width,bmp.height));
  const c=document.createElement("canvas");c.width=Math.round(bmp.width*sc);c.height=Math.round(bmp.height*sc);
  c.getContext("2d").drawImage(bmp,0,0,c.width,c.height);
  const blob=await new Promise(r=>c.toBlob(r,"image/jpeg",0.85));
  return blob&&blob.size<file.size?new File([blob],file.name.replace(/\.\w+$/,"")+".jpg",{type:"image/jpeg"}):file;
 }catch(_){return file}
}
function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`))return res();const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Chargement impossible : "+src));document.head.appendChild(s)})}

const API={
 demo:DEMO,
 async hasSession(){if(DEMO)return false;const {data}=await sb.auth.getSession();return !!data.session},
 async sendCode(email,order){
  const r=await fetch(CFG.supabaseUrl+"/functions/v1/envoyer-code",{method:"POST",headers:{"Content-Type":"application/json",apikey:CFG.supabaseAnonKey,Authorization:"Bearer "+CFG.supabaseAnonKey},body:JSON.stringify({email,commande:order||""})}).catch(()=>null);
  if(!r)throw new Error("Pas de connexion internet. Réessayez.");
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.erreur||"Une erreur est survenue. Réessayez.");
 },
 async verifyCode(email,code){const {error}=await sb.auth.verifyOtp({email,token:code,type:"email"});if(error)throw new Error("Ce code est incorrect ou a expiré. Demandez-en un nouveau.")},
 async logout(){if(!DEMO)await sb.auth.signOut()},
 async profile(){return ok(await sb.rpc("mon_profil"))},

 // Charge tout ce que la personne connectée a le droit de voir.
 async load(profile){
  if(DEMO)return demoData();
  const team=profile.role!=="parent";
  const [weeks,lieux,refsPub,recs,enfants,familles,commandes,obs,refsFull]=await Promise.all([
   sb.from("semaines").select("*").order("debut").then(ok),
   sb.from("lieux").select("*").order("ordre").then(ok),
   sb.from("referents_public").select("*").then(ok),
   sb.from("recettes").select("*").order("cree_le",{ascending:false}).then(ok),
   sb.from("enfants").select(ENFANT_COLS).then(ok),
   sb.from("familles").select("*").then(ok),
   sb.from("commandes").select("*").then(ok),
   team?sb.rpc("observations_equipe").then(ok):[],
   profile.role==="direction"?sb.from("referents").select("*").then(ok):[]
  ]);
  const fam=Object.fromEntries(familles.map(f=>[f.email,f])),cmd=Object.fromEntries(commandes.map(c=>[c.numero,c])),ob=Object.fromEntries(obs.map(o=>[o.id,o.obs_equipe]));
  const refs={};refsPub.forEach(r=>refs[r.lieu+"|"+r.semaine]={nom:r.nom,tel:r.tel,email:""});refsFull.forEach(r=>refs[r.lieu+"|"+r.semaine]={nom:r.nom,tel:r.tel,email:r.email});
  return {
   weeks:weeks.map(weekFromRow),lieux,refs,
   kids:enfants.map(e=>kidFromRows(e,fam[e.email],cmd[e.commande],ob[e.id])),
   recipes:recs.map(r=>({id:r.id,title:r.titre,time:r.temps,level:r.niveau,week:r.semaine,tags:r.etiquettes,ing:r.ingredients,steps:r.etapes,hue:MEDIA_HUES[r.id%MEDIA_HUES.length],img:r.image})),
   media:{}
  };
 },

 async saveFiche(k){
  if(DEMO)return;
  ok(await sb.rpc("enregistrer_fiche",{p_enfant:k.id,f:{prenom:k.prenom,nom:k.nom,naissance:k.naissance,regime:k.diet.join(", "),allergies:k.allergies,allergie_severe:k.severe,sante:k.patho,medicaments:k.meds,sait_nager:k.nage,rentre_seul:k.seul,ass_maladie:k.assMaladie,ass_accident:k.assAccident,photos:k.photos,remarques:k.obs,reglement:k.cgv,
   parent:k.parent,tel:k.tel,adresse:k.adresse,parent2:k.parent2,tel2:k.tel2,contacts:k.contacts,pickup:k.pickup,rc:k.rc}}));
 },
 async saveObs(k){if(DEMO)return;ok(await sb.rpc("enregistrer_obs",{p_enfant:k.id,p_obs:k.obsEquipe}))},
 async setPaid(order,paid){
  if(DEMO)return;
  ok(await sb.from("commandes").update({paye:paid,paye_le:paid?new Date().toISOString().slice(0,10):null}).eq("numero",order));
  if(paid)await sb.functions.invoke("courriels-equipe",{body:{type:"paiement",commande:order}}).catch(()=>{});
 },
 async savePlace(lieu,info){if(DEMO)return;ok(await sb.from("lieux").update(info).eq("nom",lieu))},
 async saveRef(lieu,n,r){if(DEMO)return;ok(await sb.from("referents").upsert({lieu,semaine:n,nom:r.nom,tel:r.tel,email:(r.email||"").trim().toLowerCase()}))},
 async saveProgram(w){if(DEMO)return;ok(await sb.from("semaines").update({theme:w.theme,programme:w.program,jours:w.days}).eq("n",w.n))},
 async addRecipe(r,file){
  if(DEMO)return r;
  let image="";
  if(file){const f=await shrinkImage(file),path=crypto.randomUUID()+".jpg";ok(await sb.storage.from("recettes").upload(path,f,{contentType:f.type}));image=sb.storage.from("recettes").getPublicUrl(path).data.publicUrl}
  const row=ok(await sb.from("recettes").insert({titre:r.title,temps:r.time,niveau:r.level,semaine:r.week,etiquettes:r.tags,ingredients:r.ing,etapes:r.steps,image}).select().single());
  return {...r,id:row.id,img:image};
 },

 // Photos et vidéos d'un lieu et d'une semaine, avec liens temporaires (1 h).
 async listMedia(lieu,slug,n){
  if(DEMO)return [];
  const rows=ok(await sb.from("medias").select("*").eq("lieu",lieu).eq("semaine",n).order("cree_le",{ascending:false}));
  if(!rows.length)return [];
  const signed=ok(await sb.storage.from("medias").createSignedUrls(rows.map(r=>r.chemin),3600));
  const url=Object.fromEntries(signed.map(s=>[s.path,s.signedUrl]));
  return rows.map((r,i)=>({id:r.id,type:r.type,cap:r.legende,hue:MEDIA_HUES[i%MEDIA_HUES.length],src:url[r.chemin]||"",chemin:r.chemin,day:new Date(r.cree_le).getDay()}));
 },
 async uploadMedia(lieu,slug,n,file,by){
  const isV=file.type.startsWith("video");
  if(DEMO)return {id:"u"+Date.now()+Math.random(),type:isV?"video":"photo",cap:file.name.replace(/\.[^.]+$/,""),hue:"#CDDF70",src:URL.createObjectURL(file),day:new Date().getDay()};
  const f=isV?file:await shrinkImage(file);
  if(f.size>50*1024*1024)throw new Error(file.name+" dépasse 50 Mo");
  const ext=(f.name.split(".").pop()||"bin").toLowerCase().replace(/[^a-z0-9]/g,"");
  const chemin=`${slug}/${n}/${crypto.randomUUID()}.${ext}`;
  ok(await sb.storage.from("medias").upload(chemin,f,{contentType:f.type}));
  const row=ok(await sb.from("medias").insert({lieu,semaine:n,chemin,type:isV?"video":"photo",legende:file.name.replace(/\.[^.]+$/,""),cree_par:by||""}).select().single());
  const {data}=await sb.storage.from("medias").createSignedUrl(chemin,3600);
  return {id:row.id,type:row.type,cap:row.legende,hue:"#CDDF70",src:data?.signedUrl||"",chemin,day:new Date(row.cree_le).getDay()};
 },
 async deleteMedia(items){
  if(DEMO)return;
  ok(await sb.storage.from("medias").remove(items.map(m=>m.chemin)));
  ok(await sb.from("medias").delete().in("id",items.map(m=>m.id)));
 },
 async sendReminder(type,sujet,message,ids){
  if(DEMO)return ids.length;
  const {data,error}=await sb.functions.invoke("courriels-equipe",{body:{type:"rappel",sujet,message,enfants:ids}});
  if(error)throw new Error("Les e-mails n'ont pas pu partir.");
  return data.envoyes;
 },
 async importOrders(rows){
  if(DEMO)return {commandes:new Set(rows.map(r=>r.commande)).size,nouveaux:rows.length,mis_a_jour:0};
  return ok(await sb.rpc("importer_commandes",{rows}));
 }
};
