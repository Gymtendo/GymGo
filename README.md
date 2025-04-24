# GymGo
Team(Gymtendo):
Ethan Wang
Emily Zabron
Isaac Mitchell
Kevin Wang
Emma Cotrell

**GymGo** is a Node.js/Express application that gamifies the gym experience by tracking users' daily workouts, awarding XP, maintaining streaks, and enabling social interactions through leaderboards, friends lists, and group challenges (boss battles).

---

## Project Description

GymGo encourages users to make the gym part of their daily routine through gamification. Users earn XP by logging workouts, can challenge friends via leaderboards, join group "boss battles," and unlock rewards for consistency and achievements.

---

## Tech Stack

- **Backend**: Node.js, Express
- **Templating**: express-handlebars (Handlebars.js)
- **Database**: PostgreSQL (pg-promise)
- **Authentication**: express-session, bcryptjs
- **Styling**: Bootstrap 5
- **Containerization**: Docker, Docker Compose

---

## Folder Structure

```plaintext
ProjectSourceCode/
├── src/
│   ├── views/                # Handlebars templates (layouts, partials, pages)
│   ├── public/               # Static assets (CSS, client‑side JS)
│   └── init_data/            # SQL init scripts (create.sql, insert.sql)
├── docker-compose.yaml       # Docker Compose configuration
├── package.json              # Node.js dependencies and scripts
└── README.md                 # Project documentation
```

---

## Running Locally

1. **Clone the repository**
   ```bash
   git clone https://github.com/Gymtendo/GymGo.git
   cd GymGo/ProjectSourceCode
   ```

2. **Create a `.env` file** in the project root with:
   ```env
   # Postgres
   POSTGRES_DB=gymgo
   POSTGRES_USER=gymuser
   POSTGRES_PASSWORD=gympassword
   DB_HOST=localhost      # or 'db' when using Docker
   DB_PORT=5432

   # Session
   SESSION_SECRET=yourSuperSecretKey

   # App
   PORT=3000
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Initialize the database**
   - **Locally**: ensure Postgres is running and execute:
     ```bash
     psql -h localhost -U $POSTGRES_USER -d $POSTGRES_DB -f src/init_data/create.sql
     psql -h localhost -U $POSTGRES_USER -d $POSTGRES_DB -f src/init_data/insert.sql
     ```
   - **With Docker**: start the DB container (it auto‑runs init scripts):
     ```bash
     docker-compose up -d db
     ```

5. **Start the server**
   ```bash
   npm start
   ```

6. **Open in browser**: navigate to `http://localhost:3000`

---

## Deployed Application

The live version of GymGo is available at: [https://your-domain.com](https://your-domain.com)

---

## Production Deployment

1. Build and push Docker image:
   ```bash
   docker build -t your-registry/gymgo:latest .
   docker push your-registry/gymgo:latest
   ```
2. Deploy on your server or orchestrator, injecting environment variables securely.
3. Configure SSL/TLS, monitoring, backups, and scaling as needed.

---

## API Endpoints

| Method | Route                    | Description                   |
| ------ | -------------------------| ----------------------------- |
| GET    | `/register`              | Registration page             |
| POST   | `/register`              | Create new account            |
| GET    | `/login`                 | Login page                    |
| POST   | `/login`                 | Authenticate user             |
| GET    | `/home`                  | User dashboard (protected)    |
| POST   | `/logout`                | Log out                       |
| GET    | `/leaderboard`           | XP leaderboard (protected)    |
| GET    | `/friends`               | View friends list (protected) |
| POST   | `/friends/add`           | Add a friend                  |
| POST   | `/friends/accept`        | Accept a friend request       |
| POST   | `/friends/reject`        | Reject a friend request       |
| POST   | `/friends/remove`        | Remove a friend               |
| POST   | `/friends/cancel`        | Cancel a friend request       |
| GET    | `/boss`                  | Boss battle page              |
| GET    | `/quests`                | Daily quests                  |
| GET    | `/lose-fat-gain-muscle`  | Recommended workout program   |
| GET    | `/gain-muscle-and-fat`   | Recommended workout program   |
| GET    | `/lose-fat`              | Recommended workout program   |
| GET    | `/history`               | Workout logs                  |
| POST   | `/history`               | Log a new exercise            |

---

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/YourFeature`
3. Commit changes: `git commit -m "Add feature"
4. Push: `git push origin feature/YourFeature`
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.

---

*Gymtendo Team – GymGo*

