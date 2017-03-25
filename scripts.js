// JavaScript source code
var port = null;
var fixed_size = [600, 600];
var comport = null;
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
        } else if (request['callback'] == "load_memory") {
            load_memory(request['response']);
        } else if (request['callback'] == "login") {
            if (request['response']['success']) {
                $("#login-credentials").fadeOut("slow", function () {
                    $("#login-successful").fadeIn("slow", function () {
                        $("#control-panel").fadeIn("slow", function () {
                            //load associated settings
                        });
                    });
                });
            } else {
                toastr.error(request['response']['error'], null, toastr_tops);
            }
        } else {

        }
    });

    window.resizeTo(fixed_size[0], fixed_size[1]);
    $(window).resize(function () {
        window.resizeTo(fixed_size[0], fixed_size[1]);
    });
});

function load_memory(data) {
    comport = data;
    if (typeof comport['cpk_memory']['token'] === "undefined") {
        $("#login-credentials").fadeIn("fast", function (data) {

        }).bind(null, comport);
    } else {
        $("#login-successful").fadeIn("fast", function (data) {
            $("#control-panel").fadeIn("fast", function (cp_data) {
                //load associated settings
            }).bind(null, data);
        }).bind(null, comport);
    }
}

function clickHandler(e) {
    console.log($(this));
    if ($(this).attr("name") == "test") {
        port.postMessage({ type: "SCRIPTS", action: "testing_this" });
    } else if (e.target.innerHTML == "Connect") {
        var path = document.getElementsByName('showDevices')[0].value;
        port.postMessage({ type: "SCRIPTS", action: "serialConnect", data: path });
    } else if (e.target.innerHTML == "Send") {
        port.postMessage({ type: "SCRIPTS", action: "sendMessage", data: "whatever" });
    } else if (e.target.innerHTML == "Disconnect") {
        port.postMessage({ type: "SCRIPTS", action: "serialDisconnect" });
    } else if ($(this).attr("name") == "usbs") {
        port.postMessage({ type: "SCRIPTS", action: "getUSBs" });
    } else if (e.target.innerHTML == "ConnectUSB") {
        var divice = document.getElementsByName('showUSBs')[0].value;
        port.postMessage({ type: "SCRIPTS", action: "connectUSB", data: divice });
    } else if ($(this).attr("name") == "devices") {
        port.postMessage({ type: "SCRIPTS", action: "getDevices" });
    } else if ($(this).attr("name") == "login") {
        port.postMessage({ type: "SCRIPTS", action: "login" });
    }
    //console.log(this); console.log(e);
    return false;
}

var toastr_tops = {
    "closeButton": true,
    "debug": false,
    "positionClass": "toast-top-full-width",
    "onclick": null,
    "showDuration": "300",
    "hideDuration": "1000",
    "timeOut": "3500",
    "extendedTimeOut": "1000",
    "showEasing": "swing",
    "hideEasing": "linear",
    "showMethod": "fadeIn",
    "hideMethod": "fadeOut"
};