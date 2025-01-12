/* Copyright (c) 2012-2014 The TagSpaces Authors. All rights reserved.
 * Use of this source code is governed by a AGPL3 license that 
 * can be found in the LICENSE file. */

/* global define, fs, process, gui  */
/* undef: true, unused: true */

define(function(require, exports, module) {
"use strict";
    
    // Activating browser specific exports modul
    console.log("Loading ioapi.node.js..");
    
    var TSCORE = require("tscore");    
    var TSPOSTIO = require("tspostioapi");

    var win = gui.Window.get();

    var rootMenu = new gui.Menu({ type: 'menubar'});
    var aboutMenu = new gui.Menu();
    var viewMenu = new gui.Menu();

    //var exif = require('../ext/viewerImage/exif-parser-master/lib/exif');
    //var BufferStream = require('../ext/viewerImage/exif-parser-master/lib/bufferstream');

    process.on("uncaughtException", function(err) {
        //alert("error: " + err);

        var msg =
              ' Information | Description \n'
            + '-------------|-----------------------------\n'
            + ' Date        | '+ new Date +'\n'
            + ' Type        | UncaughtException \n'
            + ' Stack       | '+ err.stack +'\n\n';

        //fs.appendFile(errorLogFile, '---uncaughtException---\n' + msg);
    });

    var handleTray = function() {
        // TODO disable in Ubuntu until node-webkit issue in unity fixed

        // Reference to window and tray
        var win = gui.Window.get();
        var tray;

        // Get the minimize event
        win.on('minimize', function() {
            // Hide window
            this.hide();

            // Show tray
            tray = new gui.Tray({ title: 'Tray', icon: 'icon128.png' });

            // Show window and remove tray when clicked
            tray.on('click', function() {
                win.show();
                this.remove();
                tray = null;
            });
        });
    };

    var handleStartParameters = function() {
        //Windows "C:\Users\na\Desktop\TagSpaces\tagspaces.exe" --original-process-start-time=13043601900594583 "G:\data\assets\icon16.png"
        //Linux /opt/tagspaces/tagspaces /home/na/Dropbox/TagSpaces/README[README].md
        //OSX /home/na/Dropbox/TagSpaces/README[README].md
        //gui.App.on('open', function(cmdline) {
        //   console.log('Command line arguments on open: ' + cmdline);
        //   TSCORE.FileOpener.openFile(cmdArguments);
        //});
        var cmdArguments = gui.App.argv;
        if(cmdArguments !== undefined && cmdArguments.length > 0) {
            console.log("CMD Arguments: "+cmdArguments+" Process running in "+process.cwd());
            var filePath = ""+cmdArguments;
            var dirPath = TSCORE.TagUtils.extractContainingDirectoryPath(filePath);
            TSCORE.IO.listDirectory(dirPath);
            TSCORE.FileOpener.openFileOnStartup(filePath);
        }
    };

    var initMainMenu = function() {

        if(win.menu === undefined) {
            win.menu = rootMenu;

            // TODO Clear the menu on reload
            if(TSCORE.Config.getShowMainMenu()) {
                aboutMenu.append(new gui.MenuItem({
                    type: 'normal',
                    label: $.i18n.t("ns.common:aboutTagSpaces"),
                    click: function (){
                        TSCORE.UI.showAboutDialog();
                    } }));

                viewMenu.append(new gui.MenuItem({
                    type: 'normal',
                    label: $.i18n.t("ns.common:showTagLibraryTooltip")+" ("+TSCORE.Config.getShowTagLibraryKeyBinding()+")",
                    click: function (){
                        TSCORE.UI.showTagsPanel();
                    } }));

                viewMenu.append(new gui.MenuItem({
                    type: 'normal',
                    label: $.i18n.t("ns.common:showLocationNavigatorTooltip")+" ("+TSCORE.Config.getShowFolderNavigatorBinding()+")",
                    click: function (){
                        TSCORE.UI.showLocationsPanel();
                    } }));

                viewMenu.append(new gui.MenuItem({ type: 'separator' }));

                viewMenu.append(new gui.MenuItem({
                    type: 'normal',
                    label: $.i18n.t("ns.common:toggleFullScreen")+" ("+TSCORE.Config.getToggleFullScreenKeyBinding().toUpperCase()+")",
                    click: function (){
                        win.toggleFullscreen();
                    } }));

                viewMenu.append(new gui.MenuItem({
                    type: 'normal',
                    label: $.i18n.t("ns.common:showDevTools")+" ("+TSCORE.Config.getOpenDevToolsScreenKeyBinding().toUpperCase()+")",
                    click: function (){
                        win.showDevTools();
                    } }));

                viewMenu.append(new gui.MenuItem({ type: 'separator' }));

                viewMenu.append(new gui.MenuItem({
                    type: 'normal',
                    label: 'Settings',
                    click: function (){
                        TSCORE.UI.showOptionsDialog();
                    } }));

                rootMenu.append(new gui.MenuItem({
                    label: 'View',
                    submenu: viewMenu
                }));

                rootMenu.append(new gui.MenuItem({
                    label: 'Help',
                    submenu: aboutMenu
                }));
            }
        }
    };

    function scanDirectory(dirPath, index) {
        try {
            var dirList = fs.readdirSync(dirPath);
            var path, stats;
            for (var i=0; i < dirList.length; i++) {
                path = dirPath+TSCORE.dirSeparator+dirList[i];
                stats = fs.statSync(path);
                //console.log('stats: ' + JSON.stringify(stats));
                index.push({
                    "name": dirList[i],
                    "isFile": !stats.isDirectory(),
                    "size": stats.size,
                    "lmdt": stats.mtime,
                    "path": path  
                });     
                if (stats.isDirectory()) {
                    scanDirectory(path, index);
                }                        
            }        
            return index;
        } catch(ex) {
            console.error("Scanning directory "+dirPath+" failed "+ex);
        }
    }

    function generateDirectoryTree(dirPath) {
        try {
            var tree = {}; 
            var dstats = fs.statSync(dirPath);           
            tree.name = pathUtils.basename(dirPath);
            tree.isFile = false;
            tree.lmdt = dstats.mtime;
            tree.path = dirPath;
            tree.children = [];
            var dirList = fs.readdirSync(dirPath);
            for (var i=0; i < dirList.length; i++) {
                var path = dirPath+TSCORE.dirSeparator+dirList[i];
                var stats = fs.statSync(path);
                if (stats.isFile()) {
                    tree.children.push({
                        "name": pathUtils.basename(path),
                        "isFile": true,
                        "size": stats.size,
                        "lmdt": stats.mtime,   
                        "path": path 
                    });
                } else {
                    tree.children.push( generateDirectoryTree(path) );
                }  
            }
            return tree;
        } catch(ex) {
            console.error("Scanning directory "+dirPath+" failed "+ex);
        }         
    }

    var createDirectoryIndex = function(dirPath) {
        console.log("Creating index for directory: "+dirPath);
        TSCORE.showWaitingDialog("TagSpaces is indexing the current directory with subdirectories.");
        
        var directoryIndex = [];
        directoryIndex = scanDirectory(dirPath, directoryIndex);
        //console.log(JSON.stringify(directoryIndex));
        TSPOSTIO.createDirectoryIndex(directoryIndex);
    };
    
    var createDirectoryTree = function(dirPath) {
        console.log("Creating directory index for: "+dirPath);
        TSCORE.showWaitingDialog("TagSpaces is creating the structure tree of the current directory.");

        var directoyTree = generateDirectoryTree(dirPath);
        //console.log(JSON.stringify(directoyTree));
        TSPOSTIO.createDirectoryTree(directoyTree);
    };
    
    var createDirectory = function(dirPath) {
        console.log("Creating directory: "+dirPath);   

        fs.mkdir(dirPath, function(error) {
            if (error) {
                console.log("Creating directory "+dirPath+" failed "+error);
                return;
            }
            TSPOSTIO.createDirectory(dirPath);
        });
    };

    var copyFile = function(sourceFilePath, targetFilePath) {
        console.log("Copy file: "+sourceFilePath+" to "+targetFilePath);

        if(sourceFilePath.toLowerCase() === targetFilePath.toLowerCase()) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("Initial and target file names are the same.","File was not copyied.");
            return false;
        }
        if(fs.lstatSync(sourceFilePath).isDirectory()) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("'"+sourceFilePath+"' is a directory and can not be moved.");
            return false;
        }
        if(fs.existsSync(targetFilePath)) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("Target file '"+targetFilePath+"' already exists.","File renaming failed!");
            return false;
        }

        var rd = fs.createReadStream(sourceFilePath);
        rd.on("error", function(err) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("Copying of '"+sourceFilePath+"' failed.");
        });
        var wr = fs.createWriteStream(targetFilePath);
        wr.on("error", function(err) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("Copying of '"+sourceFilePath+"' failed.");
        });
        wr.on("close", function(ex) {
            TSPOSTIO.copyFile(sourceFilePath, targetFilePath)
        });
        rd.pipe(wr);
    };

    var renameFile = function(filePath, newFilePath) {
        console.log("Renaming file: "+filePath+" to "+newFilePath);

        if(filePath === newFilePath) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("Initial and target file names are the same.","File was not moved/renamed.");
            return false;
        }
        if(fs.lstatSync(filePath).isDirectory()) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("'"+filePath+"' is a directory and can not be moved.");
            return false;
        }
        if(fs.existsSync(newFilePath)) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("Target file '"+newFilePath+"' already exists.","File renaming failed!");
            return false;
        }
        fs.rename(filePath, newFilePath, function(error) {
            if (error) {
                TSCORE.hideWaitingDialog();
                TSCORE.showAlertDialog("Renaming of '"+filePath+"' failed. The file is probably on a different partion.");
                return;
            }
            TSPOSTIO.renameFile(filePath, newFilePath);
        });
    };

    var renameDirectory = function(dirPath, newDirName) {
        var newDirPath = TSCORE.TagUtils.extractParentDirectoryPath(dirPath) + TSCORE.dirSeparator + newDirName;
        console.log("Renaming file: "+dirPath+" to "+newDirPath);

        // TODO check if file opened for editing in the same directory as source dir

        if(dirPath === newDirPath) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("Initial and target directories are the same.","Directory was not renamed.");
            return false;
        }
        if(fs.existsSync(newDirPath)) {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("Target directory name '"+newDirPath+"' already exists.","Directory renaming failed!");
            return false;
        }
        var dirStatus = fs.statSync(dirPath);
        if(dirStatus.isDirectory) {
            fs.rename(dirPath, newDirPath, function(error) {
                if (error) {
                    console.log("Renaming directory failed "+error);
                    return;
                }
                TSPOSTIO.renameDirectory(dirPath, newDirPath);
            });
        } else {
            TSCORE.hideWaitingDialog();
            TSCORE.showAlertDialog("Path '"+dirPath+"' is not a directory.","Directory renaming failed!");
            return false;
        }
    };

    var loadTextFile = function(filePath, isPreview) {
        console.log("Loading file: "+filePath);

        if(isPreview) {
            var stream = fs.createReadStream(filePath,  {start: 0, end: 10000});
            stream.on('error', function(err){
                console.log("Loading file "+filePath+" failed "+err);
                return;
            });

            stream.on('data', function(content) {
                console.log("Stream: "+content);
                TSPOSTIO.loadTextFile(content);
            });

        } else {
            fs.readFile(filePath, 'utf8', function(error, content) {
                if (error) {
                    console.log("Loading file "+filePath+" failed "+error);
                    return;
                }
                TSPOSTIO.loadTextFile(content);
            });
        }
    };
    
    /* var loadEXIF = function(filePath) {
        console.log("Loading file: "+filePath);

        var buf = fs.readFileSync(filePath);
        exif.parseTags(new BufferStream(buf, 24, 23960), function(ifdSection, tagType, value, format) {
            console.log("EXIF: "+ifdSection+" "+tagType+" "+value+" "+format);
        });
    };    */
    
    var saveTextFile = function(filePath,content,overWrite) {
        console.log("Saving file: "+filePath);

        /** TODO check if fileExist by saving needed
        if(overWrite) {
            // Current implementation
        } else {
            if (!pathUtils.existsSync(filePath)) { 
               // Current implementation
            }                     
        }
        */
 
        // Handling the UTF8 support for text files
        var UTF8_BOM = "\ufeff";

        if(content.indexOf(UTF8_BOM) === 0) {
            console.log("Content beging with a UTF8 bom");
        } else {
            content = UTF8_BOM+content;
        }

        var isNewFile = !fs.existsSync(filePath);
       
        fs.writeFile(filePath, content, 'utf8', function(error) {
            if (error) {
                console.log("Save to file "+filePath+" failed "+error);
                return;
            }
            TSPOSTIO.saveTextFile(filePath, isNewFile);
        }); 
    };

    var saveBinaryFile = function(filePath,content) {
        console.log("Saving binary file: "+filePath);

        if(!fs.existsSync(filePath)) {
            fs.writeFile(filePath, content, 'utf8', function(error) {
                if (error) {
                    console.log("Save to file "+filePath+" failed "+error);
                    return;
                }
                TSPOSTIO.saveBinaryFile(filePath);
            });
        } else {
            TSCORE.showAlertDialog("File Already Exists.");
        }
    };

    var listDirectory = function (dirPath) {
        console.log("Listing directory: " + dirPath);

        try {
            fs.readdir(dirPath, function (error, dirList) {
                if (error) {
                    TSPOSTIO.errorOpeningPath(dirPath);
                    console.log("Listing directory: " + dirPath + " failed " + error);
                    return;
                }

                var anotatedDirList = [];
                for (var i = 0; i < dirList.length; i++) {
                    var path = dirPath + TSCORE.dirSeparator + dirList[i];
                    var stats = fs.statSync(path);
                    //console.log('stats: ' + JSON.stringify(stats));
                    anotatedDirList.push({
                        "name": dirList[i],
                        "isFile": !stats.isDirectory(),
                        "size": stats.size,
                        "lmdt": stats.mtime,
                        "path": path
                    });
                }
                TSPOSTIO.listDirectory(anotatedDirList);
            });
        } catch (ex) {
            TSPOSTIO.errorOpeningPath();
            console.error("Listing directory " + dirPath + " failed " + ex);
        }
    };
    
    var deleteElement = function(path) {
        console.log("Deleting: "+path);

        fs.unlink(path, function(error) {
            if (error) {
                console.log("Deleting file "+path+" failed "+error);
                return;
            }
            TSPOSTIO.deleteElement(path);
        });        
    };

    var deleteDirectory = function(path) {
        console.log("Deleting directory: "+path);

        fs.rmdir(path, function(error) {
            if (error) {
                console.log("Deleting directory "+path+" failed "+error);
                TSPOSTIO.deleteDirectoryFailed(path);
                return;
            }
            TSPOSTIO.deleteDirectory(path);
        });
    };
    
    var checkAccessFileURLAllowed = function() {
        console.log("checkAccessFileURLAllowed function not relevant for node..");
    };    
    
    var checkNewVersion = function() {
        console.log("Checking for new version...");
        var cVer = TSCORE.Config.DefaultSettings.appVersion+"."+TSCORE.Config.DefaultSettings.appBuild;
        $.ajax({
            url: 'http://tagspaces.org/releases/version.json?nVer='+cVer,
            type: 'GET'
        })
        .done(function(data) { 
            TSPOSTIO.checkNewVersion(data);    
        })
        .fail(function(data) { 
            console.log("AJAX failed "+data); 
        })
        ;      
    };    

    var selectDirectory = function() {
        if(document.getElementById('folderDialogNodeWebkit') === null) {
            $("body").append('<input style="display:none;" id="folderDialogNodeWebkit" type="file" nwdirectory />');
        }
        var chooser = $('#folderDialogNodeWebkit');
        chooser.change(function() {
            TSPOSTIO.selectDirectory($(this).val());
        });
        chooser.trigger('click');  
    };
    
    var openDirectory = function(dirPath) {
        // showItemInFolder
        gui.Shell.openItem(dirPath);
    };

    var openFile = function(filePath) {
        // TODO prevent opening executables in windows
        gui.Shell.openItem(filePath);
    };

    // Bring the TagSpaces window on top of the windows
    var focusWindow = function() {
        gui.Window.get().focus();
    };

    var selectFile = function() {
        if(document.getElementById('fileDialog') === null) {
            $("#folderLocation").after('<input style="display:none;" id="fileDialog" type="file" />');
        }
        var chooser = $('#fileDialog');        
        chooser.change(function() {
            console.log("File selected: "+$(this).val());
        });
        chooser.trigger('click');  
    };
    
    var openExtensionsDirectory = function() {
        // TODO implement openExtensionsDirectory on node
        //gui.Shell.openItem(extPath);
        console.log("Open extensions directory functionality not implemented on chrome yet!");
        TSCORE.showAlertDialog("Open extensions directory functionality not implemented yet!");
    };

/* stats for file:
  dev: 2114,
  ino: 48064969,
  mode: 33188,
  nlink: 1,
  uid: 85,
  gid: 100,
  rdev: 0,
  size: 527,
  blksize: 4096,
  blocks: 8,
  atime: Mon, 10 Oct 2011 23:24:11 GMT,
  mtime: Mon, 10 Oct 2011 23:24:11 GMT,
  ctime: Mon, 10 Oct 2011 23:24:11 GMT 
*/    
    var getFileProperties = function(filePath) {
        var fileProperties = {};
        var stats = fs.statSync(filePath);
        if (stats.isFile()) {
            fileProperties.path = filePath;
            fileProperties.size = stats.size;
            fileProperties.lmdt = stats.mtime;
            TSPOSTIO.getFileProperties(fileProperties);
        } else {
            console.warn("Error getting file properties. "+filePath+" is directory");   
        }        
    };    
    
    exports.createDirectory              = createDirectory;
    exports.renameDirectory              = renameDirectory;
    exports.renameFile                   = renameFile;
    exports.copyFile                     = copyFile;
    exports.loadTextFile                 = loadTextFile;
    exports.saveTextFile                 = saveTextFile;
    exports.saveBinaryFile               = saveBinaryFile;
    exports.listDirectory                = listDirectory;
    exports.deleteElement                = deleteElement;
    exports.deleteDirectory              = deleteDirectory;
    exports.createDirectoryIndex         = createDirectoryIndex;
    exports.createDirectoryTree          = createDirectoryTree;
    exports.selectDirectory              = selectDirectory;
    exports.openDirectory                = openDirectory;
    exports.openFile                     = openFile;
    exports.selectFile                   = selectFile;
    exports.openExtensionsDirectory      = openExtensionsDirectory;
    exports.checkAccessFileURLAllowed    = checkAccessFileURLAllowed;
    exports.checkNewVersion              = checkNewVersion;
    exports.getFileProperties            = getFileProperties;
    exports.initMainMenu                 = initMainMenu;
    exports.handleStartParameters        = handleStartParameters;
    exports.handleTray                   = handleTray;
    exports.focusWindow                  = focusWindow;

});
