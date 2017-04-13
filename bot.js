//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const cron = require('node-cron');

var messengerButton = "<html><head><title>wyd</title></head><body><h1>wyd</h1><h3>time tracking bot</h3><p>Link: <a href=\"https://www.facebook.com/wydbot\">wyd on Facebook</a></p></body></html>";

const DBWrapper = require('./db.js');
const db = new DBWrapper()

// The rest of the code implements the routes for our Express server.
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Display the web page
app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(messengerButton);
  res.end();
});

// Message processing
app.post('/webhook', function (req, res) {
  //console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;

      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          receivedPostback(event);   
        } else {
          //console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});

// Incoming events handling
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;
  
  const responses = ['kl', 'sick', 'i got u fam', 'yes mate', 'ok lol', 'Thank you - your debit card has been charged.']
  
  // logging -----------------------------------------------------------------------------
  
  console.log('---------MESSAGE RECEIVED----------')
  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log('Message:', JSON.stringify(message));
  console.log('Sender', event.sender);
  console.log('-----------MESSAGE END-------------')
  
  // ----------------------------------------------------------------------------- logging
  
  // If the message has attachments, we can't do anything:
  
  if (message.attachments) {
    sendTextMessage(senderID, "sorry lad I only understand words");
    return false
  }
  
  // If the message doesn't have attachments, we do our thing:
  
  db.checkIfUserExists(senderID).then(response => {
    if (response) { // user exists
      return Promise.resolve(true)
    } else { // user doesn't exist
      return db.createUser(senderID)
    }
  }).then(boolean => {
    return db.addEvent(event)
  }).then(res => {
    const response = responses[Math.floor(Math.random() * responses.length)];
    sendTextMessage(senderID, response);
  }).catch(err => {
    console.error('Uncaught error: something went wrong somewhere', err)
    const response = 'sorry fam something went wrong - pls message Taimur and tell him so that he can fix it :)'
    sendTextMessage(senderID, response);
  })
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);

  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  sendTextMessage(senderID, "Postback called");
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "rift",
            subtitle: "Next-generation virtual reality",
            item_url: "https://www.oculus.com/en-us/rift/",               
            image_url: "http://messengerdemo.parseapp.com/img/rift.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/rift/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for first bubble",
            }],
          }, {
            title: "touch",
            subtitle: "Your Hands, Now in VR",
            item_url: "https://www.oculus.com/en-us/touch/",               
            image_url: "http://messengerdemo.parseapp.com/img/touch.png",
            buttons: [{
              type: "web_url",
              url: "https://www.oculus.com/en-us/touch/",
              title: "Open Web URL"
            }, {
              type: "postback",
              title: "Call Postback",
              payload: "Payload for second bubble",
            }]
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    console.log('--------SENDING MESSAGE---------')
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;
      
      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
    console.log('--------SENT MESSAGE---------')
  });
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});

//////////////////////////
// Cron job
//////////////////////////

function messageAllUsers() {
  const messages = ['wyd?', 'wuu2?', 'what are you doing', 'wyd', 'wyd??', 'wyd???']
  const message = messages[Math.floor(Math.random() * messages.length)]
  db.getAllFbids().then(fbids => {
    fbids.forEach(id => {
      sendTextMessage(id, message)
    })
  })
}

cron.schedule('*/15 * * * *', () => {
  console.log('Messaging all users!');
  messageAllUsers()
}, true);
    

  