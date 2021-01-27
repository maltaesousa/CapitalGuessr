import socket
from http.server import BaseHTTPRequestHandler, HTTPServer
import time
import json
import psycopg2
import os

hostName = "0.0.0.0"
hostPort = 8000

class MyServer(BaseHTTPRequestHandler):

	# Connexion à la base de données
	data = {}
	conn_string = "dbname='{}' user='{}' host='{}' password='{}'".format(
		os.environ.get('PGDATABASE'),
		os.environ.get('PGUSER'),
		os.environ.get('PGHOST'),
		os.environ.get('PGPASSWORD'),
	)
	try:
		conn = psycopg2.connect(conn_string)
		cursor = conn.cursor()
	except:
		print("I am unable to connect to the database")

	# Contient les headers standards pour répondre du JSON
	def _set_headers(self):
		self.send_header('Access-Control-Allow-Origin', '*')
		self.send_header('Content-Type', 'application/json')
		self.send_header('Access-Control-Allow-Methods', 'OPTIONS, GETINFOSNEWGAME, NEWGAME, ANSWER, FINISHGAME, GETHIGHSCORES')
		self.send_header('Access-Control-Allow-Headers', 'X-Requested-With')
		self.send_header('Access-Control-Allow-Headers', 'Content-Type')
		self.end_headers()

	# Nécessaire pour le POST.
	def do_OPTIONS(self):
		self.send_response(200)
		self._set_headers()
	
	# Demande à la BD l'ID de la partie et les questions
	def do_GETINFOSNEWGAME(self):
		self.cursor.execute("SELECT games.idgame, idquestion, cityname FROM games INNER JOIN questions ON games.idgame = questions.idgame INNER JOIN cities ON cities.idcity = questions.idcity WHERE games.idgame = (SELECT idgame FROM games ORDER BY idgame DESC LIMIT 1) ORDER BY idquestion")
		self.data = self.cursor.fetchall()

		self.send_response(200)
		self._set_headers()
		# json.dumps converti le dictionnaire python en JSON
		self.wfile.write(bytes(json.dumps(self.data), "utf-8"))

	#Envoie à la BD le nom d'utilisateur et lui dit de créer une nouvelle ligne dans la table des parties
	#Crée aussi 10 questions aléatoires et retourne les 10 questions avec leur id et l'id de la partie
	def do_NEWGAME(self):#Ajouter la création des questions
		content_length = int(self.headers['Content-Length']) # <--- Gets the size of data
		post_data = self.rfile.read(content_length) # <--- Gets the data itself
		username = post_data.decode('utf8')
		print("Le serveur a reçu un POST!", self.path, post_data, username)

		self.cursor.execute("INSERT INTO games (username, difficulty, finished, total_points) VALUES (%s, 'easy', false, 0);",([username]))
		self.cursor.execute("SELECT games.idgame FROM games ORDER BY idgame DESC LIMIT 1")
		self.dataidgame = self.cursor.fetchall()
		self.idgame = [list(i) for i in self.dataidgame][0][0]
		self.cursor.execute("SELECT idcity FROM cities ORDER BY random() LIMIT 10") #Changer le 10 ici pour changer le nombre de questions par partie
		self.data = self.cursor.fetchall()
		self.cities = [list(i) for i in self.data]
		for idcity in self.cities :
			self.cursor.execute("INSERT INTO questions (distance, points, idcity, answer, idgame) VALUES (9999, 0, %s, ST_GeomFromText('POINT (0 0)', 4326), %s)",(idcity[0], self.idgame))
		# Le commit est nécessaire pour sauver les modifications dans la base de données
		self.conn.commit()

		self.cursor.execute("SELECT games.idgame, idquestion, cityname FROM games INNER JOIN questions ON games.idgame = questions.idgame INNER JOIN cities ON cities.idcity = questions.idcity WHERE games.idgame = %s ORDER BY idquestion",([self.idgame]))
		self.data = self.cursor.fetchall()
		self.send_response(201)
		self._set_headers()
		self.wfile.write(bytes(json.dumps(self.data), "utf-8"))

	#Envoie à la BD le n° de la question, l'ID de la partie et les coordonnées cliquées et recoit les infos de la question 
	def do_ANSWER(self):
		content_length = int(self.headers['Content-Length']) # <--- Gets the size of data
		post_data = self.rfile.read(content_length) # <--- Gets the data itself
		print("Le serveur a reçu un POST!", self.path, post_data)
		answer = json.loads(post_data.decode('utf8'))
		self.cursor.execute("SELECT answered FROM questions WHERE idgame = %s AND idquestion = %s",(answer["idgame"], answer["idquestion"]))
		self.data = self.cursor.fetchall()
		question_repondue = self.data[0][0]
		if  question_repondue == False:
			self.cursor.execute("UPDATE questions SET answer = ST_GeomFromText('POINT (%s %s)', 4326) WHERE idgame = %s AND idquestion = %s",(answer["answer_lon"], answer["answer_lat"], answer["idgame"], answer["idquestion"]))
			self.cursor.execute("UPDATE questions SET distance = (SELECT ST_DistanceSpheroid(answer,geom, 'SPHEROID[\"WGS 84\",6378137,298.257223563]')/1000 as dist_km FROM questions INNER JOIN cities ON questions.idcity = cities.idcity WHERE idquestion = %s) WHERE idquestion = %s",(answer["idquestion"], answer["idquestion"]))
			self.cursor.execute("UPDATE questions SET points = (SELECT CASE WHEN distance < 1000 THEN (1000-round(distance)) ELSE 0 END	as pts FROM questions INNER JOIN cities ON questions.idcity = cities.idcity WHERE idquestion = %s) WHERE idquestion = %s",(answer["idquestion"], answer["idquestion"]))
			self.cursor.execute("UPDATE questions SET answered = true WHERE idgame = %s AND idquestion = %s", (answer["idgame"], answer["idquestion"]))
			self.conn.commit()
			self.cursor.execute("SELECT st_asgeojson(geom), st_astext(geom), geom, st_x(geom), st_y(geom), distance, points FROM questions INNER JOIN cities ON questions.idcity = cities.idcity WHERE idquestion = %s", ([answer["idquestion"]]))
			self.data = self.cursor.fetchall()
		else:
			self.data = ("QUESTION DEJA REPONDUE")
		
		self.send_response(200)
		self._set_headers()
		# json.dumps converti le dictionnaire python en JSON
		self.wfile.write(bytes(json.dumps(self.data), "utf-8"))

	#Dit à la BD de calculer le total de points et de remplir l'attribut finished en True.
	def do_FINISHGAME(self):
		content_length = int(self.headers['Content-Length']) # <--- Gets the size of data
		post_data = self.rfile.read(content_length) # <--- Gets the data itself
		idgame = post_data.decode('utf8')
		print("Le serveur a reçu un POST!", self.path, post_data, idgame)
		self.cursor.execute("SELECT finished FROM games WHERE idgame = %s",([idgame]))
		self.data = self.cursor.fetchall()
		partie_finie = self.data[0][0]
		if partie_finie == False:
			self.cursor.execute("UPDATE games SET total_points = (SELECT sum(points) FROM games INNER JOIN questions ON questions.idgame = games.idgame WHERE games.idgame = %s) WHERE idgame = %s",(idgame,idgame))
			self.cursor.execute("UPDATE games SET finished = true WHERE idgame = %s",([idgame]))
			self.conn.commit()
			self.cursor.execute("SELECT total_points, answer, geom, st_asgeojson(answer), st_asgeojson(geom) FROM games INNER JOIN questions ON questions.idgame = games.idgame INNER JOIN cities ON questions.idcity = cities.idcity WHERE games.idgame = %s",([idgame]))
			self.data = self.cursor.fetchall()
		else:
			self.data = ("PARTIE DEJA FINIE")
		
		self.send_response(200)
		self._set_headers()
		# json.dumps converti le dictionnaire python en JSON
		self.wfile.write(bytes(json.dumps(self.data), "utf-8"))

	#Demande à la BD la liste des parties terminées triées dans l'ordre décroissant du total de points et en n'affichant que le TOP10
	def do_GETHIGHSCORES(self):
		self.cursor.execute("SELECT username, difficulty, total_points FROM games WHERE finished = true ORDER BY total_points DESC NULLS LAST LIMIT 10")
		self.data = self.cursor.fetchall()

		self.send_response(200)
		self._set_headers()
		# json.dumps converti le dictionnaire python en JSON
		self.wfile.write(bytes(json.dumps(self.data), "utf-8"))

myServer = HTTPServer((hostName, hostPort), MyServer)
print(time.asctime(), "Server Starts - %s:%s" % (hostName, hostPort))

try:
	myServer.serve_forever()
except KeyboardInterrupt:
	pass

myServer.server_close()
print(time.asctime(), "Server Stops - %s:%s" % (hostName, hostPort))
