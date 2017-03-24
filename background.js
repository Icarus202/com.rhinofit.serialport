// JavaScript source code
chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create('window.html',  function (win) {
        win.onClosed.addListener(function () {
            if (serialPort != null) {
                chrome.serial.disconnect(serialPort.connectionId, serialDisconnect);
            }
        });
    });
});

var showDevices = function (ports) {
    for (var i = 0; i < ports.length; i++) {
        console.log(ports[i].path);
    }
    port.postMessage({
        type: "BACKGROUND",
        callback: "showDevices",
        response: ports
    });
}
//chrome.serial.getDevices(onGetDevices);
var showUSBs = function (ports) {
    for (var i = 0; i < ports.length; i++) {
        console.log(ports[i]['productName']);
    }
    port.postMessage({
        type: "BACKGROUND",
        callback: "showUSBs",
        response: ports
    });
}

var connectUSB = function (data, ports) {
    for (var i = 0; i < ports.length; i++) {
        if (ports[i]['device'] == data) {
            chrome.usb.openDevice(ports[i], usbConnect);
        }
    }

}

var usbPort = null;
var usbConnect = function (connectionInfo) {
     usbPort = connectionInfo;
     console.log(usbPort);
}

var port = null;
chrome.runtime.onConnect.addListener(function (messenger) {
    port = messenger;
    console.log(port);
    port.onMessage.addListener(function (request, sender) {
        if (request['action'] == "getDevices") {
            chrome.serial.getDevices(showDevices);
        } else if (request['action'] == "serialConnect") {
            chrome.serial.connect(request['data'], { bitrate: 9600 }, serialConnect);
            //add return connect command
        } else if (request['action'] == "sendMessage") {
            writeSerial(request['data']);
        } else if (request['action'] == "serialDisconnect") {
            chrome.serial.disconnect(serialPort.connectionId, serialDisconnect);
        } else if (request['action'] == "getUSBs") {
            chrome.usb.getDevices({"vendorId": 5050, "productId": 24}, showUSBs);
        } else if (request['action'] == "connectUSB") {
            chrome.usb.getDevices({ "vendorId": 5050, "productId": 24 }, connectUSB.bind(null, request['data']));
        } else {
            port.postMessage(testing_background());
        }
    });
});

//background needs messenger
function testing_background() {
    return {type: "BACKGROUND", text: "background works" };
}

//*************//
var serialPort = null;
var serialConnect = function (connectionInfo) {
    serialPort = connectionInfo;
    console.log(serialPort);
}

var serialDisconnect = function(result) {
    if (result) {
        serialPort = null;
        port.postMessage( {type: "BACKGROUND", text: "Disconnected from serial port" });
    } else {
        port.postMessage( {type: "BACKGROUND", text: "Disconnect failed" });
    }
}

var writeSerial = function (str) {
    chrome.serial.send(serialPort.connectionId, convertStringToArrayBuffer(str), onSend);
}

// Convert string to ArrayBuffer
var convertStringToArrayBuffer = function (str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
}

var onSend = function (e) {
    console.log(e);
}