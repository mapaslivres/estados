var VERSION = '0.1.0';
var _ = require('underscore');
var request = require('request').defaults({jar: true});

var query = _.template("[out:json][timeout:<%=timeout%>];<%=query%>out body;")

function Overpass(options) {
  if (!(this instanceof Overpass)) return new Overpass(options);

  var self = this;

  var defaults = {
    endpoint: "http://overpass-api.de/api/interpreter",
    timeout: 30 * 1000, // milisecs
    responseformat: "json"
  };

  self.options = _.extend(defaults, options);

}
Overpass.VERSION = VERSION;

Overpass.prototype.get = function(userquery, done){
  var self = this;

  // console.log(query({
  //   timeout: self.options.timeout / 1000,
  //   query: userquery
  // }));

  request({
    method: "GET",
    uri: self.options.endpoint,
    timeout: self.options.timeout,
    qs: {
      data: query({
        timeout: self.options.timeout / 1000,
        query: userquery
      })
    }
  }, function(error, response, body) {
    if (error) return done(error);
    done(null, JSON.parse(body) || {});
  });
}

module.exports = Overpass;
