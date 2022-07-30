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
const currentPlaylist = document.getElementById("currentplaylist");
const plinfo = document.getElementById("plinfo");

const pause = document.getElementById("pause");
const timeline = document.getElementById("timeline");
const timeValue = document.getElementById("time");

const lyricsHTML = document.getElementById("lyrics");

const loop = document.getElementById("loop");
const shuffle = document.getElementById("shuffle");

/**
 * @type {HTMLInputElement}
 */
const slider = document.getElementById("volume");
const volumeValue = document.getElementById("davolume");

const playlist = document.getElementById("playlists");
const htmlsongs = document.getElementById("songs");

const search = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");
const searchForm = document.getElementById("searchForm");

/**
 * 
 * @param {string} file 
 * @returns {string}
 */
const filter = (file) => {
    return file.replace(".mp3", "").replace(".flac", "").replace(".m4a", "").replace(".wav", "").replace(".ogg", "")
}

let played = [];

let galleryDone = false;
let firstTime = true;

const fs = require("fs");
const mm = require('music-metadata');

const {
    getGallery
} = require("../gallery");

const {
    ipcRenderer,
    shell
} = require("electron");

const path = require("path");

let current = {
    number: 0,
    playlist: "random"
};

let latestPlaylist = "";

let playlistshtml = [];
let nodes = [];

let doLoop = 0;
let savesPath = "";

ipcRenderer.send("getFolder");

let folder = "";
let lyricsFolder = "";
let settings;

ipcRenderer.on("savesFolder", (event, data) => {
    savesPath = data;
    console.log("something happened", data);
    folder = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8");
    lyricsFolder = fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8");
    settings = JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8"));
    if (folder !== "") {
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
    if (player.paused) {
        player.play();
    } else {
        player.pause();
    }
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
    nextSong();
});

ipcRenderer.on("prev", () => {
    previousSong();
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

ipcRenderer.on("loop", () => {
    loop.click();
})

ipcRenderer.on("shuffle", () => {
    shuffle.click();
})

slider.addEventListener("input", () => {
    updatePlayer("volume", {
        volume: slider.value / 100
    });
})

volumeValue.onclick = () => {
    if (player.muted) {
        player.muted = false;
    } else {
        player.muted = true;
    }
}

timeline.addEventListener('input', () => {
    const time = (timeline.value * player.duration) / 100;
    player.currentTime = time;
});

ipcRenderer.on("timeLineReceive", (event, arg) => {
    player.currentTime = arg
})

pause.onclick = () => {
    if (player.paused) {
        player.play()
    } else {
        player.pause();
    }
}

nextbtn.onclick = () => {
    nextSong();
}

prevbtn.onclick = () => {
    previousSong();
}

loop.onclick = () => {
    switch (doLoop) {
        case 1:
            loop.innerText = "Loop all"
            settings["loop"].status = "all"
            doLoop = 2
            break;
        case 2:
            loop.innerText = "Loop off"
            settings["loop"].status = "0"
            doLoop = 0
            break;
        case 0:
            loop.innerText = "Loop one"
            settings["loop"].status = "one"
            doLoop = 1
            break;
    }

    ipcRenderer.send("loopDone", settings["loop"].status);
    fs.writeFileSync(path.join(savesPath, "settings.json"), JSON.stringify(settings));
}

shuffle.onclick = () => {
    settings["shuffle"].status = shuffle.checked
    ipcRenderer.send("shuffleclick", shuffle.checked);

    fs.writeFileSync(path.join(savesPath, "settings.json"), JSON.stringify(settings));
}

clearSearch.onclick = () => {
    search.value = "";
    searchPlaylist(search.value);
}

searchForm.onsubmit = (event) => {
    event.preventDefault();
    console.log("search submit");
    searchPlaylist(search.value);
}

search.oninput = () => {
    searchPlaylist(search.value);
}

document.addEventListener('keydown', (event) => {
    if (search !== document.activeElement) {
        event.preventDefault();
        switch (event.code) {
            case "Space":
                if (player.paused) {
                    player.play();
                } else {
                    player.pause();
                }
                break;
            case "ArrowRight":
                nextSong();
                break;
            case "ArrowLeft":
                previousSong();
                break;
            case "ArrowUp":
                if (player.volume < 0.95) {
                    player.volume += 0.05;
                    slider.value = player.volume * 100;
                    volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
                } else {
                    player.volume = 1;
                    slider.value = player.volume * 100;
                    volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
                }
                break;
            case "ArrowDown":
                if (player.volume > 0.05) {
                    player.volume -= 0.05;
                    slider.value = player.volume * 100;
                    volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
                } else {
                    player.volume = 0.01;
                    slider.value = player.volume * 100;
                    volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
                }
                break;
            case "KeyM":
                if (player.muted) {
                    player.muted = false;
                } else {
                    player.muted = true;
                }
                break;
            case "KeyL":
                loop.click();
                break;
            case "KeyS":
                shuffle.click();
                break;
        }
    }
})

ipcRenderer.on("stream", (event, arg) => {
    nowplaying.innerText = arg.title;
    nowplaying.onclick = () => {
        shell.openExternal(arg.youtube);
    }
    player.src = arg.url;
    player.play();
})

/**
 * @param {"change" | "volume" | "seek"} event
 * @param {{songNumber?: {number: number, playlist: string}, currentTime?: number, volume?: number}} param1
 */
function updatePlayer(event, {
    songNumber,
    currentTime,
    volume
}) {
    switch (event) {
        case "change":
            if (current.playlist !== songNumber.playlist) played = [];
            current = songNumber
            nowplaying.innerText = filter(songs.playlists[current.playlist][current.number]);
            nowplaying.onclick = () => {
                if(current.playlist !== currentPlaylist.innerText) getplaylist(current.playlist);
                nodes[current.number].focus();
            }

            if (current.playlist === "random") {
                player.src = `${folder}/${songs.playlists[current.playlist][current.number]}`
            } else {
                player.src = `${folder}/${current.playlist}/${songs.playlists[current.playlist][current.number]}`
            }


            if (!firstTime) player.play();
            else firstTime = false;

            if (fs.existsSync(`${lyricsFolder}/${filter(songs.playlists[current.playlist][current.number])}.txt`)) {
                const dalyrics = fs.readFileSync(`${lyricsFolder}/${filter(songs.playlists[current.playlist][current.number])}.txt`, "utf-8");
                ipcRenderer.send("updateLyrics", {
                    name: filter(songs.playlists[current.playlist][current.number]),
                    lyrics: dalyrics
                });
                lyricsHTML.innerText = dalyrics;
            } else {
                ipcRenderer.send("updateLyrics", {
                    name: filter(songs.playlists[current.playlist][current.number]),
                    lyrics: "Song doesn't have lyrics!"
                });
                lyricsHTML.innerText = "Song doesn't have lyrics!";
            }

            fs.writeFileSync(path.join(savesPath, "latest.json"), JSON.stringify(current));

            //ipcRenderer.send("change", {name: songs.playlists[current.playlist][current.number], playlist: current.playlist});

            ipcRenderer.send("changeServer", {
                current
            });
            break;
        case "volume":
            player.volume = volume;
            ipcRenderer.send("volumeChange", volume)
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
    if (player.muted) {
        volumeValue.innerText = "Unmute";
    } else {
        volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
    }
}

player.onpause = () => {
    ipcRenderer.send("pause");
    pause.innerText = "Play";
}

player.onplay = () => {
    ipcRenderer.send("play", {
        name: songs.playlists[current.playlist][current.number],
        playlist: current.playlist
    });
    pause.innerText = "Pause";
}

player.onended = () => {
    if (!played.includes(current.number)) played.push(current.number);

    if (!shuffle.checked) {

        current.number++;

        if (doLoop === 1) {
            current.number--;
        } else if (!songs.playlists[current.playlist][current.number]) {
            if (doLoop === 2) {
                current.number = 0;
                played = [];
            } else {
                current.number--;
                played = [];
                return
            }
        }
    } else {
        const makeNumber = () => {
            return Math.floor(Math.random() * songs.playlists[current.playlist].length - 1);
        }

        let number;

        if (played.length === songs.playlists[current.playlist].length) {
            if (doLoop === 2) {
                current.number = 0;
                played = [];
            } else {
                played = [];
                return
            }
        } else {
            do {
                number = makeNumber()
            } while (played.includes(number) && number < 0);
            current.number = number;
        }
    }

    console.log(played)
    updatePlayer("change", {
        songNumber: current
    });
}

/**
 * 
 * @param {string} searchValue 
 */
function searchPlaylist(searchValue){
    console.log(`Starting search for ${searchValue}`);

    if(searchValue === ""){
        getplaylist(latestPlaylist);
    }else{
        currentPlaylist.innerText = "Search results"
        removePlaylist();

        let songsConut = 0;
        for (let i = 0; i < songs.folders.length; i++) {
            const songsFolder = songs.folders[i];
            
            for (let j = 0; j < songs.playlists[songsFolder].length; j++) {
                /**
                 * @type {string}
                 */
                const song = songs.playlists[songsFolder][j];
        
                if(song.toLowerCase().includes(searchValue.toLowerCase())){

                    songsConut++;
                    const btn = document.createElement("button");
                    const songname = document.createElement("p");
                    const songDuration = document.createElement("p");

                    songname.innerText = filter(song);
                    btn.appendChild(songname);

                    if(settings["metadata"].status){
                        let songPath = ""
                
                        if (songsFolder === "random") {
                            songPath = path.join(folder, songs.playlists[songsFolder][j]);
                        } else {
                            songPath = path.join(folder, songsFolder, songs.playlists[songsFolder][j]);
                        }
                
                        mm.parseFile(songPath).then(data => {
                            if(data.format.duration){
                                if (data.format.duration > 3600) {
                                    songDuration.innerText = `${Math.floor(data.format.duration / 3600) < 10 ? `0${Math.floor(data.format.duration / 3600)}`:`${Math.floor(data.format.duration / 3600)}`}:${Math.floor(data.format.duration / 60) % 60 < 10 ? `0${Math.floor(data.format.duration / 60) % 60}`:`${Math.floor(data.format.duration / 60) % 60}`}:${Math.floor(data.format.duration) % 60 < 10 ? `0${Math.floor(data.format.duration) % 60}`:`${Math.floor(data.format.duration) % 60}`}`;
                                } else {
                                    songDuration.innerText = `${Math.floor(data.format.duration / 60) % 60 < 10 ? `0${Math.floor(data.format.duration / 60) % 60}`:`${Math.floor(data.format.duration / 60) % 60}`}:${Math.floor(data.format.duration) % 60 < 10 ? `0${Math.floor(data.format.duration) % 60}`:`${Math.floor(data.format.duration) % 60}`}`;
                                }
                                btn.appendChild(songDuration);
                            }
                        });
                    }

                    btn.onclick = () => {
                        updatePlayer("change", {
                            songNumber: {
                                number: j,
                                playlist: songsFolder
                            }
                        });
                    }
                    btn.oncontextmenu = (e) => {
                        console.log("right click on " + btn.textContent);
                        ipcRenderer.send("makeSongMenu", {
                            name: song,
                            playlist: songsFolder,
                            number: j,
                            addShow: true
                        });
                    }
                    btn.id = "removable";
                    btn.className = "grid px-2 text-left py-1 w-full text-sm text-gray-300 font-medium rounded-md hover:text-white hover:bg-white hover:bg-opacity-20 hover:border-transparent focus:border"
                    btn.style.gridTemplateColumns = "1fr auto";
                    htmlsongs.appendChild(btn);
            
                    //make a br element
                    //const br = document.createElement("br");
                    //br.id = "removable";
                    //htmlsongs.appendChild(br);
            
                    nodes.push(btn);
                    //nodes.push(br);
                }
            }
        }
        plinfo.innerText = `found ${songsConut} songs`;
    }
}

ipcRenderer.on("showSong", (event, data) => {
    search.value = "";
    getplaylist(data.playlist);
    nodes[data.number].focus();
})

function nextSong() {
    if (!played.includes(current.number)) played.push(current.number);

    if (!shuffle.checked) {
        current.number++;

        if (!songs.playlists[current.playlist][current.number]) {
            if (doLoop === 2) {
                current.number = 0;
                played = [];
            } else {
                current.number--;
                played = [];
                return
            }
        }
    } else {
        const makeNumber = () => {
            return parseInt(Math.random() * songs.playlists[current.playlist].length);
        }

        let number;

        console.log(played.length, songs.playlists[current.playlist].length);
        if (played.length === songs.playlists[current.playlist].length) {
            if (doLoop === 2) {
                current.number = 0;
                played = [];
            } else {
                played = [];
                return
            }
        } else {
            do {
                number = makeNumber()
            } while (played.includes(number));
            current.number = number;
        }
    }

    console.log(played)
    updatePlayer("change", {
        songNumber: current
    });
}

function previousSong() {
    const shuffleSong = played.pop()

    if (!shuffle.checked) {
        current.number--;

        if (!songs.playlists[current.playlist][current.number]) {
            if (doLoop === 2) {
                current.number = songs.playlists[current.playlist].length - 1;
            } else {
                current.number++;
                return
            }
        }
    } else {
        if (shuffleSong !== undefined) {
            current.number = shuffleSong
        } else {
            return
        }
    }

    console.log(played)

    updatePlayer("change", {
        songNumber: current
    });
}

function changeTimelinePosition() {
    const percentagePosition = (100 * player.currentTime) / player.duration;
    timeline.style.backgroundSize = `${percentagePosition}% 100%`;
    timeline.value = percentagePosition;

    //make the time diffent if the duration is bigger than an hour
    if (player.duration > 3600) {
        timeValue.innerText = `${Math.floor(player.currentTime / 3600)}:${Math.floor(player.currentTime / 60) % 60}:${Math.floor(player.currentTime) % 60}/${Math.floor(player.duration / 3600)}:${Math.floor(player.duration / 60) % 60}:${Math.floor(player.duration) % 60}`;
    } else {
        timeValue.innerText = `${Math.floor(player.currentTime / 60) % 60}:${Math.floor(player.currentTime) % 60}/${Math.floor(player.duration / 60) % 60}:${Math.floor(player.duration) % 60}`;
    }

    ipcRenderer.send("timeLineSend", {
        currentTime: player.currentTime,
        fullTime: player.duration
    })
}

player.ontimeupdate = changeTimelinePosition;

function setupPlayer() {
    current = JSON.parse(fs.readFileSync(path.join(savesPath, "latest.json"), "utf-8"));

    switch (settings["loop"].status) {
        case "one":
            loop.innerText = "Loop one"
            doLoop = 1
            break;
        case "all":
            loop.innerText = "Loop all"
            doLoop = 2
            break;
        case "0":
            loop.innerText = "Loop off"
            doLoop = 0
            break;
    }

    shuffle.checked = settings["shuffle"].status

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
    //playlist.style.visibility = "hidden";
    //htmlsongs.style.visibility = "visible";

    removePlaylist();

    let playlistLength = 0;
    let songsCount = 0;
    for (let i = 0; i < songs.playlists[plname].length; i++) {
        const element = songs.playlists[plname][i];
        songsCount++;

        const btn = document.createElement("button");
        const songname = document.createElement("p");
        const songDuration = document.createElement("p");

        songname.innerText = filter(element);
        btn.appendChild(songname);

        if(settings["metadata"].status){
            let songPath = ""
    
            if (plname === "random") {
                songPath = path.join(folder, songs.playlists[plname][i]);
            } else {
                songPath = path.join(folder, plname, songs.playlists[plname][i]);
            }
    
            mm.parseFile(songPath).then(data => {
                if(data.format.duration){
                    playlistLength += data.format.duration;
        
                    if (data.format.duration > 3600) {
                        songDuration.innerText = `${Math.floor(data.format.duration / 3600) < 10 ? `0${Math.floor(data.format.duration / 3600)}`:`${Math.floor(data.format.duration / 3600)}`}:${Math.floor(data.format.duration / 60) % 60 < 10 ? `0${Math.floor(data.format.duration / 60) % 60}`:`${Math.floor(data.format.duration / 60) % 60}`}:${Math.floor(data.format.duration) % 60 < 10 ? `0${Math.floor(data.format.duration) % 60}`:`${Math.floor(data.format.duration) % 60}`}`;
                    } else {
                        songDuration.innerText = `${Math.floor(data.format.duration / 60) % 60 < 10 ? `0${Math.floor(data.format.duration / 60) % 60}`:`${Math.floor(data.format.duration / 60) % 60}`}:${Math.floor(data.format.duration) % 60 < 10 ? `0${Math.floor(data.format.duration) % 60}`:`${Math.floor(data.format.duration) % 60}`}`;
                    }
                    btn.appendChild(songDuration);
                }
            });
        }

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
                number: i,
                addShow: false
            });
        }
        btn.id = "removable";
        btn.className = "grid px-2 text-left py-1 w-full text-sm text-gray-300 font-medium rounded-md hover:text-white hover:bg-white hover:bg-opacity-20 hover:border-transparent focus:border"
        btn.style.gridTemplateColumns = "1fr auto";
        htmlsongs.appendChild(btn);

        //make a br element
        //const br = document.createElement("br");
        //br.id = "removable";
        //htmlsongs.appendChild(br);

        nodes.push(btn);
        //nodes.push(br);
    }
    /*const btn = document.createElement("button");
    btn.style.visibility = "hidden";
    btn.id = "removable";
    htmlsongs.appendChild(btn);
    nodes.push(btn);*/
    latestPlaylist = plname;
    currentPlaylist.innerText = plname;
    plinfo.innerText = "";
    plinfo.innerText += `${songsCount} songs`
    if(settings["metadata"].status){
        setTimeout(() => {
            plinfo.innerText += `, ${Math.floor(playlistLength / 3600) < 10 ? `0${Math.floor(playlistLength / 3600)}`:`${Math.floor(playlistLength / 3600)}`}:${Math.floor(playlistLength / 60) % 60 < 10 ? `0${Math.floor(playlistLength / 60) % 60}`:`${Math.floor(playlistLength / 60) % 60}`}:${Math.floor(playlistLength) % 60 < 10 ? `0${Math.floor(playlistLength) % 60}`:`${Math.floor(playlistLength) % 60}`}`
        }, 200);
    }
    
    for (let i = 0; i < playlistshtml.length; i++) {
        /**
         * @type {HTMLElement}
         */
        const element = playlistshtml[i];
        if(element.innerText === plname){
            if(!element.classList.contains("clicked"))
            element.classList.add("clicked");
        }else{
            if(element.classList.contains("clicked"))
            element.classList.remove("clicked");
        }
    }
}

function removePlaylist() {
    for (let i = 0; i < nodes.length; i++) {
        const element = nodes[i];
        if (element.id === "removable") {
            htmlsongs.removeChild(element);
        }
    }
    nodes = []
    //playlist.style.visibility = "visible";
    //htmlsongs.style.visibility = "hidden";
}

function makegallery() {
    getGallery(folder).then(desongs => {
        songs = desongs;

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
            btn.oncontextmenu = (e) => {
                console.log("right click on " + btn.textContent);
                ipcRenderer.send("makePlaylistMenu", {
                    name: element
                });
            }

            btn.className = "py-[2px] text-left font-medium text-sm text-gray-500 hover:text-white focus:text-gray-300"

            playlist.appendChild(btn);

            const br = document.createElement("br");
            playlist.appendChild(br);

            playlistshtml.push(btn);
            playlistshtml.push(br);
        }

        if (currentPlaylist.innerText === "Album songs") {
            getplaylist(JSON.parse(fs.readFileSync(path.join(savesPath, "latest.json"), "utf-8")).playlist);
        } else {
            getplaylist(currentPlaylist.innerText);
        }

        if (!galleryDone) {
            setupPlayer(songs);
            galleryDone = true;
        }
    });
}