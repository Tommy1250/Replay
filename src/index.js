const {
	app,
	BrowserWindow,
	ipcMain,
	dialog,
	Tray,
	Menu,
	shell
} = require('electron');
const path = require('path');
const fs = require("fs");

const iconpath = path.join(__dirname, 'favicon.ico');

let tray = null;

let lyrics;

require("dotenv").config();

const {
	discordLogin,
	changeActivity,
	stopActivity
} = require("./discord")
discordLogin();

/**
 * @type {BrowserWindow}
 */
let mainWindow;

/**
 * @type {BrowserWindow}
 */
let lyricsWindow;

/**
 * @type {BrowserWindow}
 */
let addWindow;

/**
 * @type {BrowserWindow}
 */
let settingsWindow;

/**
 * @type {BrowserWindow}
 */
let renameWindow;

const createWindow = () => {
	// Create the browser window.
	mainWindow = new BrowserWindow({
		width: 1280,
		height: 720,
		webPreferences: {
			nodeIntegration: true,
			nodeIntegrationInWorker: true,
			nodeIntegrationInSubFrames: true,
			enableRemoteModule: true,
			contextIsolation: false
		}
	});

	// and load the index.html of the app.
	//mainWindow.setMenu(null);

	if (!app.isPackaged) {
		mainWindow.webContents.openDevTools();
	}

	mainWindow.loadFile(path.join(__dirname, 'client/index.html'));
	mainWindow.setIcon(iconpath);
};

const savesPath = path.join(app.getPath("userData"), "saves");

let settings;

//compare the current version with the version in the saves folder
if (fs.existsSync(savesPath)) {
	const savesVersion = JSON.parse(fs.readFileSync(path.join(savesPath, "version.json"), "utf-8"));
	const appSaverVersion = JSON.parse(fs.readFileSync(path.join(__dirname, "saves/version.json"), "utf-8"));

	if (parseInt(savesVersion.version) < parseInt(appSaverVersion.version)) {
		//if the version is different, delete the saves folder
		fs.rmSync(savesPath, {
			recursive: true
		});

		//create the saves folder again with the new version
		fs.mkdirSync(savesPath);
		fs.readdirSync(path.join(__dirname, "saves")).forEach(file => {
			if (!file.includes("example"))
				fs.copyFileSync(path.join(__dirname, "saves/" + file), path.join(savesPath, file));
		});
	}
	settings = JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8"));
} else {
	fs.mkdirSync(savesPath);
	fs.readdirSync(path.join(__dirname, "saves")).forEach(file => {
		if (!file.includes("example"))
			fs.copyFileSync(path.join(__dirname, "saves/" + file), path.join(savesPath, file));
	});
	settings = JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8"));
}

let settingsChanged = false;

ipcMain.on("settingsChanged", (event, arg) => {
	settingsChanged = true;
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
	if (settings["update"].status === "1") {
		const currnet = `/Tommy1250/Replay/releases/tag/v${app.getVersion()}`

		const {default: axios} = require("axios");
		axios.get("https://github.com/Tommy1250/Replay/releases/latest")
		.then(response => {
			if(response.request.path !== currnet){
				const dialogOpts = {
					type: 'info',
					buttons: ['Go to download page', "Don't notify again", "Later"],
					title: 'Update Avalable',
					detail: 'There is an update avalable for Replay do you want to download the update?',
					icon: path.join(__dirname, "favicon.ico")
				}
				dialog.showMessageBox(dialogOpts).then((returnValue) => {
					if (returnValue.response === 0) {
						shell.openExternal("https://github.com/Tommy1250/Replay/releases/latest");
						app.exit();
					} else if(returnValue.response === 1) {
						settings["update"].status = "0";
						fs.writeFile(path.join(savesPath, 'settings.json') , JSON.stringify(settings), (err) => {
							if (err) console.error(err);
						})
					}
				})
			}
		})
		.catch(err => {
			console.error(err)
		})
	}

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
								webPreferences: {
									nodeIntegration: true,
									contextIsolation: false
								}
							});

							if (!app.isPackaged) {
								addWindow.webContents.openDevTools();
							}
							addWindow.loadFile(path.join(__dirname, "client/add.html"));
							addWindow.setMenu(null);
							addWindow.setIcon(iconpath);
							addWindow.on("closed", () => {
								//emit an event to the main window
								mainWindow.webContents.send("refresh")

								addWindow.destroy();
								addWindow = null;
							});
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
			label: "Song",
			submenu: [{
					label: "Lyrics",
					click: () => {
						if (!lyricsWindow) {
							lyricsWindow = new BrowserWindow({
								width: 400,
								height: 720,
								webPreferences: {
									nodeIntegration: true,
									contextIsolation: false
								}
							});

							if (!app.isPackaged) {
								lyricsWindow.webContents.openDevTools();
							}
							lyricsWindow.loadFile(path.join(__dirname, "client/lyrics.html"));
							lyricsWindow.setMenu(null);
							lyricsWindow.setIcon(iconpath);

							lyricsWindow.on("closed", () => {
								lyricsWindow.destroy();
								lyricsWindow = null;
							});
						}
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
					label: "Pause/Play",
					click: function () {
						mainWindow.webContents.send("pause");
					}
				}
			]
		},
		{
			label: "settings",
			click: () => {
				if (!settingsWindow) {
					settingsWindow = new BrowserWindow({
						width: 800,
						height: 600,
						webPreferences: {
							nodeIntegration: true,
							contextIsolation: false
						}
					});

					if (!app.isPackaged) {
						settingsWindow.webContents.openDevTools();
					}

					settingsWindow.loadFile(path.join(__dirname, "client/settings.html"));
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
								icon: path.join(__dirname, "favicon.ico")
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
					aboutWindow.loadFile(path.join(__dirname, "client/info.html"));
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
				label: 'Music Control',
				submenu: [{
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
						label: "Pause/Play",
						click: function () {
							mainWindow.webContents.send("pause");
						}
					}
				]
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
			if (BrowserWindow.getAllWindows().length === 0) {
				createWindow();
			} else {
				BrowserWindow.getAllWindows()[0].show();
			}
		});
	}

	const menu2 = Menu.buildFromTemplate(menuTemplate);
	Menu.setApplicationMenu(menu2);

	createWindow();

	mainWindow.on('close', (e) => {
		if (settings["tray"].status === "1") {
			e.preventDefault();
			mainWindow.hide();
		}
	});
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
	if (settings["tray"].status === "0") {
		app.quit();
	}
});

app.on('activate', () => {
	// On OS X it's common to re-create a window in the app when the
	// dock icon is clicked and there are no other windows open.
	if (BrowserWindow.getAllWindows().length === 0) {
		createWindow();
	}
});

ipcMain.on("makeSongMenu", (event, arg) => {
	const template = [{
			label: "Play",
			click: () => {
				mainWindow.webContents.send("change", {
					number: arg.number,
					playlist: arg.playlist
				});
			}
		},
		{
			label: "Rename",
			click: () => {
				if (!renameWindow) {
					renameWindow = new BrowserWindow({
						width: 600,
						height: 77,
						webPreferences: {
							nodeIntegration: true,
							contextIsolation: false
						}
					});

					renameWindow.loadFile(path.join(__dirname, "client/rename.html"));
					renameWindow.setMenu(null);
					renameWindow.setIcon(iconpath);

					if (!app.isPackaged) {
						renameWindow.webContents.openDevTools();
					}

					renameWindow.webContents.send("info", {
						songName: arg.name,
						playlistName: arg.playlist,
						playlist: false
					});

					ipcMain.on("getInfo", () => {
						renameWindow.webContents.send("info", {
							songName: arg.name,
							playlistName: arg.playlist,
							playlist: false
						});
					})

					renameWindow.on("closed", () => {
						renameWindow.destroy();
						renameWindow = null;
					})
				}
			}
		},
		{
			label: "Delete",
			click: () => {
				const dialogOpts = {
					type: 'info',
					buttons: ['Yes', 'No'],
					title: 'Delete File',
					detail: `Are you sure you want to delete the file: ${arg.name}?`,
					icon: path.join(__dirname, "favicon.ico")
				}
				dialog.showMessageBox(dialogOpts).then((returnValue) => {
					if (returnValue.response === 0) {
						deleteSong(arg.name, arg.playlist);
					}
				})

			}
		}
	]

	if (arg.addShow) {
		template.splice(2, 0, {
			label: "Show in Playlist",
			click: () => {
				mainWindow.webContents.send("showSong", {
					playlist: arg.playlist,
					number: arg.number
				})
			}
		})
	}
	const menu = Menu.buildFromTemplate(template);
	menu.popup();
});

ipcMain.on("makePlaylistMenu", (event, arg) => {
	const template = [{
			label: "Play",
			click: () => {
				mainWindow.webContents.send("change", {
					number: 0,
					playlist: arg.name
				});
			}
		},
		{
			label: "Browse to folder",
			click: () => {
				let folder = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8");
				if(arg.name === "random"){
					shell.openPath(folder);
				}else{
					shell.openPath(path.join(folder, arg.name))
				}
			}
		}
	]

	if(arg.name !== "random"){
		template.push({
			label: "Rename",
			click: () => {
				if (!renameWindow) {
					renameWindow = new BrowserWindow({
						width: 600,
						height: 77,
						webPreferences: {
							nodeIntegration: true,
							contextIsolation: false
						}
					});

					renameWindow.loadFile(path.join(__dirname, "client/rename.html"));
					renameWindow.setMenu(null);
					renameWindow.setIcon(iconpath);

					if (!app.isPackaged) {
						renameWindow.webContents.openDevTools();
					}

					renameWindow.webContents.send("info", {
						songName: "",
						playlistName: arg.name,
						playlist: true
					});

					ipcMain.on("getInfo", () => {
						renameWindow.webContents.send("info", {
							songName: "",
							playlistName: arg.name,
							playlist: true
						});
					})

					renameWindow.on("closed", () => {
						renameWindow.destroy();
						renameWindow = null;
					})
				}
			}
		},
		{
			label: "Delete",
			click: () => {
				const dialogOpts = {
					type: 'info',
					buttons: ['Yes', 'No'],
					title: 'Delete Playlist',
					detail: `Are you sure you want to delete the playlist: ${arg.name}?\nNOTE: This will delete the playlist and all of its content from the device`,
					icon: path.join(__dirname, "favicon.ico")
				}
				dialog.showMessageBox(dialogOpts).then((returnValue) => {
					if (returnValue.response === 0) {
						deletePlaylist(arg.name);
					}
				})

			}
		})
	}

	const menu = Menu.buildFromTemplate(template);
	menu.popup();
})

ipcMain.on("stream", (event, arg) => {
	mainWindow.webContents.send("stream", arg);
});

ipcMain.on("updateLyrics", (event, arg) => {
	if (lyricsWindow) {
		lyricsWindow.webContents.send("lyrics", arg);
	}
	if (mainWindow) {
		mainWindow.webContents.send("lyrics", arg.lyrics);
	}
	lyrics = arg;
});

ipcMain.on("getLyrics", (event, arg) => {
	lyricsWindow.webContents.send("lyrics", lyrics);
});

ipcMain.on("renameSong", (event, arg) => {
	renameWindow.close();
	renameSong(arg.songName, arg.playlistName, arg.newName);
});

ipcMain.on("renamePlaylist", (event, arg) => {
	renameWindow.close();
	renamePlaylist(arg.playlistName, arg.newName);
})

/**
 * 
 * @param {string} songName 
 * @param {string} playlistName 
 * @param {string} newName 
 */
function renameSong(songName, playlistName, newName) {
	let folder = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8");
	let lyricsFolder = fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8");

	if (playlistName === "random") {
		if (folder && folder !== "") {
			if (fs.existsSync(folder)) {
				if (fs.existsSync(path.join(folder, songName))) {
					const format = path.extname(songName);

					fs.renameSync(path.join(folder, songName), path.join(folder, `${newName}${format}`));
					mainWindow.webContents.send("refresh");

					if (lyricsFolder && lyricsFolder !== "") {
						if (fs.existsSync(lyricsFolder)) {

							if (fs.existsSync(path.join(lyricsFolder, `${songName.replace(format, "")}.txt`))) {
								fs.renameSync(path.join(lyricsFolder, `${songName.replace(format, "")}.txt`), path.join(lyricsFolder, `${newName.replace(format, "")}.txt`));
							}
						}
					}
				}
			}
		}
	} else {
		if (folder && folder !== "") {
			if (fs.existsSync(folder)) {
				if (fs.existsSync(path.join(folder, playlistName))) {
					if (fs.existsSync(path.join(folder, playlistName, songName))) {
						const format = path.extname(songName);

						fs.renameSync(path.join(folder, playlistName, songName), path.join(folder, playlistName, `${newName}${format}`));
						mainWindow.webContents.send("refresh");

						if (lyricsFolder && lyricsFolder !== "") {
							if (fs.existsSync(lyricsFolder)) {

								if (fs.existsSync(path.join(lyricsFolder, `${songName.replace(format, "")}.txt`))) {
									fs.renameSync(path.join(lyricsFolder, `${songName.replace(format, "")}.txt`), path.join(lyricsFolder, `${newName.replace(format, "")}.txt`));
								}
							}
						}
					}
				}
			}
		}
	}
}

/**
 * 
 * @param {string} songName 
 * @param {string} playlistName 
 */
function deleteSong(songName, playlistName) {
	let folder = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8");

	if (playlistName === "random") {
		if (folder && folder !== "") {
			if (fs.existsSync(folder)) {
				if (fs.existsSync(path.join(folder, songName))) {

					fs.rmSync(path.join(folder, songName), {
						recursive: true
					});
					mainWindow.webContents.send("refresh");
				}
			}
		}
	} else {
		if (folder && folder !== "") {
			if (fs.existsSync(folder)) {
				if (fs.existsSync(path.join(folder, playlistName))) {
					if (fs.existsSync(path.join(folder, playlistName, songName))) {

						fs.rmSync(path.join(folder, playlistName, songName), {
							recursive: true
						});
						mainWindow.webContents.send("refresh");
					}
				}
			}
		}
	}
}

/**
 * 
 * @param {string} playlistName 
 * @param {string} newName 
 */
function renamePlaylist(playlistName, newName){
	let folder = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8");

	let oldPath = path.join(folder, playlistName);
	let newPath = path.join(folder, newName);

	if(folder){
		if(fs.existsSync(oldPath)){
			console.log(`Renaming: ${oldPath}\nto: ${newPath}`)
			fs.renameSync(oldPath, newPath);
			mainWindow.webContents.send("refresh");
		}
	}
}

/**
 * 
 * @param {string} playlistName 
 */
function deletePlaylist(playlistName){
	let folder = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8");

	let Path = path.join(folder, playlistName);

	if(folder){
		if(fs.existsSync(Path)){
			fs.rmSync(Path, {recursive: true})
			console.log(`Deleted: ${playlistName}`);
			mainWindow.webContents.send("refresh");
		}
	}
}

ipcMain.on("getFolder", (event, arg) => {
	//send the savesPath to the requestor
	event.sender.send("savesFolder", savesPath);
});

ipcMain.on("change", (event, arg) => {
	changeActivity(arg.name, arg.playlist);
});

ipcMain.on("play", (event, arg) => {
	changeActivity(arg.name, arg.playlist);
});

ipcMain.on("pause", (event, arg) => {
	stopActivity()
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
if (settings["server"].enabled === "1") {
	const express = require("express");
	const appExpress = express();

	const {
		getGallery
	} = require("./gallery");

	appExpress.use(express.json());
	appExpress.use(express.urlencoded({
		extended: false
	}))

	const http = require('http');
	const server = http.createServer(appExpress);
	const {
		Server
	} = require("socket.io");

	const io = new Server(server);

	appExpress.get("/", (req, res) => {
		res.sendFile(path.join(__dirname, "server/index.html"));
	})

	appExpress.get("/script.js", (req, res) => {
		res.sendFile(path.join(__dirname, "server/script.js"))
	})

	appExpress.get("/style.css", (req, res) => {
		res.sendFile(path.join(__dirname, "client/style.css"))
	})

	appExpress.get("/favicon.ico", (req, res) => {
		res.sendFile(path.join(__dirname, "favicon.ico"))
	})

	appExpress.get("/volume", async (req, res) => {
		const volumefile = fs.readFileSync(path.join(savesPath, "volume.txt"), "utf-8");
		const volume = parseFloat(volumefile);
		return res.status(200).send({
			volume: volume
		})
	})

	let serverSong = JSON.parse(fs.readFileSync(path.join(savesPath, "latest.json"), "utf8"));

	ipcMain.on("changeServer", (event, arg) => {
		serverSong = arg.current;
		io.sockets.emit("changeSong", arg.current);
	});

	ipcMain.on("loopDone", (event, arg) => {
		io.sockets.emit("loop", arg);
	})

	ipcMain.on("shuffleclick", (event, arg) => {
		io.sockets.emit("shuffle", arg);
	})

	ipcMain.on("timeLineSend", (event, arg) => {
		io.sockets.emit("timeLineChange", arg);
	})

	ipcMain.on("volumeChange", (event, arg) => {
		io.sockets.emit("volumeChange", arg)
	})

	io.on("connection", socket => {
		console.log(`${socket.id} just connected`)

		socket.on("get-gallery", (cb) => {
			getGallery(fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8"))
				.then(songs => cb(songs))
			console.log(`${socket.id} requested the gallery`);
		})

		socket.on("song-change", (currentsong) => {
			mainWindow.webContents.send("change", currentsong);
			serverSong = currentsong;
		})

		socket.on("get-latest", (cb) => {
			if (!serverSong) return cb({
				playlist: "random",
				number: 0
			});
			cb({
				song: serverSong,
				loop: JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8"))["loop"].status,
				shuffle: JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8"))["shuffle"].status
			});
		})

		socket.on("timeChange", (time) => {
			mainWindow.webContents.send("timeLineReceive", time)
		})

		socket.on("next", () => {
			mainWindow.webContents.send("next");
		})

		socket.on("previous", () => {
			mainWindow.webContents.send("prev");
		})

		socket.on("doloop", () => {
			mainWindow.webContents.send("loop");
		})

		socket.on("doshuffle", () => {
			mainWindow.webContents.send("shuffle");
		})

		socket.on("pause", () => {
			mainWindow.webContents.send("pause");
			console.log(`${socket.id} toggled pause the song`);
		})

		socket.on("volume", (volume) => {
			mainWindow.webContents.send("volume", volume);
		})

		socket.on("seek", (time) => {
			mainWindow.webContents.send("seek", time);
		})

		socket.on("mute", () => {
			mainWindow.webContents.send("mute");
		})

		socket.on("disconnect", () => {
			console.log(`${socket.id} disconnected`);
		})
	})

	server.listen(settings["server"].port, () => {
		console.log(`listening on port ${settings["server"].port}`)
	})

	server.on("error", (err) => {
		console.error(err);

		app.on("ready", () => {
			const dialogOpts = {
				type: 'error',
				buttons: ['Close Replay', 'Continue'],
				title: 'Another instance of Replay is running',
				detail: "You have another instance of Replay running,\nIf you want to continue some features may not work"
			}
			dialog.showMessageBox(dialogOpts).then((returnValue) => {
				if (returnValue.response === 0) {
					app.exit();
				}
			})
		})
	})

}