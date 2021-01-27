# CapitalGuessr

This game was made by Kilian Morel and Dylan Béguin students in GIS classes at HEIG-VD, Yverdon-les-Bains.

# Getting started

Clone this repository

Make a copy of `.env.sample` to a `.env` file and set variables according to your environement.

Restore `db/capitales.backup` pgAdmin with defaults are fine.

Start the project

```psql
docker-compose up -d
```

# Things to consider in further projects

Make sure python server runs with `0.0.0.0` and not `localhost`.
