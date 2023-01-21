const {
    ipcRenderer
} = require("electron");

const form = document.getElementById("form");
const folderName = document.getElementById("name");

const minimiseButton = document.getElementById("minimise-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const closeButton = document.getElementById("close-button");

const info = {
    name: ""
}

minimiseButton.onclick = () => {
    ipcRenderer.send("minimise-button-newfolder");
}

fullscreenButton.onclick = () => {
    ipcRenderer.send("fullscreen-button-newfolder");
}

closeButton.onclick = () => {
    ipcRenderer.send("close-button-newfolder");
}

form.onsubmit = (event) => {
    event.preventDefault();
    info.name = folderName.value;
    ipcRenderer.send("makeFolder", info);
}