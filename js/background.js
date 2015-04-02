var vkToken = null;

var audioHtmlTag = null;

/**
* The object implements the actions of primitive audio player.
* 
* @author Artem Yegorov <yegorov0725@yandex.ru>
* @version 1.0.0
*/
var audio = {
        isInit: false,
        isPlay: false,
        init: function() {
            audioHtmlTag = document.createElement("AUDIO");
            audioHtmlTag.setAttribute("id", "audioplayer");
            document.body.appendChild(audioHtmlTag);
            getPlayList(0, this.COUNT_SOUNDS); 
            this.audioPlayer().onended = this.ended;
            this.isInit = true;
        },
        volume: 0.5, // 50 %
        current: 0,
        repeat: 2, // 0 no repeat, 1 repeat one sounds, 2 repeat all
        offset: 0,
        count: -1, 
        COUNT_SOUNDS: 5,
        playList: [],
        audioPlayer: function() {
            return document.getElementById("audioplayer");
        },
        play: function() {
            if(!this.isInit) {
                this.init();
            }
            else {
                if(this.isPlay) {
                    this.audioPlayer().pause();
                    this.isPlay = false;
                } else {
                    //console.log(this);
                    this.audioPlayer().play();
                    this.isPlay = true;
                }
            }

        },
        next: function() {
            if(!this.isInit) {
                return;
            }
            this.audioPlayer().pause();
            ++this.current;
            //console.log(this);
            if(this.current < this.count) {
                if(this.current - this.offset < this.COUNT_SOUNDS) {
                    this.audioPlayer().src = this.playList[this.current - this.offset].url;
                    this.audioPlayer().play();
                    this.isPlay = true;
                    this.notify();
                }
                else {
                    this.offset += this.COUNT_SOUNDS;
                    this.getNextList();
                }
            }
            else {
                this.current = 0;
                this.offset = 0;
                this.getNextList();
            }

        },
        prev: function() {
            if(!this.isInit) {
                return;
            }
            this.audioPlayer().pause();
            --this.current;
            //console.log(this);
            if(this.current >= 0) {
                if(this.current - this.offset >= 0) {
                    this.audioPlayer().src = this.playList[this.current - this.offset].url;
                    this.audioPlayer().play();
                    this.isPlay = true;
                    this.notify();
                }
                else {
                    this.offset -= this.COUNT_SOUNDS;
                    this.getNextList();
                }
            }
            else {
                this.current = this.count - 1;
                this.offset = parseInt(this.count / this.COUNT_SOUNDS) * this.COUNT_SOUNDS;
                this.getNextList();
            }
        },
        ended: function() {
            //console.log("ended AUDIO");
            //if(this.repeat == 1)
            //    this.audioPlayer().play();
            //else if(this.repeat == 2)

            // this.next(); not working
            audio.next();
        },
        volumeUp: function() {
            this.volume += 0.1;
            if(this.volume >= 1.0)
                this.volume = 1.0;
            this.audioPlayer().volume = this.volume;
        },
        volumeDown: function() {
            this.volume -= 0.1;
            if(this.volume <= 0.1)
                this.volume = 0.1;
            this.audioPlayer().volume = this.volume;
        },
        notify: function() {
            chrome.notifications.clear("audio", function(a){});
            chrome.notifications.create("audio", 
                {
                    type: 'basic', 
                    iconUrl: 'img/music-icon150.png',
                    title: "Current track", 
                    message: this.playList[this.current - this.offset].artist + " - " + this.playList[this.current - this.offset].title
                }, function(s){});
        },
        getNextList: function() {
            getPlayList(this.offset, this.COUNT_SOUNDS);
        },
        disable: function() {
            this.audioPlayer().pause();
            this.isInit = false;
            this.isPlay = false;
            this.current = 0;
            this.offset = 0;
            this.count = -1;
        }
};

/**
* Return link for send HTTP (GET) requests
* More info: https://vk.com/dev/api_requests
*
* @param {p} Object that has the properties: method, param, token.
*
* @return {string} link
*/
function vkUrl(p) {
    return 'https://api.vk.com/method/' + p.method + '?' + p.param + '&v=5.29&access_token=' + p.token;
}

/**
* Asynchronous GET request for get audio playlist
* More info: https://vk.com/dev/audio.get
*
* @param {offset} Offset needed to return a specific subset of audio files
* @param {count} Number of audio files to return in playlist
*/
function getPlayList(offset, count) {
    request = new XMLHttpRequest();
    request.open('GET', vkUrl(({method: "audio.get", param: "offset=" + offset + "&count=" + count, token: vkToken})));
    request.onload = function() {
        var answer = JSON.parse(request.response);
        answer = answer.response;
        audio.playList = answer.items;
        // no implement if user added melody 
        // var audioOffset = audio.count - answer.count;
        audio.count = answer.count;

        //console.log(audio.playList);
        //console.log(audio.playList[audio.current - audio.offset].url);
        audio.notify();

        audio.audioPlayer().src = audio.playList[audio.current - audio.offset].url;
        audio.audioPlayer().play();
        audio.isPlay = true;
    }   

    request.send();
}

/**
* Display an alert with an error message, description
*
* @param {string} textToShow Error message text
* @param {string} errorToShow Error to show
*/
function displayAnError(textToShow, errorToShow) {
    alert(textToShow + '\n' + errorToShow);
}

/**
* Retrieve a value of a parameter from the given URL string
*
* @param {string} url Url string
* @param {string} parameterName Name of the parameter
*
* @return {string} Value of the parameter
*/
function getUrlParameterValue(url, parameterName) {

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
*
* @return {function} Listener for chrome.tabs.onUpdated
*/
function listenerHandler(authenticationTabId) {

    return function tabUpdateListener(tabId, changeInfo) {
        var vkAccessToken,
            vkAccessTokenExpiredFlag;

        //displayAnError("test", changeInfo.url);

        if (tabId === authenticationTabId) {
            if (("" + changeInfo.url).indexOf('oauth.vk.com/blank.html#access_token') > -1) {

                //displayAnError("test indexOf", changeInfo.url.indexOf('oauth.vk.com/blank.html'));

                vkAccessToken = getUrlParameterValue(changeInfo.url, 'access_token');
                if (vkAccessToken === undefined || vkAccessToken.length === undefined) {
                    displayeAnError('vk auth response problem', 'access_token length = 0 or vkAccessToken == undefined');
                    return;
                }

                /* Check Infinity token
                vkAccessTokenExpiredFlag = Number(getUrlParameterValue(changeInfo.url, 'expires_in'));
                if (vkAccessTokenExpiredFlag !== 0) {
                    displayAnError('vk auth response problem', 'vkAccessTokenExpiredFlag != 0' + vkAccessToken);
                    return;
                }
                */

                vkToken = vkAccessToken;
                chrome.tabs.remove(tabId, null);
            }
            else if(("" + changeInfo.url).indexOf('oauth.vk.com/blank.html#error') > -1) {
                chrome.tabs.remove(tabId, null);
                displayAnError("Not authorization", "Please, sign in VK and press Allow");
            }
            else {
                //displayAnError("error", changeInfo.url.indexOf('oauth.vk.com/blank.html'));
            }
        }
    };
}

/**
* Open authorization dialog in new tab and add listener
*/
function openAuthTab(authUrl) {
    chrome.tabs.create({url: authUrl, selected: true}, function (tab) {
        chrome.tabs.onUpdated.addListener(listenerHandler(tab.id));
    });
}

/**
* Listener messages from popup
*/
chrome.extension.onMessage.addListener(function(request, sender, callback){
    if(request.action == 'auth') {
        openAuthTab(request.authUrl);
    }
    else if (request.action == 'getToken') {
        callback(vkToken);
    }
    else if (request.action == 'exit') {
        vkToken = null;
        audio.disable();
    }
    else if(request.action == 'getAudio') {
        callback(audio.count == -1 ? "Press play": audio.count);
    }
    else if(request.action == 'play') {
        audio.play();
        callback(audio.isPlay);
    }
    else if(request.action == 'next') {
        audio.next();
    }
    else if(request.action == 'prev') {
        audio.prev();
    }
    else if(request.action == 'volumeUp') {
        audio.volumeUp();
    }
    else if(request.action == 'volumeDown') {
        audio.volumeDown();
    }
    else if(request.action == 'download') {
        console.log(audio.isInit);
        if(audio.isInit)
            callback(audio.playList[audio.current - audio.offset]);
        else
            callback(null);
    }

});