const router = require('express').Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const secrets = require('../config/secrets.js');
const Users = require('../users/users-model.js');

router.post('/register', validateUser, (req, res) => {
    const user = req.body;
    const hash = bcrypt.hashSync(user.password, 12);
    user.password = hash;

    Users.add(user)
        .then(saved => {
            res.status(201).json(saved);
        })
        .catch(err => {
            res.status(500).json(err);
        });
});

router.post('/login', validateUser, (req, res) => {
    const { username, password } = req.body;
    Users.findBy({ username })
        .first()
        .then(user => {
            if (user && bcrypt.compareSync(password, user.password)) {
                const token = generateToken(user);
                res.status(200).json({ token });
            } else {
                res.status(401).json({ message: 'Invalid Credentials' });
            }
        })
        .catch(err => {
            res.status(500).json(err);
        });
});

function generateToken(user) {
    const payload = {
        username: user.username
    };
    const options = {
        expiresIn: '1d'
    };
    return jwt.sign(payload, secrets.jswSecret, options);
};
//middlewares

function validateUser(req, res, next) {
    const { username, password } = req.body;
    if (!username && !password) {
        return res.status(400).json({ message: 'Username and Password are required!' })
    }
    if (!username) {
        return res.status(400).json({ message: 'Username is required!' })
    }
    if (!password) {
        return res.status(400).json({ message: 'Password is required!' })
    }
    next();
}

module.exports = router;