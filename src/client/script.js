/**
 * @type {{folders: string[], playlists: {string: string[]}}}
 */
let songs;

/**
 * @type {HTMLAudioElement}
 */
const player = document.getElementById("player");
const nextbtn = document.getElementById("next");
const prevbtn = document.getElementById("prev");
const nowplaying = document.getElementById("np");
const currnetPlaylist = document.getElementById("currentplaylist");

const pause = document.getElementById("pause");
const timeline = document.getElementById("timeline");
const timeValue = document.getElementById("time");

const lyricsHTML = document.getElementById("lyrics");

/**
 * @type {HTMLInputElement}
 */
const slider = document.getElementById("volume");
const volumeValue = document.getElementById("davolume");

const playlist = document.getElementById("playlists");
const htmlsongs = document.getElementById("songs");
const remover = document.getElementById("remover");

let galleryDone = false;

const fs = require("fs");

const {
    getGallery
} = require("../gallery");

const {
    ipcRenderer
} = require("electron");

const path = require("path");

let current = {
    number: 0,
    playlist: "random"
};

let playlistshtml = [];
let nodes = [];

let savesPath = "";

ipcRenderer.send("getFolder");

let folder = "";
let lyricsFolder = "";

ipcRenderer.on("savesFolder", (event, data) => {
    savesPath = data;
    console.log("something happened", data);
    folder = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8");
    lyricsFolder = fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8");
    if(folder !== ""){
        if (fs.existsSync(folder)) makegallery();
    } else {
        nowplaying.innerText = "No folder selected!\nPlease select a folder in the file menu.";
    }
    console.log(fs.readdirSync(savesPath));
});

ipcRenderer.on("refresh", () => {
    makegallery();
});

ipcRenderer.on("pause", () => {
    player.pause();
});

ipcRenderer.on("play", () => {
    player.play();
});

ipcRenderer.on("folder", (event, arg) => {
    folder = arg;
    fs.writeFileSync(path.join(savesPath, "folder.txt"), folder);
    makegallery();
});

ipcRenderer.on("lyricsFolder", (event, arg) => {
    lyricsFolder = arg;
    fs.writeFileSync(path.join(savesPath, "lyrics.txt"), lyricsFolder);
})

ipcRenderer.on("next", () => {
    current.number++;
    if (!songs.playlists[current.playlist][current.number]) return current.number--;
    updatePlayer("change", {
        songNumber: current
    });
});

ipcRenderer.on("prev", () => {
    current.number--;
    if (!songs.playlists[current.playlist][current.number]) return current.number++;
    updatePlayer("change", {
        songNumber: current
    });
});

ipcRenderer.on("change", (event, arg) => {
    current = arg;
    updatePlayer("change", {
        songNumber: current
    });
});

ipcRenderer.on("seek", (event, arg) => {
    updatePlayer("seek", {
        currentTime: player.currentTime + arg
    })
})

ipcRenderer.on("mute", () => {
    player.muted = !player.muted;
})

ipcRenderer.on("volume", (event, arg) => {
    slider.value = arg * 100;
    updatePlayer("volume", {
        volume: arg
    })
})

slider.addEventListener("input", () => {
    updatePlayer("volume", {
        volume: slider.value / 100
    });
})

volumeValue.onclick = () => {
    if(player.muted) {
        player.muted = false;
    } else {
        player.muted = true;
    }
}

function changeTimelinePosition () {
    const percentagePosition = (100*player.currentTime) / player.duration;
    timeline.style.backgroundSize = `${percentagePosition}% 100%`;
    timeline.value = percentagePosition;

    //make the time diffent if the duration is bigger than an hour
    if (player.duration > 3600) {
        timeValue.innerText = `${Math.floor(player.currentTime / 3600)}:${Math.floor(player.currentTime / 60) % 60}:${Math.floor(player.currentTime) % 60}/${Math.floor(player.duration / 3600)}:${Math.floor(player.duration / 60) % 60}:${Math.floor(player.duration) % 60}`;
    } else {
        timeValue.innerText = `${Math.floor(player.currentTime / 60) % 60}:${Math.floor(player.currentTime) % 60}/${Math.floor(player.duration / 60) % 60}:${Math.floor(player.duration) % 60}`;
    }

    //timeValue.innerText = `${Math.floor(player.currentTime / 60)}:${Math.floor(player.currentTime % 60)}/${Math.floor(player.duration / 60)}:${Math.floor(player.duration % 60)}`;
    
    //timeValue.innerText = `${parseInt(player.currentTime)}/${parseInt(player.duration)}`;
}

player.ontimeupdate = changeTimelinePosition;

timeline.addEventListener('input', () => {
    const time = (timeline.value * player.duration) / 100;
    player.currentTime = time;
});

pause.onclick = () => {
    if (player.paused) {
        player.play()
    } else {
        player.pause();
    }
}

nextbtn.onclick = () => {
    current.number++;
    if (!songs.playlists[current.playlist][current.number]) return current.number--;
    updatePlayer("change", {
        songNumber: current
    });
}

prevbtn.onclick = () => {
    current.number--;
    if (!songs.playlists[current.playlist][current.number]) return current.number++;
    updatePlayer("change", {
        songNumber: current
    });
}

document.addEventListener('keydown', (event) => {
    event.preventDefault();
    switch(event.code){
        case "Space":
            if(player.paused){
                player.play();
            }else{
                player.pause();
            }
        break;
        case "ArrowRight":
            nextbtn.click();
        break;
        case "ArrowLeft":
            prevbtn.click();
        break;
        case "ArrowUp":
            if(player.volume < 0.95){
                player.volume += 0.05;
                slider.value = player.volume * 100;
                volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
            }else{
                player.volume = 1;
                slider.value = player.volume * 100;
                volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
            }
        break;
        case "ArrowDown":
            if(player.volume > 0.05){
                player.volume -= 0.05;
                slider.value = player.volume * 100;
                volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
            }else{
                player.volume = 0.01;
                slider.value = player.volume * 100;
                volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
            }
        break;
        case "KeyM":
            if(player.muted){
                player.muted = false;
            }else{
                player.muted = true;
            }
        break;

    }
})

/**
 * @param {"change" | "volume" | "seek"} event
 * @param {{songNumber?: {number: number, playlist: string}, volume?: number}} param1
 */
function updatePlayer(event, {
    songNumber,
    currentTime,
    volume
}) {
    switch (event) {
        case "change":
            current = songNumber
            nowplaying.innerText = songs.playlists[current.playlist][current.number].replace(".mp3", "").replace(".flac", "");
            nowplaying.onclick = () => {
                removePlaylist();
                getplaylist(current.playlist);
                nodes[current.number * 2].focus();
            }
            
            if (current.playlist === "random") {
                player.src = `${folder}/${songs.playlists[current.playlist][current.number]}`
            } else {
                player.src = `${folder}/${current.playlist}/${songs.playlists[current.playlist][current.number]}`
            }

            if(fs.existsSync(`${lyricsFolder}/${songs.playlists[current.playlist][current.number].replace(".mp3", "").replace(".flac", "")}.txt`)) {
                const dalyrics = fs.readFileSync(`${lyricsFolder}/${songs.playlists[current.playlist][current.number].replace(".mp3", "").replace(".flac", "")}.txt`, "utf-8");
                ipcRenderer.send("updateLyrics", {name: songs.playlists[current.playlist][current.number].replace(path.extname(songs.playlists[current.playlist][current.number]), ""), lyrics: dalyrics});
                lyricsHTML.innerText = dalyrics;
            } else {
                ipcRenderer.send("updateLyrics", {name: songs.playlists[current.playlist][current.number].replace(path.extname(songs.playlists[current.playlist][current.number]), ""), lyrics: "Song doesn't have lyrics!"});
                lyricsHTML.innerText = "Song doesn't have lyrics!";
            }
            
            fs.writeFileSync(path.join(savesPath, "latest.json"), JSON.stringify(current));

            ipcRenderer.send("change", {name: songs.playlists[current.playlist][current.number], playlist: current.playlist});
            setTimeout(() => {
                ipcRenderer.send("changeServer", {current});
            }, 500)
            break;
        case "volume":
            if(!player.muted)
                volumeValue.innerText = `${Math.round(volume * 100)}%`;
            player.volume = volume;
            fs.writeFileSync(path.join(savesPath, "volume.txt"), volume.toString());
            break;
        case "seek":
            player.currentTime = currentTime;
            break;
    }

}

ipcRenderer.on("lyrics", (event, arg) => {
    lyricsHTML.innerText = arg;
});

//make an event lestener that listens for the player when it gets muted
player.onvolumechange = () => {
    if(player.muted){
        volumeValue.innerText = "Unmute";
    }else{
        volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
    }
}

player.onpause = () => {
    ipcRenderer.send("pause");
    pause.innerText = "Play";
}

player.onplay = () => {
    ipcRenderer.send("play", {name: songs.playlists[current.playlist][current.number], playlist: current.playlist});
    pause.innerText = "Pause";
}

player.onended = () => {
    current.number++;
    if (!songs.playlists[current.playlist][current.number]) return current.number--;

    updatePlayer("change", {
        songNumber: current
    });
}

function setupPlayer() {
    current = JSON.parse(fs.readFileSync(path.join(savesPath, "latest.json"), "utf-8"));

    const volumefile = fs.readFileSync(path.join(savesPath, "volume.txt"), "utf-8");
    const volume = parseFloat(volumefile);

    player.volume = volume;
    slider.value = volume * 100;
    volumeValue.innerText = `${Math.round(volume * 100)}%`;

    updatePlayer("change", {
        songNumber: current
    });
}

/**
 * 
 * @param {string} plname 
 */
function getplaylist(plname) {
    playlist.style.visibility = "hidden";
    htmlsongs.style.visibility = "visible";

    for (let i = 0; i < songs.playlists[plname].length; i++) {
        const element = songs.playlists[plname][i];

        const btn = document.createElement("button");
        btn.textContent = element.replace(".mp3", "").replace(".flac", "");
        btn.onclick = () => {
            updatePlayer("change", {
                songNumber: {
                    number: i,
                    playlist: plname
                }
            });
        }
        btn.oncontextmenu = (e) => {
            console.log("right click on " + btn.textContent);
            ipcRenderer.send("makeSongMenu", {
                name: element,
                playlist: plname,
                number: i
            });
        }
        btn.id = "removable";
        btn.className = "px-4 py-1 text-sm text-purple-600 font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-purple-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
        htmlsongs.appendChild(btn);

        //make a br element
        const br = document.createElement("br");
        br.id = "removable";
        htmlsongs.appendChild(br);

        nodes.push(btn);
        nodes.push(br);
    }
    const btn = document.createElement("button");
    btn.style.visibility = "hidden";
    btn.id = "removable";
    htmlsongs.appendChild(btn);
    nodes.push(btn);
    currnetPlaylist.innerText = plname;
    for (let i = 0; i < playlistshtml.length; i++) {
        const element = playlistshtml[i];
        playlist.removeChild(element);
    }
}

remover.onclick = () => {
    removePlaylist();
}

function removePlaylist() {
    currnetPlaylist.innerText = "Your Albums"
    for (let i = 0; i < nodes.length; i++) {
        const element = nodes[i];
        if (element.id === "removable") {
            htmlsongs.removeChild(element);
        }
    }
    for (let i = 0; i < playlistshtml.length; i++) {
        const element = playlistshtml[i];
        playlist.appendChild(element);
    }
    nodes = []
    playlist.style.visibility = "visible";
    htmlsongs.style.visibility = "hidden";
}

function makegallery() {
    getGallery(folder).then(desongs => {
        songs = desongs;

        removePlaylist();
        playlist.innerHTML = '';
        playlistshtml = [];
    
        for (let i = 0; i < songs.folders.length; i++) {
            const element = songs.folders[i];
    
            /**
             * @type {HTMLButtonElement}
             */
            const btn = document.createElement("button");
            btn.textContent = element;
            btn.onclick = () => getplaylist(element);
            btn.className = "px-4 py-1 text-sm text-purple-600 font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-purple-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
    
            playlist.appendChild(btn);
    
            const br = document.createElement("br");
            playlist.appendChild(br);
    
            playlistshtml.push(btn);
            playlistshtml.push(br);
        }
    
        if (!galleryDone) {
            setupPlayer(songs);
            galleryDone = true;
        }
    });
}