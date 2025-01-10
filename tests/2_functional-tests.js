const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');

chai.use(chaiHttp);

suite('Functional Tests', function() {
    test('Creating a new thread: POST request to /api/threads/{board}', function(done) {
        chai.request(server)
        .post('/api/threads/general')
        .type('form')
        .send({ text: "hello", delete_password: "hello" })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            done();
        });
    });
});
