const uuid = require('uuid');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
const jwt = require('jsonwebtoken')
let request = require("request");

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const SESSION_KEY = 'Authorization';

class Session {
    #sessions = {}

    constructor() {
        try {
            this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
            this.#sessions = JSON.parse(this.#sessions.trim());

            console.log(this.#sessions);
        } catch(e) {
            this.#sessions = {};
        }
    }

    #storeSessions() {
        fs.writeFileSync('./sessions.json', JSON.stringify(this.#sessions), 'utf-8');
    }

    set(key, value) {
        if (!value) {
            value = {};
        }
        this.#sessions[key] = value;
        this.#storeSessions();
    }

    get(key) {
        return this.#sessions[key];
    }


    destroy(req, res) {
        const sessionId = req.sessionId;
        delete this.#sessions[sessionId];
        this.#storeSessions();
    }
}

const sessions = new Session();
let publicKey = null;
const getPublicKey = async () => {
	await request('https://kpi.eu.auth0.com/pem', function(err, response, body){
        publicKey=body;
    });
};
app.use(async (req, res, next) => {
    let currentSession = {};
    let sessionId = req.get(SESSION_KEY);
    if (sessionId) {
        try {
            const tokenValue = jwt.verify(sessionId, publicKey);
            console.log({ tokenValue })
          } catch (err) {
            console.error(err);
            return res.status(401).end();
          }
        currentSession = sessions.get(sessionId);
    }
    req.session = currentSession;
    req.sessionId = sessionId;
    next();
});

app.get('/', (req, res) => {
    if (req.session.username) {
        return res.json({
            username: req.session.username,
            logout: 'http://localhost:3000/logout'
        })
    }
    res.sendFile(path.join(__dirname+'/index.html'));
})

app.get('/logout', (req, res) => {
    sessions.destroy(req, res);
    res.redirect('/');
});


app.post('/api/login', (req, res) => {
    const { login, password } = req.body;
    let options = { method: "POST",
    url: "https://kpi.eu.auth0.com/oauth/token",
    headers: {'content-type': 'application/x-www-form-urlencoded'},
    form:
    {
        client_id: 'JIvCO5c2IBHlAe2patn6l6q5H35qxti0',
        audience: 'https://kpi.eu.auth0.com/api/v2/',
        realm: 'Username-Password-Authentication',
        scope: 'offline_access',
        client_secret: 'ZRF8Op0tWM36p1_hxXTU-B0K_Gq_-eAVtlrQpY24CasYiDmcXBhNS6IJMNcz1EgB',
        username:login, 
        password:password, 
        grant_type: 'http://auth0.com/oauth/grant-type/password-realm',
}
    };
    request(options, function(error, response, body){
        if (error) throw new Error(error)
        if (body) {
            console.log(body);
            let bodyjson = JSON.parse(body);
            if (bodyjson.error) res.status(401).send();
            else{
                sessions.set(bodyjson.access_token,{username:login})
        
                res.json({ token: bodyjson.access_token });
            }
        }
    });
});

app.listen(port, async () => {
    await getPublicKey();
    console.log(publicKey);
    console.log(`Example app listening on port ${port}`)
})

//SOMEPASS###$@#234234!