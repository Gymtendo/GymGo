require('dotenv').config();

// *********************************************************************************
// Import Dependencies
// *********************************************************************************
const express = require('express');
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');

const app = express();

// *********************************************************************************
// View Engine (Now with eq + incremented helpers)
// *********************************************************************************
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
  helpers: {
    incremented: (index) => index + 1,
    eq: (a, b) => a === b
  }
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use('/resources', express.static(path.join(__dirname, 'resources')));

// *********************************************************************************
// Middleware
// *********************************************************************************
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false }
}));
app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.user;
  next();
});

function requireLogin(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}

// *********************************************************************************
// Database
// *********************************************************************************
const dbConfig = {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
};
const db = pgp(dbConfig);

// *********************************************************************************
// Routes
// *********************************************************************************
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.redirect('/login');
});

app.get('/register', (req, res) => res.render('pages/register'));

app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).render('pages/register', { message: 'All fields required', error: true });
  }
  if (username.length < 3 || username.length > 50 || password.length < 8 || password.length > 50) {
    return res.status(400).render('pages/register', { message: 'Invalid input lengths', error: true });
  }
  try {
    const existing = await db.oneOrNone('SELECT * FROM Accounts WHERE Username = $1', [username]);
    if (existing) {
      return res.status(409).render('pages/register', { message: 'Username already exists', error: true });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.none(`INSERT INTO Accounts (Username, Password, xp, CurDate, Quest1, Quest2, Quest3)
                   VALUES ($1, $2, 0, CURRENT_DATE, 1, 0, 0)`, [username, hashedPassword]);

    const newUser = await db.one(`SELECT * FROM Accounts WHERE Username = $1`, [username]);

    req.session.user = {
      id: newUser.accountid,
      username: newUser.username,
      email: newUser.email || '',
      xp: newUser.xp
    };

    res.redirect('/home');
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).render('pages/register', { message: 'Internal server error', error: true });
  }
});

app.get('/login', (req, res) => res.render('pages/login'));

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(401).render('pages/login', { message: 'Username and password required', error: true });
  }
  try {
    const user = await db.oneOrNone('SELECT * FROM Accounts WHERE Username = $1', [username]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render('pages/login', { message: 'Invalid credentials', error: true });
    }
    req.session.user = {
      id: user.accountid,
      username: user.username,
      email: user.email || '',
      xp: user.xp
    };
    res.redirect('/home');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).render('pages/login', { message: 'Internal error', error: true });
  }
});

app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.render('pages/logout', { error_message: "Error logging out. Try again." });
    }
    res.render('pages/logout', { success_message: "Logged out successfully!" });
  });
});

app.get('/home', requireLogin, (req, res) => {
  res.render('pages/home', {
    username: req.session.user.username,
    email: req.session.user.email,
    xp: req.session.user.xp
  });
});

app.get('/profile', requireLogin, (req, res) => {
  res.render('pages/home', {
    username: req.session.user.username,
    email: req.session.user.email,
    xp: req.session.user.xp
  });
});

app.get('/leaderboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const users = await db.any(`SELECT accountID AS id, username, xp FROM accounts ORDER BY xp DESC`);
    res.render('pages/leaderboard', {
      title: 'Leaderboard',
      users,
      login: res.locals.loggedIn
    });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).send("Unable to load leaderboard.");
  }
});

async function getFriends(id) {
  const query = `SELECT friend.* FROM AccountFriends af
    INNER JOIN Accounts you ON af.AccountID = you.AccountID
    INNER JOIN Accounts friend ON af.FriendID = friend.AccountID
    WHERE you.AccountID = ${id}`;
  return await db.any(query);
}

app.get('/friends', requireLogin, async (req, res) => {
  const userID = req.session.user.id;
  const result = await getFriends(userID);
  res.render('pages/friends.hbs', { users: result });
});

app.post('/friends/add', requireLogin, async (req, res) => {
  const userID = req.session.user.id;
  const atMax = (await getFriends(userID)).maxFriends;
  if (atMax) {
    res.render('pages/friends.hbs', { users: await getFriends(userID), message: "You have reached the maximum number of friends!" });
    return;
  }
  try {
    const otherUser = await db.one(`SELECT AccountID from Accounts WHERE Accounts.Username = '${req.body.username}'`);
    await db.none(`INSERT INTO AccountFriends (AccountID, FriendID) VALUES (${userID}, ${otherUser.accountid});`);
    res.redirect('/friends');
  } catch (err) {
    const users = await getFriends(userID);
    res.render('pages/friends.hbs', { users, message: `User ${req.body.username} does not exist!` });
  }
});

app.get('/boss', requireLogin, async (req, res) => {
  try {
    const { bossid } = await db.one(`SELECT BossID FROM Boss ORDER BY BossID DESC LIMIT 1`);
    const boss = await db.oneOrNone(`SELECT * FROM Boss WHERE BossID = $1`, [bossid]);
    if (!boss) throw new Error("Boss Not Found");
    const formattedDeadline = new Date(boss.deadline).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });
    res.render('pages/boss', {
      BossName: boss.name,
      HP: boss.hp,
      MaxHP: boss.maxhp,
      Reward: boss.rewardxp,
      Deadline: formattedDeadline
    });
  } catch (err) {
    res.status(500).render('pages/boss', {
      message: err.message || "Unexpected error",
      error: true
    });
  }
});

app.get('/history', requireLogin, async (req, res) => {
  try {
    const userID = req.session.user.id;
    const exercises = await db.any(`
      SELECT e.* FROM Exercises e
      JOIN UserExercises ue ON e.ExerciseID = ue.ExerciseID
      WHERE ue.AccountID = $1
      ORDER BY e.Date DESC`, [userID]);

    res.render('pages/history.hbs', { exercises });
  } catch (err) {
    console.error("Error loading history:", err);
    res.render('pages/history.hbs', { error_message: 'Failed to load exercises.' });
  }
});

app.post('/history', requireLogin, async (req, res) => {
  const { exerciseName, exerciseXP, timeQuant, amount } = req.body;
  const userID = req.session.user.id;
  try {
    const result = await db.one(
      `INSERT INTO Exercises (Date, ExerciseName, ExerciseXP, TimeQuant, Amount)
       VALUES (CURRENT_DATE, $1, $2, $3, $4)
       RETURNING ExerciseID`,
      [exerciseName, parseInt(exerciseXP), timeQuant === 'on', parseInt(amount)]
    );
    await db.none(`INSERT INTO UserExercises (AccountID, ExerciseID) VALUES ($1, $2)`, [userID, result.exerciseid]);
    await db.none(`UPDATE accounts SET xp = xp + $2 WHERE accountid = $1`, [userID, parseInt(exerciseXP)]);
    res.redirect('/history');
  } catch (err) {
    console.error("Error adding exercise:", err);
    res.status(500).send("Failed to add exercise.");
  }
});

app.get('/lose-fat', (req, res) => res.render('pages/lose-fat.hbs'));
app.get('/lose-fat-gain-muscle', (req, res) => res.render('pages/lose-fat-gain-muscle.hbs'));
app.get('/gain-muscle-and-fat', (req, res) => res.render('pages/gain-muscle-and-fat.hbs'));

// *********************************************************************************
// Start Server
// *********************************************************************************
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
