const searchbar = document.getElementById("search");
const lyricsHTML = document.getElementById("lyrics");
const savebtn = document.getElementById("savebtn");
const form = document.getElementById("form");

const fs = require("fs");
const path = require("path");

const genius_key = process.env.GENUIS_KEY;
const GENIUS = require("genius-lyrics");
const genius = new GENIUS.Client(genius_key);

let current = {
    name: "",
    lyrics: ""
};

const {
    ipcRenderer,
} = require('electron');

ipcRenderer.on("lyrics", (event, data) => {
    current = data;
    lyricsHTML.innerText = data.lyrics;
});

ipcRenderer.send("getFolder");

let savesPath = "";

ipcRenderer.on("savesFolder", (event, data) => {
    savesPath = data;
});

savebtn.onclick = () => {
    savelyrics();
}

function savelyrics() {
    const lyricsLocation = fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8");
    if(fs.existsSync(lyricsLocation)){
        fs.writeFileSync(`${lyricsLocation}/${current.name}.txt`, lyricsHTML.innerText);
        ipcRenderer.send("updateLyrics", {name: current.name, lyrics: lyricsHTML.innerText});
    }else{
        searchbar.value = "please choose a lyrics folder";
    }
}

form.onsubmit = (event) => {
    event.preventDefault();
    searchLyrics();
}

async function searchLyrics() {
    const search = searchbar.value;
    if (!search) return;
    searchbar.value = "";
    try{
        const song = await genius.songs.search(search);
        const lyrics = await song[0].lyrics(false)

        lyricsHTML.innerText = lyrics;
    }catch (e) {
        console.log(e);
        lyricsHTML.innerText = "Song not found!";
    }
}
