const express = require('express');
const app = express();

app.use(express.json());

let users = [];

app.get('/welcome', (req, res) => {
    res.json({ status: 'success', message: 'Welcome to the API!' });
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
