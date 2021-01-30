# CapitalGuessr

This game was made by Kilian Morel and Dylan Béguin both students in GIS classes at HEIG-VD, Yverdon-les-Bains.

# Getting started

Clone this repository

Make a copy of `.env.sample` to a `.env` file and set variables according to your environement.

Restore `db/capitales.backup`. pgAdmin with defaults are fine.

Start the project:

```psql
docker-compose up -d
```

You should be able to access backend at http://localhost:8001 and frontend at http://localhost:5001/capitales if you didn't change the default ports in you `.env`. But they don't work together yet, see Apache configuration below.

## Apache configuration

You can either install Apache in your machine or run it inside a container. In the `apache` directory, you'll find a Dockerfile ready to build an image that will run an Apache on port 80 and wiring up back and front together. If you want to intall Apache on your machine, simply copy lines from `apache/httpd.conf` provided.

To run the Apache in docker:

```powershell
docker build -t apache24 .\apache\
docker run -d --rm --name apachinou -p 80:80 apache24
```

You should be able now to go to http://localhost/capitales and play the game.

# Things to consider in further student projects

* Make sure python server runs with `0.0.0.0` and not `localhost`.
* Do not use large front assets. For this project, countries.json was 22Mo and I need to change it to a smaller file.
* Replace urls according to the set up: right backend url and relative urls for front assets.
