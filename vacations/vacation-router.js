const router = require('express').Router();

const Vacations = require('./vacation-model.js');
const Users = require('../users/users-model.js');
const UsersVacation = require('../user-vacations/user-vacation-model.js');
const restricted = require('../auth/auth-middleware.js');
const commentRouter = require('../comments/comments-router.js');
const todoRouter = require('../todos/todos-router.js');

router.get('/', restricted, (req, res) => {
    const { username } = req.user;
    UsersVacation.findByName(username).then(vacs => {
        res.status(200).json(vacs);
    })
        .catch(err => {
            console.log('error in vacation get',err);
            res.status(500).json({error: 'error getting the vacations'})
        })
});

router.get('/:vacId', restricted, validateUserVacLink, (req, res) => {

    UsersVacation.findByVacId(req.vacId).then(vacs => {
        let main = vacs[0];
        let usernames = vacs.map(each => {
            return each.username;
        });
        main.users = usernames;
        delete main.username;
        res.status(200).json(main);
    })
        .catch(err => {
            console.log(err);
            res.status(500).json({error: 'error getting individual vacation with the users'})
        });
});

router.post('/add', restricted, validateVacation, (req, res) => {
    const vac = req.body;
    const { username } = req.user;
    Vacations.add(vac)
        .then(vacation => {
            const vacId = vacation.id;
            Users.findIdFromName(username).then(userId => {
                UsersVacation.add(userId, vacId).then(userVacID => {
                    res.status(201).json(vacation)
                })
                    .catch(err => {
                        console.log('err 1', err)
                        res.status(500).json(err);
                    })
            })
                .catch(err => {
                    console.log('err 2', err)
                    res.status(500).json(err);
                });

        })
        .catch(err => {
            console.log('err 3', err)
            res.status(500).json(err)
        });
});

router.delete('/:vacId/delete', restricted, validateUserVacLink, (req, res) => {
    Vacations.remove(req.vacId).then(deleted => {
        res.status(200).json(deleted)
    }).catch(err => {
        console.log(err)
        res.status(500).json({ error: "Error during deletion" })
    })
})

router.post('/:vacId/adduser', restricted, validateUserVacLink, (req, res) => {
    const { username } = req.body
    if (!username) {
        return res.status(400).json({ message: 'Username is required!' })
    }
    Users.findIdFromName(username).then(userId => {
        if (!userId) {
            res.status(400).json({ Message: 'User with this username does not exist!' })
        }
        UsersVacation.check(userId, req.vacId).then(exists => {
            if (exists) {
                res.status(400).json({ message: 'User already added!' })
            } else {
                UsersVacation.add(userId, req.vacId).then(userVacID => {
                    res.status(201).json(userVacID)
                })
                    .catch(err => {
                        console.log('err1', err)
                        res.status(500).json(err);
                    })
            }
        }).catch(err => {
            res.status(500).json(err)
        })
    })
        .catch(err => {
            console.log('err2', err)
            res.status(500).json(err);
        });
});

router.delete('/:vacId/deleteuser', restricted, validateUserVacLink, (req, res) => {
    const { username } = req.body;
    if (!username) {
        return res.status(400).json({ message: 'Username is required!' })
    }
    Users.findIdFromName(username).then(userId => {
        console.log('yserid', userId)
        if (!userId) {
            return res.status(400).json({ Message: 'User with this username is not on the vacation!' })
        }
        UsersVacation.remove(userId, req.vacId).then(deleted => {
            if (!deleted) {
                res.status(400).json({ message: "This user is not on the vacation!" });
            } else {
                res.status(200).json(deleted);
            }
        }).catch(err => {
            res.status(404).json({ message: 'Invalid ID' })
        });
    })
        .catch(err => {
            res.status(500).json(err);
        });
});

router.put('/:vacId/update', restricted, validateUserVacLink, validateVacation, (req, res) => {
    const change = req.body;
    Vacations.update(req.vacId, change)
        .then(changed => {
            res.status(200).json(changed)
        })
        .catch(err => {
            res.send(err)
        })
});

router.use('/:vacId/comments', commentRouter);
router.use('/:vacId/suggestions', todoRouter);

//middleware

function validateVacation(req, res, next) {
    const { location, title } = req.body;
    if (!location && !title) {
        return res.status(400).json({ message: 'Location and Title are required!' })
    }
    if (!location) {
        return res.status(400).json({ message: 'Location is required!' })
    }
    if (!title) {
        return res.status(400).json({ message: 'Title is required!' })
    }
    next();
}

function validateUserVacLink(req, res, next) {
    const { username } = req.user;
    const { vacId } = req.params;
    Users.findIdFromName(username).then(userId => {
        UsersVacation.check(userId, vacId).then(validLink => {
            console.log('validelink in valdiateUservac', validLink)
            if (validLink) {
                req.vacId = vacId;
                next();
            } else {
                res.status(403).json({ message: 'You are not authorized to perform this action!' })
            }
        })
            .catch(err => {
                res.status(500).json(err);
            })
    })
        .catch(err => {
            res.status(500).json(err);
        });
}

module.exports = router;