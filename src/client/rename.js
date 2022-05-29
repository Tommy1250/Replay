const {
    ipcRenderer
} = require("electron");
const path = require("path");

const form = document.getElementById("form");
const songname = document.getElementById("name");

const info = {
    songName: "",
    playlistName: "",
    newName: ""
}

ipcRenderer.on("song", (event, song) => {
    info.songName = song.songName;
    info.playlistName = song.playlistName;
    songname.value = song.songName.replace(path.extname(song.songName), "");
    console.log(info);
})

if(!info.songName){
    ipcRenderer.send("getSong");
}

form.onsubmit = (event) => {
    event.preventDefault();
    info.newName = songname.value;
    ipcRenderer.send("renameSong", info)
}