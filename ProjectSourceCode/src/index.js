app.get('/welcome', (req, res) => {
    res.json({ status: 'success', message: 'Welcome!' });
});

module.exports = app.listen(3000, () => {
    console.log('Server is running on port 3000');
});