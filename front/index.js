let url = "http://localhost/capitales_back";

//Bouton Nouvelles partie
$("#bouton").click(function(event){
  console.log("Clic sur le bouton HOME"); //Pas forcément utile, c'est juste pour avoir une trace du clic
  location.href = 'projet.html';
});

//Fonction qui affiche le tableau des meilleurs scores
function getHighScores() {
  console.log('Cette page tente de joindre:', url);
  let content_table = document.getElementById("content_table_highscores")
  $.ajax({
    url: url,
    type: 'GETHIGHSCORES',
    dataType: "json",
    //demande les 10 meilleurs scores et reçoit (username, difficulty, total_point)
    success: function (response) {
      for (let i = 0; i< response.length; i++) {
        //Crée la structure :
        let line = document.createElement("tr");
        let content_name = document.createElement("td");
        let content_points = document.createElement("td");

        let position = parseInt(i) + 1

        //Remplit les données :
        content_name.innerText = '#' + position + ' ' + response[i][0];
        content_points.innerText = response[i][2];

        //Ajoute les données dans le tableau :
        content_table.appendChild(line);
        content_table.appendChild(content_name);
        content_table.appendChild(content_points);
      }
    }
  });
}

getHighScores()
