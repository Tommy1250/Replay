const {
    app,
    BrowserWindow,
    ipcMain,
    dialog,
    Tray,
    Menu,
    shell
} = require('electron');

const path = require("path");
const fs = require("fs");
const iconpath = path.join(__dirname, "..", 'favicon.ico');

let tray = null;

let settingsChanged = false;

ipcMain.on("settingsChanged", (event, arg) => {
	settingsChanged = true;
});

/**
 * @param {BrowserWindow} mainWindow
 * @param {BrowserWindow} settingsWindow
 * @param {BrowserWindow} lyricsWindow
 * @param {BrowserWindow} addWindow
 */
module.exports = async (settings, mainWindow, settingsWindow, lyricsWindow, addWindow) => {
    const savesPath = path.join(app.getPath("userData"), "saves");

    const menuTemplate = [{
            label: 'File',
            submenu: [{
                    label: "Choose Music Folder",
                    click: async function () {
                        const {
                            canceled,
                            filePaths
                        } = await dialog.showOpenDialog({
                            properties: ['openDirectory']
                        })

                        if (!canceled) {
                            if (filePaths) {
                                console.log(filePaths[0]);
                                mainWindow.webContents.send("folder", filePaths[0]);

                                if (menuTemplate[3].submenu[0].label === "Open Music Folder") {
                                    menuTemplate[3].submenu[0] = {
                                        label: "Open Music Folder",
                                        click: () => {
                                            shell.openPath(filePaths[0]);
                                        }
                                    }
                                } else {
                                    menuTemplate[3].submenu.unshift({
                                        label: "Open Music Folder",
                                        click: () => {
                                            shell.openPath(filePaths[0]);
                                        }
                                    })
                                }

                                const menu2 = Menu.buildFromTemplate(menuTemplate);
                                Menu.setApplicationMenu(menu2);
                            }
                        }
                    }
                },
                {
                    label: "Choose Lyrics Folder",
                    click: async function () {
                        const {
                            canceled,
                            filePaths
                        } = await dialog.showOpenDialog({
                            properties: ['openDirectory']
                        })

                        if (!canceled) {
                            if (filePaths) {
                                console.log(filePaths[0]);
                                mainWindow.webContents.send("lyricsFolder", filePaths[0]);

                                if (menuTemplate[3].submenu[1].label === "Open Lyrics Folder") {
                                    menuTemplate[3].submenu[1] = {
                                        label: "Open Lyrics Folder",
                                        click: () => {
                                            shell.openPath(filePaths[0]);
                                        }
                                    }
                                } else {
                                    if (menuTemplate[3].submenu[1]) {
                                        menuTemplate[3].submenu.splice(1, 0, {
                                            label: "Open Lyrics Folder",
                                            click: () => {
                                                shell.openPath(filePaths[0]);
                                            }
                                        })
                                    } else {
                                        menuTemplate[3].submenu.unshift({
                                            label: "Open Lyrics Folder",
                                            click: () => {
                                                shell.openPath(filePaths[0]);
                                            }
                                        })
                                    }
                                }

                                const menu2 = Menu.buildFromTemplate(menuTemplate);
                                Menu.setApplicationMenu(menu2);
                            }
                        }
                    }
                },
                {
                    label: "Refresh Library",
                    click: () => {
                        mainWindow.webContents.send("refresh");
                    }
                },
                {
                    label: "Add Songs",
                    click: () => {
                        if (!addWindow) {
                            addWindow = new BrowserWindow({
                                width: 800,
                                height: 600,
                                frame: false,
                                webPreferences: {
                                    nodeIntegration: true,
                                    contextIsolation: false
                                }
                            });

                            if (!app.isPackaged) {
                                addWindow.webContents.openDevTools();
                            }
                            addWindow.loadFile(path.join(__dirname, "..", "client/add.html"));
                            addWindow.setMenu(null);
                            addWindow.setIcon(iconpath);
                            addWindow.on("closed", () => {
                                //emit an event to the main window
                                mainWindow.webContents.send("refresh")

                                addWindow.destroy();
                                addWindow = null;
                            });
                        } else {
                            addWindow.focus();
                        }
                    }
                },
                {
                    label: 'Quit',
                    click: function () {
                        app.exit();
                    },
                }
            ]
        },
        {
            label: "Lyrics",
            click: () => {
                if (!lyricsWindow) {
                    lyricsWindow = new BrowserWindow({
                        width: 400,
                        height: 720,
                        frame: false,
                        webPreferences: {
                            nodeIntegration: true,
                            contextIsolation: false
                        }
                    });

                    if (!app.isPackaged) {
                        lyricsWindow.webContents.openDevTools();
                    }

                    lyricsWindow.loadFile(path.join(__dirname, "..", "client/lyrics.html"));
                    lyricsWindow.setMenu(null);
                    lyricsWindow.setIcon(iconpath);

                    lyricsWindow.on("closed", () => {
                        lyricsWindow.destroy();
                        lyricsWindow = null;
                    });
                } else {
                    lyricsWindow.focus();
                }
            }
        },
        {
            label: "settings",
            click: () => {
                if (!settingsWindow) {
                    settingsWindow = new BrowserWindow({
                        width: 800,
                        height: 600,
                        frame: false,
                        webPreferences: {
                            nodeIntegration: true,
                            contextIsolation: false
                        }
                    });

                    if (!app.isPackaged) {
                        settingsWindow.webContents.openDevTools();
                    }

                    settingsWindow.loadFile(path.join(__dirname, "..", "client/settings.html"));
                    settingsWindow.setMenu(null);
                    settingsWindow.setIcon(iconpath);

                    settingsWindow.on("closed", () => {
                        settingsWindow.destroy();
                        settingsWindow = null;
                        if (settingsChanged) {
                            const dialogOpts = {
                                type: 'info',
                                buttons: ['Restart', 'Later'],
                                title: 'Apply Settings',
                                detail: 'You have unsaved changes. Would you like to restart the app to apply these changes?',
                                icon: path.join(__dirname, "..", "favicon.ico")
                            }
                            dialog.showMessageBox(dialogOpts).then((returnValue) => {
                                if (returnValue.response === 0) {
                                    app.relaunch();
                                    app.exit();
                                } else {
                                    settingsChanged = false;
                                    dialog.showMessageBoxSync({
                                        title: 'Info',
                                        message: 'Settings have not been applied.\nRestart the app at any time to apply changes.'
                                    })
                                }
                            })
                        }
                    });
                } else {
                    settingsWindow.focus();
                }
            },
        },
        {
            label: "Info",
            submenu: [{
                label: "About",
                click: () => {
                    let aboutWindow = new BrowserWindow({
                        width: 400,
                        height: 400
                    })

                    if (!app.isPackaged) {
                        aboutWindow.webContents.openDevTools();
                    }
                    aboutWindow.loadFile(path.join(__dirname, "..", "client/info.html"));
                    aboutWindow.setMenu(null);
                    aboutWindow.setIcon(iconpath);
                    aboutWindow.on("closed", () => {
                        aboutWindow.destroy();
                        aboutWindow = null;
                    })
                }
            }]
        }
    ]

    const lyricsFolderLocation = fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8");
    if (lyricsFolderLocation && lyricsFolderLocation !== "") {
        if (fs.existsSync(lyricsFolderLocation)) {
            menuTemplate[3].submenu.unshift({
                label: "Open Lyrics Folder",
                click: () => {
                    shell.openPath(lyricsFolderLocation);
                }
            })
        }
    }

    const folderlocation = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf8")
    if (folderlocation && folderlocation !== "") {
        if (fs.existsSync(folderlocation)) {
            menuTemplate[3].submenu.unshift({
                label: "Open Music Folder",
                click: () => {
                    shell.openPath(folderlocation);
                }
            })
        }
    }

    if (!app.isPackaged) {
        menuTemplate[0].submenu.push({
            role: "reload"
        })
    }

    if (settings["tray"].status === "1") {
        tray = new Tray(iconpath);

        const trayTemplate = [{
                label: 'OpenApp',
                click: function () {
                    if (BrowserWindow.getAllWindows().length === 0) {
                        createWindow();
                    } else {
                        BrowserWindow.getAllWindows()[0].show();
                    }
                }
            },
            {
                label: "Pause/Play",
                click: function () {
                    mainWindow.webContents.send("pause");
                }
            },
            {
                label: "Next Song",
                click: function () {
                    mainWindow.webContents.send("next");
                }
            },
            {
                label: "Previous Song",
                click: function () {
                    mainWindow.webContents.send("prev");
                }
            },
            {
                label: 'Quit',
                click: function () {
                    app.exit();
                }
            }
        ];

        const menu = Menu.buildFromTemplate(trayTemplate);

        tray.setContextMenu(menu);
        tray.setTitle("Replay Toolbox");
        tray.setToolTip("Replay Toolbox");
        tray.on("click", function () {
            mainWindow.show()
        });
    }

    const menu2 = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu2);
}