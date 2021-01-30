//Projet SIG3 - Jeu de capitales
//réalisé par Dylan Béguin et Kilian Morel
//rendu le 20.01.2021

const vectorLayer = new ol.layer.Vector({
});

let styles = [
  new ol.style.Style({
    fill: new ol.style.Fill({
      color: 'rgba(0,0,0,0)'
    }),
    stroke: new ol.style.Stroke({
      color: 'black',
      width: 2
    })
  })
];

const geojsonPays = new ol.source.Vector({
  format: new ol.format.GeoJSON(),
  url: "countries.json",
});

const watercolor = new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: 'http://{a-c}.tile.stamen.com/watercolor/{z}/{x}/{y}.png'
  })
});

let view = new ol.View({
	center: ol.proj.fromLonLat([0,0]), //Suisse : 6.6,46.6
  zoom: 1,
  maxZoom: 9,//indique le zoom maximum
});

vectorLayer.setSource(geojsonPays);
vectorLayer.setStyle(styles);

// Map
const map = new ol.Map({
  target: "map",
  // Couches
  layers: [
    watercolor, //Variante watercolor de stamen
    vectorLayer
  ],
  // Vue (contrôle l'échelle, le centre, etc..)
  view
});

//Bouton HOME avec demande de confirmation
$("#boutonHOME").click(function(event){
  var choice = confirm("Quitter la partie en cours et revenir au menu principal ?");
  if (choice == true) {
    location.href = 'index.html';
  }
});

//Création du marker rouge
var markers = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: new ol.style.Style({
      image: new ol.style.Icon({
        anchor: [0.5, 1],
        src: 'marker.png'
      })
  })
})

//Création du marker bleu
var markers2 = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: [],
});

//Création des lignes de tracage des distances
var vectors = new ol.layer.Vector({
  source: new ol.source.Vector(),
  style: [
    new ol.style.Style({
      stroke: new ol.style.Stroke({
        color: 'blue',
        width: 3
      }),
      fill: new ol.style.Fill({
        color: 'rgba(0, 0, 255, 0.1)'
      })
    })
  ],
});

//ajout des markers / vecteurs
map.addLayer(vectors);
map.addLayer(markers);
map.addLayer(markers2);

// On déclare les variables que l'on utilise plus loin
var continue_question = 0;
var reverse_counter = 20;
var downloadTimer = null;
var dataFromServer = null;
var DataFromPostgreSQL = null;
let username = "Anonyme";
let question_jeu = "Préparez vous à répondre à la question en cliquant sur la map.";

//Fonction d'interaction avec la carte
map.on("click", function (evt) {
  clear_clock();// reset du timer
  let coordinates = evt.coordinate;//On met à jour les coordonnées cliquées
  let coordinates_wgs84 = ol.proj.transform(coordinates, 'EPSG:3857', 'EPSG:4326')// converti les coordonnées en EPSG:4326
  if (coordinates_wgs84[0] < -180){// si la coordonnée cliquée est plus(moins) que 180(-180) degrés on fait l'opération: 180(-180) + la coordonnée modulo 180 pour avoir les bonnes coordonnées 
    coordinates_wgs84[0] = 180 + coordinates_wgs84[0]%180
  } if (coordinates_wgs84[0] > 180){
    coordinates_wgs84[0] = -180 + coordinates_wgs84[0]%180
  };
  //console.log('Stock les coordonnées cliquées',coordinates_wgs84);
  DataFromPostgreSQL[continue_question][3] = coordinates_wgs84[0]; // enregistrement de la Longitude du point cliqué en wgs 84
  DataFromPostgreSQL[continue_question][4] = coordinates_wgs84[1]; // enregistrement de la Latitude du point cliqué en wgs 84
  continue_question ++; //Incrémentation des numéros des questions par clique
  const marker = new ol.Feature({ //attribut la géométrie du marker
    geometry: new ol.geom.Point(coordinates),
  });
  markers.getSource().addFeature(marker);//On afficher le marker sur la map
  affiche_question();//changement de question lorsque l'on clique sur la carte
  reverse_counter = 20;//on remet le timer à 20 seconde
  start_timer();//on restart le timer
})

function affiche_reponses() {
  for (let i = 0; i<10; i++) {
    let coordinates_wgs84 = [DataFromPostgreSQL[i][5][0][3], DataFromPostgreSQL[i][5][0][4]]; //
    let coordinates = ol.proj.fromLonLat(coordinates_wgs84);
    let coordinates_start = ol.proj.fromLonLat([DataFromPostgreSQL[i][3],DataFromPostgreSQL[i][4]]);

    const marker2 = new ol.Feature({ //attribut la géométrie du marker
      geometry: new ol.geom.Point(coordinates),
    });
    const texte_ville = [ // creation des styles pour afficher les marqueurs ainsi que les noms des bonnes réponses.
      new ol.style.Style({
        text: new ol.style.Text({
          text: DataFromPostgreSQL[i][2], //nom de la ville
          offsetY: 15,//décallage du texte vers le bas
          scale: 2,//taille du texte
          stroke: new ol.style.Stroke({//contours du texte
            color:"white",
            width:2
          }),
          fill: new ol.style.Fill({
            color: "black"
          })
        })
      }),
      new ol.style.Style({//propriétés du marker
        image: new ol.style.Icon({
          anchor: [0.5, 1],
          src: 'marker2.png'
        }),
      })
    ];
    if (DataFromPostgreSQL[i][3] != 9999) { //Si l'utilisateur à répondu à la question on relie la réponse donnée à la bonne réponse
      const vector = new ol.Feature({
        geometry: new ol.geom.LineString([coordinates, coordinates_start]),
      });
      vectors.getSource().addFeature(vector);
    }
    marker2.setStyle(texte_ville);//Attribution du nom de la ville pour chaque marker
    markers2.getSource().addFeature(marker2);//On ajoute les attribus au marker de la réponse pour pouvoir l'afficher sur la map
  }
}

//Fonction utilisée pour reset le timer
function clear_clock() {
  clearInterval(downloadTimer);
}

//Fonction pour le minuteur
function start_timer(){
  downloadTimer = setInterval(function(){
    document.getElementById("pbar").value = 20 - --reverse_counter;
    if (reverse_counter < 0 ) {// Si timer arrive à zéro
      DataFromPostgreSQL[continue_question][3] = 9999, // enregistrement de la Longitude avec 9999 comme valeur
      DataFromPostgreSQL[continue_question][4] = 9999, // enregistrement de la Latitude avec 9999 comme valeur
      clear_clock(), 
      continue_question ++,// si le timer arrive à zéro, on passe à la prochaine question
      affiche_question(),//on affiche la prochaine question
      alert("Dommage vous n'avez pas répondu !"),
      reverse_counter = 20,
      start_timer();
    } if (continue_question ==10) { //si on arrive à la 10ème question on clear le timer
      clear_clock();
    };
    document.getElementById("counting").innerHTML= reverse_counter;
  },1000);
};

//On reload la page pour refaire une partie
function start_game() {
    var choice = confirm("Voulez-vous commencer une nouvelle partie ?");
    if (choice == true) {
      location.reload();
    }
};

//On rempli le champ avec son pseudo et le stock en local
function Username_choice() {
  var person = prompt("Entrez votre nom:", username);
  //On force l'utilisateur à entrer un nom différent que Anonyme ou vide et qui fasse moins de 40 caractères
  while (person == null || person == "" || person =="Anonyme" || person.length > 40) { 
    person = prompt("Entrez votre nom:", username);
  }
  username = person;
  if ( confirm( "Votre nom est bien "+ username +" ?\n\nSi oui, cliquez sur ok pour contiuer") ) {// On demande la confirmation 
    createNewGame();
  }
}

function affiche_question() {
  if (continue_question < 10 ) { //Si le numero de la question est inférieur au nombre de question
    question_jeu = "Où se trouve " + DataFromPostgreSQL[continue_question][2] + " ?";//Met à jour la question
    let zone_question = document.getElementById("zone_question")//
    zone_question.innerHTML = "";
    zone_question.innerText = question_jeu;
    
  } else{ //si on dépasse le nombre de question, 
    Answer();//on envoie les réponses au serveur qui calcul les distances et les points marqués, 
    if (confirm("Partie terminée, cliquez sur OK pour valider votre score")) {//il faut valider pour envoyer les réponses au serveur
      finishGame();//fini la partie
    };
  };
}

//boucle qui envoie les réponses au serveur
function Answer() {
  for (let i = 0; i<10; i++) { //Boucle sur toutes le réponses données, remplacer 10 par le nombre de question

    let nogame = DataFromPostgreSQL[i][0];//on récupère le numéro de la partie
    let noquestion = DataFromPostgreSQL[i][1];//on récupère le numéro de la question
    let answerlon = DataFromPostgreSQL[i][3];//on récupère la longitude
    let answerlat = DataFromPostgreSQL[i][4];//on récupère la latitude
    let fullanswer_object = { //groupement des réponses dans un objet
        idgame: parseInt(nogame),
        idquestion: parseInt(noquestion),
        answer_lon: parseFloat(answerlon),
        answer_lat: parseFloat(answerlat)
    };
    let fullanswer = JSON.stringify(fullanswer_object);
    //console.log('On va tenter d\'envoyer ça au serveur:', fullanswer);
    //console.log('Cette page tente de joindre:', url);
    $.ajax({
      url: url,
      type: 'ANSWER',
      contentType: "application/json",
      data: fullanswer,
      dataType: "json",
      success: function (response) {
        if (response == "QUESTION DEJA REPONDUE") {
          let info_erreur = 'Mec t\'as déjà répondu à cette question, tu serais pas en train d\'essayer de tricher là ?'
          console.log(info_erreur);
        } else {
          //console.log('POST fait avec succès, voici la réponse:', response);
          DataFromPostgreSQL[i][5] = response;//mise à jour en local des réponses, longitudes, latitudes vraies
        }
      },
      error: function (error) {
        console.error('Houston on a un problème:', error);
      }
    });
  };
}

//Fonction qui demande à la BD la création d'une nouvelle partie
function createNewGame() {
  console.log('Cette page tente de joindre:', url);
  $.ajax({
    url: url,
    type: 'NEWGAME',
    data: username,
    dataType: "json",
    //envoie idgame, idquestion, cityname
    success: function (response) {
      //console.log('POST fait avec succès, voici la réponse:', response);
      getInfosNewGame();//nous envoie les infos de la partie créée
    },
    error: function (error) {
      console.error('Houston on a un problème:', error);
    }
  });
}

//déclaration de l'url
let url = "http://localhost/capitales_back";
console.log(url)

//demande des informations sur la nouvelle partie (idgame, idquestion, cityname)
function getInfosNewGame() {
  console.log('Cette page tente de joindre:', url);
  $.ajax({
    url: url,
    type: 'GETINFOSNEWGAME',
    dataType: "json",
    //envoie idgame, idquestion, cityname
    success: function(dataFromServer) {
      //console.log('Le serveur a répondu:', dataFromServer);
      DataFromPostgreSQL = dataFromServer; //met à jour la liste des questions en local
      affiche_question();//affiche les questions de la nouvelle partie
      start_timer();//start le timer
    }
  });
}

//demande à la base de données de terminer la partie 
function finishGame() {
  let finishedgame = DataFromPostgreSQL[0][0];//le numéro de la partie
  finishedgame = finishedgame.toString();
  console.log('Cette page tente de joindre:', url);
  $.ajax({
    url: url,
    type: 'FINISHGAME',
    data: finishedgame,
    dataType: "json",
    success: function (response) {
      if (response == "PARTIE DEJA FINIE") {
        let info_erreur = 'Mec cette partie est déjà terminée, tu serais pas en train d\'essayer de tricher là ?'
        console.log(info_erreur);
      } else {
        console.log('POST fait avec succès, voici les bonnes réponses :', response);
        question_jeu = "Félicitations "+ username +", votre score est de " + response[0][0] + " points";//met à jour la question en affichant le score de la partie
        let zone_question = document.getElementById("zone_question")
        zone_question.innerHTML = "";
        zone_question.innerText = question_jeu;
        affiche_reponses(); //On affiche les réponses sur la carte
      }
    },
    error: function (error) {
      console.error('Houston on a un problème:', error);
    }
  });
}

Username_choice();//lance directement la partie lors du chargement de la page

