const express = require('express');
const session = require('express-session');
const path = require('path');
const { engine } = require('express-handlebars');

const app = express();

app.engine('hbs', engine({ extname: 'hbs', defaultLayout: false }));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(session({
    secret: 'mysecret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: false }
}));

app.use((req, res, next) => {
    res.locals.loggedIn = req.session.loggedIn || false;
    next();
});

let users = [];

// 🔹 GET /login route added here
app.get('/login', (req, res) => {
    res.render('pages/login');
});

// Welcome route
app.get('/welcome', (req, res) => {
    res.json({ status: 'success', message: 'Welcome to the API!' });
});

// Register route
app.post('/register', (req, res) => {
    const { username, password, email } = req.body;
    if (!username || !password || !email) {
        return res.status(400).send({ message: 'All fields are required' });
    }
    const userExists = users.some(user => user.email === email);
    if (userExists) {
        return res.status(409).send({ message: 'User already exists' });
    }
    const newUser = { username, password, email };
    users.push(newUser);
    return res.status(201).send({ message: 'User registered successfully', user: newUser });
});

// Login POST handler
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(user => user.email === email && user.password === password);
    if (user) {
        req.session.loggedIn = true;
        req.session.username = user.username;
        req.session.email = user.email;
        res.redirect('/profile');
    } else {
        // Re-render login page with error
        return res.status(401).render('pages/login', { error: "Invalid credentials" });
    }
});

// Profile page
app.get('/profile', (req, res) => {
    if (!req.session.loggedIn) {
        return res.status(401).send({ message: 'Please log in first' });
    }
    res.status(200).send({
        message: 'Profile information',
        user: { username: req.session.username, email: req.session.email }
    });
});

// Logout handler
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.render('pages/logout', { error_message: "Error logging out. Please try again." });
        }
        res.render('pages/logout', { success_message: "Logged out successfully!" });
    });
});

// Optional test route
app.get('/test', (req, res) => {
    res.render('pages/logout', { success_message: 'Test page!' });
});

// Export and launch
module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
        console.log("Running index.js from:", __dirname);
    });
}
