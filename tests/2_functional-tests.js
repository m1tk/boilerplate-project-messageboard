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
        .send({ text: "hello", delete_password: "pasw" })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            done();
        });
    });

    var del_thread_id;
    test('View the 10 most recent threads with 3 replies each: GET request to /api/threads/{board}', function(done) {
        chai.request(server)
        .get('/api/threads/general')
        .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.isArray(res.body);
            assert.isTrue(res.body.length <= 10);
            assert.isTrue(res.body[0].replies <= 3);
            del_thread_id = res.body[0]._id;
            done();
        });
    });

    test('Reporting a thread: PUT request to /api/threads/{board}', function(done) {
        chai.request(server)
        .put('/api/threads/general')
        .type('form')
        .send({ thread_id: del_thread_id })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "reported");
            done();
        });
    });
    
    test('DELETE request to /api/threads/{board} with an invalid delete_password', function(done) {
        chai.request(server)
        .delete('/api/threads/general')
        .type('form')
        .send({ thread_id: del_thread_id, delete_password: "wrong" })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "Invalid delete password");
            done();
        });
    });

    test('DELETE request to /api/threads/{board} with a valid delete_password', function(done) {
        chai.request(server)
        .delete('/api/threads/general')
        .type('form')
        .send({ thread_id: del_thread_id, delete_password: "pasw" })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");
            done();
        });
    });

    var rep_thread_id;
    test('Creating a new reply: POST request to /api/replies/{board}', function(done) {
        chai.request(server)
        .post('/api/threads/general')
        .type('form')
        .send({ text: "hello2", delete_password: "pasw" })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            chai.request(server)
            .get('/api/threads/general')
            .end(function(err, res) {
                assert.equal(res.status, 200);
                assert.isArray(res.body);
                rep_thread_id = res.body[0]._id;
                chai.request(server)
                .post('/api/replies/general')
                .type('form')
                .send({ text: "Hi there!", thread_id: rep_thread_id, delete_password: "pasw2" })
                .end(function(err, res) {
                    assert.equal(res.status, 200);
                    done();
                });
            });
        })
    });

    var rep_id;
    test('Viewing a single thread with all replies: GET request to /api/replies/{board}', function(done) {
        chai.request(server)
        .get(`/api/replies/general?thread_id=${rep_thread_id}`)
        .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.body.replies.length, 1);
            rep_id = res.body.replies[0]._id;
            done();
        });
    });

    test('DELETE request to /api/replies/{board} with an invalid delete_password', function(done) {
        chai.request(server)
        .delete('/api/replies/general')
        .type('form')
        .send({ thread_id: del_thread_id, reply_id: rep_id, delete_password: "wrong" })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "Invalid delete password");
            done();
        });
    });

    test('DELETE request to /api/replies/{board} with a valid delete_password', function(done) {
        chai.request(server)
        .delete('/api/replies/general')
        .type('form')
        .send({ thread_id: del_thread_id, reply_id: rep_id, delete_password: "pasw2" })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "success");
            done();
        });
    });

    test('Reporting a reply: PUT request to /api/replies/{board}', function(done) {
        chai.request(server)
        .put('/api/replies/general')
        .type('form')
        .send({ thread_id: del_thread_id, reply_id: rep_id })
        .end(function(err, res) {
            assert.equal(res.status, 200);
            assert.equal(res.text, "reported");
            done();
        });
    });
});
