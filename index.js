var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

//IBM Watson Setup
const ToneAnalyzerV3 = require('ibm-watson/tone-analyzer/v3');
const { IamAuthenticator } = require('ibm-watson/auth');

const toneAnalyzer = new ToneAnalyzerV3({
  version: '2017-09-21',
  authenticator: new IamAuthenticator({
    apikey: 'CPe_aYAKTNM7SoRHQ_l19BUScpLgT8x6mt7bE0T6eIWq',
  }),
  url: 'https://api.us-south.tone-analyzer.watson.cloud.ibm.com/instances/311333bd-92e3-4c39-8a9e-6fd2fefc9335',
});

// Server index page
app.get("/", function (req, res) {
  res.send("Deployed!");
});

// Facebook Webhook
// Used for verification
app.get("/webhook", function (req, res) {
  if (req.query["hub.verify_token"] === "csrocks") {
    console.log("Verified webhook");
    res.status(200).send(req.query["hub.challenge"]);
  } else {
    console.error("Verification failed. The tokens do not match.");
    res.sendStatus(403);
  }
});

// All callbacks for Messenger will be POST-ed here
app.post("/webhook", function (req, res) {
  // Make sure this is a page subscription
  if (req.body.object == "page") {
    // Iterate over each entry
    // There may be multiple entries if batched
    req.body.entry.forEach(function(entry) {
      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.postback) {
          processPostback(event);
        } else if (event.message) {
          processMessage(event);
        }
      });
    });

    res.sendStatus(200);
  }
});

function processPostback(event) {
  var senderId = event.sender.id;
  var payload = event.postback.payload;

  if (payload === "Greeting") {
    // Get user's first name from the User Profile API
    // and include it in the greeting
    request({
      url: "https://graph.facebook.com/v2.6/" + senderId,
      qs: {
        access_token: process.env.PAGE_ACCESS_TOKEN,
        fields: "first_name"
      },
      method: "GET"
    }, function(error, response, body) {
      var greeting = "";
      if (error) {
        console.log("Error getting user's name: " +  error);
      } else {
        var bodyObj = JSON.parse(body);
        name = bodyObj.first_name;
        greeting = "Hi " + name + ". ";
      }
      var message = `${greeting}Welcome to Relatio - thanks for using! Your actions are 'Analyze' or 'Get Help.' `;
      sendMessage(senderId, {text: message});
    });
  }
}

// sends message to user
function sendMessage(recipientId, message) {
  request({
    url: "https://graph.facebook.com/v2.6/me/messages",
    qs: {access_token: 'EAAliG7mvpQkBAHoWfPfpw4WyFUTW0N1zyLb8yrrHu6vLZBfCNE1I9ByMJ83JLaJZCnlgeqyU1Lu3HQyZAUzJa89wq2CYdpDGQZCKpeZAaOBoKoM13ME5UfC6FZBYJMMrJeZAz9sC5ZBjnI3D17fGNU1p1dvmbtzCwSioVM7ivB77OAZDZD'},
    method: "POST",
    json: {
      recipient: {id: recipientId},
      message: message,
    }
  }, function(error, response, body) {
    if (error) {
      console.log("Error sending message: " + response.error);
    }
  });
}

var analyzing = false;
function processMessage(event) {
  if (!event.message.is_echo) {
    var message = event.message;
    var senderId = event.sender.id;

    console.log("Received message from senderId: " + senderId);
    console.log("Message is: " + JSON.stringify(message));

    // You may get a text or attachment but not both
    if (message.text) {
      var formattedMsg = message.text.toLowerCase().trim();

      // If we receive a text message, check to see if it matches any special
      // keywords and send back the corresponding movie detail.
      // Otherwise, search for new movie.
      if (formattedMsg === "analyze") {
        analyzing = true;
        sendMessage(senderId, {text: "I understand you'd like to analyze your relationship. Please copy & paste a conversation you'd like analyzed."});
      } else if (analyzing) {
        analyzing = false;
        analyzeMessages(senderId, formattedMsg);
      } else {
        sendMessage(senderId, {text: "Sorry, I don't understand your request."});
      }
    } else if (message.attachments) {
      sendMessage(senderId, {text: "Sorry, I don't understand your request."});
    }
  }
}

function analyzeMessages(senderId, text) {
  var toneParams = {
    toneInput: { 'text': text },
    contentType: 'application/json',
  };
  
  toneAnalyzer.tone(toneParams)
    .then(toneAnalysis => {
      var tonesString = JSON.stringify(toneAnalysis);
      var tonesJSON = JSON.parse(tonesString);
      var tones = tonesJSON["result"]["document_tone"];
      var emotions = ["Sadness", "Joy", "Fear", "Disgust", "Anger"];
      var tonesMap = new Map();
      var text = JSON.stringify(tones["tones"][0]["tone_name"]) + ", SIZE: " + Object.keys(tones["tones"].length);

      // for (tone in tones) {
      //   text = text + JSON.stringify(tones[tone]["tone_name"]) + ": " + JSON.stringify(tones[tone]["score"]);
      //   tonesMap.set(JSON.stringify(tones[tone]["tone_name"]), JSON.stringify(tones[tone]["score"]));
      // }

      // for (emotion in emotions) {
      //   if (tonesMap.has(emotions[emotion])) {
      //     text = text + emotions[emotion] + ": " + tonesMap.get(emotions[emotion]) + '\n';
      //   } else {
      //     text = text + emotions[emotion] + ": Not recognized" + '\n';
      //   }
      // }

      console.log("Message Analysis Output: " + JSON.stringify(tones, null, 2));
      // console.log("STRING: " + toneString);
      // console.log("JSON: " + JSON.stringify(toneJSON));
      // console.log("JUST TONES FROM JSON: " + JSON.stringify(tone));
      sendMessage(senderId, {text: text});
    })
    .catch(err => {
      console.log('error:', err);
    });
}