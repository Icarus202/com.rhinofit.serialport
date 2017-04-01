// JavaScript source code
var port = null;
var fixed_size = [600, 500];
var comport = null;
var loadLimiter = 0;
var todo_list = {};
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
            var RS232 = "";
            if (typeof comport['cpk_memory']['input'] !== "undefined"
                && typeof comport['cpk_memory']['input']['RS232'] !== "undefined") {
                RS232 = comport['cpk_memory']['input']['RS232'];
            }
            for (var i = 0; i < request['response'].length; i++) {
                if ($("select[name=showInput").val() != request['response'][i]['path']
                    && RS232 != request['response'][i]['path']) {
                    var opt = document.createElement('option');
                    opt.value = request['response'][i]['path'];
                    opt.innerHTML = request['response'][i]['displayName'] + ': ' + request['response'][i]['path'];
                    showDevices.appendChild(opt);
                }
            }
            RS232 = "";
            if (typeof comport['cpk_memory']['output'] !== "undefined"
                && typeof comport['cpk_memory']['output']['RS232'] !== "undefined") {
                RS232 = comport['cpk_memory']['output']['RS232'];
            }
            if (!comport.initiated) { /* NOT TRIGGERING */
                $("select[name=showOutput").val(RS232).change();
            } else {
                var type = "USB";
                //if (typeof comport['cpk_memory']['input'] !== "undefined"
                //    && typeof comport['cpk_memory']['input']['type'] !== "undefined") {
                //    type = comport['cpk_memory']['input']['type'];
                //}
                if ($("input[name=input-type]").is(":checked")) {
                    type = "USB";
                } else {
                    type = "RS232";
                }
                if (type == "USB" || comport.inputSerialPort) {
                    loadLimiter = 0;
                } else {
                    if (loadLimiter > 0) {
                        loadLimiter = 0;
                    } else if (type == "RS232" && loadLimiter == 0) {
                        getInputDevices(); /* load opposing when applicable */
                        loadLimiter = loadLimiter + 1;
                    }
                }
            }
        } else if (request['callback'] == "showInput") {
            var showDevices = document.getElementsByName('showInput')[0];
            showDevices.innerHTML = "";
            opt = document.createElement('option');
            opt.value = "";
            opt.innerHTML = "Please Select";
            showDevices.appendChild(opt);
            var RS232 = "";
            if (typeof comport['cpk_memory']['output'] !== "undefined"
                && typeof comport['cpk_memory']['output']['RS232'] !== "undefined") {
                RS232 = comport['cpk_memory']['output']['RS232'];
            }
            for (var i = 0; i < request['response'].length; i++) {
                if ($("select[name=showOutput").val() != request['response'][i]['path']
                    && RS232 != request['response'][i]['path']) {
                    opt = document.createElement('option');
                    opt.value = request['response'][i]['path'];
                    opt.innerHTML = request['response'][i]['displayName'] + ': ' + request['response'][i]['path'];
                    showDevices.appendChild(opt);
                }
            }
            RS232 = "";
            if (typeof comport['cpk_memory']['input'] !== "undefined"
                && typeof comport['cpk_memory']['input']['RS232'] !== "undefined") {
                RS232 = comport['cpk_memory']['input']['RS232'];
            }
            if (!comport.initiated) {
                $("select[name=showInput").val(RS232).change();
            } else {
                if (comport.outputSerialPort) {
                    loadLimiter = 0;
                } else {
                    if (loadLimiter > 0) {
                        loadLimiter = 0;
                    } else if (loadLimiter == 0) {
                        getOutputDevices(); /* load opposing when applicable */
                        loadLimiter = loadLimiter + 1;
                    }
                }
            }
        } else if (request['callback'] == "load_memory") {
            /* load_memory builds underlying object */
            load_memory(request['response']);
        } else if (request['callback'] == "reload_memory") {
            /* load_memory builds underlying object */
            reload_memory(request['response']);
        } else if (request['callback'] == "not_initiated") {
            comport = request['response'];
            setTimeout(function () { port.postMessage({ type: "SCRIPTS", action: "fullyInitiated" }); }, 500);
        } else if (request['callback'] == "login") {
            if (request['response']['success']) {
                post_memory(request['response']['comport']);
                $("#login-credentials").fadeOut("slow", function () {
                    $("#login-successful").fadeIn("slow", function () {
                        $("#control-panel").fadeIn("slow", function () {
                            $('button[name=logout]').fadeIn("slow");
                            //load associated settings
                            selectInputType(null);
                            getOutputDevices();
                        });
                    });
                });
            }// else {
            //    toastr.error(request['response']['msg'], null, toastr_tops);
            //}
        } else if (request['callback'] == "error") {
            var title = null;
            if (typeof request['title'] !== "undefined") { title = request['title']; }
            toastr.error(request['msg'], title, toastr_tops);
        } else if (request['callback'] == "warning") {
            var title = null;
            if (typeof request['title'] !== "undefined") { title = request['title']; }
            toastr.warning(request['msg'], title, toastr_tops);
        } else if (request['callback'] == "info") {
            var title = null;
            if (typeof request['title'] !== "undefined") { title = request['title']; }
            toastr.info(request['msg'], title, toastr_tops);
        } else if (request['callback'] == "success") {
            var title = null;
            if (typeof request['title'] !== "undefined") { title = request['title']; }
            toastr.success(request['msg'], title, toastr_tops);
        } else if (request['callback'] == "focus") {
            /* load_memory builds underlying object */
            $('input[name=input-type]').focus();
        } else if (request['callback'] == "post_memory") {
            /* load_memory builds underlying object */
            post_memory(request['response']);
        }//else if (request['callback'] == "connecterror") {
         //  if (request['target'] == "input") {
         //      $("div[name=output-control-box].alert-warning").removeClass("alert-warning").addClass("alert-success");
         //  } else if (request['target'] == "output") {
         //      $("div[name=output-control-box].alert-warning").removeClass("alert-warning").addClass("alert-success");
         //  }
         //  toastr.error(request['msg'], null, toastr_tops);
        //} else {
        //
        //}
    });

    $(window).scannerDetection();//{ ignoreIfFocusOn: "input[name='username']" });
    $(window).bind('scannerDetectionComplete', function (e, data) {
        if (typeof comport['cpk_memory']['input'] !== "undefined"
           && typeof comport['cpk_memory']['input']['type'] !== "undefined"
           && comport['cpk_memory']['input']['type'] == "USB") {
            $.post(
                "http://test20.rhinofit.ca/api",
                {
                    "action": "comportvaliduser",
                    "token": comport['cpk_memory']['token'],
                    "barcodeid": data["string"]
                },
                function (a_response) {
                    if (typeof a_response["error"] !== "undefined") {
                        toastr.error(a_response["error"], null, toastr_tops);
                        //port.postMessage({ type: "BACKGROUND", callback: "login", response: { "error": 1, "msg": a_response["error"] } });
                    } else {
                        if (a_response["success"] == 1) {
                            if (a_response["alerttype"] == 0) {
                                if (comport.outputSerialPort) {
                                    toastr.success(data["string"], null, toastr_tops);
                                    port.postMessage({ type: "SCRIPTS", action: "sendMessage", data: data["string"] });
                                } else {
                                    toastr.info(data["string"], "Output Not Configured", toastr_tops);
                                }
                            } else {
                                toastr.warning("User has no membership or is overdue.", null, toastr_tops);
                            }
                        } else {
                            toastr.error(a_response["msg"], null, toastr_tops);
                        }
                    }
                }
            ).fail(function () {
                toastr.error("Barcode ID query failed", null, toastr_tops);
            });
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
            //port.postMessage({ type: "SCRIPTS", action: "fullyInitiated", data: true });
        }).bind(null, comport);
    } else {
        $("#login-successful").fadeIn("fast", function (data) {
            $("#control-panel").fadeIn("fast", function (cp_data) {
                $('button[name=logout]').fadeIn("slow");
                //load associated settings
                if (typeof comport['cpk_memory']['input'] !== "undefined" && comport['cpk_memory']['input']) {
                    var type = "USB";
                    if (typeof comport['cpk_memory']['input']['type'] !== "undefined") {
                        type = comport['cpk_memory']['input']['type'];
                    }
                    if (type == "RS232") {
                        $('input[name=input-type]').prop('checked', false).change();
                        //getInputDevices(); triggered internally on input-type change...
                    } else {
                        $('input[name=input-type]').prop('checked', true).change();
                        //port.postMessage({ type: "SCRIPTS", action: "connectInputDevice", data: "USB" });
                    }
                }
                if (typeof comport['cpk_memory']['output'] !== "undefined" && comport['cpk_memory']['output']) {
                    getOutputDevices();
                }
                setTimeout(function () { port.postMessage({ type: "SCRIPTS", action: "fullyInitiated" }); }, 500);
            }).bind(null, data);
        }).bind(null, comport);
    }
}

function post_memory(data) {
    comport = data;
}

function reload_memory(data) {
    comport = data;
    var type = "USB";
    if (typeof comport['cpk_memory']['input'] !== "undefined"
        && typeof comport['cpk_memory']['input']['type'] !== "undefined") {
        type = comport['cpk_memory']['input']['type'];
    }
    if (type == "USB" || comport.inputSerialPort) {
        $("div[name=input-control-box].alert-warning").removeClass("alert-warning").addClass("alert-success");
    }
    if (comport.outputSerialPort) {
        $("div[name=output-control-box].alert-warning").removeClass("alert-warning").addClass("alert-success");
    }
    if (todo_list['refreshInput'] && comport.initiated) {
        todo_list['refreshInput'] = false;
        if (comport.inputSerialPort) { } else {
            getInputDevices();
        }
    }
    if (todo_list['refreshOutput'] && comport.initiated) {
        todo_list['refreshOutput'] = false;
        if (comport.outputSerialPort) { } else {
            getOutputDevices();
        }
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
        //$("div[name=input-control-box]").removeClass("alert-success").addClass("alert-warning");
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
        $.post(
            "http://test20.rhinofit.ca/api",
            {
                "action": "login",
                "email": $('#login-credentials input[name=username]').val(),
                "password": $('#login-credentials input[name=password]').val()
            },
            function (a_response) {
                if (a_response["error"]) {
                    toastr.error(a_response["error"], null, toastr_tops);
                } else {
                    port.postMessage({ type: "SCRIPTS", action: "login", token: a_response["token"] });
                }
            }
        ).fail(function () {
            toastr.error("Login attempt failed", null, toastr_tops);
        });
    } else if ($(this).attr("name") == "logout") {
        port.postMessage({ type: "SCRIPTS", action: "logout" });
        window.close();
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
            //$("div[name=input-control-box]").removeClass("alert-success").addClass("alert-warning");
            getInputDevices();
        });
    }
};

var getInputDevices = function () {
    $("div[name=input-control-box].alert-success").removeClass("alert-success").addClass("alert-warning");
    port.postMessage({ type: "SCRIPTS", action: "getInputDevices" });
}

var connectInputTrigger = function () {
    $("div[name=input-control-box].alert-success").removeClass("alert-success").addClass("alert-warning");
    port.postMessage({ type: "SCRIPTS", action: "connectInputDevice", data: $(this).val() });
    if (comport.outputSerialPort) { } else {
        todo_list["refreshOutput"] = true;
    }
};

var getOutputDevices = function () {
    $("div[name=output-control-box].alert-success").removeClass("alert-success").addClass("alert-warning");
    port.postMessage({ type: "SCRIPTS", action: "getOutputDevices" });
};

var connectOutputTrigger = function (e) {
    $("div[name=output-control-box].alert-success").removeClass("alert-success").addClass("alert-warning");
    port.postMessage({ type: "SCRIPTS", action: "connectOutputDevice", data: $(this).val() });
    var type = "USB";
    //if (typeof comport['cpk_memory']['input'] !== "undefined"
    //    && typeof comport['cpk_memory']['input']['type'] !== "undefined") {
    //    type = comport['cpk_memory']['input']['type'];
    //}
    if ($("input[name=input-type]").is(":checked")) {
        type = "USB";
    } else {
        type = "RS232";
    }
    if (type == "RS232") {
        if (comport.inputSerialPort) { } else {
            todo_list["refreshInput"] = true;
        }
    }
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