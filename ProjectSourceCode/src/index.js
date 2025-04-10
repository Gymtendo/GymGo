const express = require('express');
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars')
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords

const app = express();

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
    host: 'db', // the database server
    port: 5432, // the database port
    database: process.env.POSTGRES_DB, // the database name
    user: process.env.POSTGRES_USER, // the user account to connect with
    password: process.env.POSTGRES_PASSWORD, // the password of the user account
  };
  
  const db = pgp(dbConfig);
  
  // test your database
  db.connect()
    .then(obj => {
      console.log('Database connection successful'); // you can view this message in the docker compose logs
      obj.done(); // success, release the connection;
    })
    .catch(error => {
      console.log('ERROR:', error.message || error);
    });


// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        saveUninitialized: false,
        resave: false,
    })
);

app.use(
    bodyParser.urlencoded({
        extended: true
    })
);

let users = [];

app.get('/welcome', (req, res) => {
    res.json({ status: 'success', message: 'Welcome to the API!' });
});

app.get('/', (req, res) => {
    res.redirect('/login');
});

app.get('/login', (req, res) => {
    res.render('pages/login.hbs', {});
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(401).render('pages/login.hbs', {message: 'Username and password are required!', error: true});
    }
    const query = `SELECT * FROM users WHERE username = '${username}'`;
    db.one(query)
        .then(async (user) => {
            const isValidPassword = await bcrypt.compare(password, user.password);
            if (!isValidPassword) {
                return res.status(401).render('pages/login.hbs', {message: 'Invalid username or password!', error: true});
            }
            req.session.user = user;
            res.redirect('/home');
        })
        .catch(() => res.status(401).render('pages/login.hbs', {message: 'Invalid username or password!', error: true}));
});

app.get('/register', (req, res) => {
    res.render('pages/register.hbs', {});
});

app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    if (!username || !password || !email) {
        return res.status(400).send({ message: 'All fields are required' });
    }
    if (username.length < 3 || username.length > 50) {
        return res.status(400).render('pages/register.hbs', {message: 'Username must be between 3 and 50 characters long!', error: true});
    }
    if (password.length < 8 || password.length > 50) {
        return res.status(400).render('pages/register.hbs', {message: 'Password must be between 8 and 50 characters long!', error: true});
    }
    if (!email.includes('@')) {
        return res.status(400).render('pages/register.hbs', {message: 'Email must be valid!', error: true});
    }
    const hash = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (username, password, email) VALUES ('${username}', '${hash}', '${email}')`;
    db.none(query)
        //.then(() => res.status(201).redirect('/login'))
        .then(() => res.status(201).send({ message: 'User registered successfully', user: username }))
        .catch(() => res.status(500).render('pages/register.hbs', {message: `User ${req.body.username} already exists!`, error: true}));

    /*

    const userExists = users.some(user => user.email === email);
    if (userExists) {
        return res.status(409).send({ message: 'User already exists' });
    }

    const newUser = { username, password, email };
    users.push(newUser);
    return res.status(201).send({ message: 'User registered successfully', user: newUser });*/
});

const auth = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// 🔹 Profile route
app.get('/profile', (req, res) => {
    if (!req.session.loggedIn) {
        return res.status(401).send({ message: 'Please log in first' });
    }
    res.status(200).send({
        message: 'Profile information',
        user: { username: req.session.username, email: req.session.email }
    });
});

// 🔹 Logout route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.render('pages/logout', { error_message: "Error logging out. Please try again." });
        }
        res.render('pages/logout', { success_message: "Logged out successfully!" });
    });
});

// 🔹 Test route to check rendering
app.get('/test', (req, res) => {
    res.render('pages/logout', { success_message: 'Test page!' });
});

// 🔹 Export app or run it
module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
