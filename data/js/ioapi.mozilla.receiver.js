/* Copyright (c) 2012 The Tagspaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that 
 * can be found in the LICENSE file. */
// Activating browser specific IOAPI modul
define(function(require, exports, module) {
"use strict";

console.debug("Loading messaging.mozilla.js..");

	var TSCORE = require("tscore");	

	document.documentElement.addEventListener("addon-message1", function(event) {
	    console.debug("Message received in page script from content script: "); //+JSON.stringify(event.detail));
	    TSCORE.hideLoadingAnimation();
	    var message = event.detail;
	    switch (message.command) {
	      case "loadSettings":
	        if(message.success) {
	            try {
	                console.debug("Loading settings...: "+JSON.stringify(message.content));
	                TSCORE.Config.updateSettingMozillaPreferences(message.content);
	
	                TSCORE.initFavorites();
	                TSCORE.generateTagGroups();
	                  
	            } catch (ex) {
	                console.debug("Exception while getting setting from firefox failed "+ex)
	            }
	        } else {
	            console.debug("Getting setting from firefox failed") 
	        }
	        break;
	      case "saveSettings":
	        if(message.success) {
	            console.debug("Saving setting as native mozilla preference successfull!")
	        } else {
	            console.debug("Saving setting as native mozilla preference failed!")            
	        }
	        break;        
	      case "updateDefaultPath":
	        if(message.content.length > 1) {
	            TSCORE.setCurrentPath(message.content);
	        }
	        break;
	      case "rename":
	        if(message.success){
	            TSCORE.updateLogger("Rename success");   
	            // message.content contains the name of the file after the rename
	            TSCORE.selectedFiles[0] = message.content;
	            if(TSCORE.isFileOpened) {
	               TSCORE.openFile(TSCORE.selectedFiles[0]); 	
	            }
	            TSCORE.refreshFileListContainer();
	        } else {
	            TSCORE.updateLogger("Rename failed");        
	        }
	        break;
	      case "saveTextFile":
	        if(message.success){
	            TSCORE.updateLogger("Save success");             
	        } else {
	            TSCORE.updateLogger("Save failed");      
	        }
	        break;
	      case "createDirectory":
	        if(message.success){
	            TSCORE.updateLogger("Create dir success");            
	            TSCORE.openFavorite(TSCORE.Config.Settings["tagspacesList"][0].path, TSCORE.Config.Settings["tagspacesList"][0].name);
	        } else {
	            TSCORE.updateLogger("Create dir failed");        
	        }
	        break;
	      case "loadTextFile":
	        if(message.success){
	            TSCORE.FileOpener.updateEditorContent(message.content);         
	        } else {
	            TSCORE.updateLogger("File loading failed");      
	        }
	        break;
	      case "listDirectory":
	        if(message.success){
	            TSCORE.updateFileBrowserData(message.content);       
	        } else {
	            TSCORE.updateLogger("List directory failed");        
	        }
	        break;      
	      case "indexDirectory":
	        if(message.success){
	            //console.debug("Directory Index: "+JSON.stringify(message.content));
	            TSCORE.ViewManager.updateIndexData(message.content);       
	        } else {
	            TSCORE.updateLogger("Indexing directory failed");        
	        }
	        break;  
	      case "createDirectoryTree":
	        if(message.success){
	            //console.debug("Directory tree: "+JSON.stringify(message.content));
	            TSCORE.ViewManager.updateTreeData(message.content);       
	        } else {
	            TSCORE.updateLogger("Indexing directory failed");        
	        }
	        break;  
	      case "getSubdirs":
	        if(message.success){
	            var dirListing = [];
	            for (var i=0; i < message.content.length; i++) {
	                dirListing.push(message.content[i]);
	            }
	            // TODO JSON functions are a workarround for a bug....
	            TSCORE.updateSubDirs(JSON.parse( JSON.stringify(dirListing)));
	        } else {
	            TSCORE.updateLogger("Getting subdirs failed");       
	        }
	        break;  
	      case "delete":
	        if(message.success){
	            TSCORE.updateLogger("Delete success");               
	        } else {
	            TSCORE.updateLogger("Delete failed");        
	        }
	        break;          
	      case "selectDirectory":
	        if(message.success){
	        	// TODO make the use of this function more general
				$("#favoriteLocation").val(message.content);
	        } else {
	            TSCORE.updateLogger("Selecting directory failed.");        
	        }
	        break;          
	      default:
	        break;
	    }   
	}, false);
	
});