const {
    ipcRenderer
} = require("electron");
const path = require("path");

const form = document.getElementById("form");
const songname = document.getElementById("name");

const info = {
    songName: "",
    playlistName: "",
    newName: "",
    received: false,
    playlist: false
}



ipcRenderer.on("info", (event, data) => {
    if(data.playlist){
        songname.value = data.playlistName;
        info.songName = "";
        console.log(info);
    }else{
        info.songName = data.songName;
        songname.value = data.songName.replace(path.extname(data.songName), "");
        console.log(info);
    }

    info.playlistName = data.playlistName;
    info.received = true;
    info.playlist = data.playlist
})

if(!info.received){
    ipcRenderer.send("getInfo");
}

form.onsubmit = (event) => {
    event.preventDefault();
    info.newName = songname.value;
    if(info.playlist){
        ipcRenderer.send("renamePlaylist", info);
    }else{
        ipcRenderer.send("renameSong", info);
    }
    
}