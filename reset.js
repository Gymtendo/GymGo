// This file is for resetting the database on render (UNRELATED TO APP ITSELF)
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function resetDB() {
  await client.connect();
  await client.query('DROP SCHEMA public CASCADE;');
  await client.query('CREATE SCHEMA public;');
  await client.query(require('fs').readFileSync('./src/init_data/create.sql', 'utf8'));
  await client.query(require('fs').readFileSync('./src/init_data/insert.sql', 'utf8'));
  await client.end();
  console.log('Database reset complete.');
}

resetDB().catch(console.error);
