require('dotenv').config();
// *********************************************************************************
// Import Dependencies
// *********************************************************************************
const express = require('express');
const handlebars = require('express-handlebars');
const path = require('path');
const pgp = require('pg-promise')();  // To connect to the Postgres DB from the node server
const session = require('express-session');// To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');//  To hash passwords


const app = express();

// this is for the leaderboard rank so it indexes starting at 1 rather than 0
const Handlebars = require('handlebars');
Handlebars.registerHelper('incremented', function (index) {
  index++;
  return index;
})

// *********************************************************************************
// Connect to DB
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

// ------------------------------
// Middleware
// ------------------------------
// app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
  secret: 'developmentSecret',
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false }
}));

app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.user;
  next();
});

// database configuration
const dbConfig = {
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);


// Commented out the database connection testing to bypass DB access for now.
// db.connect()
//   .then(obj => {
//     console.log('Database connection successful'); // you can view this message in the docker compose logs
//     obj.done(); // success, release the connection;
//   })
//   .catch(error => {
//     console.log('ERROR:', error.message || error);
//   });

// *********************************************************************************
// App Settings
// *********************************************************************************
// Register `hbs` as our view engine using its bound `engine()` function.
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.redirect('/login');
});

app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome to the API!' });
});

// ------------------------------
// Register
// ------------------------------
app.get('/register', (req, res) => {
  res.render('pages/register');
});
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).render('pages/register', {
      message: 'Username and password are required',
      error: true
    });
  }

  if (username.length < 3 || username.length > 50) {
    return res.status(400).render('pages/register', {
      message: 'Username must be between 3 and 50 characters',
      error: true
    });
  }

  if (password.length < 8 || password.length > 50) {
    return res.status(400).render('pages/register', {
      message: 'Password must be between 8 and 50 characters',
      error: true
    });
  }

  try {
    const existing = await db.oneOrNone('SELECT * FROM Accounts WHERE Username = $1', [username]);
    if (existing) {
      return res.status(409).render('pages/register', {
        message: 'Username already exists',
        error: true
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.none(
      `INSERT INTO Accounts (Username, Password, xp, CurDate, Quest1, Quest2, Quest3)
         VALUES ($1, $2, 0, CURRENT_DATE, 1, 0, 0)`,
      [username, hashedPassword]
    );

    res.redirect('/login');
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).render('pages/register', {
      message: 'Internal server error',
      error: true
    });
  }
});


// ------------------------------
// Login
// ------------------------------
app.get('/login', (req, res) => {
  res.render('pages/login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(401).render('pages/login', {
      message: 'Username and password are required',
      error: true
    });
  }

  try {
    const user = await db.oneOrNone('SELECT * FROM Accounts WHERE Username = $1', [username]);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).render('pages/login', {
        message: 'Invalid username or password',
        error: true
      });
    }

    req.session.user = {
      id: user.accountid,
      username: user.username,
      email: user.email || '',
      xp: user.xp
    };

    if (req.session.desiredPath) {
      const desiredPath = req.session.desiredPath;
      delete req.session.desiredPath;
      return res.redirect(desiredPath);
    }
    res.redirect('/home');
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).render('pages/login', {
      message: 'Something went wrong. Try again.',
      error: true
    });
  }
});

// ------------------------------
// Home
// ------------------------------
// TODO: Combine /home and /profile (same thing) and get xp from db instead of saving in session since xp may update
app.get('/home', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  res.render('pages/home', {
    username: req.session.user.username,
    email: req.session.user.email,
    xp: req.session.user.xp
  });
});

// ------------------------------
// Profile
// ------------------------------
app.get('/profile', (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  res.render('pages/home', {
    username: req.session.user.username,
    email: req.session.user.email,
    xp: req.session.user.xp
  });
});

// ------------------------------
// Logout 
// ------------------------------
app.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Logout error:", err);
      return res.render('pages/logout', { error_message: "Error logging out. Please try again." });
    }
    res.render('pages/logout', { success_message: "Logged out successfully!" });
  });
});

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

app.get('/leaderboard', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    // Pull all accounts ordered by xp descending
    const users = await db.any(
      `SELECT accountID AS id,
          username,
          xp
        FROM accounts
        ORDER BY xp DESC`
    );
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
  const makeQuery = (what, where) => `SELECT ${what} FROM AccountFriends af
    INNER JOIN Accounts you ON af.AccountID = you.AccountID
    INNER JOIN Accounts friend ON af.FriendID = friend.AccountID
    WHERE ${where} = ${id}`;
  const pendingOut = await db.any(makeQuery('friend.*', 'af.Pending = TRUE AND you.AccountID'));
  const pendingIn = await db.any(makeQuery('you.*', 'af.Pending = TRUE AND friend.AccountID'));
  const acceptedOut = await db.any(makeQuery('friend.*', 'af.Pending = FALSE AND you.AccountID'));
  const acceptedIn = await db.any(makeQuery('you.*', 'af.Pending = FALSE AND friend.AccountID'));
  const accepted = acceptedOut.concat(acceptedIn);
  const maxFriends = pendingOut.length + accepted.length >= 1;
  return {pendingIn, pendingOut, accepted, maxFriends};
}

app.get('/friends', async (req, res) => {
  const userID = req.session.user.id;
  const users = await getFriends(userID);
  console.log(users);
  const message = req.session.message || "";
  req.session.message = "";
  res.render('pages/friends.hbs', { users, message });
});

app.post('/friends/add', async (req, res) => {
  const userID = req.session.user.id;
  const atMax = (await getFriends(userID)).maxFriends;
  if (atMax) {
    res.render('pages/friends.hbs', { users: await getFriends(userID), message: "You have reached the maximum number of friends!" });
    return;
  }
  try {
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
    res.redirect('/friends');
  } catch (c) {
    res.render('pages/friends.hbs', { users: await getFriends(userID), message: `User ${req.body.username} does not exist!` });
  }
});

// ------------------------------
// Boss Page
// ------------------------------
app.get('/boss', async (req, res) => {
  try {
    // Hard coded for testing:
    // const boss = {
    //   Name: 'Gains Goblin',
    //   HP: 300,
    //   MaxHP: 500,
    //   Pic: null,
    //   RewardXP: 100,
    //   Deadline: '2025-04-18'
    // };

    // Finds most recent boss to display (assuming the newest boss is the current one)
    const idQuery = `SELECT BossID 
                     FROM Boss 
                     ORDER BY BossID 
                     DESC LIMIT 1;`;

    const id = await db.one(idQuery);
    // console.log(id);

    // Queries and returns all info related to the current boss
    const bossQuery = `SELECT BossID, Name, HP, MaxHP, Pic, RewardXP, Deadline 
                       FROM Boss WHERE BossID = $1;`;

    const boss = await db.oneOrNone(bossQuery, [id.bossid]);
    // console.log(boss);
    if (!boss) {
      throw new Error("Boss Not Found!");
    }

    // Date formatter
    const formattedDeadline = new Date(boss.deadline).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    res.render('pages/boss', {
      BossName: boss.name,
      HP: boss.hp,
      MaxHP: boss.maxhp,
      Reward: boss.rewardxp,
      Deadline: formattedDeadline
    });

  } catch (error) {
    if (error instanceof pgp.errors.QueryResultError) {
      res.status(500).render('pages/boss', {
        message: "Database error. Please try again later.",
        error: true
      });
    }
    else if (error.message == "Boss Not Found!") {
      res.status(404).render('pages/boss', {
        message: "Error querying for boss. Please try again later.",
        error: true
      });
    }
    else {
      res.status(500).render('pages/boss', {
        message: "Unexpected error.",
        error: true
      });
    }
  }
});

// ------------------------------
// Quests Page
// ------------------------------
app.get('/quests', async (req, res) => {
  try {

    const id = req.session.user.id;
    console.log(id);
    let message = "Quests NOT Reset!";

    // Queries the last user visit to /quests and resets all quest progress if a day has passed 
    const dateQuery = `SELECT CurDate
                       FROM Accounts WHERE AccountID = $1;`;

    const date = await db.oneOrNone(dateQuery, [id]);
    console.log(date);
    if (!date) {
      throw new Error("Date Not Found");
    }

    const lastLoggedDate = date.curdate.toISOString().slice(0, 10);
    const todaysDate = new Date().toISOString().slice(0, 10);

    // Quest1 will be set to 1 since the user must have logged in today to see this page
    if (lastLoggedDate !== todaysDate) {
      const resetQuery = `UPDATE Accounts 
                          SET CurDate = $1,
                          Quest1 = 1,
                          Quest2 = 0,
                          Quest3 = 0
                          WHERE AccountID = $2;`;

      await db.none(resetQuery, [todaysDate, id]);
      message = "Quests Reset!";
    }

    // Queries the current (or reset) quest progress of the logged in user 
    const questQuery = `SELECT Quest1, Quest2, Quest3 
                        FROM Accounts WHERE AccountID = $1;`;

    const questProgress = await db.oneOrNone(questQuery, [id]);
    if (!questProgress) {
      throw new Error("Quest Progress Not Found");
    }

    // If any of the quests are achieved, add the corresponding reward xp to the account
    let questXP = 0;
    let questComplete = false;

    // Using == here so that if the user achieved more than the quest, they won't be awarded multiple times
    if (questProgress.quest1 == 1) {
      questXP += 20;
      questComplete = true;
    }
    if (questProgress.quest2 == 2) {
      questXP += 80;
      questComplete = true;
    }
    if (questProgress.quest1 == 160) {
      questXP += 120;
      questComplete = true;
    }

    if (questComplete) {
      const XPQuery = `SELECT xp
                       FROM Accounts WHERE AccountID = $1;`;

      const xp = await db.oneOrNone(XPQuery, [id]);
      if (!xp) {
        throw new Error("XP Not Found");
      }

      questXP += xp.xp;

      const addXPQuery = `UPDATE Accounts 
                       SET xp = $1
                       WHERE AccountID = $2;`;

      await db.none(addXPQuery, [questXP, id]);
    }

    res.render('pages/quests', {
      message: message,
      error: false,
      Quest1: questProgress.quest1,
      Quest2: questProgress.quest2,
      Quest3: questProgress.quest3
    });

  } catch (error) {
    if (error instanceof pgp.errors.QueryResultError) {
      res.status(500).render('pages/quests', {
        message: "Database error. Please try again later.",
        error: true
      });
    }
    else if (error.message) {
      res.status(404).render('pages/quests', {
        message: error.message + ". Please try again later.",
        error: true
      });
    }
    else {
      res.status(500).render('pages/quests', {
        message: "Unexpected error.",
        error: true
      });
    }
  }
});

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

app.get('/lose-fat', (req, res) => {
  res.render('pages/lose-fat.hbs', {});
});

app.get('/lose-fat-gain-muscle', (req, res) => {
  res.render('pages/lose-fat-gain-muscle.hbs', {});
});

app.get('/gain-muscle-and-fat', (req, res) => {
  res.render('pages/gain-muscle-and-fat.hbs', {});
});

// app.get('/history', (req, res) => {
//     res.render('pages/history.hbs', {});
// });

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

    res.render('pages/history.hbs', { exercises });
  } catch (err) {
    console.error("Error loading history:", err);
    res.render('pages/history.hbs', { error_message: 'Failed to load exercises.' });
  }
});

app.post('/history', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  const { exerciseName, exerciseXP, timeQuant, amount } = req.body;
  const userID = req.session.user.id;

  try {
    const result = await db.one(
      `INSERT INTO Exercises (Date, ExerciseName, ExerciseXP, TimeQuant, Amount)
             VALUES (CURRENT_DATE, $1, $2, $3, $4)
             RETURNING ExerciseID`,
      [exerciseName, parseInt(exerciseXP), timeQuant === 'on', parseInt(amount)]
    );

    await db.none(
      `INSERT INTO UserExercises (AccountID, ExerciseID)
             VALUES ($1, $2)`,
      [userID, result.exerciseid]
    );

    await db.none(
      `UPDATE accounts 
        SET xp = xp + $2 
        WHERE accountid = $1`,
      [userID, parseInt(exerciseXP)]
    );

    res.redirect('/history');
  } catch (err) {
    console.error("Error adding exercise:", err);
    res.status(500).send("Failed to add exercise.");
  }
});

//------------------------------------------------------------------
