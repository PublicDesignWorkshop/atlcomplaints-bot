var request = require('request').defaults({ encoding: null });
var moment = require('moment');
var Twit = require('twit')
var accelaConfig = require('./accela-config');
var twitterConfig = require('./twitter-config');

console.log(Date());
var Bot = new Twit(twitterConfig);

// http request option to get access token from Accela API
// using an Accela account
var oauthOptions = {
  method: 'POST',
  url: 'https://apis.accela.com/oauth2/token',
  json: true,
  headers: {
    'content-type': 'application/x-www-form-urlencoded',
    'cache-control': 'no-cache'
  },
  form: accelaConfig
};

// make the request to Accela API using the options above
request(oauthOptions, function (error, response, body) {
  if (error) console.error('error getting access token', error);

  // get the access token needed to make future calls to Accela API
  var accela_token = body.access_token;
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
      authorization:  accela_token
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