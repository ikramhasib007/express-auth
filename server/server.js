const express = require('express');
const uuid = require('uuid/v4');
const {mongoose} = require('./db/mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const bodyParser = require('body-parser');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const fetch = require('isomorphic-unfetch');
const bcrypt = require('bcrypt-nodejs');


// configure passport.js to use the local strategy
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  (email, password, done) => {
    fetch(`http://localhost:5000/users?email=${email}`)
    .then(async(res) => {
	  var data = await res.json();
      const user = data[0];
      if (!user) {
        return done(null, false, { message: 'Invalid credentials.\n' });
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return done(null, false, { message: 'Invalid credentials.\n' });
      }
      return done(null, user);
    })
    .catch(error => done(error));
  }
));

// tell passport how to serialize the user
passport.serializeUser((user, done) => {
  console.log('Inside serializeUser callback. User id is save to the session file store here')
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  console.log('Inside deserializeUser callback')
  console.log(`The user id passport saved in the session file store is: ${id}`)
  fetch(`http://localhost:5000/users/${id}`)
  .then(async(res) => {
  	var data = await res.json();
  	return done(null, data)
  })
  .catch(error => done(error, false))
});


// create the server
const app = express();

// add & configure middleware
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(session({
	genid: (req) => {
		console.log('Inside the session middleware');
		console.log(req.sessionID)
		return uuid() // use UUIDs for session IDs
	},
	store: new MongoStore({
		url: process.env.MONGO_URI,
		autoRemove: 'interval',
		autoRemoveInterval: 10, // Removes expired sessions every 10 minutes
		collection: 'sessions',
		stringify: false,
	}),
	secret: 'keyboard cat',
	resave: false,
	saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
	res.send(`You hit home page!\n`)
})

// create the login get and post routes
app.get('/login', (req, res) => {
  res.send(`You got the login page!\n`)
})

app.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if(info) {return res.send(info.message)}
    if (err) { return next(err); }
    if (!user) { return res.redirect('/login'); }
    req.login(user, (err) => {
      if (err) { return next(err); }
      return res.redirect('/authrequired');
    })
  })(req, res, next);
})

app.get('/authrequired', (req, res) => {
  if(req.isAuthenticated()) {
    res.send('you hit the authentication endpoint\n')
  } else {
    res.redirect('/')
  }
})


// tell the server what port to listen on
app.listen(3000, () => {
  console.log('Listening on localhost:3000')
})