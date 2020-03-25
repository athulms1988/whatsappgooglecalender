const express = require('express');
const cors = require('cors');
const app = express();
const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const apiEndpoint = process.env.apiEndpoint;
const client = require('twilio')(accountSid, authToken);
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const waterfall = require('async-waterfall');
const rp = require('request-promise');
app.use(cors())
app.use(require('body-parser').urlencoded({ extended: false }))

app.post('/sendmessage', (req, res) => {
    const body = [];
    req.on("data", (chunk) => {
        body.push(chunk);
    });
    req.on("end", () => {
        const parsedBody = Buffer.concat(body).toString();
        const data = JSON.parse(parsedBody);
        if(data.name && data.number && data.confirmation_number && data.email_id) {
            sendWhatsapp(data);
            res.status(200).json("ok");
        } else {
            res.status(400).json("Bad Request");
        }
    });
});

app.post('/whatsappwebhook', (req, res) => {
    let body = req.body.Body;
    let responseMessage = new MessagingResponse();
    if(body) {
        console.log(body);
        body = body.replace('```','').replace('```','');
        let messageSplits = body.split(' ');
        if(messageSplits && messageSplits.length === 3 && messageSplits[0].toLowerCase() === 'cancel') {
            let emailID = messageSplits[1];
            let confirmationNumber = messageSplits[2];
            waterfall([
                function(callback){
                    const options = {
                        uri: apiEndpoint + '/order/' + confirmationNumber,
                        qs: {
                            customerEmail: emailID
                        },
                    };
                    rp(options)
                        .then(function (data) {
                            if(JSON.parse(data).orderNumber) {
                                callback(null, JSON.parse(data).orderNumber);
                            } else {
                                callback("Sorry we are unable to retrieve booking details, Please try again later"); 
                            }
                        })
                        .catch(function (err) {
                            callback("Sorry we are unable to retrieve booking details, Please try again later");
                        });
                },
                function(orderNumber, callback){
                    const options = {
                        uri: apiEndpoint + '/order/' + orderNumber +'/cancel',
                        method: 'POST',
                        headers: {
                            'accountid': '1'
                        },
                        body: {
                            "id": orderNumber,
                            "customerEmail": emailID,
                            "reason":"TBD",
                            "brand":"CR",
                            "pos":"us",
                            "language":"en"
                        },
                        json: true
                    };
                    rp(options)
                        .then(function (data) {
                            callback(null, 'Your booking has been cancelled successfully, Thank you');
                        })
                        .catch(function (err) {
                            if(err && err.error && err.error.errorMessage && err.error.errorMessage !== "Order Already Cancelled") {
                                callback("Sorry, we are unable to cancel your booking, as "+err.error.errorMessage);
                            } else if (err && err.error && err.error.errorMessage && err.error.errorMessage === "Order Already Cancelled") {
                                callback("Your booking has been already cancelled, Thank you");
                            } else {
                                callback("Sorry, we are unable to cancel your booking. Can you please check your confirmation number and email id ?");
                            }
                        });
                }
                ], function (err, result) {
                    responseMessage.message(err || result);
                    res.set('Content-Type', 'text/xml');
                    res.send(responseMessage.toString()).status(200);
                // result now equals 'done'
                });
        } else {
            responseMessage.message("Sorry we are unable to process your request");
            res.set('Content-Type', 'text/xml');
            res.send(responseMessage.toString()).status(200);
        }
    } else {
        responseMessage.message("Sorry we are unable to process your request");
        res.set('Content-Type', 'text/xml');
        res.send(responseMessage.toString()).status(200);
    }
    
});

var sendWhatsapp = function(data) {
    var whatsappObj = {
        body: 'Hello '+data.name+'! Your booking has been confirmed. Booking number is '+data.confirmation_number+'. If you like to cancel the booking, reply to us ```cancel '+data.email_id+' '+data.confirmation_number+'```',
        from: 'whatsapp:+14155238886',
        mediaUrl: ['https://assets.autoescape-travel.com/vehicle-images/fox/us/toyota/corolla/icar.jpg'],
        to: 'whatsapp:' + data.number
    };
    if(data.image_url && data.image_url.split('.')[data.image_url.split('.').length - 1] != 'gif') {
        whatsappObj.mediaUrl =  [data.image_url];
    }
    client.messages
      .create(whatsappObj)
      .then(message => console.log(message.sid))
      .done();
}

app.listen(process.env.PORT || 3000);