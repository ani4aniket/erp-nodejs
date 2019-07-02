var request = require('supertest');
var expect = require('chai').expect;
var url = 'http://localhost:8089/';
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

describe('Vacation Specs', function () {
    'use strict';
    var id;

    describe('Vacation with admin', function () {

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

        it('should create vacation', function (done) {
            var body = {
                department: '55b92ace21e4b7c40f000014',
                employee  : '55b92ad221e4b7c40f00004f',
                month     : 2,
                year      : 2016,
                vacArray  : [null, 'V', 'V', 'V', null, 'V', null, 'V', 'V', 'V', null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null]
            };

            aggent
                .post('vacation')
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

                    id = body.success._id;

                    done();
                });
        });

        it('should get Years for vacation', function (done) {
            aggent
                .get('vacation/getYears')
                .expect(200)
                .end(function (err, res) {
                    var body = res.body;

                    if (err) {
                        return done(err);
                    }

                    expect(body)
                        .to.be.instanceOf(Array);
                    expect(body[0])
                        .to.have.property('_id');

                    done();
                });
        });

        it('should get For list View of vacation', function (done) {
            var body = {
                month   : 2,
                viewType: 'list',
                year    : 2016
            };

            aggent
                .get('vacation/')
                .expect(200)
                .query(body)
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

        it('should get For attendance View of vacation', function (done) {
            var body = {
                month   : 2,
                viewType: 'list',
                year    : 2016
            };

            aggent
                .get('vacation/')
                .expect(200)
                .query(body)
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

        it('should update putchModel of vacation', function (done) {
            var body = [{
                _id     : id,
                month   : 2,
                year    : 2016,
                vacArray: [null, null, null, null, null, 'V', 'V', null, 'V', null, null, null, 'P', null, null, null, 'S', null, null
                    , null, null, null, null, null, null, null, null, null, null]
            }];

            aggent
                .patch('vacation')
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

        it('should delete vacation', function (done) {
            aggent
                .delete('vacation/' + id)
                .expect(200, done);
        });
    });

    describe('Vacation with user without a license', function () {

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

        it('should fail create vacation', function (done) {
            var body = {
                department: '55b92ace21e4b7c40f000014',
                employee  : '55b92ad221e4b7c40f00004f',
                month     : 2,
                year      : 2016,
                vacArray  : ['V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V'
                    , 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V', 'V']
            };

            aggent
                .post('vacation')
                .send(body)
                .expect(403, done);
        });
    });
});