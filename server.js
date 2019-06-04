const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI || 'mongodb://localhost/exercise-track' )

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});



//Code for Exercise Tracker
var Schema=mongoose.Schema;

var userSchema=new Schema({
  userName: String
  });

var exerciseSchema=new Schema({
  userID: String,
  description: String,
  duration: String,
  date: Date
  });

var User=mongoose.model('User', userSchema);
var Exercise=mongoose.model('Exercise', exerciseSchema);

//I can create a user by posting form data username to /api/exercise/new-user and returned will be an object with username and _id.
app.post("/api/exercise/new-user", function(req,res) {
  User.findOne({userName: req.body.username}, function(err, result) {
            if (err) { console.log(err); }
            if (result==null) // if the user not found in DB, create the user
            {
              var newUser = new User({userName: req.body.username});
              newUser.save((err, data) => {
                if (err) { console.log(err); }
                res.json({user_name: data.userName, user_id: data._id});
              });
            }
            else // if the user alreay created, return the user
            { res.json({user_name: result.userName, user_id: result._id}); }
  });     
});

//I can get an array of all users by getting api/exercise/users with the same info as when creating a user.
app.get("/api/exercise/users", function(req,res) {
  User.find({}, 'userName _id', function(err, result) {
            if (err) { console.log(err); }
            if (result==null) 
            { res.json("No User exists!"); }
            else 
            { res.json(result); }
  });     
});

//I can add an exercise to any user by posting form data userId(_id), description, duration, and optionally date to /api/exercise/add. 
//If no date supplied it will use current date. Returned will be the the user object also with the exercise fields added.
app.post("/api/exercise/add", function(req,res) {
  User.findOne({_id: req.body.userId}, function(err, result) {
            if (err) { console.log(err); }
            if (result!=null) // if the userID is valid, create the exercise
            {
              var exerciseDate;
              
              if (req.body.date=="")
              { exerciseDate=new Date(); }
              else 
              { exerciseDate=new Date(req.body.date); }
                
              var newExercise = new Exercise({
                userID: req.body.userId,
                description: req.body.description,
                duration: req.body.duration,
                date: exerciseDate
              });
              
              newExercise.save((err, data) => {
                if (err) { console.log(err); }
                res.json({user_name: result.userName, user_id: result._id, description: data.description, duration: data.duration,date: data.date});
              });
            }
            else // if the userId not found in DB User Model
            { res.json("The userId is invalid."); }
  });     
});

//I can retrieve a full exercise log of any user by getting /api/exercise/log with a parameter of userId(_id). 
//Returned will be the user object with added array log and count (total exercise count).
app.get("/api/exercise/log/:userId", function(req,res) {
  User.findOne({_id: req.params.userId}, function(err, result) {
      if (err) { console.log(err); }
      if (result!=null) // if the userID is valid, search exercise
      {    
        Exercise.find({userID: req.params.userId}, function(err, resultArray) {
            if (err) { console.log(err); }
            if (resultArray.length==0)
            { res.json("No exercise for this userId!"); }
            else 
            { res.json({user_name: result.userName, user_id: result._id, exercise_log: resultArray, total_exercise_count: resultArray.length}); }
         });      
      }
      else // if the userId not found in DB User Model
      { res.json("The userId is invalid."); }
  });     
});

//I can retrieve part of the log of any user by also passing along optional parameters of from & to or limit.
//GET users's exercise log: GET /api/exercise/log?{userId}[&from][&to][&limit]
//{ } = required, [ ] = optional
//from, to = dates (yyyy-mm-dd); limit = number
app.get("/api/exercise/log", function(req,res) {
  User.findOne({_id: req.query.userId}, function(err, result) {
      if (err) { console.log(err); }
      if (result!=null) // if the userId is valid, search exercise
      {
        var fromDate,toDate
        
        if (req.query.from)
        { fromDate=req.query.from; }
        else { fromDate='1970-01-01'; }
            
        if (req.query.to)
        { toDate=req.query.to; }
        else { toDate=new Date(); }
        
        var findExercise=Exercise.find({userID: req.query.userId, date: {
                    $gte: fromDate,
                    $lte: toDate }});
        
        var callbackFindExercise=function(err, resultArray) {
            if (err) { console.log(err); }
            if (resultArray.length==0) 
            { res.json("No exercise for this userId!"); }
            else 
            { res.json({user_name: result.userName, user_id: result._id, exercise_log: resultArray}); }
         };    
        
        if (req.query.limit)
        { findExercise.limit(parseInt(req.query.limit)).exec(callbackFindExercise); }
        else 
        { findExercise.exec(callbackFindExercise); }
      }
      else // if the userId not found in DB User Model
      { res.json("The userId is invalid."); }
  });     
});



// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
