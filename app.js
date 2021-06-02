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


//setting our view engine
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

//session creation using ejs
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));


//commence using passpirt for the sake of Oauth
app.use(passport.initialize());
app.use(passport.session());

//Connect to our mongoose database and allow creation of index for our documents
mongoose.connect("mongodb://localhost:27017/unify", {useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

//Our UserSchema
const userSchema = new mongoose.Schema ({
  username: String,
  googleId: String,
  courses: [String],
  preferredName: String,
  discordName: String,
  Faculty: String,
  Major: String
});

//Calling on Mongoose
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//Create this user model based on the previous schema
const User = new mongoose.model("User", userSchema);

//for use of passport oauth
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



//the route for the form on it's submission
app.post("/calculate", function(req, res){

  //add each element in courses (all integers)
  let chosenCourses = [];
  var data = req.body;
  console.log(data);

  //pushing our course on to our list of chosen courses
  for( let prop in data ){//for each key our "dictionary" of information sent over
    if(!(isNaN(parseInt(prop)))){//if the key is an integer (as all our courses have integer keys)
      chosenCourses.push(data[prop]);//push this with it's key to the list of courses
    }
  }


  //adding the user to our database
  var newvalues = {$set: {preferredName: req.body.pname, discordName:req.body.discord, courses: chosenCourses} };
  User.updateOne({ googleId: currentUser.id }, newvalues, function(err, foundUser){
    console.log(foundUser.discordName);
  });

  matches(chosenCourses);//check who our user matches


  res.redirect("/success");// send over to success route
});

function matches(courses){

  //Format of our data
  // currentUser = { "_id" : ObjectId("60043b353f988b4cc03e9439"), "courses" : [ "ECON101", "ECON281", "ECON282" ], "googleId" : "102824134670291232843", "__v" : 0, "discordName" : "Cosmic#7938", "preferredName" : "Akrash" }
  // courses = currentUser["courses"]

  //results will be stored in two dictionaries one called results and another final_results
  //ideas:
  //Not too pragmatic - 1 ~ Sort on input(dont see any harm there) *not for now*
  //Check if we have a counter object in javascript, later *not for now*
  //2-  results = {}
  //    for each course in courses{
  //      find all students with said course, for each of them
  //      if dict[student]:
  //          dict[student]+=1
  //      else:
  //          dict[student] = 1
  //    }

  results = {}
  courses.forEach(function(course){
    findMatchingStudents(course, results)
  });



  // print(results);//just checking if it's working
  //Store data in format, maybe later on we
  //{1(Number of matches): [Students], 2(""): [Students]}
}

function findMatchingStudents(course, results){
  //find all students with said course first
  User.find({courses: course}, function(err,docs){
    console.log(course);
    docs.forEach(function(doc){
      console.log(doc.googleId);
      //to be debugged (creating results)
      // if (results.hasOwnProperty(doc.googleId)){
      //   results[doc.googleId] ++;
      // }
      // else{
      //   results[doc.googleId] = 1;
      // }

    })
  });

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
