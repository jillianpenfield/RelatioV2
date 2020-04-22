
var express = require("express");
var request = require("request");
var bodyParser = require("body-parser");

var app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.listen((process.env.PORT || 5000));

//local variables
var zipcodeRegEx= RegExp('[0-9][0-9][0-9][0-9][0-9]');
var localMessages= [];
var mostRecentAnalysis = new Map();
//var accessToken=config.MY_FB_ACCESS_TOKEN;
//var watsonKey=config.MY_WATSON_KEY;

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
  url: "https://www.nationaleatingdisorders.org",
  title: "Eating Disorder Line"
};
var cyberCrimeJson={
  type:"web_url",
  url: "https://www.cybercivilrights.org",
  title: "Cyber Civil Rights"
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
      var message = "Hi there! Welcome to Relatio - the messaging agent that can analyze your relationship! Your actions are 'analyze' or 'get support.' You can always type 'help' if you forget the valid commands. We hope you enjoy.";
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
            text: "Local support is on the way!",
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
      else if(formattedMsg === "get support"){
        helping=true;
        sendMessage(senderId, {text: "Support is here for you. Enter 'local' or 'national' for support near or far."});
      }
      else if (formattedMsg === "help") {
        sendMessage(senderId, {text: "To use Relatio, type 'analyze' to analyze a conversation or type 'get support' for local or national hotlines." });
      }
      else if (formattedMsg === "more info") {
        if( mostRecentAnalysis.size > 0) {
          getMoreInfo(senderId);
        } else {
          sendMessage(senderId, {text: "Please analyze a conversation to get more info on. To do that, type 'analyze'."});
        }
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
          sendMessage(senderId, {text: " Sorry, we didn't understand your support request. Try 'local' or 'national.'"});
          helping=true;

        }
      }
      
      else {
        sendMessage(senderId, {text: "Sorry, I don't understand your request. Type 'help' for valid Relatio commands."});
      }
    }
   else if (message.attachments) {
    sendMessage(senderId, {text: "Sorry, I don't understand your request. Type 'help' for valid Relatio commands."});
    }
  }
}

function getMoreInfo(senderId) {
  var sadness = Math.round(mostRecentAnalysis.get("Sadness")/1 * 100) || null;
  var joy = Math.round(mostRecentAnalysis.get("Joy")/1 * 100) || null;
  var fear = Math.round(mostRecentAnalysis.get("Fear")/1 * 100) || null;
  var disgust = Math.round(mostRecentAnalysis.get("Disgust")/1 * 100) || null;
  var anger = Math.round(mostRecentAnalysis.get("Anger")/1 * 100) || null;
  var text = "";

  if (sadness > 74) {
    text = text + "There is a high likelihood that your conversation depicts sadness. Sadness is often defined as a transient emotional "
          + "state characterized by feelings of disappointment, grief, hopelessness, disinterest, and dampened mood. Sadness can often "
          + "lead to people engaging in negative coping mechanisms. If you find yourself experiencing a lot of sadness in your relationship, "
          + "help is here for you!\n\n";
  } else if (sadness > 49) {
    text = text + "There is a medium likelihood that your conversation depicts sadness. Sadness is something all relationships experience "
          + "from time to time. The type and severity of sadness can vary depending upon root cause and how people cope with such feelings.\n\n";
  } else {
    text = text + "There is no sadness detected in your conversation. Woo hoo!\n\n";
  }

  if (joy > 74) {
    text = text + "There is a high likelihood that your conversation depicts joy. Joy tends ot be the emotion people strive for the most. Joy has been linked to a variety of outcomes such as increased "
          + "longevity and increased marital satisfaction. Keep up the great work!\n\n";
  } else if (joy > 49) {
    text = text + "There is a medium likelihood that your conversation depicts joy. Research has supported the idea that joy can play a role in both physical "
          + "and mental health. You're on the right track!\n\n"
  } else {
    text = text + "There is no joy detected in your conversation. Unhappiness has been linked to a variety of poor health outcomes such as stress, "
          +  "anxiety, depression, and loneliness. If you find yourself never truly experiencing joy in your relationship, help is here for you!\n\n";
  }

  if (fear > 74) {
    text = text + "There is a high likelihood that your conversation depicts fear. Fear is the emotional response to an immediate threat putting our bodies "
          + "into fight or flight mode. Expressions of this type of emotion can include attempts to hide or flea from the threat as well as rapid breathing and heartbeat. " 
          + "If you find yourself experiencing a lot of fear in your relationship, help is here for you!\n\n";
  } else if (fear > 49) {
    text = text + "There is a medium likelihood that your conversation depicts fear. Not everyone experiences fear in the same way - some people may be more sensitive to "
          + "fear and certain situations or objects may be more likely to trigger this emotion. Some people actually seek out fear-provoking situations.\n\n";
  } else {
    text = text + "There is no fear detected in your conversation. Go you!\n\n";
  }

  if (disgust > 74) {
    text = text + "There is a high likelihood that your conversation depicts disgust. Disgust can be displayed in a number of ways including "
          + "physical reactions, such as vomiting or retching, or facial expressions. This sense of revulsion can originate from a number of things, "
          + "including an unpleasant taste, sight, or smell, or even a person's morals. If you find yourself experiencing a lot of disgust in your relationship, "
          + "help is here for you!\n\n";
  } else if (disgust > 49) {
    text = text + "There is a medium likelihood that your conversation depicts disgust. People can experience disgust from a number of things including an unpleasant "
          + "taste, sight, or smell, as well as moral disgust when they observe others engaging in behaviors they fnd distateful, immoral, or evil.\n\n";
  } else {
    text = text + "There is no disgust detected in your conversation. Way to go!\n\n";
  }

  if (anger > 74) {
    text = text + "There is a high likelihood that your conversation depicts anger. Anger can be a particularly powerful emotion characterized "
          + "by feelings of hostility, agitation, frustration, and antagonism towards others. Anger can become a problem when it is excessive or expressed "
          + "in ways that are unhealthy, dangerous, or harmful to others. Uncontrollable anger can quickly turn to aggression, abuse, or violence. "
          + "If you find yourself experiencing anger often in your relationship, help is here for you!\n\n";
  } else if (anger > 49) {
    text = text + "There is a medium likelihood that your conversation depicts anger. While anger is often thought of as a negative emotion, it can sometimes be a good thing. "
          + "It can be constructive in clarifying your needs in a relationship and it can also motivate you to take action and find solutions to things that are bothering you. \n\n";
  } else {
    text = text + "There is no anger detected in your conversation. Keep it up!\n\n";
  }
  
  sendMessage(senderId, {text: text});
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
      mostRecentAnalysis = tonesMap;

      for (emotion in emotions) {
        if (tonesMap.has(emotions[emotion])) {
          text = text + emotions[emotion] + ":" + spacing[emotion] + Math.round(tonesMap.get(emotions[emotion])/1 * 100) + '%\n';
        } else {
          text = text + emotions[emotion] + ":" + spacing[emotion] + "  0%" + '\n';
        }
      }

      text = text + '\n' + "For more information on what these percentages mean, type 'more info'. Type 'get support' to access local/national help and hotlines.";

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

var cyberCrimeJson;
function customizeHelp(){
  var customHelp=[];
  
  for(message in localMessages){
    console.log(message);

    if(!customHelp.includes(domesticAbusejson)){
      customHelp.push(domesticAbusejson);
    }
    
    if(localMessages[message].includes("kill yourself") || localMessages[message].includes("kill myself")){
      console.log("suicide line activated");
      console.log("message is" +localMessages[message]);
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
  
  }
  return customHelp;
}