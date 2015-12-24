function scriptHost() {
  try {
    throw new Error();
  }
  catch(e) {
    var stackLines = e.stack.split('\n');
    var callerIndex = 0;
    for(var i in stackLines){
      if(!stackLines[i].match(/http[s]?:\/\//)) continue;
      callerIndex = Number(i);
      break;
    }
    pathParts = stackLines[callerIndex].match(/(http[s]?:\/\/.+)\/.*:/);
    return pathParts[1];
  }
  return '';
}

var style = document.createElement('style');
style.textContent = "div.icon{height:100px;width:60px;overflow:hidden;display:inline-block;float:left;}\
div.icon div.playing{width:0;height:0;border-style:solid;border-color:transparent transparent transparent #fff;border-width:25px 0px 25px 40px;margin:25px 0 0 10px;}\
div.icon div.paused{width:5px;height:40px;border:20px solid #fff;border-top:none;border-bottom:none;margin:30px 0 0 8px;}\
div.icon div.stopped{width:40px;height:40px;margin:30px 0 0 10px;background:#fff;}";
document.head.appendChild(style);

var container = document.createElement('div');
container.id = 'sonos-container';
document.body.appendChild(container);

var statusUrl = scriptHost() + '/status';
var update = (function() {
  var callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
  window[callbackName] = function(html) {
      delete window[callbackName];
      document.body.removeChild(script);
      container.innerHTML = html;
  };

  var script = document.createElement('script');
  script.onerror = function() {
    delete window[callbackName];
    document.body.removeChild(script);
  }
  script.src = statusUrl + '?callback=' + callbackName;
  document.body.appendChild(script);
});

setInterval(update, 15000);
update();
