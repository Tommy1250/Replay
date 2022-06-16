const form = document.getElementById("main");
const tray = document.getElementById("tray");
const discord = document.getElementById("discord");
const update = document.getElementById("autoupdate");
const search = document.getElementById("search");

const server = document.getElementById("server");
const port = document.getElementById("port");

const discordstatus = document.getElementById("discordstatus");
const traystatus = document.getElementById("traystatus");
const updatestatus = document.getElementById("updatestatus");
const serverstatus = document.getElementById("serverstatus");
const serveradress = document.getElementById("serveradress");
const searchStatus = document.getElementById("searchstatus");

const ip = require("ip");
const fs = require("fs");
const path = require("path");
const {
    ipcRenderer
} = require('electron');

let savesPath = "";
let settings = {};

ipcRenderer.send("getFolder");

ipcRenderer.on("savesFolder", (event, data) => {
    savesPath = data;
    settings = JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8"));

    tray.checked = settings["tray"].status === "1" ? true:false
    traystatus.innerText = settings["tray"].status === "1" ? "enabled" : "disabled"

    discord.checked = settings["discord"].status === "1" ? true:false
    discordstatus.innerText = settings["discord"].status === "1" ? "enabled" : "disabled";

    update.checked = settings["update"].status === "1" ? true:false
    updatestatus.innerText = settings["update"].status === "1" ? "enabled" : "disabled";

    search.checked = settings["search"].status;
    searchStatus.innerText = settings["search"].status ? "enabled" : "disabled";

    server.checked = settings["server"].enabled === "1" ? true:false
    serverstatus.innerText = settings["server"].enabled === "1" ? "enabled" : "disabled";

    port.value = settings["server"].port

    serveradress.innerText = `http://${ip.address("Ethernet")}:${settings["server"].port}`

    const folderLocation = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8")
    if(folderLocation === ""){
        document.getElementById("folder").value = "Choose a folder location in the file menu"
    }else{
        document.getElementById("folder").value = folderLocation;
    }

    const lyricsLocation = fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8")
    if(lyricsLocation === ""){
        document.getElementById("lyrics").value = "Choose lyrics location in the file menu";
    }else{
        document.getElementById("lyrics").value = lyricsLocation;
    }
});

tray.onclick = () => {
    traystatus.innerText = tray.checked ? "enabled" : "disabled";
}

discord.onclick = () => {
    discordstatus.innerText = discord.checked ? "enabled" : "disabled";
}

update.onclick = () => {
    updatestatus.innerText = update.checked ? "enabled" : "disabled";
}

server.onclick = () => {
    serverstatus.innerText = server.checked ? "enabled" : "disabled";
}

form.onsubmit = (ev) => {
    ev.preventDefault();
    settings["tray"].status = tray.checked ? "1" : "0";
    settings["discord"].status = discord.checked ? "1" : "0";
    settings["update"].status = update.checked ? "1" : "0";
    settings["server"].enabled = server.checked ? "1" : "0";
    settings["server"].port = port.value.toString();
    settings["search"].status = search.checked;
    saveSettings(settings);
}

function saveSettings(settings){
	fs.writeFile(path.join(savesPath, 'settings.json') , JSON.stringify(settings), (err) => {
		if (err) console.error(err);
        ipcRenderer.send("settingsChanged");
        window.close();
	})
}
