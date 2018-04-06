"use strict";

require('dotenv').config();

const PORT        = process.env.PORT || 8080;
const ENV         = process.env.ENV || "development";
const express     = require("express");
const bodyParser  = require("body-parser");
const sass        = require("node-sass-middleware");
const app         = express();

const knexConfig  = require("./knexfile");
const knex        = require("knex")(knexConfig[ENV]);
const morgan      = require('morgan');
const knexLogger  = require('knex-logger');

// Seperated Routes for each Resource
const usersRoutes = require("./routes/users");

// Load the logger first so all (static) HTTP requests are logged to STDOUT
// 'dev' = Concise output colored by response status for development use.
//         The :status token will be colored red for server error codes, yellow for client error codes, cyan for redirection codes, and uncolored for all other codes.
app.use(morgan('dev'));

// Log knex SQL queries to STDOUT as well
app.use(knexLogger(knex));


// generateRandomString function
function generateRandomString() {
  let output = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (var i = 0; i < 10; i++)
  output += possible.charAt(Math.floor(Math.random() * possible.length));
  return output;
};


app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use("/styles", sass({
  src: __dirname + "/styles",
  dest: __dirname + "/public/styles",
  debug: true,
  outputStyle: 'expanded'
}));
app.use(express.static("public"));

// Mount all resource routes
app.use("/api/users", usersRoutes(knex));

// Home page
app.get("/", (req, res) => {
  res.render("index");
  var randonmun = generateRandomString();
});

app.get("/:id", (req, res, next) => {
  let templatevars = {}
  console.log('req ' + JSON.stringify(req.params))
    knex('events')
      .first("event_name","details","sched_name","id")
      .where("event_url" , req.params.id )
      .then((event) => {
        if(event){
          templatevars = {
            name     :  event.sched_name,
            title    :  event.event_name,
            location :  event.location,
            details  :  event.details
          }
          knex('timeslots')
            .select("start_time","end_time")
            .where("event_id", event.id)
            .then((timeslot) => {
              console.log(event.id)
              if(timeslot){
                console.log(timeslot)
                templatevars.start_time = timeslot[0].start_time
                console.log(templatevars)
                res.render("events", templatevars);
              } else {
                next()
              }
            });
        } else {
          next()
        }
      });
});




app.post("/", (req, res) => {
	let oururl = generateRandomString()
	console.log('post /events')
  console.log('JSON Stringify ' + JSON.stringify(req.body))
  var yearArray = req.body.year;
  console.log(req.body.year)
  var monthArray = req.body.month;
  var dayArray = req.body.day;
  var startArray = req.body.start_time;
  var endArray = req.body.end_time;

    knex('events')
    .returning('id')
    .insert({
      event_name: req.body.title,
      event_url:oururl,
      details: req.body.details,
      sched_name: req.body.name,
      sched_email: req.body.email
    }).then((id) => {
      if (typeof yearArray === 'string'){
        var startDate = new Date(`${req.body.year} ${req.body.month} ${req.body.day} ${req.body.start_time}`);
        var endDate = new Date(`${req.body.year} ${req.body.month} ${req.body.day} ${req.body.end_time}`);
        console.log('this fires for one time!');
        console.log('this is startDate' + startDate);
        knex('timeslots').insert({
            event_id   : id[0],
            start_time : startDate,
            end_time   : endDate
          }).then(() => {
            console.log('success for timeslots this is so great weeeeeeeeeeeeeee')
          })
          .catch((err)=>{
           throw err;
          })
      } else {
        console.log('this fires for multiple times')
        for(var i = 0; i < yearArray.length; i ++){
          console.log(yearArray[i]);
          console.log(monthArray[i]);
            var startDate = new Date(`${yearArray[i]} ${monthArray[i]} ${dayArray[i]} ${startArray[i]}`);
            var endDate = new Date(`${yearArray[i]} ${monthArray[i]} ${dayArray[i]} ${endArray[i]}`);
            console.log('this is startDate' + startDate);
            knex('timeslots').insert({
                event_id   : id[0],
                start_time : startDate,
                end_time   : endDate
              }).then(() => {
                console.log('success for timeslots this is so great weeeeeeeeeeeeeee')
            })
            .catch((err)=>{
            throw err;
          })
        }
      }
    })
    .catch((err)=>{
     throw err;
  })

   res.redirect(`/${oururl}`);
});

app.use((req, res, next) => {
  res.status(404).render('404');
});

app.listen(PORT, () => {
  console.log("Example app listening on port " + PORT);
});
