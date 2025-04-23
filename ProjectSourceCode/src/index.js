require('dotenv').config();
// ------------------------------
// Import Dependencies
// ------------------------------
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
//const hbs = require('hbs');

Handlebars.registerHelper('eq', function (a, b) {
  return a === b;
});


// ------------------------------
// Setting up Handlebars js
// ------------------------------
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
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: false }
}));

app.use((req, res, next) => {
  res.locals.loggedIn = !!req.session.user;
  next();
});

// ------------------------------
// Database Configuration
// ------------------------------
const dbConfig = {
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
};

const db = pgp(dbConfig);

// Expose data to handlebars views if logged in
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

// ------------------------------
// App Settings
// ------------------------------
// Register `hbs` as our view engine using its bound `engine()` function.
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.redirect('/login');
});

app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome to the API!' });
});



// ------------------------------
// (TEST ROUTE) adds xp to profile and it updates
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

// Fixes error of browser trying to load /favicon.ico
app.get('/favicon.ico', (req, res) => res.status(204).end());

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

    // Quest1 starts at 1 at registration since they will earn the quest xp as soon as they log in
    await db.none(
      `INSERT INTO Accounts (Username, Password, xp, CurDate, Quest1, Quest2, Quest3)
         VALUES ($1, $2, 0, CURRENT_DATE, 1, 0, 0)`,
      [username, hashedPassword]
    );

    req.session.message = "Registration successful! Please log in.";
    req.session.error = false;
    res.status(201).redirect('/login');
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
  const error = req.session.error;
  const message = req.session.message;

  req.session.error = null;
  req.session.message = null;

  res.render('pages/login', {
    message: message,
    error: error
  });
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
app.get('/home', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');

  try {

    const id = req.session.user.id
    const XPQuery = `SELECT xp
                     FROM Accounts WHERE AccountID = $1;`;

    const xp = await db.oneOrNone(XPQuery, [id]);
    if (!xp) {
      throw new Error("XP Not Found");
    }

    res.render('pages/home', {
      username: req.session.user.username,
      xp: xp.xp
  });

  } catch (error) {
    if (error.message) {
      res.status(404).render('pages/home', {
        message: error.message + ". Please try again later.",
        error: true
      });
    }
    else {
      res.status(500).render('pages/home', {
        message: "Unexpected error.",
        error: true
      });
    }
  }
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

// ------------------------------
// Session Authentication (all routes below require the user to be logged in )
// ------------------------------
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
  const maxFriends = pendingOut.length + accepted.length >= 30;
  return { pendingIn, pendingOut, accepted, maxFriends };
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
    // Finds most recent boss to display (assuming the newest boss is the current one)
    const idQuery = `SELECT BossID 
                     FROM Boss 
                     ORDER BY BossID 
                     DESC LIMIT 1;`;

    const id = await db.one(idQuery);
    // console.log(id);

    // Queries and returns all info related to the current boss
    const bossQuery = `SELECT BossID, Name, HP, MaxHP, Pic, RewardXP, Completion, Deadline 
                       FROM Boss WHERE BossID = $1;`;

    const boss = await db.oneOrNone(bossQuery, [id.bossid]);
    // console.log(boss);
    if (!boss) {
      throw new Error("Boss Not Found!");
    }

    // If the deadline has passed
    let defeated = false;
    let expired = false;

    const todaysDate = new Date();
    if (todaysDate > boss.deadline) {
      expired = true;

      // If boss is defeated before deadline, reward xp to all users, update boss completion status, and pass defeated status to boss.hbs
      if (boss.hp <= 0 && !boss.completion) {
        expired = false;
        defeated = true;

        const rewardQuery = `UPDATE Accounts 
                             SET xp = xp + $1;`;

        await db.none(rewardQuery, [boss.rewardxp]);
      }

      const defeatQuery = `UPDATE Boss 
                           SET Completion = TRUE
                           WHERE BossID = $1;`;

      await db.none(defeatQuery, [id]);
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
      BossImage: boss.pic,
      Reward: boss.rewardxp,
      defeated,
      Deadline: formattedDeadline,
      expired
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
// ALL users will need to visit the /quests page to get xp, even if they meet the requirements for a quest
app.get('/quests', async (req, res) => {
  try {

    const id = req.session.user.id;
    // console.log(id);
    // let message = "Quests NOT Reset!";

    // Queries the last user visit to /quests and resets all quest progress if a day has passed 
    const dateQuery = `SELECT CurDate
                       FROM Accounts WHERE AccountID = $1;`;

    const date = await db.oneOrNone(dateQuery, [id]);
    // console.log(date);
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
                          Quest3 = 0,
                          Q1Complete = FALSE,
                          Q2Complete = FALSE,
                          Q3Complete = FALSE
                          WHERE AccountID = $2;`;

      await db.none(resetQuery, [todaysDate, id]);
      // message = "Quests Reset!";
    }

    // Queries the current (or reset) quest progress of the logged in user 
    const questQuery = `SELECT Quest1, Quest2, Quest3,
                        Q1Complete, Q2Complete, Q3Complete
                        FROM Accounts WHERE AccountID = $1;`;

    const questProgress = await db.oneOrNone(questQuery, [id]);
    if (!questProgress) {
      throw new Error("Quest Progress Not Found");
    }

    // If any of the quests are achieved, add the corresponding reward xp to the account
    let questXP = 0;
    let q1Complete = false, q2Complete = false, q3Complete = false;


    // Awards quest xp if the quest hasn't been completed already
    if (questProgress.quest1 == 1 && !questProgress.q1complete) {
      questXP += 20;
      q1Complete = true;
    }
    if (questProgress.quest2 >= 2 && !questProgress.q2complete) {
      questXP += 80;
      q2Complete = true;
    }
    if (questProgress.quest3 >= 160 && !questProgress.q3complete) {
      questXP += 120;
      q3Complete = true;
    }
    
    // console.log(q1Complete)
    // console.log(q2Complete)
    // console.log(q3Complete)
    // console.log(questXP)
    if (q1Complete || q2Complete || q3Complete) {
      const addXPQuery = `UPDATE Accounts 
                          SET xp = xp + $1,
                          Q1Complete = Q1Complete OR $2,
                          Q2Complete = Q2Complete OR $3,
                          Q3Complete = Q3Complete OR $4
                          WHERE AccountID = $5;`;

      await db.none(addXPQuery, [questXP, q1Complete, q2Complete, q3Complete, id]);

      // Update the session with the new XP value
      req.session.user.xp += questXP;

      // Subtract the earned xp from the boss hp
      const bossIDQuery = `SELECT BossID 
                           FROM Boss 
                           ORDER BY BossID 
                           DESC LIMIT 1;`;

      const bossID = await db.one(bossIDQuery);

      const bossQuery = `UPDATE Boss 
                         SET HP = HP - $1
                         WHERE BossID = $2;`;

      await db.none(bossQuery, [questXP, bossID.bossid]);
    }

    res.render('pages/quests', {
      userXP: req.session.user.xp,
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

    // Update the user's XP in the database
    await db.none(
      `UPDATE accounts 
        SET xp = xp + $2,
        Quest2 = Quest2 + 1,
        Quest3 = Quest3 + $2
        WHERE accountid = $1`,
      [userID, parseInt(exerciseXP)]
    );

    // Fetch the updated XP from the database and update the session
    const user = await db.one(
      `SELECT xp FROM accounts WHERE accountid = $1`,
      [userID]
    );

    // Update the session with the new XP value
    req.session.user.xp = user.xp;

    // Subtract the earned xp from the boss hp
    const bossIDQuery = `SELECT BossID 
                         FROM Boss 
                         ORDER BY BossID 
                         DESC LIMIT 1;`;

    const bossID = await db.one(bossIDQuery);

    const bossQuery = `UPDATE Boss 
                       SET HP = HP - $1
                       WHERE BossID = $2;`;

    await db.none(bossQuery, [parseInt(exerciseXP), bossID.bossid]);

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

//------------------------------------------------------------------

