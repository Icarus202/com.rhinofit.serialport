// JavaScript source code
var port = null;
document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll('button');
    [].forEach.call(buttons, function (button) {
        button.addEventListener('click', clickHandler);
    });

    port = chrome.runtime.connect({ name: "content-background" });
    //also disconnect listeners...
    port.onMessage.addListener(function (request, sender) {
        console.log(JSON.stringify(request));
        if (request['callback'] == "showDevices") {
            var showDevices = document.getElementsByName('showDevices')[0];
            showDevices.innerHTML = "";
            for (var i = 0; i < request['response'].length; i++) {
                var opt = document.createElement('option');
                opt.value = request['response'][i]['path'];
                opt.innerHTML = request['response'][i]['displayName'] + ': ' + request['response'][i]['path'];
                showDevices.appendChild(opt);
            }
        } else if (request['callback'] == "showUSBs") {
            var showDevices = document.getElementsByName('showUSBs')[0];
            showDevices.innerHTML = "";
            for (var i = 0; i < request['response'].length; i++) {
                var opt = document.createElement('option');
                opt.value = request['response'][i]['device'];
                opt.innerHTML = request['response'][i]['productName'];
                showDevices.appendChild(opt);
            }
        } else {

        }
    })
});

function clickHandler(e) {
    if (e.target.innerHTML == "Test") {
        port.postMessage({ type: "SCRIPTS", action: "testing_this" });
    } else if (e.target.innerHTML == "Connect") {
        var path = document.getElementsByName('showDevices')[0].value;
        port.postMessage({ type: "SCRIPTS", action: "serialConnect", data: path });
    } else if (e.target.innerHTML == "Send") {
        port.postMessage({ type: "SCRIPTS", action: "sendMessage", data: "whatever" });
    } else if (e.target.innerHTML == "Disconnect") {
        port.postMessage({ type: "SCRIPTS", action: "serialDisconnect" });
    } else if (e.target.innerHTML == "USBs") {
        port.postMessage({ type: "SCRIPTS", action: "getUSBs" });
    } else if (e.target.innerHTML == "ConnectUSB") {
        var divice = document.getElementsByName('showUSBs')[0].value;
        port.postMessage({ type: "SCRIPTS", action: "connectUSB", data: divice });
    } else {
        port.postMessage({ type: "SCRIPTS", action: "getDevices" });
    }
    console.log(this); console.log(e);
    return false;
}
