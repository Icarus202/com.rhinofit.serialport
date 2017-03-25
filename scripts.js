// JavaScript source code
var port = null;
var fixed_size = [600, 600];
var comport = null;
document.addEventListener("DOMContentLoaded", function () {
    var buttons = document.querySelectorAll('button');
    [].forEach.call(buttons, function (button) {
        button.addEventListener('click', clickHandler);
    });

    $("input[name=input-type]").on("change", selectInputType);
    $("select[name=showInput]").on("change", connectInputTrigger);
    $("select[name=showOutput]").on("change", connectOutputTrigger);

    port = chrome.runtime.connect({ name: "content-background" });

    //also disconnect listeners...

    port.onMessage.addListener(function (request, sender) {
        console.log(JSON.stringify(request));
        if (request['callback'] == "showOutput") {
            var showDevices = document.getElementsByName('showOutput')[0];
            showDevices.innerHTML = "";
            opt = document.createElement('option');
            opt.value = "";
            opt.innerHTML = "Please Select";
            showDevices.appendChild(opt);
            for (var i = 0; i < request['response'].length; i++) {
                if ($("select[name=showInput").val() != request['response'][i]['path']) {
                    var opt = document.createElement('option');
                    opt.value = request['response'][i]['path'];
                    opt.innerHTML = request['response'][i]['displayName'] + ': ' + request['response'][i]['path'];
                    showDevices.appendChild(opt);
                }
            }
        } else if (request['callback'] == "showInput") {
            var showDevices = document.getElementsByName('showInput')[0];
            showDevices.innerHTML = "";
            opt = document.createElement('option');
            opt.value = "";
            opt.innerHTML = "Please Select";
            showDevices.appendChild(opt);
            for (var i = 0; i < request['response'].length; i++) {
                if ($("select[name=showDevices").val() != request['response'][i]['path']) {
                    opt = document.createElement('option');
                    opt.value = request['response'][i]['path'];
                    opt.innerHTML = request['response'][i]['displayName'] + ': ' + request['response'][i]['path'];
                    showDevices.appendChild(opt);
                }
            }
        } else if (request['callback'] == "load_memory") {
            /* load_memory builds underlying object */
            load_memory(request['response']);
        } else if (request['callback'] == "reload_memory") {
            /* load_memory builds underlying object */
            reload_memory(request['response']);
        } else if (request['callback'] == "login") {
            if (request['response']['success']) {
                $("#login-credentials").fadeOut("slow", function () {
                    $("#login-successful").fadeIn("slow", function () {
                        $("#control-panel").fadeIn("slow", function () {
                            //load associated settings
                            getOutputDevices();
                        });
                    });
                });
            } else {
                toastr.error(request['response']['error'], null, toastr_tops);
            }
        } else if (request['callback'] == "error") {
            /* load_memory builds underlying object */
            toastr.error(request['msg'], null, toastr_tops);
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
                if (comport['cpk_memory']['input']) {
                    if (comport['cpk_memory']['input']['type'] == "RS232") {
                        $('input[name=input-type]').prop('checked', false).change();
                    }
                }
            }).bind(null, data);
        }).bind(null, comport);
    }
}

function reload_memory(data) {
    comport = data;
    if (comport.inputSerialPort) {
        $("div[name=input-control-box].alert-warning").removeClass("alert-warning").addClass("alert-success");
    }
    if (comport.outputSerialPort) {
        $("div[name=output-control-box].alert-warning").removeClass("alert-warning").addClass("alert-success");
    }
}

function clickHandler(e) {
    console.log($(this));
    if ($(this).attr("name") == "test") {
        port.postMessage({ type: "SCRIPTS", action: "testing_this" });
    } else if (e.target.innerHTML == "Connect") {
        serialConnect(); /*updated*/
    } else if (e.target.innerHTML == "Send") {
        port.postMessage({ type: "SCRIPTS", action: "sendMessage", data: "whatever" });
    } else if (e.target.innerHTML == "Disconnect") {
        serialDisconnect(); /*updated*/
    } else if ($(this).attr("name") == "InputDevices") {
        getInputDevices();
        //port.postMessage({ type: "SCRIPTS", action: "getUSBs" });
    } else if ($(this).attr("name") == "OutputDevices") {
        getOutputDevices();
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

var serialConnect = function () {
    var path = document.getElementsByName('showDevices')[0].value;
    port.postMessage({ type: "SCRIPTS", action: "serialConnect", data: path });
};
var serialDisconnect = function () { /*Call on Change Events*/
    port.postMessage({ type: "SCRIPTS", action: "serialDisconnect" });
};

var selectInputType = function (memory_load) {
    if ($("input[name=input-type]").is(":checked")) {
        port.postMessage({ type: "SCRIPTS", action: "updateInputType", data: "USB" });
        $("#input-rs232:visible").fadeOut("slow", function () {
            $("div[name=input-control-box]").removeClass("alert-warning").addClass("alert-success");
            var showDevices = document.getElementsByName('showInput')[0];
            showDevices.innerHTML = "";
            opt = document.createElement('option');
            opt.value = "";
            opt.innerHTML = "Please Select";
            showDevices.appendChild(opt);
        });
    } else {
        port.postMessage({ type: "SCRIPTS", action: "updateInputType", data: "RS232" });
        $("#input-rs232:hidden").fadeIn("slow", function () {
            $("div[name=input-control-box]").removeClass("alert-success").addClass("alert-warning");
            getInputDevices();
        });
    }
};

var getInputDevices = function () {
    port.postMessage({ type: "SCRIPTS", action: "getInputDevices" });
}

var connectInputTrigger = function () {
    $("div[name=input-control-box].alert-success").removeClass("alert-success").addClass("alert-warning");
    port.postMessage({ type: "SCRIPTS", action: "connectInputDevice", data: $(this).val() });
};

var getOutputDevices = function () {
    port.postMessage({ type: "SCRIPTS", action: "getOutputDevices" });
};

var connectOutputTrigger = function () {
    $("div[name=output-control-box].alert-success").removeClass("alert-success").addClass("alert-warning");
    port.postMessage({ type: "SCRIPTS", action: "connectOutputDevice", data: $(this).val() });
};

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