// server.js
require('dotenv').config(); // This loads the real .env

const app = require('./src/index');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
