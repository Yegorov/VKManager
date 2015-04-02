# Some snippets code on javascript (JQuery) & Chrome API that i use in VKManager

### Using JQuery

``` javascript

// Set propery src for img
$('#profilePhoto').prop('src', "http://example.com/my.png");

// Set text (for example: <div id="name">...</div> to <div id="name">Artem</div>)
$('#name').html('Artem');

// Set CSS property for element
$('#profileContent').css('display', 'block');

// Select links and other manipulation
var list = $('a.list-group-item');
// Access to 3 link
list.eq(2).prop('href', 'http://vk.com/')
              .html('My text');
 
// Click listeners
$('#signInVK').click(function (e) {
    // implementation of events
});

$(document).on("click", "#volumeUpBtn", function() {
    // implementation of events
});

```

### Asynchronous GET request using JQuery

``` javascript

$.ajax({
    type: 'GET',
    url: getProfileUrl(vkToken),
    dataType: 'jsonp',
    success: function (data) {
        alert("Data: " + data);
    }
});

```

### Asynchronous GET request with javascript XMLHttpRequest

``` javascript
request = new XMLHttpRequest();
request.open('GET', getProfileUrl(vkToken));
request.onload = function () {
    var answer = JSON.parse(request.response);
    // Other code after load data...
}   

request.send();
```

### Using Chrome API

``` javascript
// Open Tab
chrome.tabs.create({url: "http://google.com"});

// Close tab
chrome.tabs.remove(tabId, callback);

// Save token in Chrome   
chrome.storage.local.get({'vkaccess_token': {}}, function (items) {
    if (items.vkaccess_token.length === undefined) {
        $('#login').css('display', 'block');
        $('#wrap').css('display', 'none');
    }
    else {
        $('#login').css('display', 'none');
        $('#wrap').css('display', 'block');
    }
});

// Send message from popup to background page
chrome.extension.sendMessage({action : 'getToken'}, function(token){
    // implementation callback function
});

chrome.extension.sendMessage({action : 'auth', authUrl: getAuthUrl(settingsApp)});

// Recive messages from popup in background page
chrome.extension.onMessage.addListener(function(request, sender, callback){
    if(request.action == 'auth') {
        openAuthTab(request.authUrl);
    }
    else if (request.action == 'getToken') {
        callback(vkToken);
    }
});


// Download file 
chrome.downloads.download({url: "http://example.com/photo.jpg", filename: "my foto.jpg"}, function() {
    // implementation callback function
});

// Clear, create and show notification
chrome.notifications.clear("idNotification", function(a){ });
chrome.notifications.create("idNotification", 
    {
        type: 'basic', 
        iconUrl: 'img/iconNotification.png',
        title: "my title", 
        message: "my message"
    }, function(a){ });

// Set badge and title text for main icon
chrome.browserAction.setBadgeText({text: b});
chrome.browserAction.setTitle({title: t});

// Create tab and set update listener
chrome.tabs.create({url: authUrl, selected: true}, function (tab) {
    chrome.tabs.onUpdated.addListener(listenerHandler(tab.id));
});

```

### Use JS library

``` javascript

alertify.success('Start downloading...', 2, null);
alertify.warning(message, timeSec, callback); 

// obj = { method: "user.get", param: "fields=name,city&otherparam=true", token="as23cd21m9sv9bd7avvd"}
sprintf('https://api.vk.com/method/%(method)s?%(param)s&v=5.29&access_token=%(token)s', obj);

```

### Other

``` javascript

// Main function start when onload popup page
(function() {
    checkUserToken();
})();

// Create, add id and append to body element
audioHtmlTag = document.createElement("AUDIO");
audioHtmlTag.setAttribute("id", "audioplayer");
document.body.appendChild(audioHtmlTag);

// JS listener
document.getElementById("audioplayer").addEventListener("ended", callback);
// or
document.getElementById("audioplayer").onended = callback;

```


### Original auth in [vk.com-rehosting-in-docs](https://github.com/crea7or/vk.com-rehosting-in-docs)

``` javascript

/**
 * Retrieve a value of a parameter from the given URL string
 *
 * @param {string} url Url string
 * @param {string} parameterName Name of the parameter
 *
 * @return {string} Value of the parameter
 */
function getUrlParameterValue(url, parameterName) {
    "use strict";
    var urlParameters = url.substr(url.indexOf("#") + 1),
        parameterValue = "",
        index,
        temp;
    urlParameters = urlParameters.split("&");
    for (index = 0; index < urlParameters.length; index += 1) {
        temp = urlParameters[index].split("=");
        if (temp[0] === parameterName) {
            return temp[1];
        }
    }
    return parameterValue;
}

/**
 * Chrome tab update listener handler. Return a function which is used as a listener itself by chrome.tabs.obUpdated
 *
 * @param {string} authenticationTabId Id of the tab which is waiting for grant of permissions for the application
 * @param {string} imageSourceUrl URL of the image which is uploaded
 *
 * @return {function} Listener for chrome.tabs.onUpdated
 */     
function listenerHandler(authenticationTabId, imageSourceUrl) {
    "use strict";
    return function tabUpdateListener(tabId, changeInfo) {
        var vkAccessToken,
            vkAccessTokenExpiredFlag;
        if (tabId === authenticationTabId && changeInfo.url !== undefined && changeInfo.status === "loading") {
            if (changeInfo.url.indexOf('oauth.vk.com/blank.html') > -1) {
                authenticationTabId = null;
                chrome.tabs.onUpdated.removeListener(tabUpdateListener);
                vkAccessToken = getUrlParameterValue(changeInfo.url, 'access_token');
                if (vkAccessToken === undefined || vkAccessToken.length === undefined) {
                    displayeAnError('vk auth response problem', 'access_token length = 0 or vkAccessToken == undefined');
                    return;
                }
                vkAccessTokenExpiredFlag = Number(getUrlParameterValue(changeInfo.url, 'expires_in'));
                if (vkAccessTokenExpiredFlag !== 0) {
                    displayeAnError('vk auth response problem', 'vkAccessTokenExpiredFlag != 0' + vkAccessToken);
                    return;
                }
                chrome.storage.local.set({
                    'vkaccess_token': vkAccessToken
                }, function() {
                    chrome.tabs.update(
                        tabId, {
                            'url': 'upload.html#' + imageSourceUrl + '&' + vkAccessToken,
                            'active': true
                        },
                        function(tab) {}
                    );
                });
            }
        }
    };
}

```