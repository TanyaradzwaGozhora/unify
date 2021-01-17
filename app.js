//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
var picture ="";
var courses = [];
var currentUser ={};



app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/unify", {useNewUrlParser: true});
mongoose.set("useCreateIndex", true);

//pname = preferred name
const userSchema = new mongoose.Schema ({
  username: String,
  googleId: String,
  courses: Array,
  preferredName: String,
  discordName: String,
  Faculty: String,
  Major: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});



passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    //can be change later to google/unify
    callbackURL: "http://localhost:3000/auth/google/unify",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    picture = profile.photos[0].value;
    currentUser = profile;
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", isLoggedIn, function(req, res){
  res.render("homePage", {imageURL: picture});
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/unify",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/");
  });

app.get("/login", isLoggedIn,function(req, res){
  res.render("login");
});

app.get("/register", isLoggedIn,function(req, res){
  res.render("register");
});


app.get("/signIn", function(req,res){
  res.render("signIn");
});

app.get("/courses", isLoggedIn, function (req, res) {
  res.render("coursesUpload");
});




app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.get("/success", isLoggedIn, function(req, res){
  User.findOne({ googleId: currentUser.id }, function(err, foundUser){
    if (err){
      console.log(err);
    } else {
      if (foundUser) {
        if (foundUser.courses.length === 0) {
          res.render("success", {results: 'You need to submit classes'});
        } else {
        res.render("success", {results: 'Congrats here are your matches'});
        }
      }
    }
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;

//Once the user is authenticated and their session gets saved, their user details are saved to req.user.
  // console.log(req.user.id);

  User.findById(req.user.id, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

//evaluate usefulness
app.post("/register", function(req, res){

  User.register({username: req.body.discord}, req.body.pname, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/");
      });
    }
  });

});


// app.post("/login", function(req, res){
//
//   const user = new User({
//     preferredName: req.body.preferred,
//     discordName: req.body.discord
//   });
//
//   req.login(user, function(err){
//     if (err) {
//       console.log(err);
//     } else {
//       passport.authenticate("local")(req, res, function(){
//         res.redirect("/secrets");
//       });
//     }
//   });
//
// });

app.post("/calculate", function(req, res){
  //add each element in courses (all integers)
  let chosenCourses = [];
  var data = req.body;
  console.log(data);
  for( let prop in data ){
    if(!(isNaN(parseInt(prop)))){
      chosenCourses.push(data[prop]);
    }
  }

  var newvalues = {$set: {preferredName: req.body.pname, discordName:req.body.discord, courses: chosenCourses} };
  User.updateOne({ googleId: currentUser.id }, newvalues, function(err, foundUser){
    console.log(foundUser.discordName);
  });
  //matches(courses)
  res.redirect("/success");
});

function matches(courses){
  //algorithm goes here
}

function isLoggedIn(req, res, next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect("/signIn");
}




app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
