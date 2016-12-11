var express = require('express'),
    app = express(),
    valid = require('url-valid'),
    port = process.env.PORT;

//Connect and init mongodb
var mongodb = require('mongodb').MongoClient,
    dbUrl = process.env.MONGODB_URI || "mongodb://localhost:27017/littleurl";
  
function generateKey(){
  return Math.floor((Math.random() * 9999) + 1);
};

function createShortURL(req, key){
  return req.protocol + "://" + req.hostname + "/" + key;
};

function isNumber(n) {
  return !isNaN(+n) && isFinite(n);
}

//Redirect to original path
app.get('/:key', (req, res) => {
  var key = req.params.key;
  if(isNumber(key)){
    //connect to db
    mongodb.connect(dbUrl, (err, db) => {
      if(err) return console.error(err);
        console.log("Connected to " + dbUrl);
        //use collection 
        db.collection("urlmap", (err, urlmap) => {
          if(err) { console.error(err); return res.json({error : err.message}); }
          //query if url was allready required
          console.log("Querying key " + key);
          urlmap.find({ key: { $eq:  Number(key) } }).toArray((err, map) => {
            if(err) { console.error(err); return res.json({error : err.message}); }
            if(map.length > 0){
              console.log("redirecting to: " + map[0].url);
              res.redirect(map[0].url);  
            }else{
              res.send("<h2>Not valid short url.</h2>");
            }
            db.close();
          }); 
        });
    });  
  }
});


//Requests Handling
app.get('/little/*', (req, res) => {
  //get the url passed as parameter
  var url = req.params[0];
  //validate if it is a valid url
  valid(url, (err, valid) => {
    if(err) return res.json({error : err.message});
    //connect to db
    mongodb.connect(dbUrl, (err, db) => {
      if(err) return console.error(err);
      console.log("Connected to " + dbUrl);
      //use collection 
      db.collection("urlmap", (err, urlmap) => {
        if(err) { console.error(err); return res.json({error : err.message}); }
        //query if url was allready required
        //if url was found, return it; otherwise insert and return
        urlmap.find({ url: { $eq: url } }).limit(1).toArray((err, map) => {
          if(err) { console.error(err); return res.json({error : err.message}); }
          if(map.length > 0){
            res.json({ original_url: map[0].url, short_url: createShortURL(req, map[0].key) });
            db.close();
          }else{
            var key = generateKey();
            urlmap.insert({ url: url, key: key }, (err, entry) => {
              if(err) { console.error(err); return res.json({error : err.message});} 
              res.json({ original_url: url, short_url: createShortURL(req, key) });
              db.close();
            });
          }
        });
      });
    });
  });
});


app.get('/', (req, res) => {
  var sampleURL = createShortURL(req, "little/http://google.com");
  var html = "<h1>FreeCodeCamp API: URL Shortener Microservice</h1>";
  html += "<p>Pass a URL as a parameter to get a short URL as JSON format. Just as this:</p>";
  html += "<code>" + sampleURL + "</code>";
  html += "<p>The miscroservice will retrun a JSON document just like this:</p>";
  html += '<code>{"original_url":"http://www.google.com","short_url":"http://hr-littleurl-ms.herokuapp.com/4543"}</code>';
  res.send(html);
});


app.listen(port, function () {
  console.log('Example app listening on port ' + port);
});