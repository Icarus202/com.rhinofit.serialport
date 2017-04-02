/*
 * RhinoFit ComPort Communicator
 * Copyright (c) 2017 Rhino Software
 *
 * Welcome - This project operates with permissions from the underlying RhinoFit platform and its API
 * This forward facing script mirrors the background scripts operating object (comport) and loads its saved state from
 * Google Chrome's storage API. The majority of the function calls simply forward information to the backend for processing,
 * and then the backend sends completion messages to the front end. Most calls occur. The most nuanced aspect of the code
 * is the loading of existing credentials and connected devices on reset - which is done with an initation flag and completion events
 * Decyphering how this occurs is not suggested, but if it becomes necessary - Good Luck.
 */
chrome.app.runtime.onLaunched.addListener(function () {
    chrome.app.window.create('window.html',  function (win) {
        win.onClosed.addListener(function () {
            if (something.inputSerialPort != null && something.outputSerialPort != null) {
                fullDisconnect();
            } else {
                if (something.inputSerialPort != null) {
                    chrome.serial.disconnect(something.inputSerialPort.connectionId, inputClear);
                }
                if (something.outputSerialPort != null) {
                    chrome.serial.disconnect(something.outputSerialPort.connectionId, outputClear);
                }
            }
            port = null;
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
    this.serialInputStr = "";
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
};

var token_login = function (comport, data) {
    comport.cpk_memory = data;
    port.postMessage({
        type: "BACKGROUND",
        callback: "login",
        response: {
            "success": "1",
            "comport": comport
        }
    });
};

var token_complete = function () {
    chrome.storage.sync.get(token_login.bind(null, something));
};

var showDevices = function (callback, ports) {
    for (var i = 0; i < ports.length; i++) {
        console.log(ports[i].path);
    }
    port.postMessage({
        type: "BACKGROUND",
        callback: callback,
        response: ports
    });
};

var port = null;
chrome.runtime.onConnect.addListener(function (messenger) {
    port = messenger;
    console.log(port);
    port.onMessage.addListener(function (request, sender) {
        if (request['action'] == "sendMessage") {
            writeSerial(request['data']);
        } else if (request['action'] == "serialDisconnect") {
            chrome.serial.disconnect(serialPort.connectionId, serialDisconnect);
        }else if (request['action'] == "login") {
            something.initiated = true;
            chrome.storage.sync.set({ "token": request["token"] }, token_complete);
        } else if (request['action'] == "updateInputType") {
            updateInputType(request['data'])
        } else if (request['action'] == "getInputDevices") {
            if (something.inputSerialPort) {
                chrome.serial.disconnect(something.inputSerialPort.connectionId, inputDisconnect);
            }
            chrome.serial.getDevices(showDevices.bind(null, "showInput"));
        } else if (request['action'] == "connectInputDevice") {
            if (something.inputSerialPort) {
                chrome.serial.disconnect(something.inputSerialPort.connectionId, inputDisconnectReconnect.bind(null, request['data']));
            } else {
                if (request['data'] != null && request['data'] != "") {
                    try {
                        chrome.serial.connect(request['data'], { bitrate: 9600 }, inputConnect.bind(null, request['data']));
                    }
                    catch (err) {
                        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Port Already in use." });
                    }
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
                if (request['data'] != null && request['data'] != "") {
                    try {
                        chrome.serial.connect(request['data'], { bitrate: 9600 }, outputConnect.bind(null, request['data']));
                    }
                    catch (err) {
                        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Port Already in use." });
                    }
                } else {
                    outputConnect("", null);
                }
            }
        } else if (request['action'] == "fullyInitiated") {
            if (request['data']) {
                something.inputInitiated = true;
                something.outputInitiated = true;
            }
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
        } else if (request['action'] == "logout") {
            chrome.storage.sync.clear(onClear);
        } else {
            port.postMessage(testing_background());
        }
    });
    something = new ComPortKiosk();
    chrome.storage.sync.get(load_memory.bind(null, something));
    console.log(something['cpk_memory']);
});

var onReceiveCallback = function (info) {
    if (info.connectionId == something.inputSerialPort.connectionId && info.data) {
        var str = convertArrayBufferToString(info.data);
        if (str.charAt(str.length - 1) === '\n') {
            something.serialInputStr += str.substring(0, str.length - 1);
            onLineReceived(something.serialInputStr);
            something.serialInputStr = '';
        } else {
            something.serialInputStr += str;
        }
    }
};

var onLineReceived = function (line) {
    $.post(
        "http://my.rhinofit.ca/api",
        {
            "action": "comportvaliduser",
            "token": something['cpk_memory']['token'],
            "barcodeid": line
        },
        function (a_response) {
            if (typeof a_response["error"] !== "undefined") {
                port.postMessage({ type: "BACKGROUND", callback: "error", msg: a_response["error"] });
            } else {
                if (a_response["success"] == 1) {
                    if (a_response["alerttype"] == 0) {
                        if (something.outputSerialPort) {
                            port.postMessage({ type: "BACKGROUND", callback: "success", msg: line });
                            writeSerial(line);
                        } else {
                            port.postMessage({ type: "BACKGROUND", callback: "info", msg: line, title: "Output Not Configured" });
                        }
                    } else {
                        port.postMessage({ type: "BACKGROUND", callback: "warning", msg: "User has no membership or is overdue." });
                    }
                } else {
                    port.postMessage({ type: "BACKGROUND", callback: "error", msg: a_response["msg"] });
                }
            }
        }
    ).fail(function () {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Barcode ID query failed" });
    });
};

function onClear() {
    //something = new ComPortKiosk(); /* does this when listener reconnect */
    chrome.app.window.create('window.html', function (win) {
        win.onClosed.addListener(function () {
            if (something.inputSerialPort != null && something.outputSerialPort != null) {
                fullDisconnect();
            } else {
                if (something.inputSerialPort != null) {
                    chrome.serial.disconnect(something.inputSerialPort.connectionId, inputClear);
                }
                if (something.outputSerialPort != null) {
                    chrome.serial.disconnect(something.outputSerialPort.connectionId, outputClear);
                }
            }
            port = null;
        });
    });
}

function updateInputType(value) {
    if (typeof something['cpk_memory']['input'] === "undefined") {
        something['cpk_memory']['input'] = { type: value };
    } else {
        something['cpk_memory']['input']['type'] = value;
    }
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

//*************//
var fullDisconnect = function () {
    chrome.serial.disconnect(something.inputSerialPort.connectionId, fullInputClear);
}
var fullInputClear = function (result) {
    chrome.serial.disconnect(something.outputSerialPort.connectionId, outputClear);
    if (result) {
        something.inputSerialPort = null;
    } else {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Disconnect failed" });
    }
}

var inputConnect = function (data, connectionInfo) {
    if (chrome.runtime.lastError) {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Port Already in use" , title: chrome.runtime.lastError.message });
    } else {
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
    }
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

var inputClear = function (result) {
    if (result) {
        something.inputSerialPort = null;
    } else {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Disconnect failed" });
    }
}

var inputDisconnectReconnect = function (data, result) {
    if (result) {
        something.inputSerialPort = null;
        if (data != "") {
            try {
                chrome.serial.connect(data, { bitrate: 9600 }, inputConnect.bind(null, data));
            } catch (err) {
                port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Port Already in use." });
            }
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
    if (chrome.runtime.lastError) {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Port Already in use", title: chrome.runtime.lastError.message });
    } else {
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
    }
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

var outputClear = function (result) {
    if (result) {
        something.outputSerialPort = null;
    } else {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Disconnect failed" });
    }
}

var outputDisconnectReconnect = function (data, result) {
    if (result) {
        something.outputSerialPort = null;
        if (data != "") {
            try {
                chrome.serial.connect(data, { bitrate: 9600 }, outputConnect.bind(null, data));
            } catch (err) {
                port.postMessage({ type: "BACKGROUND", callback: "error", msg: "Port Already in use." });
            }
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
    chrome.serial.send(something.outputSerialPort.connectionId, convertStringToArrayBuffer(str), onSend);
};

var convertStringToArrayBuffer = function (str) {
    var buf = new ArrayBuffer(str.length);
    var bufView = new Uint8Array(buf);
    for (var i = 0; i < str.length; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};

function convertArrayBufferToString(buf) {
    return String.fromCharCode.apply(null, new Uint8Array(buf));
}

var onSend = function (e) {
    if (chrome.runtime.lastError) {
        port.postMessage({ type: "BACKGROUND", callback: "error", msg: runtime.lastError.message });
    }
    console.log(e);
};

var something = null;
chrome.serial.onReceive.addListener(onReceiveCallback);
