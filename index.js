var fs = require('fs'),
    http = require('http'),
    request = require('request'),
    sonos = require('sonos'),
    url = require('url'),
    util = require('util');

function startServer(sonos) {
  console.log(sonos);
  var server = http.createServer(function (req, res) {
    var requestUrl = url.parse(req.url, true);
    if (requestUrl.pathname === '/now-playing.js') {
      fs.readFile('./client.js', function(err, data) {
        res.end(data);
      });
    } else if (requestUrl.pathname === "/status") {
      sonos.getCurrentState(function (err, state) {
        sonos.currentTrack(function(err, track) {
          if (err) {
            console.log(err);
            res.writeHead(404);
            res.end();
            return;
          }
          console.log(track);
          if (!track.albumArtURL) {
            res.writeHead(404);
            res.end();
            return;
          }
          var artUrl = (url.parse(track.albumArtURL).hostname)
            ? track.albumArtURL
            : url.resolve(url.format({protocol: "http", hostname: sonos.host, port: sonos.port}), track.albumArtURL);
          request({ uri: artUrl, encoding: 'binary'}, function(err, response, body) {
            if (err) {
              console.log(err);
              res.writeHead(404);
              res.end();
              return;
            }
            res.writeHead(200, {"Content-Type": "application/javascript"});
            fs.readFile('./template.html', function(err, data) {
      	      data = new String(data).replace(/(\r\n|\n|\r)/gm, '')
      	      data = data.replace(/\{([a-zA-Z\-]+)\}/gm, function(match, capture) {
                if (capture === 'album-art') {
                  return 'data:image/gif;base64,' + new Buffer(body.toString(), 'binary').toString('base64');
                } else if (capture === 'state') {
                  return state;
                } else {
                  return track[capture].replace('\'', '&#39;');
                }
              });
              res.end(requestUrl.query.callback + '(\'' + data + '\')');
            });
          });
        });
      });
    } else if (requestUrl.pathname === "/zones") {
      sonos.getTopology(function (err, top) {
          if (err) {
            console.log(err);
            res.writeHead(503);
            res.end();
            return;
          }
          var zones = {};
          top.zones.forEach(function (zone) {
            //console.log(zone);
            if (zone.name === "BRIDGE" || zone.name.substring(0, 5) === "BOOST") return;
            if (!zones[zone.group]) {
              zones[zone.group] = { members: []};
            }
            if (zone.coordinator === 'true') {
              zones[zone.group].name = zone.name + " (" + url.parse(zone.location).hostname + ")";
            } else {
              zones[zone.group].members.push(zone.name + " (" + url.parse(zone.location).hostname + ")");
            }
          });
          for (var zone in zones) {
            var z = zones[zone];
            if (z.members.length === 0) {
              z.displayName = z.name;
            } else {
              z.displayName = z.name + " +" + z.members.length;
            }
          };
          res.writeHead(200, {"Content-Type": "application/json"});
          res.end(JSON.stringify(zones));
        });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(process.env.LISTEN_PORT || 8000);

  console.log("Server started");
}

if (process.env.SONOS_HOST) {
  startServer(new sonos.Sonos(process.env.SONOS_HOST));
} else {
  var search = sonos.search()
  var timeout = setTimeout(function () {
    search.socket.close();
    console.log("Sonos system not found on network");
  }, 5000);

  search.once('DeviceAvailable', function(dev, model) {
    clearTimeout(timeout);
    search.socket.close();
    console.log("Found model: ", model, "@", dev.host);
    startServer(dev);
  });
}
