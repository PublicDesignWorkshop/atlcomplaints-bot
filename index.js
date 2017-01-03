var request = require('request').defaults({ encoding: null });
var moment = require('moment');
var Twit = require('twit')
var accelaConfig = require('./accela-config');
var twitterConfig = require('./twitter-config');

console.log(Date());
var Bot = new Twit(twitterConfig);


// var yesterday = moment().subtract(60, 'days').format('YYYY-MM-DD') + ' 00:00:00';
var today = moment().format('YYYY-MM-DD') + ' 00:00:00';

// http request options to make the search for code complaints to the api
// the search query is specified in the body
var searchOptions = {
  method: 'POST',
  url: 'https://apis.accela.com/v4/search/records/',
  qs: { expand: 'addresses' },
  headers: {
    'cache-control': 'no-cache',
    'content-type': 'application/json',
    'x-accela-appid': '636101632517218736',
    'x-accela-agency': 'Atlanta_Ga',
    'x-accela-environment': 'PROD'
  },
  body: {
    address: { city: 'Atlanta' },
    type: { type: 'Complaint' },
    openedDateFrom: today,
    openedDateTo: today
  },
  json: true
};

// make the actual search request
request(searchOptions, function (error, response, body) {
  if (error) console.error('error making search', error);

  for (var i = 0; i < body.result.length; i++) {
    var record = body.result[i];
    var address = record.addresses[0].streetStart + ' ' + record.addresses[0].streetName + ' ' + 
      (record.addresses[0].streetSuffix && record.addresses[0].streetSuffix.text ? record.addresses[0].streetSuffix.text : '');
    var description = record.description;
    console.log(record.id)
    var status = (description || '').replace(/^\s+|\s+$/g, ''); // trim whitespace
    if (status.length + address.length + ' : '.length <= 140) status += ((description ? ' : ' : '') + address);
    else if (status.length > 140) status = status.slice(0,137) + '...';
    console.log(status);

    // don't tweet all the result at once by creating a time delay
    staggerTweet(status, i * 1000 * 60 * 5);
  }
});

function staggerTweet(status, delay) {
  setTimeout(function() { createTweet(status) }, delay);
}

function createTweet(status) {
  // post tweet to Twitter account created with config file
  Bot.post('statuses/update', { status: status }, function(err, data, response) {
    if (err) console.error('error creating tweet', err);
    else console.log('done tweeting');
  });
}