const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const port = 3000;
const fs = require('fs');
let request = require('request');
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

class Session {
  #sessions = {};

  constructor() {
    try {
      this.#sessions = fs.readFileSync('./sessions.json', 'utf8');
      this.#sessions = JSON.parse(this.#sessions.trim());

      console.log(this.#sessions);
    } catch (e) {
      this.#sessions = {};
    }
  }

  #storeSessions() {
    fs.writeFileSync(
      './sessions.json',
      JSON.stringify(this.#sessions),
      'utf-8'
    );
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

app.use(async (req, res, next) => {
  let currentSession = {};
  let sessionId = req.get('Authorization');
  if (sessionId) {
    currentSession = sessions.get(sessionId);
  }

  req.session = currentSession;
  req.sessionId = sessionId;
  next();
});

app.get('/', async (req, res) => {
  if (req.session.username) {
    return res.json({
      username: req.session.username,
      logout: 'http://localhost:3000/logout',
    });
  }
  res.sendFile(path.join(__dirname + '/index.html'));
});

app.post('/api/codelogin', (req, res) => {
  const { code } = req.body;
  console.log(code);
  let options = {
    method: 'POST',
    url: 'https://kpi.eu.auth0.com/oauth/token',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    form: {
      client_id: 'JIvCO5c2IBHlAe2patn6l6q5H35qxti0',
      audience: 'https://kpi.eu.auth0.com/api/v2/',
      client_secret:
        'ZRF8Op0tWM36p1_hxXTU-B0K_Gq_-eAVtlrQpY24CasYiDmcXBhNS6IJMNcz1EgB',
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: 'http://localhost:3000/',
      scope: 'offline_access',
    },
  };
  request(options, function (error, response, body) {
    if (error) throw new Error(error);
    if (body) {
      let bodyjson = JSON.parse(body);
      console.log(JSON.stringify(bodyjson, null, 2));
      if (bodyjson.error) {
        res.status(401).send();
      } else {
        sessions.set(bodyjson.access_token, { username: 'user' });

        res.json({ token: bodyjson.access_token });
      }
    }
  });
});

app.get('/logout', (req, res) => {
  sessions.destroy(req, res);
  res.redirect('/');
});

app.get('/login', (req, res) => {
  return res.redirect(
    'https://kpi.eu.auth0.com/authorize?client_id=JIvCO5c2IBHlAe2patn6l6q5H35qxti0&redirect_uri=http%3A%2F%2Flocalhost%3A3000&response_type=code&response_mode=query'
  );
});

app.listen(port, async () => {
  console.log(publicKey);
  console.log(`Example app listening on port ${port}`);
});
