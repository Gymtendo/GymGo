const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/index'); // now importing the app, not a running server
const should = chai.should();
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bcrypt = require('bcryptjs'); //  To hash passwords

chai.use(chaiHttp);

let server;

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

describe('User Registration', () => {
    // Start the server before tests
    before((done) => {
      server = app.listen(0, () => {
          const port = server.address().port;
          console.log(`Test server running on port ${port}`);
          done();
      });
  });
  

    // Close the server after tests
    after(() => {
        server.close();
    });

    it('should register a user successfully and redirect to login', (done) => {
        const user = {
            username: "newUser",
            password: "password123",
            email: "newuser@example.com"
        };
        chai.request(server)
            .post('/register')
            .send(user)
            .end((err, res) => {
                res.should.have.status(201);
                res.body.should.have.property('message').eql('User registered successfully');
                done();
            });
    });

    it('should not register a user when the password is missing and show an error', (done) => {
        const user = {
            username: "newUser",
            email: "another@example.com"
        };
        chai.request(server)
            .post('/register')
            .send(user)
            .end((err, res) => {
                res.should.have.status(400);
                res.body.should.have.property('message').match(/All fields are required/);
                done();
            });
    });

    it('should not allow too short of a username and show an error', (done) => {
        const user = {
            username: "o",
            password: "password123",
            email: "tooshort@example.com"
        };
        chai.request(server)
            .post('/register')
            .send(user)
            .end((err, res) => {
                res.should.have.status(400);
                res.text.should.include('Username must be between 3 and 50 characters long!');
                done();
            });
    });

    it('should not allow duplicate users and show an error', (done) => {
        const user = {
            username: "duplicateUser",
            password: "password123",
            email: "duplicate@example.com"
        };
        chai.request(server)
            .post('/register')
            .send(user)
            .end((err, res) => {
                res.should.have.status(201);
                res.body.should.have.property('message').eql('User registered successfully');
                chai.request(server)
                    .post('/register')
                    .send(user)
                    .end((err, res) => {
                        res.should.have.status(500);
                        res.text.should.include(`User ${user.username} already exists!`);
                        done();
                    });
            });
    });
});

describe('Home page', () => {
    let agent;
    const testUser = {
        username: 'testuser',
        password: 'testpass123',
        email: 'testuser@example.com'
    };

    // Start the server before tests
    before(async () => {
        await db.query('TRUNCATE TABLE users CASCADE');
        const hash = await bcrypt.hash(testUser.password, 10);
        await db.query(`INSERT INTO users (username, password, email) VALUES ('${testUser.username}', '${hash}', '${testUser.email}')`);
        server = app.listen(0, () => {
            const port = server.address().port;
            console.log(`Test server running on port ${port}`);
        });
    });

    beforeEach(() => {
        agent = chai.request.agent(server);
    });

    afterEach(() => {
        agent.close();
    });

    after(async () => {
        await db.query('TRUNCATE TABLE users CASCADE');
    });

    describe('GET /', () => {
        it('should redirect to /login when not logged in', (done) => {
            agent
                .get('/')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.should.redirectTo('/login');
                    done();
                });
        });

        it('should render the home page when logged in', (done) => {
            agent
                .post('/login')
                .send({ username: testUser.username, password: testUser.password })
                .end((err, res) => {
                    res.should.have.status(200);
                    res.should.redirectTo('/');
                    agent
                        .get('/')
                        .end((err, res) => {
                            res.should.have.status(200);
                            done();
                        });
                });
        });
    });
});
