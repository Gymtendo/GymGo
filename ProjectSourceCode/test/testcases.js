process.env.NODE_ENV = 'test';
require('dotenv').config({ path: './.env.test' });

const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/index');
const pgp = require('pg-promise')();
const bcrypt = require('bcryptjs');
const expect = chai.expect;

chai.use(chaiHttp);
// ---------------------
// Database Configuration
// ---------------------
const dbConfig = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

let server;

describe('User Registration and Home Route', () => {
  const testUser = {
    username: `testuser_${Date.now()}`,
    password: 'testpassword123'
  };

  // Clean up before and after to avoid duplicates
  before(async () => {
    await db.none('DELETE FROM accounts WHERE username = $1', [testUser.username]);
  });

  after(async () => {
    await db.none('DELETE FROM accounts WHERE username = $1', [testUser.username]);
  });

  before((done) => {
    server = app.listen(0, () => {
      console.log('Test server started');
      done();
    });
  });

  after((done) => {
    server.close(() => {
      console.log('Test server stopped');
      done();
    });
  });

  // -------------------------
  // 1. Successful Registration
  // -------------------------
  it('should register a new user successfully and redirect to login', (done) => {
    chai.request(server)
      .post('/register')
      .type('form')
      .redirects(0) 
      .send(testUser)
      .end((err, res) => {
        expect(res).to.have.status(302);
        expect(res).to.redirectTo(/\/login$/);
        done();
      });
  });

  // ---------------------------------
  // 2. Missing Password Should Fail
  // ---------------------------------
  it('should not register without a password and show an error', (done) => {
    chai.request(server)
      .post('/register')
      .type('form')
      .send({ username: 'incompleteUser' })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.text).to.include('Username and password are required');
        done();
      });
  });

  // ------------------------------------
  // 3. Username Too Short Should Fail
  // ------------------------------------
  it('should reject a username that is too short', (done) => {
    chai.request(server)
      .post('/register')
      .type('form')
      .send({ username: 'x', password: 'longenoughpass' })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.text).to.include('Username must be between 3 and 50 characters');
        done();
      });
  });

  // -------------------------------------------
  // 4. Duplicate Username Should Show Conflict
  // -------------------------------------------
  it('should not allow duplicate usernames', (done) => {
    chai.request(server)
      .post('/register')
      .type('form')
      .send(testUser) // same as earlier
      .end((err, res) => {
        expect(res).to.have.status(409);
        expect(res.text).to.include('Username already exists');
        done();
      });
  });

  // -----------------------------------------
  // 5. Redirect to Login When Not Logged In
  // -----------------------------------------
  it('should redirect to /login when visiting "/" and not logged in', (done) => {
    chai.request(server)
      .get('/')
      .end((err, res) => {
        expect(res).to.redirect;
        expect(res.redirects[0]).to.include('/login');
        done();
      });
  });
});
