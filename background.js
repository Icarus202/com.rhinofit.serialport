// JavaScript source code
chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create('window.html',  function (win) {
        win.onClosed.addListener(function () {
            if (serialPort != null) {
                chrome.serial.disconnect(serialPort.connectionId, serialDisconnect);
            }
            if (something.inputSerialPort != null) {
                chrome.serial.disconnect(something.inputSerialPort.connectionId, inputDisconnect);
            }
            if (something.outputSerialPort != null) {
                chrome.serial.disconnect(something.outputSerialPort.connectionId, outputDisconnect);
            }
        });
    });
});

var ComPortKiosk = function () {
    this.cpk_memory = {};
    this.outputSerialPort = null;
    this.inputSerialPort = null;
    this.initiated = false;
    this.inputInitiated = false;
    this.outputInitiated = false;
};

var load_memory = function(comport, data) {
    comport.cpk_memory = data;
    port.postMessage({
        type: "BACKGROUND",
        callback: "load_memory",
        response: comport
    });
};

var reload_memory = function (comport, data) {
    comport.cpk_memory = data;
    port.postMessage({
        type: "BACKGROUND",
        callback: "reload_memory",
        response: comport
    });
};

var save_complete = function () {
    chrome.storage.sync.get(reload_memory.bind(null, something));
}

var showDevices = function (callback, ports) {
    for (var i = 0; i < ports.length; i++) {
        console.log(ports[i].path);
    }
    port.postMessage({
        type: "BACKGROUND",
        callback: callback,
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
            chrome.serial.getDevices(showDevices.bind(null, "showOutput"));
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
        } else if (request['action'] == "login") {
            port.postMessage({
                type: "BACKGROUND",
                callback: "login",
                response: { "success": "1" }
            });
        } else if (request['action'] == "updateInputType") {
            updateInputType(request['data'])
            //chrome.usb.getDevices({ "vendorId": 5050, "productId": 24 }, connectUSB.bind(null, request['data']));
        } else if (request['action'] == "getInputDevices") {
            if (something.inputSerialPort) {
                chrome.serial.disconnect(something.inputSerialPort.connectionId, inputDisconnect);
            }
            chrome.serial.getDevices(showDevices.bind(null, "showInput"));
        } else if (request['action'] == "connectInputDevice") {
            if (something.inputSerialPort) {
                chrome.serial.disconnect(something.inputSerialPort.connectionId, inputDisconnectReconnect.bind(null, request['data']));
            } else {
                if (request['data'] != "") {
                    chrome.serial.connect(request['data'], { bitrate: 9600 }, inputConnect.bind(null, request['data']));
                } else {
                    inputConnect("", null);
                }
            }
        } else if (request['action'] == "getOutputDevices") {
            if (something.outputSerialPort) {
                chrome.serial.disconnect(something.outputSerialPort.connectionId, outputDisconnect);
            }
            chrome.serial.getDevices(showDevices.bind(null, "showOutput"));
        } else if (request['action'] == "connectOutputDevice") {
            if (something.outputSerialPort) {
                chrome.serial.disconnect(something.outputSerialPort.connectionId, outputDisconnectReconnect.bind(null, request['data']));
            } else {
                if (request['data'] != "") {
                    chrome.serial.connect(request['data'], { bitrate: 9600 }, outputConnect.bind(null, request['data']));
                } else {
                    outputConnect("", null);
                }
            }
        } else if (request['action'] == "fullyInitiated") {
            if (something.inputInitiated && something.outputInitiated) {
                something.initiated = true;
                port.postMessage({
                    type: "BACKGROUND",
                    callback: "reload_memory",
                    response: something
                });
            } else {
                port.postMessage({
                    type: "BACKGROUND",
                    callback: "not_initiated",
                    response: something
                });
            }
        } else {
            port.postMessage(testing_background());
        }
    });
    something = new ComPortKiosk();
    chrome.storage.sync.get(load_memory.bind(null, something));
    console.log(something['cpk_memory']);
});

function updateInputType(value) {
    if (something.initiated) {
        chrome.storage.sync.set({ "input": { "type": value } }, save_complete);
        if (value == "USB" && something.inputSerialPort) {
            chrome.serial.disconnect(something.inputSerialPort.connectionId, inputDisconnect);
        }
    } else {
        if (value == "USB") {
            something.inputInitiated = true;
        }
    }
}

//background needs messenger
function testing_background() {
    return { type: "BACKGROUND", text: "background works" };
}

//*************//
var serialPort = null;
var serialConnect = function (connectionInfo) {
    serialPort = connectionInfo;
    console.log(serialPort);
};

var inputConnect = function (data, connectionInfo) {
    something.inputSerialPort = connectionInfo;
    if (!something.initiated) {
        something.inputInitiated = true;
    }
    var type = "USB";
    if (typeof something['cpk_memory']['input'] !== "undefined"
        && typeof something['cpk_memory']['input']['type'] !== "undefined") {
        type = something['cpk_memory']['input']['type'];
    }
    chrome.storage.sync.set({
        "input":
            {
                "type": type,
                "RS232": data
            }
    }, save_complete);
};

var inputDisconnect = function (result) {
    if (result) {
        something.inputSerialPort = null;
        var type = "USB";
        if (typeof something['cpk_memory']['input'] !== "undefined"
            && typeof something['cpk_memory']['input']['type'] !== "undefined") {
            type = something['cpk_memory']['input']['type'];
        }
        chrome.storage.sync.set({
            "input":
                {
                    "type": type,
                    "RS232": ""
                }
        }, save_complete);
    } else {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Disconnect failed" });
    }
};

var inputDisconnectReconnect = function (data, result) {
    if (result) {
        something.inputSerialPort = null;
        if (data != "") {
            chrome.serial.connect(data, { bitrate: 9600 }, inputConnect.bind(null, data));
        } else {
            if (!something.initiated) {
                something.inputInitiated = true;
            } else {
                var type = "USB";
                if (typeof something['cpk_memory']['input'] !== "undefined"
                    && typeof something['cpk_memory']['input']['type'] !== "undefined") {
                    type = something['cpk_memory']['input']['type'];
                }
                chrome.storage.sync.set({
                    "input":
                        {
                            "type": type,
                            "RS232": ""
                        }
                }, save_complete);
            }
        }
    } else {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Disconnect failed" });
        if (!something.initiated) {
            something.inputInitiated = true;
        }
    }
};

var outputConnect = function (data, connectionInfo) {
    something.outputSerialPort = connectionInfo;
    if (!something.initiated) {
        something.outputInitiated = true;
    }
    chrome.storage.sync.set({
        "output":
            {
                "RS232": data
            }
    }, save_complete);
};

var outputDisconnect = function (result) {
    if (result) {
        something.outputSerialPort = null;
        chrome.storage.sync.set({
            "output":
                {
                    "RS232": ""
                }
        }, save_complete);
    } else {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Disconnect failed" });
    }
};

var outputDisconnectReconnect = function (data, result) {
    if (result) {
        something.outputSerialPort = null;
        if (data != "") {
            chrome.serial.connect(data, { bitrate: 9600 }, outputConnect.bind(null, data));
        } else {
            if (!something.initiated) {
                something.outputInitiated = true;
            } else {
                chrome.storage.sync.set({
                    "output":
                        {
                            "RS232": ""
                        }
                }, save_complete);
            }
        }
    } else {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Disconnect failed" });
        if (!something.initiated) {
            something.outputInitiated = true;
        }
    }
};

var serialDisconnect = function (result) {
    if (result) {
        serialPort = null;
        port.postMessage({ type: "BACKGROUND", text: "Disconnected from serial port" });
    } else {
        port.postMessage({ type: "BACKGROUND", text: "Disconnect failed" });
    }
};

var writeSerial = function (str) {
    chrome.serial.send(serialPort.connectionId, convertStringToArrayBuffer(str), onSend);
};

// Convert string to ArrayBuffer
var convertStringToArrayBuffer = function (str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};

var onSend = function (e) {
    console.log(e);
};

var something = null;
