GymGo

Team(Gymtendo):
Ethan Wang
Emily Zabron
Isaac Mitchell
Kevin Wang
Emma Cotrell

GymGo is a Node.js/Express application that gamifies the gym experience by tracking users' daily workouts, awarding XP (experience points), quests, and enabling social interactions through leaderboards, friends lists, and group challenges (boss battles).

Features

User Authentication: Register and login with secure password hashing (bcrypt).

XP Tracking & Daily Quests: Log workouts to earn XP and track completion of daily quests.

Leaderboard: Global and friends-based leaderboard to foster healthy competition.

Friends: Add friends, view their progress, and compare metrics.

Boss Battles: Group tasks where workout points contribute damage to a boss monster.

Responsive UI: Handlebars templates with Bootstrap for desktop views.

Dockerized: Run both the app and Postgres database via Docker Compose.

Tech Stack

Backend: Node.js, Express

Templating: express-handlebars (Handlebars.js)

Database: PostgreSQL (pg-promise)

Authentication: express-session, bcryptjs

Styling: Bootstrap 5

Containerization: Docker, Docker Compose

Prerequisites

Node.js (v16+)

npm (v8+)

Docker & Docker Compose

API Endpoints

Method

Route

Description

GET

/register

Registration page

POST

/register

Create new account

GET

/login

Login page

POST

/login

Authenticate user

GET

/home

User dashboard (protected)

POST

/logout

Log out

GET

/profile

View profile (protected)

GET

/leaderboard

XP leaderboard (protected)

GET

/friends

View friends list (protected)

POST

/friends/add

Add a friend

GET

/boss

Boss battle page

Folder Structure

ProjectSourceCode/
├── src/
│   ├── views/                # Handlebars templates
│   │   ├── layouts/
│   │   ├── partials/
│   │   └── pages/
│   ├── public/               # Static assets (CSS, JS)
│   └── init_data/            # SQL init scripts
├── docker-compose.yaml
├── package.json
└── README.md

Contributing

Fork the repository

Create a new branch: git checkout -b feature/YourFeatureName

Make your changes and commit: `git commit -m "Add feature"

Push to your branch: git push origin feature/YourFeatureName

Open a Pull Request

License

This project is licensed under the MIT License. Feel free to use, modify, and distribute.

Gymtendo Team – GymGo

