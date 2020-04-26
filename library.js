const pino = require('pino')({ level: 'info' });
const request = require('superagent');
const User = require.main.require('./src/user/');
const async = module.parent.require('async');
const authenticationController = require.main.require('./src/controllers/authentication');
const groups = require.main.require('./src/groups');
const config = require('./config');

exports.getStrategy = function (strategies, callback) {
    pino.info({ method: 'getStrategy', input: strategies, output: callback, type: 'start' });
    strategies && strategies.push({
        name: 'buc',
        url: config.loginUrl,
        callbackURL: '/',
        icon: config.loginIcon,
        scope: 'user:email',
    });
    callback && callback(null, strategies);
};

exports.load = function (params, callback) {
    pino.info({ method: 'load', input: params, type: 'start' });

    params.router && params.router.use(function autoLogin(req, res, next) {
        if (req.uid) { // already login, passed
            return next();
        }
        getUserUid(req.headers, function (error, uid) {
            if (error) {
                return next();
            }
            //this will cover some errors
            if (!req.session) {
                req.session = {};
            }
            // login as uid
            authenticationController.doLogin(req, uid, (error) => {
                if (error) { // login failed, continue login
                    return next(error);
                }
                res.redirect('/'); // login success, redirect to homepage
            });
        });
    });

    callback && callback();
};

function doGetUserFromRemote(headers, callback) {
    const cookie = headers.cookie || '';
    pino.info({ method: 'doGetUserFromRemote', input: cookie, type: 'start' });

    if (!cookie || (config.cookiePrefix && !config.cookiePrefix.test(cookie))) {
        return callback && callback(new Error('no cookie'));
    }

    request
        .get(config.authUrl)
        .set('Cookie', cookie)
        .end((error, res) => {
            res = res && res.text;
            pino.info({ method: 'get ' + config.authUrl, input: cookie, output: res, type: 'end' });

            let result;
            try {
                result = JSON.parse(res);
            } catch (error) {}

            if (error || !result) {
                result = error || res;
                pino.error({ method: 'doGetUserFromRemote', input: headers.cookie, error: result, type: 'end' });
                return callback && callback(new Error('not login'));
            }

            pino.info({ method: 'doGetUserFromRemote', input: headers.cookie, output: result, type: 'end' });
            callback && callback(null, result);
        });
}

function getUserUid(headers, callback) {
    pino.info({ method: 'getUserUid', input: headers.cookie, type: 'start' });

    async.waterfall(
        [
            (done) => doGetUserFromRemote(headers, done),
            doFindOrCreateUser,
        ],
        (error, uid) => {
            if (error) {
                pino.error({ method: 'getUserUid', input: headers.cookie, error: error.toString(), type: 'end' });
                return callback(error);
            }
            pino.info({ method: 'getUserUid', input: headers.cookie, output: uid, type: 'end' });
            return callback(null, uid);
        }
    );
}

function doCreateUser(data, callback) {
    pino.info({ method: 'doCreateUser', input: data, type: 'start' });

    return User.create(data, (error, result) => {
        if (error) {
            pino.error({ method: 'doCreateUser', input: data, error: error.toString(), type: 'end' });
            return callback && callback(error);
        }
        pino.info({ method: 'doCreateUser', input: data, output: result, type: 'end' });
        return callback && callback(null, result);
    });
}

function doFindOrCreateUser(user, callback) {
    pino.info({ method: 'doFindOrCreateUser', input: user, type: 'start' });

    if (!user || !user.email) {
        return callback && callback(new Error('no user session'));
    }

    async.waterfall(
        [
            function findUser(done) {
                if (!user || !user.email) {
                    return done(new Error('no user session'));
                }
                return User.getUidByEmail(user.email, (error, uid) => done(error, uid ? uid : null));
            },
            function tryCreateUser(uid, done) {
                // get username from email without subfix
                const username = user.username || (user.email && user.email.replace(/@.*/, ''));
                if (uid) { // if user exists
                    return done(null, uid);
                }
                return doCreateUser({
                    userslug: username,
                    fullname: user.fullName,
                    email: user.email,
                    username,
                }, done);
            },
            function tryJoinGroupIfUserAdmin(uid, callback) {
                if (isAdmin(user.email)) {
                    return groups.join('administrators', uid, (err) => callback && callback(err, uid));
                }
                callback && callback(null, uid);
            },
        ],
        (error, uid) => {
            if (error) {
                pino.error({ method: 'doFindOrCreateUser', input: user, error: error.toString(), type: 'end' });
                return callback(error);
            }

            pino.info({ method: 'doFindOrCreateUser', input: user, output: uid, type: 'end' });
            callback && callback(null, uid);
        }
    );
}

function isAdmin(username) {
    return config.admins && config.admins.includes(username);
}
