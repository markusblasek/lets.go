var passport = require('passport');
var forms = require('forms');

var User = require('../models/user');

var registerForm = forms.create({
    email: forms.fields.email({ required: true }),
    password: forms.fields.password({ required: true }),
    password2: forms.fields.password({
        required: true,
        validators: [forms.validators.matchField('password')]
    })
});

var loginForm = forms.create({
    email: forms.fields.email({ required: true }),
    password: forms.fields.password({ required: true })
});

// TODO: Somehow integrate semantic ui placeholders
var renderSemanticField = function(name, object) {
    var label = object.labelHTML(name);
    var error = object.error ? '<div class="ui red pointing above ui label">' + object.error + '</div>' : '';
    var widget = object.widget.toHTML(name, object);
    return '<div class="field ' + (error !== '' ? 'error' : '')  + '">' + label + widget + error + '</div>';
};

exports.register = function(req, res) {
    registerForm.handle(req, {
        success: function(form) {
            var user = new User({
                email: form.data.email
                /*
                 username: req.body.username,
                 forename: req.body.forename,
                 surname: req.body.surname
                 */
            });

            User.register(user, form.data.password, function(err) {
                if (err) {
                    form.fields.email.error = err.message;
                    return res.render('register', { form: form.toHTML(renderSemanticField) });
                }

                passport.authenticate('local')(req, res, function () {
                    res.redirect('/');
                });
            });

        },
        error: function(form) {
            res.render('register', { form: form.toHTML(renderSemanticField) });
        },
        empty: function(form) {
            res.render('register', { form: form.toHTML(renderSemanticField) });
        }
    });
};

exports.login = function(req, res) {
    loginForm.handle(req, {
        success: function(form) {
            // TODO: Is there a better way to handle the error message without using connect-flash?
            passport.authenticate('local', function(err, user, info) {
                if (!user) {
                    res.render('login', { form: form.toHTML(renderSemanticField),
                                          message: 'Incorrect credentials.' });
                } else {
                    req.logIn(user, function(err) {
                        res.redirect('/');
                    })
                }
            })(req, res);
        },
        error: function(form) {
            res.render('login', { form: form.toHTML(renderSemanticField) });
        },
        empty: function(form) {
            res.render('login', { form: form.toHTML(renderSemanticField) });
        }
    });
};

exports.logout = function(req, res) {
    req.logout();
    res.redirect('/');
};
