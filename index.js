var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

//local variables
var zipcodeRegEx= RegExp('[0-9][0-9][0-9][0-9][0-9]');
var localMessages=[];
var accessToken='EAAliG7mvpQkBAHoWfPfpw4WyFUTW0N1zyLb8yrrHu6vLZBfCNE1I9ByMJ83JLaJZCnlgeqyU1Lu3HQyZAUzJa89wq2CYdpDGQZCKpeZAaOBoKoM13ME5UfC6FZBYJMMrJeZAz9sC5ZBjnI3D17fGNU1p1dvmbtzCwSioVM7ivB77OAZDZD' 

//Resource Variables 
var domesticAbusejson= {
  type:"web_url",
  url: "https://www.thehotline.org/help/",
  title: "National Abuse Line"
};
var suicideLineJson={
  type:"web_url",
  url: "https://suicidepreventionlifeline.org",
  title: "Suicide Lifelife"
};
var eatingLineJson={
  type:"web_url",
  url: "https://suicidepreventionlifeline.org",
  title: "Suicide Lifelife"
};
var cyberCrimeJson={
  type:"web_url",
  url: "https://suicidepreventionlifeline.org",
  title: "Suicide Lifelife"
};
  

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
function sendHelpTemplate(recipientId, customizedResources){
  request({
    url: "https://graph.facebook.com/v6.0/me/messages", 
    qs: {access_token: 'EAAliG7mvpQkBAHoWfPfpw4WyFUTW0N1zyLb8yrrHu6vLZBfCNE1I9ByMJ83JLaJZCnlgeqyU1Lu3HQyZAUzJa89wq2CYdpDGQZCKpeZAaOBoKoM13ME5UfC6FZBYJMMrJeZAz9sC5ZBjnI3D17fGNU1p1dvmbtzCwSioVM7ivB77OAZDZD'},
    method: "POST",
    json: {
      recipient: {id: recipientId},
      message: {
        attachment:{
          type: "template",
          payload:{
            template_type: "button",
            text: "Based on the messages you wanted analyzed, here is a custom resource for you.",
            buttons: customizedResources,
          }
        }
      }
    }
  });

}
var custombuttons =[{
  type:"web_url",
  url: "https://suicidepreventionlifeline.org",
  title: "Suicide Lifelife"
} ,{
  type:"web_url",
  url: "https://www.thehotline.org/help/",
  title: "National Abuse Line"
} ];

function sendLocalHelp(recipientId){
  request({
    url: "https://graph.facebook.com/v6.0/me/messages", 
    qs: {access_token: 'EAAliG7mvpQkBAHoWfPfpw4WyFUTW0N1zyLb8yrrHu6vLZBfCNE1I9ByMJ83JLaJZCnlgeqyU1Lu3HQyZAUzJa89wq2CYdpDGQZCKpeZAaOBoKoM13ME5UfC6FZBYJMMrJeZAz9sC5ZBjnI3D17fGNU1p1dvmbtzCwSioVM7ivB77OAZDZD'},
    method: "POST",
    json: {
      recipient: {id: recipientId},
      message: {
        attachment:{
          type: "template",
          payload:{
            template_type: "button",
            text: "Local Help is on the way!",
            buttons: [
              {
                type:"web_url",
                url: "https://www.domesticshelters.org/",
                title: "Domestic Shelters"
              },
            ]
          }
        }
      }
    }
  });

}



var analyzing = false;
var helping = false;
function processMessage(event) {
  if (!event.message.is_echo) {
    var message = event.message;
    var senderId = event.sender.id;

    console.log("Received message from senderId: " + senderId);
    console.log("Message is: " + JSON.stringify(message));

    // You may get a text or attachment but not both
    if (message.text) {
      var formattedMsg = message.text.toLowerCase().trim();

      // Check for special keywords
      if (formattedMsg === "analyze") {
        analyzing = true;
        sendMessage(senderId, {text: "I understand you'd like to analyze your relationship. Please copy & paste a conversation you'd like analyzed."});
      } 
      else if(formattedMsg === "help"){
        helping=true;
        sendMessage(senderId, {text: "Help is here for you. Enter local or national for help near or far."});
      }
      else if (analyzing) {
        analyzing = false;
        localMessages.push(formattedMsg);
        analyzeMessages(senderId, formattedMsg);
      } 
      else if(helping){
        if(formattedMsg==="national"){
          customizedResources=customizeHelp();
          sendHelpTemplate(senderId, customizedResources);
          helping=false;
      
        }
        else if(formattedMsg==="local"){
          console.log("local was understood");
          sendLocalHelp(senderId);
          helping=false;
        }
  
        
        else{
          sendMessage(senderId, {text: " Sorry, we didn't understand your help request. Try local or national."});
          helping=true;

        }
      }
      
      else {
        sendMessage(senderId, {text: "Sorry, I don't understand your request."});
      }
    }
   else if (message.attachments) {
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
      var tones = tonesJSON["result"]["document_tone"]["tones"];
      var emotions = ["Sadness", "Joy", "Fear", "Disgust", "Anger"];
      var spacing = ["\t\t", "\t\t\t", "\t\t", "\t\t", "\t\t"];
      var tonesMap = new Map();
      var text = '';

      for (tone in tones) {
        tonesMap.set(String(tones[tone]["tone_name"]), tones[tone]["score"]);
      }

      for (emotion in emotions) {
        if (tonesMap.has(emotions[emotion])) {
          text = text + emotions[emotion] + ":" + spacing[emotion] + Math.round(tonesMap.get(emotions[emotion])/1 * 100) + '%\n';
        } else {
          text = text + emotions[emotion] + ":" + spacing[emotion] + "  0%" + '\n';
        }
      }

      text = text + '\n' + "For more information on what these percentages mean, type 'More Info'. Type 'help' to access local/national help and hotlines.";

      console.log("Message Analysis Output: " + JSON.stringify(tones, null, 2));
      sendMessage(senderId, {text: text});
    })
    .catch(err => {
      console.log('error:', err);
    });
}
//trigger warning
// this is a highly specific keyword search to better determine the help user may need. 
//It is in no way a replacement for professional help and just a start for distressed users.

  var cyberCrimeJson
function customizeHelp(){
  var customHelp=[];
  
  for(message in localMessages){
    console.log(message);
    if(localMessages[message].includes("kill you") ){
      if(!customHelp.includes(domesticAbusejson)){
        customHelp.push(domesticAbusejson);
      }
    
      
    }
    if(localMessages[message].includes("kill yourself") || localMessages[message].includes("kill myself")){
      if(!customHelp.includes(suicideLineJson)){
        customHelp.push(suicideLineJson);
      }
      

    }
    if(localMessages[message].includes("fat") || localMessages[message].includes("pig")){
      if(!customHelp.includes(eatingLineJson)){
        customHelp.push(eatingLineJson);
      }
      
    }
     if(localMessages[message].includes("nudes") || localMessages.includes("revenge porn")){
       if(!customHelp.includes(cyberCrimeJson)){
        customHelp.push(cyberCrimeJson);
       }
      
    }
    if(customHelp.length==0){
      //if none of those keywords were recognized, then give them the default domestic line
      customHelp.push(domesticAbusejson);

    }
  }
  return customHelp;
}