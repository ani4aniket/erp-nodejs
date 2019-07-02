var request = require('supertest');
var expect = require('chai').expect;
var url = 'http://localhost:8089/';
var host = process.env.HOST;
var aggent;

require('../../config/environment/development');

describe('Application Specs', function () {
    'use strict';
    var id;

    describe('Application with admin', function () {
        before(function (done) {
            aggent = request.agent(url);

            aggent
                .post('users/login')
                .send({
                    login: 'superAdmin',
                    pass : '111111',
                    dbId : 'vasyadb'
                })
                .expect(200, done);
        });

        after(function (done) {
            aggent
                .get('logout')
                .expect(302, done);
        });

        it('should create application', function (done) {
            var body = {
                name: {
                    first: 'test',
                    last : 'test'
                },

                dateBirth: '28 Dec, 1990'
            };

            aggent
                .post('applications')
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
                        .to.have.property('result');
                    expect(body)
                        .to.have.property('id');
                    expect(body.result)
                        .to.have.property('_id');
                    expect(body.result)
                        .to.have.property('marital')
                        .and.to.be.oneOf(['married', 'unmarried']);
                    expect(body.result)
                        .to.have.property('gender')
                        .and.to.be.oneOf(['male', 'female']);
                    expect(body.result)
                        .to.have.property('name');
                    expect(body.result)
                        .to.have.property('dateBirth');

                    id = body.id;

                    done();
                });
        });

        it('should getById application', function (done) {
            var query = {
                id: id
            };
            aggent
                .get('applications/')
                .query(query)
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

        it('should get by viewType list application', function (done) {
            var query = {
                viewType   : 'list',
                contentType: 'Applications'
            };
            aggent
                .get('applications/')
                .query(query)
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;
                    var application;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Object);
                    expect(body)
                        .to.have.property('data');
                    expect(body)
                        .to.have.property('total');

                    application = body.data[0];

                    expect(application)
                        .to.exist;
                    /* expect(application)
                     .to.have.property('department')
                     .and.to.have.property('_id');*/
                    /* expect(application)
                     .to.have.property('department')
                     .and.to.have.property('name')
                     .and.to.be.a('string');*/
                    /* expect(application)
                     .to.have.property('jobPosition')
                     .and.to.have.property('_id');
                     expect(application)
                     .to.have.property('jobPosition')
                     .and.to.have.property('name')
                     .and.to.be.a('string');*/
                    expect(application)
                        .to.have.property('name')
                        .and.to.have.property('last')
                        .and.to.be.a('string');
                    expect(application)
                        .to.have.property('name')
                        .and.to.have.property('first')
                        .and.to.be.a('string');
                    expect(application)
                        .to.have.property('isEmployee')
                        .and.to.be.false;

                    done();
                });
        });

        it('should get by viewType kanban application', function (done) {
            var query = {
                workflowId: '528ce5e3f3f67bc40b000018',
                viewType  : 'kanban'
            };
            aggent
                .get('applications/')
                .query(query)
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
                    expect(body)
                        .to.have.property('time');
                    expect(body)
                        .to.have.property('workflowId');

                    done();
                });
        });

        it('should get applications length by workflows', function (done) {
            aggent
                .get('applications/getApplicationsLengthByWorkflows')
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Object);
                    expect(body)
                        .to.have.property('showMore');
                    expect(body)
                        .to.have.property('arrayOfObjects')
                        .and.to.be.instanceOf(Array);

                    done();
                });
        });

        it('should update application', function (done) {
            var body = {
                social: {
                    LI: 'test'
                }
            };
            aggent
                .patch('applications/' + id)
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
                        .to.have.property('n')
                        .and.equal(1);

                    done();
                });
        });

        it('should delete application', function (done) {
            aggent
                .delete('applications/' + id)
                .expect(200, done);
        });

    });

    describe('Application with user without a license', function () {
        before(function (done) {
            aggent = request.agent(url);

            aggent
                .post('users/login')
                .send({
                    login: 'ArturMyhalko',
                    pass : 'thinkmobiles2015',
                    dbId : 'vasyadb'
                })
                .expect(200, done);
        });

        after(function (done) {
            aggent
                .get('logout')
                .expect(302, done);
        });

        it('should fail create application', function (done) {
            var body = {
                name     : {
                    first: 'test',
                    last : 'test'
                },
                dateBirth: '28 Dec, 1990'
            };

            aggent
                .post('applications')
                .send(body)
                .expect(403, done);
        });
    });
});