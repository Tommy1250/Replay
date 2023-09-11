const searchbar = document.getElementById("search");
const lyricsHTML = document.getElementById("lyrics");
const savebtn = document.getElementById("savebtn");
const form = document.getElementById("form");

const minimiseButton = document.getElementById("minimise-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const closeButton = document.getElementById("close-button");

const editBtn = document.getElementById("editBtn");

const fs = require("fs");
const path = require("path");

// const lyricsFinder = require("lyrics-finder");
const Genius = require("genius-lyrics");
const genius = new Genius.Client();

let current = {
    name: "",
    lyrics: ""
};

const {
    ipcRenderer,
} = require('electron');

ipcRenderer.on("lyrics", (event, data) => {
    current = data;
    lyricsHTML.value = data.lyrics;
});

if(!current.name){
    ipcRenderer.send("getLyrics");
}

ipcRenderer.send("getFolder");

let savesPath = "";

ipcRenderer.on("savesFolder", (event, data) => {
    savesPath = data;
});

minimiseButton.onclick = () => {
    ipcRenderer.send("minimise-button-lyrics");
}

fullscreenButton.onclick = () => {
    ipcRenderer.send("fullscreen-button-lyrics");
}

closeButton.onclick = () => {
    ipcRenderer.send("close-button-lyrics")
}

let editing = false;
let oldLyrics = "";

editBtn.onclick = () => {
    if(!editing){
        editing = true;
        editBtn.innerText = "Discard changes";
        lyricsHTML.removeAttribute("readonly");
        oldLyrics = lyricsHTML.value;
    }else{
        editing = false;
        editBtn.innerText = "Edit lyrics";
        lyricsHTML.setAttribute("readonly", true);
        discardChanges();
    }
}

savebtn.onclick = () => {
    editing = false;
    editBtn.innerText = "Edit lyrics";
    lyricsHTML.setAttribute("readonly", true);
    oldLyrics = null;
    savelyrics();
}

function savelyrics() {
    const lyricsLocation = fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8");
    if(fs.existsSync(lyricsLocation)){
        fs.writeFileSync(`${lyricsLocation}/${current.name}.txt`, lyricsHTML.value);
        ipcRenderer.send("updateLyrics", {name: current.name, lyrics: lyricsHTML.value});
    }else{
        searchbar.value = "please choose a lyrics folder";
    }
}

function discardChanges() {
    lyricsHTML.value = oldLyrics;
    oldLyrics = null;
}

form.onsubmit = (event) => {
    event.preventDefault();
    if(editing) return searchbar.value = "Please exit edit";
    searchLyrics();
}

async function searchLyrics() {
    const search = searchbar.value;
    if (!search) return;
    searchbar.value = "";

    // lyricsFinder("", search)
    // .then((lyrics) => {
    //     if(lyrics){
    //         lyricsHTML.value = lyrics;
    //     }else{
    //         lyricsHTML.value = "Song not found!";
    //     }
    // })
    // .catch((err) => {
    //     console.log(err);
    //     lyricsHTML.value = "Song not found!";
    // })
    
    try{
        const song = await genius.songs.search(search);
        const lyrics = await song[0].lyrics(false)

        lyricsHTML.value = lyrics;
    }catch (e) {
        console.log(e);
        lyricsHTML.value = "Song not found!";
    }
}
