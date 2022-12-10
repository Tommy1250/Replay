const form = document.getElementById("main");
const tray = document.getElementById("tray");
const discord = document.getElementById("discord");
const update = document.getElementById("autoupdate");
const search = document.getElementById("search");
const metadata = document.getElementById("metadata");
const startup = document.getElementById("startup");

const server = document.getElementById("server");
const port = document.getElementById("port");

const discordstatus = document.getElementById("discordstatus");
const traystatus = document.getElementById("traystatus");
const updatestatus = document.getElementById("updatestatus");
const serverstatus = document.getElementById("serverstatus");
const serveradress = document.getElementById("serveradress");
const searchStatus = document.getElementById("searchstatus");
const metadataStatus = document.getElementById("metadatastatus");
const startupstatus = document.getElementById("startupstatus");

const minimiseButton = document.getElementById("minimise-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const closeButton = document.getElementById("close-button");

const exitBtn = document.getElementById("exit");
const output = document.getElementById("output");

const ip = require("ip");
const fs = require("fs");
const path = require("path");
const {
    ipcRenderer
} = require('electron');

let savesPath = "";
let settings = {};

minimiseButton.onclick = () => {
    ipcRenderer.send("minimise-button-settings");
}

fullscreenButton.onclick = () => {
    ipcRenderer.send("fullscreen-button-settings");
}

closeButton.onclick = () => {
    ipcRenderer.send("close-button-settings")
}

ipcRenderer.send("getFolder");

ipcRenderer.on("savesFolder", (event, data) => {
    savesPath = data;
    settings = JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8"));

    tray.checked = settings["tray"].status === "1" ? true:false
    traystatus.innerText = settings["tray"].status === "1" ? "enabled" : "disabled"

    discord.checked = settings["discord"].status === "1" ? true:false
    discordstatus.innerText = settings["discord"].status === "1" ? "enabled" : "disabled";

    startup.checked = settings["startup"].status
    startupstatus.innerText = settings["startup"].status ? "enabled" : "disabled";

    update.checked = settings["update"].status === "1" ? true:false
    updatestatus.innerText = settings["update"].status === "1" ? "enabled" : "disabled";

    search.checked = settings["search"].status;
    searchStatus.innerText = settings["search"].status ? "enabled" : "disabled";

    metadata.checked = settings["metadata"].status;
    metadataStatus.innerText = settings["metadata"].status ? "enabled" : "disabled";

    let selectedAudio = 0;
    let previous = 0;
    let gotSaved = false;
    navigator.mediaDevices.enumerateDevices()
    .then((devices) => {
        for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            if(device.kind === "audiooutput"){
                if(device.deviceId === settings["output"].id && !gotSaved){
                    selectedAudio = i - previous;
                    gotSaved = true;
                    console.log("gotOutput: ", selectedAudio);
                }   
                const option = document.createElement("option");
                option.value = device.deviceId;
                option.innerText = device.label || 'Speaker ' + (output.length + 1);
                output.appendChild(option);
            }else{
                previous++;
            }
        }
        output.selectedIndex = selectedAudio;
    })
    .catch((err) => {
        console.log(err)
    })

    server.checked = settings["server"].enabled === "1" ? true:false
    serverstatus.innerText = settings["server"].enabled === "1" ? "enabled" : "disabled";

    port.value = settings["server"].port

    serveradress.innerText = `http://${ip.address("Ethernet") ?? ip.address()}:${settings["server"].port}`

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

navigator.mediaDevices.addEventListener("devicechange", async() => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        if(device.kind === "audiooutput" && device.label.startsWith("Default")){
            output[0].innerText = device.label;
            output[0].value = device.deviceId;
            continue;
        }
    }
})

output.onchange = (ev) => {
    settings["output"].id = output[output.selectedIndex].value;
    ipcRenderer.send("outputChange", output[output.selectedIndex].value);
}

tray.onclick = () => {
    traystatus.innerText = tray.checked ? "enabled" : "disabled";
}

discord.onclick = () => {
    discordstatus.innerText = discord.checked ? "enabled" : "disabled";
}

startup.onclick = () => {
    startupstatus.innerText = startup.checked ? "enabled" : "disabled";
}

update.onclick = () => {
    updatestatus.innerText = update.checked ? "enabled" : "disabled";
}

server.onclick = () => {
    serverstatus.innerText = server.checked ? "enabled" : "disabled";
}

search.onclick = () => {
    searchStatus.innerText = search.checked ? "enabled" : "disabled";
}

metadata.onclick = () => {
    metadataStatus.innerText = metadata.checked ? "enabled" : "disabled";
}

form.onsubmit = (ev) => {
    ev.preventDefault();
    saveSettings(true);
}

exitBtn.onclick = () => {
    saveSettings(false);
}

function saveSettings(restart = true){
    settings["tray"].status = tray.checked ? "1" : "0";
    settings["discord"].status = discord.checked ? "1" : "0";
    settings["update"].status = update.checked ? "1" : "0";
    settings["server"].enabled = server.checked ? "1" : "0";
    settings["server"].port = port.value.toString();
    settings["search"].status = search.checked;
    settings["metadata"].status = metadata.checked;
    settings["startup"].status = startup.checked;
	fs.writeFile(path.join(savesPath, 'settings.json') , JSON.stringify(settings), (err) => {
		if (err) console.error(err);
        if(restart){
            ipcRenderer.send("settingsChanged");
        }else{
            ipcRenderer.send("settingsChangedNoRestart");
        }
        window.close();
	})
}
