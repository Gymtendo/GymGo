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

// ------------------------------
// Middleware
// ------------------------------
app.use(express.static(path.join(__dirname, 'public')));
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
         VALUES ($1, $2, 0, CURRENT_DATE, 0, 0, 0)`,
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

// ------------------------------
// Leaderboard
// ------------------------------
app.get('/leaderboard', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    try {
      // Pull all accounts ordered by xp descending
      const users = await db.any(
        `SELECT "AccountID" AS id,
                "Username"  AS username,
                xp
         FROM "Accounts"
         ORDER BY xp DESC`
      );
      res.render('pages/leaderboard', {
        title: 'Leaderboard',
        users,
        login: res.locals.loggedIn
      });
    } catch (err) {
      console.error('Leaderboard error:', err);
      res.status(500).render('pages/error', {
        message: 'Unable to load leaderboard',
        error: err
      });
    }
  });  


async function getFriends(id) {
    const query = `SELECT friend.* FROM AccountFriends af
    INNER JOIN Accounts you ON af.AccountID = you.AccountID
    INNER JOIN Accounts friend ON af.FriendID = friend.AccountID
    WHERE you.AccountID = ${id}`;
    return await db.any(query); 
}

app.get('/friends', async(req, res) => {
    const userID = req.session.user.id;

   const result = await getFriends(userID);
    console.log(result);
    res.render('pages/friends.hbs', {users: result}); 
});

app.post('/friends/add', async(req, res) => {
    const userID = req.session.user.id;
    try {
        const otherUser = await db.one(`SELECT AccountID from Accounts WHERE Accounts.Username = '${req.body.username}'`);
        await db.none(`INSERT INTO AccountFriends (AccountID, FriendID) VALUES (${userID}, ${otherUser.accountid});`);
        res.redirect('/friends');
    } catch (c) {
        res.render('pages/friends.hbs', {users: await getFriends(userID), message: `User ${req.body.username} does not exist!`});
    }
});

// ------------------------------
// Boss Page (optional)
// ------------------------------
// // Finds most recent boss to display (assuming the newest boss is the current one)
        // const idQuery = `SELECT BossID 
        //                  FROM Boss 
        //                  ORDER BY BossID 
        //                  DESC LIMIT 1;`;
        
        // const id = await db.one(idQuery);

        // // Queries and returns all info related to the current boss
        // const bossQuery = `SELECT BossID, Name, HP, MaxHP, Pic, RewardXP, Deadline 
        //                    FROM Boss WHERE BossID = $1;`;
        
        // let results = await db.query(bossQuery, [id]);
        // if (boss.length == 0) {
        //     throw new Error("Boss Not Found!");
        // }
        // const boss = results[0];

        // Hard coded for testing:
app.get('/boss', (req, res) => {
  const boss = {
    Name: 'Gains Goblin',
    HP: 300,
    MaxHP: 500,
    Pic: null,
    RewardXP: 100,
    Deadline: '2025-04-18'
  };

  res.render('pages/boss', {
    BossName: boss.Name,
    HP: boss.HP,
    MaxHP: boss.MaxHP,
    Reward: boss.RewardXP,
    Deadline: boss.Deadline
  });
});

// ------------------------------
// Start Server
// ------------------------------
module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}
