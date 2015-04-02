var apiVkToken = '';

/**
* Object containing main settings VK
* More info: https://vk.com/dev/auth_mobile
*/
var settingsApp = {
    "app_id": "4814001",
    "scope": "friends,audio,messages",
    "redirect_uri": "https://oauth.vk.com/blank.html",
    "display": "page",
    "v": "5.28",
    "response_type": "token",
    "revoke": "1"
}

/**
* Return link for authorization consisting specific main VK settings
*
* @param {settingsApp} Main VK settings
*
* @return {string} Authorization link
*/
function getAuthUrl(settings) {
    return sprintf('https://oauth.vk.com/authorize?client_id=%(app_id)s&scope=%(scope)s&redirect_uri=%(redirect_uri)s&display=%(display)s&v=%(v)s&response_type=%(response_type)s&revoke=%(revoke)s', settings);
}

/**
* Return link for send HTTP (GET) requests
* More info: https://vk.com/dev/api_requests
*
* @param {p} Object that has the properties: method, param, token.
*
* @return {string} link
*/
function vkUrl(p) {
    return sprintf('https://api.vk.com/method/%(method)s?%(param)s&v=5.28&access_token=%(token)s', p);
}

function getProfileUrl(vkToken) {
    return vkUrl({method: "users.get", param: "fields=photo_200,city,country,status,about", token: vkToken});
}

function getDialogsUrl(vkToken) {
    return vkUrl({method: "execute.dialogs", param: "offset=0&count=5&preview_length=50", token: vkToken});
}

/**
* Asynchronous GET request for update profile tab
*
* @param {vkToken} User's auth VK token.
*/
function updateProfile(vkToken) {
    var request = new XMLHttpRequest();
    request.open('GET', getProfileUrl(vkToken));
    request.onload = function () {
        var answer = JSON.parse(request.response);

        $('#profilePhoto').prop('src', answer.response[0].photo_200);
        $('#name').html(answer.response[0].first_name + " " + answer.response[0].last_name);

        var city = "";
        var country = "";
        var status = "";
        var about = "Nothing...";
        if("city" in answer.response[0])
            city = answer.response[0].city.title;

        if("country" in answer.response[0])
            country = answer.response[0].country.title;

        $('#place').html(city + " " + country);

        if("status" in answer.response[0])
            status = answer.response[0].status;

        if(answer.response[0].about.length > 0)
            about = answer.response[0].about;

        status = status.substring(0, status.length > 30 ? 30 : status.length);

        if(answer.response[0].status.length > 30)
            status += "...";

        status = status.replace(/&#(\d*);/g, function(full, number) {
            return String.fromCodePoint(Number(number));
        });

        $('#status').html(twemoji.parse(status));

        $('#otherInfo').html(about);

        $('#profileContent').css('display', 'block');
        $('.loaderImg').css('display', 'none');
    }   

    $('#profileContent').css('display', 'none');
    $('.loaderImg').css('display', 'block');

    request.send();
}

/**
* Asynchronous GET request for update messages tab
*
* @param {vkToken} User's auth VK token.
*/
function updateDialog(vkToken) {
    var request = new XMLHttpRequest();
    request.open('GET', getDialogsUrl(vkToken));
    request.onload = function () {

        var answer = JSON.parse(request.response);
        var names = answer.response.u;
        answer = answer.response.d;

        var list = $('a.list-group-item');

        if(answer.items == []) {
            list.forEach(function(e, i, a) {
                e.html("You have not dialogs");
            });
        }

        answer.items.forEach(function(element, index, array) {
            if (index > 5) 
                return false;
            var sel = '';
            var title = '';
            if("chat_id" in element.message) {
                sel = 'c' + element.message.chat_id;
                title = element.message.title;
            }
            else {
                sel = element.message.user_id;
                title = names[index].first_name + ' ' + names[index].last_name;
            }
            list.eq(index).prop('href', 'http://vk.com/im?sel=' + sel)
                       .html((title.length > 30 ? title.substr(0, 30) : title) + ': ' + twemoji.parse(element.message.body));
            return true;
        });

        $('#messageBadge').css('display', 'inline-block').html(answer.count);

        $('#dialogList').css('display', 'block');
        $('.loaderImg').css('display', 'none');
    }   

    $('#dialogList').css('display', 'none');
    $('#messageBadge').css('display', 'none');

    $('.loaderImg').css('display', 'block');

    request.send();
}

/**
* The function checks whether the user is logged in to the application
* Show or hide login button
*/
function checkUserToken() {
    chrome.extension.sendMessage({action : 'getToken'}, function(token){
        $('#profileContent').css('display', 'none');
        if(token == null) {
            $('#login').css('display', 'block');
            $('#wrap').css('display', 'none');
        }
        else {
            $('#login').css('display', 'none');
            $('#wrap').css('display', 'block');
            apiVkToken = token;
            updateProfile(token);
        }
    });
}

function displayeAnError(textToShow, errorToShow) {
    alert(textToShow + '\n' + errorToShow);
}

function openAuthTab() {
    chrome.extension.sendMessage({action : 'auth', authUrl: getAuthUrl(settingsApp)});
}

/**
* Subscribe on click when pressed on the login button
* Open authorization dialog in new tab
*/
$('#signInVK').click(function (e) {
    openAuthTab();
});


/**
* Subscribe on click when pressed on the one of the last 5 messages
* Open dialog in new tab (vk.com/im?sel=....)
*/
$('a.list-group-item').click(function (e) {
    chrome.tabs.create({url: $(this).attr('href')});
});


$('#profileTab').click(function (e) {
    // add update profile if need user
});

/**
* Subscribe on click when pressed on the message tab
* Update last 5 messages
*/
$('#messageTab').click(function (e) {
    if(apiVkToken !== '')
        updateDialog(apiVkToken); 
});

/**
* Subscribe to click when pressed on the audio tab
* Update last 5 messages
*/
$('#audioTab').click(function (e) {
    chrome.extension.sendMessage({action : 'getAudio'}, function(countAudio) {
        $('#audioLabel').css('display', 'inline-block').html(countAudio);
    });
});

/**
* Subscribe to click when pressed on the exit tab
* Clean user token
*/
$('#exitTab').click(function (e) {
    chrome.extension.sendMessage({action : 'exit'});
    checkUserToken();
    // or close popup
    // window.close();
});

/**
* Subscribe to click when pressed on the audio prev button
* Send message to background audio player
*/
$('#prevBtn').click(function (e) {
    chrome.extension.sendMessage({action : 'prev'});
});

/**
* Subscribe to click when pressed on the audio play button
* Send message to background audio player
*/
$('#playBtn').click(function (e) {
    chrome.extension.sendMessage({action : 'play'}, function(isPlay) {
        if(isPlay) {
            $('#playText').html("Pause");
            $('#playSpan').removeClass("glyphicon-play");
            $('#playSpan').addClass("glyphicon-pause");
        }
        else {
            $('#playText').html("Play");
            $('#playSpan').removeClass("glyphicon-pause");
            $('#playSpan').addClass("glyphicon-play");
        }
    });
});

/**
* Subscribe to click when pressed on the audio next button
* Send message to background audio player
*/
$('#nextBtn').click(function (e) {
    chrome.extension.sendMessage({action : 'next'});
});

/**
* Open popup window with sound volume change
*/
$('#volumeBtn').popover({
    animation: true,
    trigger: 'click',
    placement : 'top',
    html: 'true',
    content : function() { return $('#volumeChange').html(); }
});

/**
* Subscribe to click when pressed on the audio volume up button
* Send message to background audio player
*/
$(document).on("click", "#volumeUpBtn", function() {
    chrome.extension.sendMessage({action : 'volumeUp'});
});

/**
* Subscribe to click when pressed on the audio volume down button
* Send message to background audio player
*/
$(document).on("click", "#volumeDownBtn", function() {
    chrome.extension.sendMessage({action : 'volumeDown'});
});

/**
* Subscribe to click when pressed on the download button
* Get current audio track and save it in hard drive
*/
$('#downloadBtn').click(function (e) {
    chrome.extension.sendMessage({action : 'download'}, function(sounds) {
        if(sounds == null) {
            return;
        }
 
        $('#downloadBtn').addClass("disabled");
        // Replace illegal characters for the name sounds
        var name = (sounds.artist + ' - ' + sounds.title + '.mp3').replace(/[|&;:\/\\$%@\"<>()+,]/g, '');

        chrome.downloads.download({url: sounds.url, filename: name}, function() {$('#downloadBtn').removeClass("disabled");});
    });
});

/** 
* Main function start when onload popup page
*/
(function() {
    checkUserToken();
})();

/**
Schema ids in popup.html:
[ login > signInVK ]
[ wrap
  [ profileTab | messageTab (messageBadge) | audioTab (audioLabel) ]
  [
    profile [
        .loaderImg
        profileContent [
            profileHeader [
                    profilePhoto, name, status, place
            ]
            otherInfo
        ]
    ]
    messages [
        .loaderImg
        dialogList
    ]
    audio [
                                                              volumeDownBtn  volumeUpBtn
        prevBtn (prevSpan) | playBtn (playSpan) | nextBtn (nextSpan) | volumeBtn | downloadBtn

    ]
  ]
]
*/