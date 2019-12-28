/// <reference path="./winrtrefs.d.ts"/>
/// <reference path="../built/pxtlib.d.ts"/>
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        function driveDeployCoreAsync(res) {
            var drives = pxt.appTarget.compile.deployDrives;
            pxt.Util.assert(!!drives);
            pxt.debug("deploying to drives " + drives);
            var drx = new RegExp(drives);
            var firmware = pxt.outputName();
            var r = res.outfiles[firmware];
            function writeAsync(folder) {
                pxt.debug("writing " + firmware + " to " + folder.displayName);
                return pxt.winrt.promisify(folder.createFileAsync(firmware, Windows.Storage.CreationCollisionOption.replaceExisting)
                    .then(function (file) { return Windows.Storage.FileIO.writeTextAsync(file, r); })).then(function (r) { }).catch(function (e) {
                    pxt.debug("failed to write " + firmware + " to " + folder.displayName + " - " + e);
                });
            }
            return pxt.winrt.promisify(Windows.Storage.KnownFolders.removableDevices.getFoldersAsync())
                .then(function (ds) {
                var df = ds.filter(function (d) { return drx.test(d.displayName); });
                var pdf = df.map(writeAsync);
                var all = Promise.join.apply(Promise, pdf);
                return all;
            }).then(function (r) { });
        }
        winrt.driveDeployCoreAsync = driveDeployCoreAsync;
        function browserDownloadAsync(text, name, contentType) {
            var file;
            return pxt.winrt.promisify(Windows.Storage.ApplicationData.current.temporaryFolder.createFileAsync(name, Windows.Storage.CreationCollisionOption.replaceExisting)
                .then(function (f) { return Windows.Storage.FileIO.writeTextAsync(file = f, text); })
                .then(function () { return Windows.System.Launcher.launchFileAsync(file); })
                .then(function (b) { }));
        }
        winrt.browserDownloadAsync = browserDownloadAsync;
        function saveOnlyAsync(res) {
            var useUf2 = pxt.appTarget.compile.useUF2;
            var fileTypes = useUf2 ? [".uf2"] : [".hex"];
            var savePicker = new Windows.Storage.Pickers.FileSavePicker();
            savePicker.suggestedStartLocation = Windows.Storage.Pickers.PickerLocationId.documentsLibrary;
            savePicker.fileTypeChoices.insert("MakeCode binary file", fileTypes);
            savePicker.suggestedFileName = res.downloadFileBaseName;
            return pxt.winrt.promisify(savePicker.pickSaveFileAsync()
                .then(function (file) {
                if (file) {
                    var fileContent = useUf2 ? res.outfiles[pxtc.BINARY_UF2] : res.outfiles[pxtc.BINARY_HEX];
                    if (!pxt.isOutputText()) {
                        fileContent = atob(fileContent);
                    }
                    var ar_1 = [];
                    var bytes = pxt.Util.stringToUint8Array(fileContent);
                    bytes.forEach(function (b) { return ar_1.push(b); });
                    return Windows.Storage.FileIO.writeBytesAsync(file, ar_1)
                        .then(function () { return true; });
                }
                // Save cancelled
                return Promise.resolve(false);
            }));
        }
        winrt.saveOnlyAsync = saveOnlyAsync;
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
/// <reference path="./winrtrefs.d.ts"/>
/// <reference path="../built/pxtlib.d.ts"/>
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        var WindowsRuntimeIO = /** @class */ (function () {
            function WindowsRuntimeIO() {
                this.onData = function (v) { };
                this.onEvent = function (v) { };
                this.onError = function (e) { };
            }
            WindowsRuntimeIO.prototype.error = function (msg) {
                throw new Error(pxt.U.lf("USB/HID error ({0})", msg));
            };
            WindowsRuntimeIO.prototype.reconnectAsync = function () {
                var _this = this;
                return this.disconnectAsync()
                    .then(function () { return _this.initAsync(); });
            };
            WindowsRuntimeIO.prototype.isSwitchingToBootloader = function () {
                isSwitchingToBootloader();
            };
            WindowsRuntimeIO.prototype.disconnectAsync = function () {
                if (this.dev) {
                    var d = this.dev;
                    delete this.dev;
                    d.close();
                }
                return Promise.resolve();
            };
            WindowsRuntimeIO.prototype.sendPacketAsync = function (pkt) {
                if (!this.dev)
                    return Promise.resolve();
                var ar = [0];
                for (var i = 0; i < Math.max(pkt.length, 64); ++i)
                    ar.push(pkt[i] || 0);
                var dataWriter = new Windows.Storage.Streams.DataWriter();
                dataWriter.writeBytes(ar);
                var buffer = dataWriter.detachBuffer();
                var report = this.dev.createOutputReport(0);
                report.data = buffer;
                return pxt.winrt.promisify(this.dev.sendOutputReportAsync(report)
                    .then(function (value) {
                    pxt.debug("hf2: " + value + " bytes written");
                }));
            };
            WindowsRuntimeIO.prototype.initAsync = function (isRetry) {
                var _this = this;
                if (isRetry === void 0) { isRetry = false; }
                pxt.Util.assert(!this.dev, "HID interface not properly reseted");
                var wd = Windows.Devices;
                var whid = wd.HumanInterfaceDevice.HidDevice;
                var rejectDeviceNotFound = function () {
                    var err = new Error(pxt.U.lf("Device not found"));
                    err.notifyUser = true;
                    err.type = "devicenotfound";
                    return Promise.reject(err);
                };
                var getDevicesPromise = hidSelectors.reduce(function (soFar, currentSelector) {
                    // Try all selectors, in order, until some devices are found
                    return soFar.then(function (devices) {
                        if (devices && devices.length) {
                            return Promise.resolve(devices);
                        }
                        return wd.Enumeration.DeviceInformation.findAllAsync(currentSelector, null);
                    });
                }, Promise.resolve(null));
                var deviceId;
                return getDevicesPromise
                    .then(function (devices) {
                    if (!devices || !devices[0]) {
                        pxt.debug("no hid device found");
                        return Promise.reject(new Error("no hid device found"));
                    }
                    pxt.debug("hid enumerate " + devices.length + " devices");
                    var device = devices[0];
                    pxt.debug("hid connect to " + device.name + " (" + device.id + ")");
                    deviceId = device.id;
                    return whid.fromIdAsync(device.id, Windows.Storage.FileAccessMode.readWrite);
                })
                    .then(function (r) {
                    _this.dev = r;
                    if (!_this.dev) {
                        pxt.debug("can't connect to hid device");
                        var status_1 = Windows.Devices.Enumeration.DeviceAccessInformation.createFromId(deviceId).currentStatus;
                        pxt.reportError("winrt_device", "could not connect to HID device; device status: " + status_1);
                        return Promise.reject(new Error("can't connect to hid device"));
                    }
                    pxt.debug("hid device version " + _this.dev.version);
                    _this.dev.addEventListener("inputreportreceived", function (e) {
                        pxt.debug("input report");
                        var dr = Windows.Storage.Streams.DataReader.fromBuffer(e.report.data);
                        var values = [];
                        while (dr.unconsumedBufferLength) {
                            values.push(dr.readByte());
                        }
                        if (values.length == 65 && values[0] === 0) {
                            values.shift();
                        }
                        _this.onData(new Uint8Array(values));
                    });
                    return Promise.resolve();
                })
                    .catch(function (e) {
                    if (isRetry) {
                        return rejectDeviceNotFound();
                    }
                    return winrt.bootloaderViaBaud()
                        .then(function () {
                        return _this.initAsync(true);
                    })
                        .catch(function () {
                        return rejectDeviceNotFound();
                    });
                });
            };
            return WindowsRuntimeIO;
        }());
        winrt.WindowsRuntimeIO = WindowsRuntimeIO;
        winrt.packetIO = undefined;
        function mkPacketIOAsync() {
            pxt.U.assert(!winrt.packetIO);
            winrt.packetIO = new WindowsRuntimeIO();
            return winrt.packetIO.initAsync()
                .catch(function (e) {
                winrt.packetIO = null;
                return Promise.reject(e);
            })
                .then(function () { return winrt.packetIO; });
        }
        winrt.mkPacketIOAsync = mkPacketIOAsync;
        function isSwitchingToBootloader() {
            expectingAdd = true;
            if (winrt.packetIO && winrt.packetIO.dev) {
                expectingRemove = true;
            }
        }
        winrt.isSwitchingToBootloader = isSwitchingToBootloader;
        var hidSelectors = [];
        var watchers = [];
        var deviceCount = 0;
        var expectingAdd = false;
        var expectingRemove = false;
        function initWinrtHid(reconnectUf2WrapperCb, disconnectUf2WrapperCb) {
            var wd = Windows.Devices;
            var wde = Windows.Devices.Enumeration.DeviceInformation;
            var whid = wd.HumanInterfaceDevice.HidDevice;
            if (pxt.appTarget && pxt.appTarget.compile && pxt.appTarget.compile.hidSelectors) {
                pxt.appTarget.compile.hidSelectors.forEach(function (s) {
                    var sel = whid.getDeviceSelector(parseInt(s.usagePage), parseInt(s.usageId), parseInt(s.vid), parseInt(s.pid));
                    if (hidSelectors.indexOf(sel) < 0) {
                        hidSelectors.push(sel);
                    }
                });
            }
            hidSelectors.forEach(function (s) {
                var watcher = wde.createWatcher(s, null);
                watcher.addEventListener("added", function (e) {
                    pxt.debug("new hid device detected: " + e.id);
                    if (expectingAdd) {
                        expectingAdd = false;
                    }
                    else {
                        // A new device was plugged in. If it's the first one, then reconnect the UF2 wrapper. Otherwise,
                        // we're already connected to a plugged device, so don't do anything.
                        ++deviceCount;
                        if (deviceCount === 1 && reconnectUf2WrapperCb) {
                            reconnectUf2WrapperCb();
                        }
                    }
                });
                watcher.addEventListener("removed", function (e) {
                    pxt.debug("hid device closed: " + e.id);
                    if (expectingRemove) {
                        expectingRemove = false;
                    }
                    else {
                        // A device was unplugged. If there were more than 1 device, we don't know whether the unplugged
                        // one is the one we were connected to. In that case, reconnect the UF2 wrapper. If no more devices
                        // are left, disconnect the existing wrapper while we wait for a new device to be plugged in.
                        --deviceCount;
                        if (deviceCount > 0 && reconnectUf2WrapperCb) {
                            reconnectUf2WrapperCb();
                        }
                        else if (deviceCount === 0 && disconnectUf2WrapperCb) {
                            disconnectUf2WrapperCb();
                        }
                    }
                });
                watcher.addEventListener("updated", function (e) {
                    // As per MSDN doc, we MUST subscribe to this event, otherwise the watcher doesn't work
                });
                watchers.push(watcher);
            });
            watchers.filter(function (w) { return !w.status; }).forEach(function (w) { return w.start(); });
        }
        winrt.initWinrtHid = initWinrtHid;
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
/// <reference path="./winrtrefs.d.ts"/>
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        var watcher;
        var deviceNameFilter;
        var activePorts = {};
        function initSerial() {
            var hasDeviceFilter = !!pxt.appTarget.serial &&
                (!!pxt.appTarget.serial.nameFilter || (!!pxt.appTarget.serial.vendorId && !!pxt.appTarget.serial.productId));
            var canLogSerial = !!pxt.appTarget.serial && pxt.appTarget.serial.log;
            if (!canLogSerial || !hasDeviceFilter)
                return;
            var sd = Windows.Devices.SerialCommunication.SerialDevice;
            var serialDeviceSelector;
            if (!pxt.appTarget.serial.vendorId || !pxt.appTarget.serial.productId) {
                deviceNameFilter = new RegExp(pxt.appTarget.serial.nameFilter);
                serialDeviceSelector = sd.getDeviceSelector();
            }
            else {
                serialDeviceSelector = sd.getDeviceSelectorFromUsbVidPid(parseInt(pxt.appTarget.serial.vendorId), parseInt(pxt.appTarget.serial.productId));
            }
            // Create a device watcher to look for instances of the Serial device
            // As per MSDN doc, to use the correct overload, we pass null as 2nd argument
            watcher = Windows.Devices.Enumeration.DeviceInformation.createWatcher(serialDeviceSelector, null);
            watcher.addEventListener("added", deviceAdded);
            watcher.addEventListener("removed", deviceRemoved);
            watcher.addEventListener("updated", deviceUpdated);
            watcher.start();
        }
        winrt.initSerial = initSerial;
        function suspendSerialAsync() {
            if (watcher) {
                watcher.stop();
                watcher.removeEventListener("added", deviceAdded);
                watcher.removeEventListener("removed", deviceRemoved);
                watcher.removeEventListener("updated", deviceUpdated);
                watcher = undefined;
            }
            var stoppedReadingOpsPromise = Promise.resolve();
            Object.keys(activePorts).forEach(function (deviceId) {
                var port = activePorts[deviceId];
                var currentRead = port.readingOperation;
                if (currentRead) {
                    var deferred_1 = Promise.defer();
                    port.cancellingDeferred = deferred_1;
                    stoppedReadingOpsPromise = stoppedReadingOpsPromise.then(function () {
                        return deferred_1.promise
                            .timeout(500)
                            .catch(function (e) {
                            pxt.reportError("winrt_device", "could not cancel reading operation for a device: " + e.message);
                        });
                    });
                    currentRead.cancel();
                }
            });
            return stoppedReadingOpsPromise
                .then(function () {
                Object.keys(activePorts).forEach(function (deviceId) {
                    var port = activePorts[deviceId];
                    if (port.device) {
                        var device = port.device;
                        device.close();
                    }
                });
                activePorts = {};
            });
        }
        winrt.suspendSerialAsync = suspendSerialAsync;
        /**
         * Most Arduino devices support switching into bootloader by opening the COM port at 1200 baudrate.
         */
        function bootloaderViaBaud() {
            if (!pxt.appTarget || !pxt.appTarget.compile || !pxt.appTarget.compile.useUF2 ||
                !pxt.appTarget.simulator || !pxt.appTarget.simulator.boardDefinition || !pxt.appTarget.simulator.boardDefinition.bootloaderBaudSwitchInfo) {
                return Promise.reject(new Error("device does not support switching to bootloader via baudrate"));
            }
            var allSerialDevices;
            var vidPidInfo = pxt.appTarget.simulator.boardDefinition.bootloaderBaudSwitchInfo;
            var selector = {
                vid: vidPidInfo.vid,
                pid: vidPidInfo.pid,
                usageId: undefined,
                usagePage: undefined
            };
            return connectSerialDevicesAsync([selector])
                .then(function (serialDevices) {
                if (!serialDevices || serialDevices.length === 0) {
                    // No device found, it really looks like no device is plugged in. Bail out.
                    return Promise.reject(new Error("no serial devices to switch into bootloader"));
                }
                allSerialDevices = serialDevices;
                if (allSerialDevices.length) {
                    winrt.isSwitchingToBootloader();
                }
                allSerialDevices.forEach(function (dev) {
                    dev.baudRate = 1200;
                    dev.close();
                });
                // A long delay is needed before attempting to connect to the bootloader device, enough for the OS to
                // recognize the device has been plugged in. Without drivers, connection to the device might still fail
                // the first time, but drivers should be installed by the time the user clicks Download again, at which
                // point flashing will work without the user ever needing to manually set the device to bootloader
                return Promise.delay(1500);
            });
        }
        winrt.bootloaderViaBaud = bootloaderViaBaud;
        /**
         * Connects to all matching serial devices without initializing the full PXT serial stack. Returns the list of
         * devices that were successfully connected to, but doesn't do anything with these devices.
         */
        function connectSerialDevicesAsync(hidSelectors) {
            if (!hidSelectors) {
                return Promise.resolve([]);
            }
            var wd = Windows.Devices;
            var sd = wd.SerialCommunication.SerialDevice;
            var di = wd.Enumeration.DeviceInformation;
            var serialDeviceSelectors = [];
            hidSelectors.forEach(function (s) {
                var sel = sd.getDeviceSelectorFromUsbVidPid(parseInt(s.vid), parseInt(s.pid));
                serialDeviceSelectors.push(sel);
            });
            var allDevicesPromise = serialDeviceSelectors.reduce(function (promiseSoFar, sel) {
                var deviceInfoSoFar;
                return promiseSoFar
                    .then(function (diSoFar) {
                    deviceInfoSoFar = diSoFar;
                    return di.findAllAsync(sel, null);
                })
                    .then(function (foundDevices) {
                    if (deviceInfoSoFar) {
                        for (var i = 0; i < foundDevices.length; ++i) {
                            deviceInfoSoFar.push(foundDevices[i]);
                        }
                    }
                    else {
                        deviceInfoSoFar = foundDevices;
                    }
                    return Promise.resolve(deviceInfoSoFar);
                });
            }, Promise.resolve(null));
            return allDevicesPromise
                .then(function (allDeviceInfo) {
                if (!allDeviceInfo) {
                    return Promise.resolve([]);
                }
                return Promise.map(allDeviceInfo, function (devInfo) {
                    return sd.fromIdAsync(devInfo.id);
                });
            });
        }
        winrt.connectSerialDevicesAsync = connectSerialDevicesAsync;
        function deviceAdded(deviceInfo) {
            if (deviceNameFilter && !deviceNameFilter.test(deviceInfo.name)) {
                return;
            }
            pxt.debug("serial port added " + deviceInfo.name + " - " + deviceInfo.id);
            activePorts[deviceInfo.id] = {
                info: deviceInfo
            };
            Windows.Devices.SerialCommunication.SerialDevice.fromIdAsync(deviceInfo.id)
                .done(function (dev) {
                activePorts[deviceInfo.id].device = dev;
                startDevice(deviceInfo.id);
            });
        }
        function deviceRemoved(deviceInfo) {
            delete activePorts[deviceInfo.id];
        }
        function deviceUpdated(deviceInfo) {
            var port = activePorts[deviceInfo.id];
            if (port) {
                port.info.update(deviceInfo);
            }
        }
        var readingOpsCount = 0;
        function startDevice(id) {
            var port = activePorts[id];
            if (!port)
                return;
            if (!port.device) {
                var status_2 = Windows.Devices.Enumeration.DeviceAccessInformation.createFromId(id).currentStatus;
                pxt.reportError("winrt_device", "could not connect to serial device; device status: " + status_2);
                return;
            }
            var streams = Windows.Storage.Streams;
            port.device.baudRate = 115200;
            var stream = port.device.inputStream;
            var reader = new streams.DataReader(stream);
            reader.inputStreamOptions = streams.InputStreamOptions.partial;
            var serialBuffers = {};
            var readMore = function () {
                // Make sure the device is still active
                if (!activePorts[id] || !!port.cancellingDeferred) {
                    return;
                }
                port.readingOperation = reader.loadAsync(32);
                port.readingOperation.done(function (bytesRead) {
                    var msg = reader.readString(Math.floor(reader.unconsumedBufferLength / 4) * 4);
                    pxt.Util.bufferSerial(serialBuffers, msg, id);
                    setTimeout(function () { return readMore(); }, 1);
                }, function (e) {
                    var status = port.readingOperation.operation.status;
                    if (status === Windows.Foundation.AsyncStatus.canceled) {
                        reader.detachStream();
                        reader.close();
                        if (port.cancellingDeferred) {
                            setTimeout(function () { return port.cancellingDeferred.resolve(); }, 25);
                        }
                    }
                    else {
                        setTimeout(function () { return startDevice(id); }, 1000);
                    }
                });
            };
            setTimeout(function () { return readMore(); }, 100);
        }
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
/// <reference path="./winrtrefs.d.ts"/>
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        function promisify(p) {
            return new Promise(function (resolve, reject) {
                p.done(function (v) { return resolve(v); }, function (e) { return reject(e); });
            });
        }
        winrt.promisify = promisify;
        function toArray(v) {
            var r = [];
            var length = v.length;
            for (var i = 0; i < length; ++i)
                r.push(v[i]);
            return r;
        }
        winrt.toArray = toArray;
        /**
         * Detects if the script is running in a browser on windows
         */
        function isWindows() {
            return !!navigator && /Win32/i.test(navigator.platform);
        }
        winrt.isWindows = isWindows;
        function isWinRT() {
            return typeof Windows !== "undefined";
        }
        winrt.isWinRT = isWinRT;
        function initAsync(importHexImpl) {
            if (!isWinRT() || pxt.BrowserUtils.isIFrame())
                return Promise.resolve();
            var uiCore = Windows.UI.Core;
            var navMgr = uiCore.SystemNavigationManager.getForCurrentView();
            var app = Windows.UI.WebUI.WebUIApplication;
            app.addEventListener("suspending", suspendingHandler);
            app.addEventListener("resuming", resumingHandler);
            navMgr.onbackrequested = function (e) {
                // Ignore the built-in back button; it tries to back-navigate the sidedoc panel, but it crashes the
                // app if the sidedoc has been closed since the navigation happened
                pxt.log("BACK NAVIGATION");
                navMgr.appViewBackButtonVisibility = uiCore.AppViewBackButtonVisibility.collapsed;
                e.handled = true;
            };
            winrt.initSerial();
            return hasActivationProjectAsync()
                .then(function () {
                if (importHexImpl) {
                    importHex = importHexImpl;
                    app.removeEventListener("activated", initialActivationHandler);
                    app.addEventListener("activated", fileActivationHandler);
                }
            });
        }
        winrt.initAsync = initAsync;
        // Needed for when user double clicks a hex file without the app already running
        function captureInitialActivation() {
            if (!isWinRT()) {
                return;
            }
            initialActivationDeferred = Promise.defer();
            var app = Windows.UI.WebUI.WebUIApplication;
            app.addEventListener("activated", initialActivationHandler);
        }
        winrt.captureInitialActivation = captureInitialActivation;
        function loadActivationProject() {
            return initialActivationDeferred.promise
                .then(function (args) { return fileActivationHandler(args, /* openHomeIfFailed */ true); });
        }
        winrt.loadActivationProject = loadActivationProject;
        function hasActivationProjectAsync() {
            if (!isWinRT()) {
                return Promise.resolve(false);
            }
            // By the time the webapp calls this, if the activation promise hasn't been settled yet, assume we missed the
            // activation event and pretend there were no activation args
            initialActivationDeferred.resolve(null); // This is no-op if the promise had been previously resolved
            return initialActivationDeferred.promise
                .then(function (args) {
                return Promise.resolve(args && args.kind === Windows.ApplicationModel.Activation.ActivationKind.file);
            });
        }
        winrt.hasActivationProjectAsync = hasActivationProjectAsync;
        function releaseAllDevicesAsync() {
            if (!isWinRT()) {
                return Promise.resolve();
            }
            return Promise.resolve()
                .then(function () {
                if (winrt.packetIO) {
                    pxt.log("disconnecting packetIO");
                    return winrt.packetIO.disconnectAsync();
                }
                return Promise.resolve();
            })
                .catch(function (e) {
                e.message = "error disconnecting packetIO: " + e.message;
                pxt.reportException(e);
            })
                .then(function () {
                pxt.log("suspending serial");
                return winrt.suspendSerialAsync();
            })
                .catch(function (e) {
                e.message = "error suspending serial: " + e.message;
                pxt.reportException(e);
            });
        }
        winrt.releaseAllDevicesAsync = releaseAllDevicesAsync;
        function initialActivationHandler(args) {
            Windows.UI.WebUI.WebUIApplication.removeEventListener("activated", initialActivationHandler);
            initialActivationDeferred.resolve(args);
        }
        function suspendingHandler(args) {
            pxt.log("suspending");
            var suspensionDeferral = args.suspendingOperation.getDeferral();
            return releaseAllDevicesAsync()
                .then(function () { return suspensionDeferral.complete(); }, function (e) { return suspensionDeferral.complete(); })
                .done();
        }
        function resumingHandler(args) {
            pxt.log("resuming");
            if (winrt.packetIO) {
                pxt.log("reconnet pack io");
                winrt.packetIO.reconnectAsync().done();
            }
            winrt.initSerial();
        }
        var initialActivationDeferred;
        var importHex;
        function fileActivationHandler(args, openHomeIfFailed) {
            if (openHomeIfFailed === void 0) { openHomeIfFailed = false; }
            if (args.kind === Windows.ApplicationModel.Activation.ActivationKind.file) {
                var info = args;
                var file = info.files.getAt(0);
                if (file && file.isOfType(Windows.Storage.StorageItemTypes.file)) {
                    var f = file;
                    Windows.Storage.FileIO.readBufferAsync(f)
                        .then(function (buffer) {
                        var ar = [];
                        var dataReader = Windows.Storage.Streams.DataReader.fromBuffer(buffer);
                        while (dataReader.unconsumedBufferLength) {
                            ar.push(dataReader.readByte());
                        }
                        dataReader.close();
                        return pxt.cpp.unpackSourceFromHexAsync(new Uint8Array(ar));
                    })
                        .then(function (hex) { return importHex(hex, { openHomeIfFailed: openHomeIfFailed }); });
                }
            }
        }
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
/// <reference path="../built/pxtlib.d.ts"/>
/// <reference path="../built/pxteditor.d.ts"/>
/// <reference path="./winrtrefs.d.ts"/>
var pxt;
(function (pxt) {
    var winrt;
    (function (winrt) {
        var workspace;
        (function (workspace) {
            var U = pxt.Util;
            var folder;
            function fileApiAsync(path, data) {
                if (U.startsWith(path, "pkg/")) {
                    var id = path.slice(4);
                    if (data) {
                        return writePkgAsync(id, data);
                    }
                    else {
                        return readPkgAsync(id, true);
                    }
                }
                else if (path == "list") {
                    return initAsync()
                        .then(listPkgsAsync);
                }
                else {
                    throw throwError(404);
                }
            }
            workspace.fileApiAsync = fileApiAsync;
            function initAsync() {
                if (folder)
                    return Promise.resolve();
                var applicationData = Windows.Storage.ApplicationData.current;
                var localFolder = applicationData.localFolder;
                pxt.debug("winrt: initializing workspace");
                return winrt.promisify(localFolder.createFolderAsync(pxt.appTarget.id, Windows.Storage.CreationCollisionOption.openIfExists))
                    .then(function (fd) {
                    folder = fd;
                    pxt.debug("winrt: initialized workspace at " + folder.path);
                }).then(function () { });
            }
            function pathjoin() {
                var parts = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    parts[_i] = arguments[_i];
                }
                return parts.join('\\');
            }
            function readFileAsync(path) {
                var fp = pathjoin(folder.path, path);
                pxt.debug("winrt: reading " + fp);
                return winrt.promisify(Windows.Storage.StorageFile.getFileFromPathAsync(fp)
                    .then(function (file) { return Windows.Storage.FileIO.readTextAsync(file); }));
            }
            function writeFileAsync(dir, name, content) {
                var fd = pathjoin(folder.path, dir);
                pxt.debug("winrt: writing " + pathjoin(fd, name));
                return winrt.promisify(Windows.Storage.StorageFolder.getFolderFromPathAsync(fd))
                    .then(function (dk) { return dk.createFileAsync(name, Windows.Storage.CreationCollisionOption.replaceExisting); })
                    .then(function (f) { return Windows.Storage.FileIO.writeTextAsync(f, content); })
                    .then(function () { });
            }
            function statOptAsync(path) {
                var fn = pathjoin(folder.path, path);
                pxt.debug("winrt: " + fn);
                return winrt.promisify(Windows.Storage.StorageFile.getFileFromPathAsync(fn)
                    .then(function (file) { return file.getBasicPropertiesAsync()
                    .then(function (props) {
                    return {
                        name: path,
                        mtime: props.dateModified.getTime()
                    };
                }); }));
            }
            function throwError(code, msg) {
                if (msg === void 0) { msg = null; }
                var err = new Error(msg || "Error " + code);
                err.statusCode = code;
                throw err;
            }
            var HEADER_JSON = ".header.json";
            function writePkgAsync(logicalDirname, data) {
                pxt.debug("winrt: writing package at " + logicalDirname);
                return winrt.promisify(folder.createFolderAsync(logicalDirname, Windows.Storage.CreationCollisionOption.openIfExists))
                    .then(function () { return Promise.map(data.files, function (f) { return readFileAsync(pathjoin(logicalDirname, f.name))
                    .then(function (text) {
                    if (f.name == pxt.CONFIG_NAME) {
                        try {
                            var cfg = JSON.parse(f.content);
                            if (!cfg.name) {
                                pxt.log("Trying to save invalid JSON config");
                                throwError(410);
                            }
                        }
                        catch (e) {
                            pxt.log("Trying to save invalid format JSON config");
                            throwError(410);
                        }
                    }
                    if (text !== f.prevContent) {
                        pxt.log("merge error for " + f.name + ": previous content changed...");
                        throwError(409);
                    }
                }, function (err) { }); }); })
                    .then(function () { return Promise.map(data.files, function (f) { return writeFileAsync(logicalDirname, f.name, f.content); }); })
                    .then(function () { return writeFileAsync(logicalDirname, HEADER_JSON, JSON.stringify(data.header, null, 4)); })
                    .then(function () { return readPkgAsync(logicalDirname, false); });
            }
            function readPkgAsync(logicalDirname, fileContents) {
                pxt.debug("winrt: reading package under " + logicalDirname);
                return readFileAsync(pathjoin(logicalDirname, pxt.CONFIG_NAME))
                    .then(function (text) {
                    var cfg = JSON.parse(text);
                    return Promise.map(pxt.allPkgFiles(cfg), function (fn) {
                        return statOptAsync(pathjoin(logicalDirname, fn))
                            .then(function (st) {
                            var rf = {
                                name: fn,
                                mtime: st ? st.mtime : null
                            };
                            if (st == null || !fileContents)
                                return rf;
                            else
                                return readFileAsync(pathjoin(logicalDirname, fn))
                                    .then(function (text) {
                                    rf.content = text;
                                    return rf;
                                });
                        });
                    })
                        .then(function (files) {
                        var rs = {
                            path: logicalDirname,
                            header: null,
                            config: cfg,
                            files: files
                        };
                        return readFileAsync(pathjoin(logicalDirname, HEADER_JSON))
                            .then(function (text) {
                            if (text)
                                rs.header = JSON.parse(text);
                        }, function (e) { })
                            .then(function () { return rs; });
                    });
                });
            }
            function listPkgsAsync() {
                return winrt.promisify(folder.getFoldersAsync())
                    .then(function (fds) { return Promise.map(fds, function (fd) { return readPkgAsync(fd.name, false); }); })
                    .then(function (fsPkgs) {
                    return Promise.resolve({ pkgs: fsPkgs });
                });
            }
            function resetAsync() {
                return winrt.promisify(folder.deleteAsync(Windows.Storage.StorageDeleteOption.default)
                    .then(function () {
                    folder = undefined;
                }));
            }
            function getProvider(base) {
                var r = {
                    listAsync: base.listAsync,
                    getAsync: base.getAsync,
                    setAsync: base.setAsync,
                    resetAsync: resetAsync,
                };
                return r;
            }
            workspace.getProvider = getProvider;
        })(workspace = winrt.workspace || (winrt.workspace = {}));
    })(winrt = pxt.winrt || (pxt.winrt = {}));
})(pxt || (pxt = {}));
