const express = require('express');
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars')
const path = require('path');;

const app = express();

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});


// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json());

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

app.get('/register', (req, res) => {
    res.render('pages/register.hbs', {});
});

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

module.exports = app;

if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}
