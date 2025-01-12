/* Copyright (c) 2012-2014 The Tagspaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that 
 * can be found in the LICENSE file. */
/* jshint moz: true, strict: false */
/* global exports */

// the value of this var is replaced to "true" by the build script
var PRODUCTION = "@@PRODUCTION";
var VERSION = "@@VERSION";

// Disabling all output to console in production mode
if (PRODUCTION == "true") {
    console = console || {};
    console.log = function(){};
    console.error = function(){};    
}

// Import the needed APIs
var data = require('sdk/self').data; // self
var ioutils = require("ioutils");
var settings = require("settings"); 
var request = require("sdk/request"); // request
var tabs = require("sdk/tabs");
//var userstyles = require("userstyles");
//var {Cc, Ci, Cu}  = require('chrome');
//var os = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULRuntime).OS;

var workers = [];
var toolbarButton;

if (require("sdk/system").staticArgs.disableStrict) {
    require("sdk/preferences/service").set("javascript.options.strict", false);
}

exports.main = function(options, callbacks) {
    console.log("Load reason: "+options.loadReason);

    var mainUIMod = require("sdk/page-mod"); // page-mod 
    mainUIMod.PageMod({
      include: data.url("index.html"), 
      contentScript: ''+
        'self.on("message", function(message) {'+
//            'console.log("Message received in content script from addon: "+JSON.stringify(message));'+
            'var event = document.createEvent("CustomEvent");'+
            'var cloned = cloneInto(message, document.defaultView);'+
            'event.initCustomEvent("tsMessage", true, true, cloned);'+
            'document.documentElement.dispatchEvent(event);'+
        '}); '+
        'document.documentElement.addEventListener("addon-message", function(event) {'+
//            'console.log("Message received from page script in content script "+JSON.stringify(event.detail));'+
            'self.postMessage(event.detail);'+ 
        '}, false);'+
      '',        
      contentScriptWhen: 'end', 
      onAttach: function onAttach(worker) {
        console.log("Attaching worker on tab with title: "+worker.tab.title);
        
        workers.push(worker);
        worker.on('message', function(data) {
            handleMessage(data, this);
        });
        worker.on('detach', function () {
            detachWorker(this);
        });	
      }  
    }); 

    // Adding menuitem to the tools menu
    var menuitem = require("menuitems").Menuitem({
        id: "TagSpacesMenuItem",
        menuid: "menu_ToolsPopup",
        label: "TagSpaces",
        // image: data.url("assets/icon16.png"),
        onCommand: openTagSpacesInNewTab,
        insertbefore: "menu_pageInfo"
    });
    
    // Adding toolbar button
    initToobarButton();
    if (options.loadReason == "install" || options.loadReason == "enable") {
        installToolbarButton();
    }
};

function installToolbarButton () {
    tsButton.moveTo({
        toolbarID: "nav-bar",
        insertbefore: "home-button",
        forceMove: false
    });
}

function openTagSpacesInNewTab() {
    tabs.open({
        url: data.url("index.html"),
        //isPinned: true,
        isPrivate : true
    });
}

function initToobarButton() {
    // Toolbar icon with badge
    /*toolbarButton = require('toolbarbutton').ToolbarButton({
        id: "tagspaces",
        label: "TagSpaces",
        tooltiptext: "TagSpaces",
        onClick: openTagSpacesInNewTab
    });
    toolbarButton.badge = "1.8.6";

    // Loading style for the toolbar icon with badge
    userstyles.load(data.url("mozilla/overlay.css"));
    if (os == "Linux") {
        userstyles.load(data.url("mozilla/overlay-linux.css"));
    }
    else if (os == "Darwin") {
        userstyles.load(data.url("mozilla/overlay-darwin.css"));
    }*/

    var buttons = require('sdk/ui/button/action');
    toolbarButton = buttons.ActionButton({
        id: "TSToolbarButton",
        label: "TagSpaces",
        icon: {
            "16": data.url("assets/icon16.png"),
            "32": data.url("assets/icon32.png"),
            "64": data.url("assets/icon64.png")
        },
        onClick: openTagSpacesInNewTab
    });
}
 
exports.onUnload = function(reason) {
  console.log(reason);
};

function detachWorker(worker) {
  console.log("Detaching worker...");
  var index = workers.indexOf(worker);
  workers.splice(index,1);
}

var checkForNewVersion = request.Request({
  url: "http://tagspaces.org/releases/version.json?fVer="+VERSION,
  onComplete: function (response) {
//    console.log("Result: " + response.text + " " + response.status);
    return response.text;  
  }
});

function checkNewVersion(worker) {
    try {   
        var content;
        var versionReq = request.Request({
            url: "http://tagspaces.org/releases/version.json?fVer=" + VERSION,
            onComplete: function (response) {
                console.log("Result: " + response.text + " " + response.status);
                response.text;
                worker.postMessage({
                    "command": "checkNewVersion",
                    "content": response.text,
                    "success": true
                });
                console.log("Loading settings successful!");
            }
        }).get();
    } catch(ex) {
        worker.postMessage({
                "command": "checkNewVersion",
                "success": false    
            });
        console.error("Checking new version failed "+ex);
    } 
}

function handleMessage(msg, worker) {
    //console.log("Message in main.js: " + JSON.stringify(msg) + " from tab " + worker.tab.title);
    //console.log("Thumbnail: "+worker.tab.getThumbnail());
    switch (msg.detail.command) {
        case "loadSettings":
            settings.loadSettings(worker);
            break;
        case "checkNewVersion":
            checkNewVersion(worker);
            break;
        case "saveSettings":
            settings.saveSettings(msg.detail.content, worker);
            break;
        case "rename":
            ioutils.rename(msg.detail.path, msg.detail.newPath, worker);
            break;
        case "copy":
            ioutils.copy(msg.detail.path, msg.detail.newPath, worker);
            break;
        case "saveTextFile":
            ioutils.saveTextFile(msg.detail.path, msg.detail.content, worker);
            break;
        case "saveBinaryFile":
            ioutils.saveBinaryFile(msg.detail.path, msg.detail.content, worker);
            break;
        case "createDirectory":
            ioutils.createDirectory(msg.detail.path, worker);
            break;
        case "loadTextFile":
            ioutils.loadTextFile(msg.detail.path, worker);
            break;
        case "listDirectory":
            ioutils.listDirectory(msg.detail.path, worker);
            break;
        case "delete":
            ioutils.deleteElement(msg.detail.path, worker);
            break;
        case "selectFile":
            ioutils.promptFileOpenPicker(worker);
            break;
        case "selectDirectory":
            ioutils.promptDirectorySelector(worker);
            break;
        case "openDirectory":
            ioutils.openDirectory(msg.detail.path, worker);
            break;
        case "openExtensionsDirectory":
            ioutils.openExtensionsDirectory(worker);
            break;
        case "createDirectoryIndex":
            ioutils.createDirectoryIndex(msg.detail.path, worker);
            break;
        case "createDirectoryTree":
            ioutils.createDirectoryTree(msg.detail.path, worker);
            break;
        case "getFileProperties":
            ioutils.getFileProperties(msg.detail.path, worker);
            break;
        default:
            break;
    }
}