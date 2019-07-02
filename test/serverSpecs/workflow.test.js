var request = require('supertest');
var expect = require('chai').expect;
var url = 'http://localhost:8089/';
var host = process.env.HOST;
var aggent;
var dbId = 'vasyadb';
var admin = {
    login: 'superAdmin',
    pass : '111111',
    dbId : dbId
};
var bannedUser = {
    login: 'ArturMyhalko',
    pass : 'thinkmobiles2015',
    dbId : dbId
};


require('../../config/environment/development');

describe('Workflow Specs', function () {

    'use strict';
    var id;

    describe('Workflow with admin', function () {

        before(function (done) {
            aggent = request.agent(url);

            aggent
                .post('users/login')
                .send(admin)
                .expect(200, done);
        });

        after(function (done) {
            aggent
                .get('logout')
                .expect(302, done);
        });

        it('should create workflow', function (done) {
            var body = {
                name   : 'testWorkflow_10',
                status : 'New',
                _id    : 'testCreateWF',
                wName  : 'testCreateWF',
                visible: true
            };
            aggent
                .post('workflows')
                .send(body)
                .expect(201)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Object);
                    expect(body)
                        .to.have.property('success');
                    expect(body)
                        .to.have.property('createdModel');
                    id = body.createdModel._id;
                    done();
                });
        });

        it('should get workflow', function (done) {
            var body = {
                id: 'testCreateWF'
            };

            aggent
                .get('workflows')
                .query(body)
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Object);
                    expect(body)
                        .to.have.property('data');

                    done();
                });
        });

        it('should get relatedStatus', function (done) {
            var body = {};

            aggent
                .get('workflows/relatedStatus')
                .send(body)
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Object);
                    expect(body)
                        .to.have.property('data');

                    done();
                });
        });

        it('should get getWorkflowsForDd', function (done) {
            var body = {
                id: 'testCreateWF'
            };

            aggent
                .get('workflows/getWorkflowsForDd')
                .query(body)
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Object);
                    expect(body)
                        .to.have.property('data');

                    done();
                });
        });

        it('should get getFirstForConvert', function (done) {
            var body = {
                wId: 'testCreateWF'
            };

            aggent
                .get('workflows/getFirstForConvert')
                .query(body)
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Object);
                    expect(body)
                        .to.have.property('_id');

                    done();
                });
        });

        it('should fetch', function (done) {
            var body = {
                wId: 'testCreateWF'
            };

            aggent
                .get('workflows/fetch')
                .query(body)
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Array);

                    done();
                });
        });

        it('should update workflow', function (done) {
            var body = {
                name: 'testWorkflow_updated'
            };
            aggent
                .put('workflows/' + id)
                .send(body)
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Object);
                    expect(body)
                        .to.have.property('success');

                    done();
                });
        });

        it('should update only selected fields', function (done) {
            var body = {
                color        : '#2C3E51',
                sequenceStart: 1,
                sequence     : 2,
                wId          : id
            };

            aggent
                .patch('workflows/' + id)
                .send(body)
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Object);
                    expect(body)
                        .to.have.property('success');

                    done();
                });
        });

        it('should delete workflow', function (done) {
            aggent
                .delete('workflows/' + id)
                .expect(200, done);
        });
    });

    describe('Workflow with user without a license', function () {

        before(function (done) {
            aggent = request.agent(url);

            aggent
                .post('users/login')
                .send(bannedUser)
                .expect(200, done);
        });

        after(function (done) {
            aggent
                .get('logout')
                .expect(302, done);
        });

        it('should fail create workflow', function (done) {
            var body = {
                name   : 'testWorkflow_10',
                status : 'New',
                _id    : 'testCreateWF',
                wName  : 'testCreateWF',
                visible: true
            };
            aggent
                .post('workflows')
                .send(body)
                .expect(403, done);

        });
    });
});