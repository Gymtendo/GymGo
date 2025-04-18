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

// This is for the leaderboard rank
const Handlebars = require('handlebars');
Handlebars.registerHelper('incremented', function (index) {
<<<<<<< HEAD
  return index + 1;
});
=======
  index++;
  return index;
})
//const hbs = require('hbs');

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});



>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95

// *********************************************************************************
// View Engine
// *********************************************************************************
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname, 'views', 'layouts'),
  partialsDir: path.join(__dirname, 'views', 'partials'),
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

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.redirect('/login');
  }
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

<<<<<<< HEAD
=======
//////////////////////////////////////////////
app.use((req, res, next) => {
  if (req.session.user) {
    res.locals.loggedIn = true;
    res.locals.username = req.session.user.username;
    res.locals.xp = req.session.user.xp;
  } else {
    res.locals.loggedIn = false;
    res.locals.username = null;
    res.locals.xp = null;
  }
  next();
});
//////////////////////////////////////////////


// Commented out the database connection testing to bypass DB access for now.
// db.connect()
//   .then(obj => {
//     console.log('Database connection successful'); // you can view this message in the docker compose logs
//     obj.done(); // success, release the connection;
//   })
//   .catch(error => {
//     console.log('ERROR:', error.message || error);
//   });

>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95
// *********************************************************************************
// Routes
// *********************************************************************************
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.redirect('/login');
});

<<<<<<< HEAD
=======
app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome to the API!' });
});



// ------------------------------
// adds xp to profile and it updates
// ------------------------------
app.post('/add-exercise', async (req, res) => {
  const userId = req.session.user.id;
  const xpEarned = 50; // however much XP this exercise gives

  try {
    // Update the XP in the database
    await db.none('UPDATE Accounts SET xp = xp + $1 WHERE accountid = $2', [xpEarned, userId]);

    // OPTIONAL: get the new XP from the DB (if you want to be precise)
    const updatedUser = await db.one('SELECT xp FROM Accounts WHERE accountid = $1', [userId]);

    // Update the session
    req.session.user.xp = updatedUser.xp;

    // Redirect or respond
    res.redirect('/somewhere'); // or send JSON if using AJAX
  } catch (err) {
    console.error('Error updating XP:', err);
    res.status(500).send('Something went wrong');
  }
});


// ------------------------------
// Register
// ------------------------------
>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95
app.get('/register', (req, res) => {
  res.render('pages/register');
});

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
    res.redirect('/login');
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).render('pages/register', { message: 'Internal server error', error: true });
  }
});

app.get('/login', (req, res) => {
  res.render('pages/login');
});

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
<<<<<<< HEAD
=======

    if (req.session.desiredPath) {
      const desiredPath = req.session.desiredPath;
      delete req.session.desiredPath;
      return res.redirect(desiredPath);
    }
>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95
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

<<<<<<< HEAD
app.get('/home', requireLogin, (req, res) => {
  res.render('pages/home', {
    username: req.session.user.username,
    email: req.session.user.email,
    xp: req.session.user.xp
  });
});
=======
const auth = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    req.session.desiredPath = req.path;
    res.redirect('/login');
  }
};
app.use(auth);

// ------------------------------
// Leaderboard
// ------------------------------
//helper function for rank to work properly
>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95

app.get('/profile', requireLogin, (req, res) => {
  res.render('pages/home', {
    username: req.session.user.username,
    email: req.session.user.email,
    xp: req.session.user.xp
  });
});

app.get('/leaderboard', requireLogin, async (req, res) => {
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
<<<<<<< HEAD
  return await db.any(`
    SELECT friend.* FROM AccountFriends af
    INNER JOIN Accounts you ON af.AccountID = you.AccountID
    INNER JOIN Accounts friend ON af.FriendID = friend.AccountID
    WHERE you.AccountID = $1`, [id]);
=======
  const makeQuery = (what, where) => `SELECT ${what} FROM AccountFriends af
    INNER JOIN Accounts you ON af.AccountID = you.AccountID
    INNER JOIN Accounts friend ON af.FriendID = friend.AccountID
    WHERE ${where} = ${id}`;
  const pendingOut = await db.any(makeQuery('friend.*', 'af.Pending = TRUE AND you.AccountID'));
  const pendingIn = await db.any(makeQuery('you.*', 'af.Pending = TRUE AND friend.AccountID'));
  const acceptedOut = await db.any(makeQuery('friend.*', 'af.Pending = FALSE AND you.AccountID'));
  const acceptedIn = await db.any(makeQuery('you.*', 'af.Pending = FALSE AND friend.AccountID'));
  const accepted = acceptedOut.concat(acceptedIn);
  const maxFriends = pendingOut.length + accepted.length >= 30;
  return { pendingIn, pendingOut, accepted, maxFriends };
>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95
}

app.get('/friends', requireLogin, async (req, res) => {
  const userID = req.session.user.id;
<<<<<<< HEAD
  const result = await getFriends(userID);
  res.render('pages/friends.hbs', { users: result });
=======
  const users = await getFriends(userID);
  console.log(users);
  const message = req.session.message || "";
  req.session.message = "";
  res.render('pages/friends.hbs', { users, message });
>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95
});

app.post('/friends/add', requireLogin, async (req, res) => {
  const userID = req.session.user.id;
  const atMax = (await getFriends(userID)).maxFriends;
  if (atMax) {
    res.render('pages/friends.hbs', { users: await getFriends(userID), message: "You have reached the maximum number of friends!" });
    return;
  }
  try {
<<<<<<< HEAD
    const otherUser = await db.one(`SELECT AccountID FROM Accounts WHERE Username = $1`, [req.body.username]);
    await db.none(`INSERT INTO AccountFriends (AccountID, FriendID) VALUES ($1, $2)`, [userID, otherUser.accountid]);
=======
    const otherUser = await db.one(`SELECT AccountID from Accounts WHERE Accounts.Username = '${req.body.username}'`);
    if (otherUser.accountid === userID) {
      res.render('pages/friends.hbs', { users: await getFriends(userID), message: "You cannot add yourself as a friend!" });
      return;
    }
    await db.none(`INSERT INTO AccountFriends (AccountID, FriendID) VALUES (${userID}, ${otherUser.accountid});`);
    req.session.message = `Friend request sent to ${req.body.username}`;
    res.redirect('/friends');
  } catch (c) {
    res.render('pages/friends.hbs', { users: await getFriends(userID), message: `User ${req.body.username} does not exist!` });
  }
});

app.post('/friends/accept', async (req, res) => {
  const userID = req.session.user.id;
  const friendID = req.body.id;
  const atMax = (await getFriends(userID)).maxFriends;
  if (atMax) {
    res.render('pages/friends.hbs', { users: await getFriends(userID), message: "You have reached the maximum number of friends! Delete one of your current friends to accept this request!" });
    return;
  }
  try {
    // use db.one to catch if it doesn't work
    await db.one(`UPDATE AccountFriends SET Pending = FALSE WHERE AccountID = ${friendID} AND FriendID = ${userID} RETURNING *;`);
    req.session.message = `You are now friends with ${req.body.username}`;
    res.redirect('/friends');
  } catch (c) {
    res.render('pages/friends.hbs', { users: await getFriends(userID), message: `Could not accept  ${req.body.username} does not exist!` });
  }
});

app.post('/friends/reject', async (req, res) => {
  const userID = req.session.user.id;
  const friendID = req.body.id;
  try {
    await db.one(`DELETE FROM AccountFriends WHERE AccountID = ${friendID} AND FriendID = ${userID} AND Pending = TRUE RETURNING *;`);
    req.session.message = `You rejected ${req.body.username}'s friend request`;
    res.redirect('/friends');
  } catch (c) {
    res.render('pages/friends.hbs', { users: await getFriends(userID), message: `Could not reject ${req.body.username}'s friend request!` });
  }
});

app.post('/friends/remove', async (req, res) => {
  const userID = req.session.user.id;
  const friendID = req.body.id;
  try {
    await db.one(`DELETE FROM AccountFriends WHERE (AccountID = ${userID} AND FriendID = ${friendID}) OR (AccountID = ${friendID} AND FriendID = ${userID}) AND Pending = FALSE RETURNING *;`);
    req.session.message = `You removed ${req.body.username} from your friends`;
    res.redirect('/friends');
  } catch (c) {
    res.render('pages/friends.hbs', { users: await getFriends(userID), message: `Could not un-friend ${req.body.username}!` });
  }
});

app.post('/friends/cancel', async (req, res) => {
  const userID = req.session.user.id;
  const friendID = req.body.id;
  try {
    await db.one(`DELETE FROM AccountFriends WHERE AccountID = ${userID} AND FriendID = ${friendID} RETURNING *;`);
    req.session.message = `You canceled your friend request to ${req.body.username}`;
>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95
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

<<<<<<< HEAD
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
=======
// ------------------------------
// Start Server
// ------------------------------
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}


// ------------------------------
// old goals
// ------------------------------
app.get('/lose-fat', (req, res) => {
  res.render('pages/lose-fat.hbs', {});
});

app.get('/lose-fat-gain-muscle', (req, res) => {
  res.render('pages/lose-fat-gain-muscle.hbs', {});
});

app.get('/gain-muscle-and-fat', (req, res) => {
  res.render('pages/gain-muscle-and-fat.hbs', {});
});

// ------------------------------
// History
// ------------------------------
app.post('/history', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95
  const { exerciseName, exerciseXP, timeQuant, amount } = req.body;
  const userID = req.session.user.id;

  try {
    const result = await db.one(
      `INSERT INTO Exercises (Date, ExerciseName, ExerciseXP, TimeQuant, Amount)
       VALUES (CURRENT_DATE, $1, $2, $3, $4)
       RETURNING ExerciseID`,
      [exerciseName, parseInt(exerciseXP), timeQuant === 'on', parseInt(amount)]
    );

<<<<<<< HEAD
    await db.none(`INSERT INTO UserExercises (AccountID, ExerciseID) VALUES ($1, $2)`, [userID, result.exerciseid]);
    await db.none(`UPDATE accounts SET xp = xp + $2 WHERE accountid = $1`, [userID, parseInt(exerciseXP)]);
=======
    await db.none(
      `INSERT INTO UserExercises (AccountID, ExerciseID)
             VALUES ($1, $2)`,
      [userID, result.exerciseid]
    );

    // Update the user's XP in the database
    await db.none(
      `UPDATE accounts 
        SET xp = xp + $2 
        WHERE accountid = $1`,
      [userID, parseInt(exerciseXP)]
    );
>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95

    // Fetch the updated XP from the database and update the session
    const user = await db.one(
      `SELECT xp FROM accounts WHERE accountid = $1`,
      [userID]
    );

    // Update the session with the new XP value
    req.session.user.xp = user.xp;

    res.redirect('/history');
  } catch (err) {
    console.error("Error adding exercise:", err);
    res.status(500).send("Failed to add exercise.");
  }
});
app.get('/history', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {
    const userID = req.session.user.id;

    const exercises = await db.any(
      `SELECT e.*
             FROM Exercises e
             JOIN UserExercises ue ON e.ExerciseID = ue.ExerciseID
             WHERE ue.AccountID = $1
             ORDER BY e.Date DESC`,
      [userID]
    );

    // You can now pass the user XP from the session to the view
    res.render('pages/history.hbs', { exercises, userXP: req.session.user.xp });
  } catch (err) {
    console.error("Error loading history:", err);
    res.render('pages/history.hbs', { error_message: 'Failed to load exercises.' });
  }
});

<<<<<<< HEAD
// Optional pages
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
=======
//------------------------------------------------------------------

>>>>>>> e31b167de0426219b57f3a35e8a965c229b63a95
