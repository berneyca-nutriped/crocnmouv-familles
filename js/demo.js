// Données fictives pour essayer le site sans serveur (ouvrir index.html?demo).
// Aucune vraie famille ici.
function demoData(){
const LIEUX=["Bernex","Laconnex","Ville de Genève","Cossonay"];
const ageOf=k=>{const b=new Date(k.naissance),r=new Date("2027-07-01");let a=r.getFullYear()-b.getFullYear();if(r<new Date(r.getFullYear(),b.getMonth(),b.getDate()))a--;return a};
const WEEKS=[
 {n:1,from:"5 juil.",to:"9 juil.",theme:"Les petits chefs du verger"},
 {n:2,from:"12 juil.",to:"16 juil.",theme:"Explorateurs de la forêt"},
 {n:3,from:"19 juil.",to:"23 juil.",theme:"Le potager en fête"},
 {n:4,from:"26 juil.",to:"30 juil.",theme:"Olympiades de l'été"},
 {n:5,from:"2 août",to:"6 août",theme:"À la ferme"},
 {n:6,from:"9 août",to:"13 août",theme:"Saveurs du monde"},
 {n:7,from:"16 août",to:"20 août",theme:"Le grand final de l'été"},
 {n:8,from:"5 avril",to:"9 avril",theme:"Le printemps des saveurs",period:"Pâques 2027",code:"P1",start:new Date(2027,3,5)}
];
WEEKS.forEach(w=>{if(!w.period){w.period="Été 2027";w.code="S"+w.n;w.start=new Date(2027,6,5+7*(w.n-1))}});
const PERIODS=["Pâques 2027","Été 2027"];
const wLabel=n=>{const w=W(n);return w.period.split(" ")[0]+" · semaine "+w.code.slice(1)};
const periodWeeks=pr=>WEEKS.filter(w=>w.period===pr).map(w=>w.n);
const PROGRAM={
 alimentation:["Éducation nutritionnelle","Réalisation des repas","Activités sensorielles","Activités culinaires","Dégustations"],
 mouvement:["Découverte d'un sport","Chasse aux trésors","Marche","Exercices de relaxation","Jeux en plein air"],
 nature:["Visite d'une ferme pédagogique","Activités comment ça pousse","Cueillette de saison"]
};
const DAYS=[
 ["Lun","Accueil, jeux de connaissance et atelier dégustation des fruits de saison"],
 ["Mar","Découverte d'un sport le matin, préparation du pique-nique l'après-midi"],
 ["Mer","Sortie nature : cueillette et marche (prévoir casquette et gourde)"],
 ["Jeu","Atelier cuisine : les enfants préparent le repas de midi"],
 ["Ven","Chasse aux trésors géante. De 17h00 à 17h45, apéritif préparé par les enfants et film de la semaine avec les parents"]
];
WEEKS.forEach(w=>{w.program=JSON.parse(JSON.stringify(PROGRAM));w.days=(w.code==="P2"?DAYS.slice(1):DAYS).map(d=>[...d])});
let kids=[
 {id:1,prenom:"Léa",nom:"Martin",naissance:"2019-03-14",weeks:[8,1,3],paid:true,order:"14817",email:"famille.martin@exemple.ch",parent:"Sophie Martin",tel:"079 123 45 67",diet:["Végétarien"],allergies:"Arachides",severe:true,patho:"",meds:[{name:"EpiPen Junior",dose:"0,15 mg",when:"En cas de réaction"}],photos:true,obs:"",done:false,cgv:false,urgence:"Paul Martin, 079 765 43 21"},
 {id:2,prenom:"Noah",nom:"Dubois",naissance:"2017-08-02",weeks:[8,1,2],paid:false,order:"14822",email:"",parent:"Claire Dubois",tel:"078 222 11 00",diet:[],allergies:"",severe:false,patho:"Asthme léger",meds:[{name:"Ventolin",dose:"2 bouffées",when:"Avant le sport"}],photos:true,obs:"Timide le premier jour",done:true,urgence:""},
 {id:3,prenom:"Inès",nom:"Rochat",naissance:"2020-11-21",weeks:[1],paid:true,order:"14830",email:"",parent:"Marc Rochat",tel:"076 555 66 77",diet:["Sans lactose"],allergies:"Lactose (intolérance)",severe:false,patho:"",meds:[],photos:false,obs:"",done:true,urgence:""},
 {id:4,prenom:"Gabriel",nom:"Favre",naissance:"2015-05-09",weeks:[1,4,5],paid:true,order:"14834",email:"",parent:"Anne Favre",tel:"079 888 12 34",diet:[],allergies:"",severe:false,patho:"",meds:[],photos:true,obs:"",done:true,urgence:""},
 {id:5,prenom:"Chloé",nom:"Perret",naissance:"2018-01-30",weeks:[1,2,3],paid:false,order:"14841",email:"",parent:"Julie Perret",tel:"077 432 10 98",diet:["Sans gluten"],allergies:"Gluten (maladie cœliaque)",severe:true,patho:"Maladie cœliaque",meds:[],photos:true,obs:"",done:false,urgence:""},
 {id:6,prenom:"Elias",nom:"Bonvin",naissance:"2016-06-17",weeks:[8,1],paid:true,order:"14845",email:"",parent:"Karim Bonvin",tel:"079 310 20 30",diet:["Halal"],allergies:"",severe:false,patho:"",meds:[],photos:true,obs:"",done:true,urgence:""},
 {id:7,prenom:"Zoé",nom:"Mercier",naissance:"2019-09-05",weeks:[1,6],paid:true,order:"14850",email:"",parent:"Laura Mercier",tel:"078 901 23 45",diet:[],allergies:"Kiwi",severe:false,patho:"",meds:[],photos:false,obs:"Porte des lunettes",done:true,urgence:""},
 {id:8,prenom:"Liam",nom:"Gerber",naissance:"2014-12-12",weeks:[1,2],paid:true,order:"14853",email:"",parent:"Tom Gerber",tel:"076 210 98 76",diet:[],allergies:"",severe:false,patho:"TDAH",meds:[{name:"Ritaline",dose:"10 mg",when:"12h00 après le repas"}],photos:true,obs:"",done:true,urgence:""},
 {id:9,prenom:"Alice",nom:"Jaquet",naissance:"2020-04-28",weeks:[1,2],paid:false,order:"14860",email:"",parent:"Nina Jaquet",tel:"079 654 32 10",diet:[],allergies:"",severe:false,patho:"",meds:[],photos:true,obs:"",done:false,urgence:""},
 {id:10,prenom:"Hugo",nom:"Pittet",naissance:"2017-02-11",weeks:[2,3],paid:true,order:"14866",email:"",parent:"Eva Pittet",tel:"078 777 88 99",diet:["Végétarien"],allergies:"",severe:false,patho:"",meds:[],photos:true,obs:"",done:true,urgence:""},
 {id:11,prenom:"Maya",nom:"Rey",naissance:"2016-10-03",weeks:[2,4],paid:true,order:"14871",email:"",parent:"Sami Rey",tel:"079 432 87 65",diet:[],allergies:"Fruits à coque",severe:true,patho:"",meds:[{name:"EpiPen",dose:"0,3 mg",when:"En cas de réaction"},{name:"Aerius sirop",dose:"5 ml",when:"Si urticaire"}],photos:true,obs:"",done:true,urgence:""},
 {id:12,prenom:"Jules",nom:"Morel",naissance:"2018-07-19",weeks:[3,5],paid:false,order:"14878",email:"",parent:"Léon Morel",tel:"077 111 22 33",diet:["Sans porc"],allergies:"",severe:false,patho:"",meds:[],photos:false,obs:"",done:true,urgence:""},
 {id:13,prenom:"Louise",nom:"Blanc",naissance:"2015-03-25",weeks:[4,5,6,7],paid:true,order:"14883",email:"",parent:"Iris Blanc",tel:"076 333 44 55",diet:[],allergies:"",severe:false,patho:"Diabète type 1",meds:[{name:"Insuline (pompe)",dose:"Selon glycémie",when:"Contrôle 10h, 12h, 15h"}],photos:true,obs:"Collation obligatoire à 10h",done:true,urgence:""},
 {id:14,prenom:"Adam",nom:"Fontana",naissance:"2019-12-01",weeks:[5,6,7],paid:true,order:"14890",email:"",parent:"Rita Fontana",tel:"079 999 00 11",diet:[],allergies:"",severe:false,patho:"",meds:[],photos:true,obs:"",done:false,urgence:""},
 {id:16,prenom:"Tom",nom:"Martin",naissance:"2016-02-10",weeks:[1,3],paid:true,order:"14817",email:"famille.martin@exemple.ch",parent:"Sophie Martin",tel:"079 123 45 67",diet:[],allergies:"",severe:false,patho:"",meds:[],photos:true,obs:"",done:false,cgv:false,urgence:""},
 {id:17,prenom:"Emma",nom:"Martin",naissance:"2020-06-02",weeks:[4],paid:false,order:"14899",email:"famille.martin@exemple.ch",parent:"Sophie Martin",tel:"079 123 45 67",diet:[],allergies:"",severe:false,patho:"",meds:[],photos:true,obs:"",done:false,cgv:false,urgence:""},
 {id:15,prenom:"Rose",nom:"Chevalley",naissance:"2017-05-22",weeks:[6,7],paid:false,order:"14896",email:"",parent:"Yann Chevalley",tel:"078 123 98 76",diet:["Vegan"],allergies:"Œuf",severe:false,patho:"",meds:[],photos:true,obs:"",done:true,urgence:""}
];
const ASS=["CSS","Helsana","Groupe Mutuel","Swica","Visana"],RCS=["Vaudoise","Zurich","Baloise","AXA","Generali"];
function fillDemo(){kids.forEach((k,i)=>Object.assign(k,{nage:k.nage??(ageOf(k)>=8||i%3===1),lieu:k.lieu??LIEUX[[0,0,1,0,2,0,3,1,0,2,0,3,1,2,0][i]??0],contacts:k.contacts??(k.urgence?[{name:k.urgence.split(",")[0]+" (papa)",tel:(k.urgence.split(",")[1]||"").trim()}]:[]),seul:k.seul??(ageOf(k)>=10&&i%2===0),pickup:k.pickup??(i%3===0?"Grand-maman, 079 000 00 0"+(i%10):""),adresse:k.adresse??("Rue des Exemples "+(i+3)+", 1233 Bernex"),parent2:k.parent2??(i%2?"":"Parent "+(i+1)+" bis"),tel2:k.tel2??(i%2?"":"078 000 11 "+String(10+i)),assMaladie:k.assMaladie??ASS[i%5],assAccident:k.assAccident??ASS[i%5],rc:k.rc??RCS[i%5],cgv:k.cgv??k.done,email:k.email||("parent"+(i+1)+"@exemple.ch")}));}
let recipes=[
 {id:1,title:"Brochettes arc-en-ciel",time:"15 min",level:"Facile",week:1,tags:["Sans cuisson","Végétarien"],ing:["1 barquette de fraises","2 kiwis","1 ananas","1 poignée de myrtilles","Piques en bois"],steps:["Laver et couper les fruits en cubes.","Enfiler les fruits en suivant les couleurs de l'arc-en-ciel.","Déguster bien frais !"],hue:"#E9EFA0",img:""},
 {id:2,title:"Houmous de betterave",time:"20 min",level:"Facile",week:1,tags:["Vegan","Sans gluten"],ing:["1 betterave cuite","1 boîte de pois chiches","2 c. à s. de tahini","1 citron","Sel, cumin"],steps:["Égoutter les pois chiches.","Mixer tous les ingrédients jusqu'à obtenir une crème lisse.","Servir avec des bâtonnets de légumes."],hue:"#D8E88A",img:""},
 {id:3,title:"Mini-muffins courgette & feta",time:"35 min",level:"Moyen",week:3,tags:["Végétarien"],ing:["1 courgette","100 g de feta","2 œufs","150 g de farine","1 sachet de levure","5 cl d'huile d'olive"],steps:["Râper la courgette et émietter la feta.","Mélanger œufs, farine, levure et huile.","Ajouter courgette et feta, remplir les moules.","Cuire 20 min à 180 °C."],hue:"#B7CC4A",img:""}
];
const MEDIA_CAPS=["Atelier cuisine","Chasse aux trésors","Pique-nique","Cueillette","Jeux d'eau","Relaxation","Visite de la ferme","Course relais","Dégustation","Goûter des familles","Potager","Balade en forêt"];
const MEDIA_HUES=["#CDDF70","#F0F2BC","#A9C94F","#E9EFA0","#D8E88A","#BFD45F"];
const media={};
["Bernex","Laconnex","Ville de Genève","Cossonay"].forEach((l,li)=>WEEKS.forEach(w=>{media[l+"|"+w.n]=MEDIA_CAPS.map((c,i)=>({id:li+"-"+w.n+"-"+i,type:i%5===3?"video":"photo",cap:c,hue:MEDIA_HUES[(i+w.n+li)%MEDIA_HUES.length],src:"",day:i%5+1})).slice(0,w.n<=2?12-li*2:(w.n===3?6:0))}));
fillDemo();
const fam=kids.filter(k=>k.email==="famille.martin@exemple.ch");fam.forEach(k=>Object.assign(k,{parent:fam[0].parent,tel:fam[0].tel,adresse:fam[0].adresse,parent2:fam[0].parent2,tel2:fam[0].tel2,contacts:fam[0].contacts,pickup:fam[0].pickup,rc:fam[0].rc}));
kids.forEach(k=>{k.obsEquipe=k.obs;k.obs=""});
return {
 weeks:WEEKS,
 lieux:LIEUX.map((nom,i)=>({nom,slug:["bernex","laconnex","geneve","cossonay"][i],salle:i?"":"Exemple : salle communale de Bernex",adresse:i?"":"Exemple : rue de l'Exemple 1, 1233 Bernex",prix:0})),
 refs:{"Bernex|8":{nom:"Julie (exemple)",tel:"079 000 00 00",email:"julie@exemple.ch"},"Bernex|1":{nom:"Julie (exemple)",tel:"079 000 00 00",email:"julie@exemple.ch"}},
 kids,recipes,media
};
}
