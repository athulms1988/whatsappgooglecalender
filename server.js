const express = require('express');
const cors = require('cors');
const app = express();
const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const client = require('twilio')(accountSid, authToken);
app.use(cors())
app.use(require('body-parser').json());

app.post('/sendmessage', (req, res) => {
    const data = req.body;
    if(data.name && data.number && data.confirmation_number && data.email_id) {
        sendWhatsapp(data);
        res.status(200).json("poli sadhanam my!!");
    } else {
        res.status(400).json("Bad Request");
    }
});

app.post('/whatsappwebhook', (req, res) => {
    res.status(200).json("ok");
});

var sendWhatsapp = function(data) {
    client.messages
      .create({
        body: 'Hello '+data.name+'! Your booking has been confirmed. Booking number is '+data.confirmation_number+'. If you like to cancel the booking, reply to us *cancel '+data.email_id+' '+data.confirmation_number+'*',
        mediaUrl: data.image_url ? [data.image_url]: [],
        from: 'whatsapp:+14155238886',
        to: 'whatsapp:' + data.number
      })
      .then(message => console.log(message.sid))
      .done();
}

app.listen(process.env.PORT || 3000);