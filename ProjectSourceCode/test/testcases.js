const chai = require('chai');
const chaiHttp = require('chai-http');
const app = require('../src/index'); // now importing the app, not a running server
const should = chai.should();

chai.use(chaiHttp);

let server;

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
});
