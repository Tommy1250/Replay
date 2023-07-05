/**
 * @type {{folders: string[], playlists: {string: {name: string, location: string}[]}}}
 */
let songs;

/**
 * @type {HTMLAudioElement}
 */
const player = document.getElementById("player");
const nextbtn = document.getElementById("next");
const prevbtn = document.getElementById("prev");
const nowplaying = document.getElementById("np");
/**
 * @type {HTMLImageElement}
 */
const coverImg = document.getElementById("coverimg");
const currentPlaylist = document.getElementById("currentplaylist");
const plinfo = document.getElementById("plinfo");
const pltime = document.getElementById("pltime");

const pause = document.getElementById("pause");
const timeline = document.getElementById("timeline");
const timeValue = document.getElementById("time");

const lyricsHTML = document.getElementById("lyrics");

const loop = document.getElementById("loop");
const shuffle = document.getElementById("shuffle");
const speed = document.getElementById("speed");

/**
 * @type {HTMLInputElement}
 */
const slider = document.getElementById("volume");
const volumeValue = document.getElementById("davolume");

const playlist = document.getElementById("playlists");
const htmlsongs = document.getElementById("songs");
const dragArea = document.getElementById("overlay");

const search = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");
const searchForm = document.getElementById("searchForm");

const fileButton = document.getElementById("file-button");
const lyricsButton = document.getElementById("lyrics-button");
const settingsButton = document.getElementById("settings-button");
const infoButton = document.getElementById("info-button");

const minimiseButton = document.getElementById("minimise-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const closeButton = document.getElementById("close-button");

/**
 * 
 * @param {string} file 
 * @returns {string}
 */
const filter = (file) => {
    return file.replace(".mp3", "").replace(".flac", "").replace(".m4a", "").replace(".wav", "").replace(".ogg", "")
}

let galleryDone = false;
let firstTime = true;

const fs = require("fs");
const musicMetadata = require('music-metadata');

const {
    getGallery
} = require("../gallery");

const {
    ipcRenderer,
    shell
} = require("electron");

const path = require("path");

let current = 0;
let currentInQueue = 0;
let diffence = 0;

let latestPlaylist = "";

let playlistshtml = [];
let nodes = [];

/**
 * @type {{playlistName: string, songs: {location: string, name: string, out?: boolean}[]}}
 */
let queue = {};
/**
 * @type {number[]}
 */
let shuffleQueue = [];

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
        nowplaying.innerText = "No folder selected! Please select a folder in the file menu.";
    }
    console.log(fs.readdirSync(savesPath));
});

ipcRenderer.on("settingsChanged", (event, data) => {
    settings = data
})

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
    current = 0;
    currentInQueue = 0;
    diffence = 0;
    makegallery();
    setTimeout(() => {
        getplaylist(path.parse(folder).base)
    }, 1000);
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
    currentInQueue = arg.number;
    if(queue.playlistName !== arg.playlist || queue.songs.length !== songs.playlists[plname].length){
        queue.playlistName = arg.playlist;
        queue.songs = [...songs.playlists[arg.playlist]];
        diffence = 0;
        shuffleTheQueue();
    }
    updatePlayer("change", {
        songNumber: currentInQueue
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

fileButton.onclick = () => {
    ipcRenderer.send("file-button");
}

lyricsButton.onclick = () => {
    ipcRenderer.send("lyrics-button");
}

settingsButton.onclick = () => {
    ipcRenderer.send("settings-button");
}

infoButton.onclick = () => {
    ipcRenderer.send("info-button");
}

minimiseButton.onclick = () => {
    ipcRenderer.send("minimise-button");
}

fullscreenButton.onclick = () => {
    ipcRenderer.send("fullscreen-button");
}

closeButton.onclick = () => {
    ipcRenderer.send("close-button")
}

slider.addEventListener("input", () => {
    updatePlayer("volume", {
        volume: slider.value / 100
    });
})

slider.addEventListener("wheel", (ev) => {
    if (ev.deltaY == -100) {
        if (player.volume < 0.98) {
            updatePlayer("volume", {
                volume: player.volume + 0.02
            });
            slider.value = player.volume * 100;
            volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
        } else {
            updatePlayer("volume", {
                volume: 1
            });
            slider.value = player.volume * 100;
            volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
        }
    } else {
        if (player.volume > 0.02) {
            updatePlayer("volume", {
                volume: player.volume - 0.02
            });
            slider.value = player.volume * 100;
            volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
        } else {
            updatePlayer("volume", {
                volume: 0.01
            });
            slider.value = player.volume * 100;
            volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
        }
    }
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

    if (shuffle.checked) {
        let songsLength = queue.songs.length;
        let unShuffled = [];
        for (let i = 0; i < songsLength; i++) {
            unShuffled.push(i);
        }
        for (let i = unShuffled.length - 1; i > 1; i--) {
            let j = 1 + Math.floor(Math.random() * i);
            [unShuffled[i], unShuffled[j]] = [unShuffled[j], unShuffled[i]];
        }
        shuffleQueue = unShuffled;
    }else{
        currentInQueue = current;
    }

    console.log(shuffleQueue);

    fs.writeFileSync(path.join(savesPath, "settings.json"), JSON.stringify(settings));
}

speed.addEventListener("click", () => {
    if (player.playbackRate < 2) {
        player.playbackRate += 0.25;
    }
    else {
        player.playbackRate = 0.25;
    }
    speed.innerText = `speed ${player.playbackRate}x`;
})

speed.addEventListener("wheel", (ev) => {
    if (ev.deltaY == -100) {
        if (player.playbackRate == 16) player.playbackRate = 0.25;
        else player.playbackRate += 0.25;
    } else {
        if (player.playbackRate == 0.25) player.playbackRate = 16;
        else player.playbackRate -= 0.25;
    }
    speed.innerText = `speed ${player.playbackRate}x`;
});

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
                    updatePlayer("volume", {
                        volume: player.volume + 0.05
                    });
                    slider.value = player.volume * 100;
                    volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
                } else {
                    updatePlayer("volume", {
                        volume: 1
                    });
                    slider.value = player.volume * 100;
                    volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
                }
                break;
            case "ArrowDown":
                if (player.volume > 0.05) {
                    updatePlayer("volume", {
                        volume: player.volume - 0.05
                    });
                    slider.value = player.volume * 100;
                    volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
                } else {
                    updatePlayer("volume", {
                        volume: 0.01
                    });
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
    coverImg.style.display = "initial";
    coverImg.src = arg.image;
    nowplaying.innerText = arg.title;
    nowplaying.onclick = () => {
        shell.openExternal(arg.youtube);
    }
    player.src = arg.url;
    player.play();
})

/**
 * @param {"change" | "volume" | "seek"} event
 * @param {{songNumber?: number, currentTime?: number, volume?: number}} param1
 */
function updatePlayer(event, {
    songNumber,
    currentTime,
    volume
}) {
    switch (event) {
        case "change":
            currentInQueue = songNumber;
            if(shuffle.checked && !queue.songs[shuffleQueue[currentInQueue]].out){
                current = shuffleQueue[currentInQueue];
            }else{
                current = currentInQueue - diffence;
            }

            if (queue.songs[currentInQueue].out) {
                nowplaying.onclick = () => {
                    shell.showItemInFolder(queue.songs[currentInQueue].location);
                }
            } else {
                nowplaying.onclick = () => {
                    if (queue.playlistName !== currentPlaylist.innerText) getplaylist(queue.playlistName);
                    nodes[current].focus();
                }
            }

            if (shuffle.checked) {
                nowplaying.innerText = filter(queue.songs[shuffleQueue[currentInQueue]].name);
                let songPath = queue.songs[shuffleQueue[currentInQueue]].location;
                player.src = songPath;
                if (settings["metadata"].status) {
                    musicMetadata.parseFile(songPath).then(data => {
                        if (data.common.picture) {
                            coverImg.src = `data:image/png;base64,${data.common.picture[0].data.toString("base64")}`
                            coverImg.style.display = "initial";
                        } else {
                            coverImg.style.display = "none";
                        }
                    })
                }
            } else {
                nowplaying.innerText = filter(queue.songs[currentInQueue].name);
                let songPath = queue.songs[currentInQueue].location;
                player.src = songPath;
                if (settings["metadata"].status) {
                    musicMetadata.parseFile(songPath).then(data => {
                        if (data.common.picture) {
                            coverImg.src = `data:image/png;base64,${data.common.picture[0].data.toString("base64")}`
                            coverImg.style.display = "initial";
                        } else {
                            coverImg.style.display = "none";
                        }
                    })
                }
            }

            if (!firstTime) player.play();
            else firstTime = false;

            if (fs.existsSync(path.join(lyricsFolder, `${filter(queue.songs[currentInQueue].name)}.txt`))) {
                const dalyrics = fs.readFileSync(path.join(lyricsFolder, `${filter(queue.songs[currentInQueue].name)}.txt`), "utf-8");
                ipcRenderer.send("updateLyrics", {
                    name: filter(queue.songs[currentInQueue].name),
                    lyrics: dalyrics
                });
                lyricsHTML.innerText = dalyrics;
            } else {
                ipcRenderer.send("updateLyrics", {
                    name: filter(queue.songs[currentInQueue].name),
                    lyrics: "Song doesn't have lyrics!"
                });
                lyricsHTML.innerText = "Song doesn't have lyrics!";
            }

            fs.writeFileSync(path.join(savesPath, "latest.json"), JSON.stringify({
                number: current,
                playlist: queue.playlistName
            }));

            //ipcRenderer.send("change", {name: songs.playlists[current.playlist][current.number], playlist: current.playlist});

            ipcRenderer.send("changeCurrent", {
                number: current,
                playlist: queue.playlistName
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

navigator.mediaDevices.addEventListener("devicechange", async () => {
    if (settings["output"].id === "default") {
        const devices = await navigator.mediaDevices.enumerateDevices();
        for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            if (device.kind === "audiooutput" && device.deviceId === "default") {
                ipcRenderer.send("serverOutputChange", ({
                    label: device.label,
                    deviceId: device.deviceId
                }))
                continue;
            }
        }
    }
})

ipcRenderer.on("outputChange", (event, arg) => {
    player.pause();
    player.setSinkId(arg)
        .then(() => {
            console.log('Audio output device attached: ' + arg);
            settings["output"].id = arg;
            fs.writeFileSync(path.join(savesPath, 'settings.json'), JSON.stringify(settings));
            player.play();

            ipcRenderer.send("serverOutputChange", ({
                deviceId: arg,
                label: "none"
            }))
        })
        .catch(function (error) {
            console.error(error);
        });
})

ipcRenderer.on("getOutputDevices", () => {
    let gotSaved = false;
    let payload = {
        devices: [],
        current: ""
    }
    navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
            for (let i = 0; i < devices.length; i++) {
                const device = devices[i];
                if (device.kind === "audiooutput") {
                    if (device.deviceId === settings["output"].id && !gotSaved) {
                        gotSaved = true;
                        payload.current = device.deviceId;
                    }
                    payload.devices.push({
                        deviceId: device.deviceId,
                        label: device.label
                    });
                }
            }
            ipcRenderer.send("outputDevices", (payload));
        })
        .catch((err) => {
            console.error(err)
        })
})

ipcRenderer.on("lyrics", (event, arg) => {
    lyricsHTML.innerText = arg;
});

//make an event lestener that listens for the player when it gets muted
player.onvolumechange = () => {
    if (player.muted) {
        volumeValue.innerText = "Unmute";
        ipcRenderer.send("mute", true);
    } else {
        volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
        ipcRenderer.send("mute", false);
    }
}

player.onpause = () => {
    ipcRenderer.send("pause");
    pause.innerText = "Play";
}

player.onplay = () => {
    ipcRenderer.send("play", {
        name: filter(queue.songs[currentInQueue].name)
    });
    pause.innerText = "Pause";
}

function shuffleTheQueue() {
    if (shuffle.checked) {
        let songsLength = queue.songs.length;
        let unShuffled = [];
        for (let i = 0; i < songsLength; i++) {
            unShuffled.push(i);
        }
        for (let i = unShuffled.length - 1; i > 1; i--) {
            let j = 1 + Math.floor(Math.random() * i);
            [unShuffled[i], unShuffled[j]] = [unShuffled[j], unShuffled[i]];
        }
        shuffleQueue = unShuffled;
    }
}

player.onended = () => {
    currentInQueue++;
    if (!shuffle.checked) {
        if (doLoop === 1) {
            currentInQueue--;
        } else if (!queue.songs[currentInQueue]) {
            if (doLoop === 2) {
                currentInQueue = 0;
            } else {
                currentInQueue--;
                return
            }
        }
    } else {
        console.log(currentInQueue, queue.songs.length);
        if (currentInQueue === queue.songs.length) {
            if (doLoop === 2) {
                currentInQueue = 0;
            } else {
                currentInQueue--;
                return
            }
        }
    }

    updatePlayer("change", {
        songNumber: currentInQueue
    });
}

/**
 * 
 * @param {string} searchValue 
 */
function searchPlaylist(searchValue) {
    console.log(`Starting search for ${searchValue}`);

    if (searchValue === "") {
        getplaylist(latestPlaylist);
    } else {
        currentPlaylist.innerText = "Search results"
        removePlaylist();

        let songsConut = 0;
        for (let i = 0; i < songs.folders.length; i++) {
            const songsFolder = songs.folders[i];

            for (let j = 0; j < songs.playlists[songsFolder].length; j++) {
                /**
                 * @type {{name: string, location: string}}
                 */
                const song = songs.playlists[songsFolder][j];

                if (song.name.toLowerCase().includes(searchValue.toLowerCase())) {
                    songsConut++;
                    const btn = document.createElement("button");
                    const songname = document.createElement("p");
                    const songDuration = document.createElement("p");
                    const songPhoto = document.createElement("img");
                    const artist = document.createElement("p");

                    songname.innerText = filter(song.name);
                    btn.style.gridTemplateColumns = "1fr auto";
                    btn.appendChild(songname);

                    if (settings["metadata"].status) {
                        let songPath = song.location;

                        musicMetadata.parseFile(songPath).then(data => {
                            if (data.common.picture) {
                                songPhoto.src = `data:image/png;base64,${data.common.picture[0].data.toString("base64")}`;
                                songPhoto.style.objectFit = "contain"
                                songPhoto.className = "w-[35px] h-[35px] mr-1"
                                btn.style.gridTemplateColumns = "auto 1fr auto";
                                btn.insertBefore(songPhoto, songname);
                            }

                            if (data.format.duration) {
                                if (data.format.duration > 3600) {
                                    songDuration.innerText = `${Math.floor(data.format.duration / 3600) < 10 ? `0${Math.floor(data.format.duration / 3600)}` : `${Math.floor(data.format.duration / 3600)}`}:${Math.floor(data.format.duration / 60) % 60 < 10 ? `0${Math.floor(data.format.duration / 60) % 60}` : `${Math.floor(data.format.duration / 60) % 60}`}:${Math.floor(data.format.duration) % 60 < 10 ? `0${Math.floor(data.format.duration) % 60}` : `${Math.floor(data.format.duration) % 60}`}`;
                                } else {
                                    songDuration.innerText = `${Math.floor(data.format.duration / 60) % 60 < 10 ? `0${Math.floor(data.format.duration / 60) % 60}` : `${Math.floor(data.format.duration / 60) % 60}`}:${Math.floor(data.format.duration) % 60 < 10 ? `0${Math.floor(data.format.duration) % 60}` : `${Math.floor(data.format.duration) % 60}`}`;
                                }
                                btn.appendChild(songDuration);
                            }

                            if (data.common.artist) {
                                artist.innerText = data.common.artist
                                artist.className = "text-gray-500 font-normal"
                                songname.appendChild(artist);
                            }
                        });
                    }

                    btn.onclick = () => {
                        if (queue.playlistName !== songsFolder || queue.songs.length !== songs.playlists[songsFolder].length) {
                            diffence = 0;
                            queue.playlistName = plname;
                            queue.songs = [...songs.playlists[plname]];
                            shuffleTheQueue();
                        }
                        shuffleTheQueue();
                        updatePlayer("change", {
                            songNumber: j
                        });
                    }

                    btn.oncontextmenu = (e) => {
                        console.log("right click on " + btn.textContent);
                        ipcRenderer.send("makeSongMenu", {
                            name: song.name,
                            playlist: songsFolder,
                            location: song.location,
                            number: j,
                            addShow: true
                        });
                    }

                    btn.id = "removable";
                    btn.className = "grid px-2 text-left py-1 w-full text-sm text-gray-300 font-medium rounded-md hover:text-white hover:bg-white hover:bg-opacity-20 hover:border-transparent focus:border"
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
        pltime.innerText = "";
    }
}

ipcRenderer.on("showSong", (event, data) => {
    search.value = "";
    getplaylist(data.playlist);
    nodes[data.number].focus();
})

function nextSong() {
    currentInQueue++;
    if (!shuffle.checked) {
        if (!queue.songs[currentInQueue]) {
            if (doLoop === 2) {
                currentInQueue = 0;
            } else {
                currentInQueue--;
                return
            }
        }
    } else {
        console.log(currentInQueue, queue.songs.length);
        if (currentInQueue === queue.songs.length) {
            if (doLoop === 2) {
                currentInQueue = 0;
            } else {
                currentInQueue--;
                return
            }
        }
    }

    updatePlayer("change", {
        songNumber: currentInQueue
    });
}

function previousSong() {
    currentInQueue--;
    if (!shuffle.checked) {
        if (!queue.songs[currentInQueue]) {
            if (doLoop === 2) {
                currentInQueue = queue.songs.length - 1;
            } else {
                currentInQueue++;
                return
            }
        }
    } else {
        if (!queue.songs[shuffleQueue.at(currentInQueue)]) {
            currentInQueue++;
            return
        }
    }

    updatePlayer("change", {
        songNumber: currentInQueue
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

async function setupPlayer() {
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

    shuffle.checked = settings["shuffle"].status;

    shuffleTheQueue();

    const volumefile = fs.readFileSync(path.join(savesPath, "volume.txt"), "utf-8");
    const volume = parseFloat(volumefile);

    player.volume = volume;
    slider.value = volume * 100;
    volumeValue.innerText = `${Math.round(volume * 100)}%`;

    queue.playlistName = current.playlist
    current = current.number ? current.number : current
    currentInQueue = current;
    updatePlayer("change", {
        songNumber: current
    });

    if (!settings["output"]) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        for (let i = 0; i < devices.length; i++) {
            const device = devices[i];
            if (device.kind === "audiooutput" && device.label.startsWith("Default")) {
                player.setSinkId(device.deviceId)
                    .then(() => {
                        console.log('Audio output device attached: ' + device.deviceId);
                        settings["output"] = {
                            "id": ""
                        };
                        settings["output"].id = device.deviceId;
                        settings = fs.writeFileSync(path.join(savesPath, "settings.json"), JSON.stringify(settings));
                        ipcRenderer.send("settingsChangedNoRestart");
                    })
                    .catch(function (error) {
                        console.error(error);
                    });
                continue;
            }
        }
    } else {
        player.setSinkId(settings["output"].id)
            .then(() => {
                console.log('Audio output device attached: ' + settings["output"].id);
            })
            .catch(function (error) {
                console.error(error);
            });
    }
}

/**
 * 
 * @param {string} plname 
 */
function getplaylist(plname) {
    search.value = "";

    removePlaylist();

    let playlistLength = 0;
    let songsCount = 0;
    for (let i = 0; i < songs.playlists[plname].length; i++) {
        const songInfo = songs.playlists[plname][i];
        songsCount++;

        const btn = document.createElement("button");
        const songname = document.createElement("p");
        const songDuration = document.createElement("p");
        const songPhoto = document.createElement("img");
        const artist = document.createElement("p");

        songname.innerText = filter(songInfo.name);
        btn.style.gridTemplateColumns = "1fr auto";
        btn.appendChild(songname);

        if (settings["metadata"].status) {
            let songPath = songInfo.location;

            musicMetadata.parseFile(songPath).then(data => {
                if (data.common.picture) {
                    songPhoto.src = `data:image/png;base64,${data.common.picture[0].data.toString("base64")}`;
                    songPhoto.style.objectFit = "contain"
                    songPhoto.className = "w-[35px] h-[35px] mr-1"
                    btn.style.gridTemplateColumns = "auto 1fr auto";
                    btn.insertBefore(songPhoto, songname);
                }

                if (data.format.duration) {
                    playlistLength += data.format.duration;

                    if (data.format.duration > 3600) {
                        songDuration.innerText = `${Math.floor(data.format.duration / 3600) < 10 ? `0${Math.floor(data.format.duration / 3600)}` : `${Math.floor(data.format.duration / 3600)}`}:${Math.floor(data.format.duration / 60) % 60 < 10 ? `0${Math.floor(data.format.duration / 60) % 60}` : `${Math.floor(data.format.duration / 60) % 60}`}:${Math.floor(data.format.duration) % 60 < 10 ? `0${Math.floor(data.format.duration) % 60}` : `${Math.floor(data.format.duration) % 60}`}`;
                    } else {
                        songDuration.innerText = `${Math.floor(data.format.duration / 60) % 60 < 10 ? `0${Math.floor(data.format.duration / 60) % 60}` : `${Math.floor(data.format.duration / 60) % 60}`}:${Math.floor(data.format.duration) % 60 < 10 ? `0${Math.floor(data.format.duration) % 60}` : `${Math.floor(data.format.duration) % 60}`}`;
                    }
                    btn.appendChild(songDuration);
                }

                pltime.innerText = `, ${Math.floor(playlistLength / 3600) < 10 ? `0${Math.floor(playlistLength / 3600)}` : `${Math.floor(playlistLength / 3600)}`}:${Math.floor(playlistLength / 60) % 60 < 10 ? `0${Math.floor(playlistLength / 60) % 60}` : `${Math.floor(playlistLength / 60) % 60}`}:${Math.floor(playlistLength) % 60 < 10 ? `0${Math.floor(playlistLength) % 60}` : `${Math.floor(playlistLength) % 60}`}`

                if (data.common.artist) {
                    artist.innerText = data.common.artist
                    artist.className = "text-gray-500 font-normal"
                    songname.appendChild(artist);
                }
            });
        }

        btn.onclick = () => {
            if (queue.playlistName !== plname || queue.songs.length !== songs.playlists[plname].length) {
                currentInQueue = i;
                diffence = 0;
                queue.playlistName = plname;
                queue.songs = [...songs.playlists[plname]];
                shuffleTheQueue();
            }
            updatePlayer("change", {
                songNumber: i,
                force: true
            });
        }

        btn.oncontextmenu = (e) => {
            console.log("right click on ", songInfo.name, i);
            ipcRenderer.send("makeSongMenu", {
                name: songInfo.name,
                playlist: plname,
                location: songInfo.location,
                number: i,
                addShow: false
            });
        }
        btn.id = "removable";
        btn.className = "grid px-2 text-left py-1 w-full text-sm text-gray-300 font-medium rounded-md hover:text-white hover:bg-white hover:bg-opacity-20 hover:border-transparent focus:border"
        htmlsongs.appendChild(btn);

        nodes.push(btn);
    }

    latestPlaylist = plname;
    currentPlaylist.innerText = plname;
    plinfo.innerText = `${songsCount} songs`

    for (let i = 0; i < playlistshtml.length; i++) {
        /**
         * @type {HTMLElement}
         */
        const element = playlistshtml[i];
        if (element.innerText === plname) {
            if (!element.classList.contains("clicked"))
                element.classList.add("clicked");
        } else {
            if (element.classList.contains("clicked"))
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
}

function makegallery() {
    getGallery(folder).then(desongs => {
        console.log(desongs);
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

            if (element === latestPlaylist) btn.classList.add("clicked");

            playlist.appendChild(btn);

            const br = document.createElement("br");
            playlist.appendChild(br);

            playlistshtml.push(btn);
            playlistshtml.push(br);
        }

        if (currentPlaylist.innerText === "Album songs") {
            const savedPlaylist = JSON.parse(fs.readFileSync(path.join(savesPath, "latest.json"), "utf-8")).playlist;
            queue.songs = [...songs.playlists[savedPlaylist]];
            queue.playlistName = savedPlaylist;
            getplaylist(savedPlaylist);
        } else if (currentPlaylist.innerText === "Search results") {
            searchPlaylist(search.value);
        } else {
            getplaylist(latestPlaylist);
        }

        if (!galleryDone) {
            setupPlayer(songs);
            galleryDone = true;
        }
    });
}

/**
 * 
 * @param {string} file 
 * @returns {boolean}
 */
const isAudio = (file) => {
    return file.endsWith(".mp3") ||
        file.endsWith(".flac") ||
        file.endsWith(".m4a") ||
        file.endsWith(".wav") ||
        file.endsWith(".ogg")
}

//drag and drop methods
document.addEventListener("dragover", (e) => {
    e.stopPropagation();
    e.preventDefault();
})

document.addEventListener("drop", (e) => {
    e.stopPropagation();
    e.preventDefault();

    console.log("Drop");

    dragArea.style.display = "none";

    const files = e.dataTransfer.files;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (isAudio(file.name)) {
            const filePath = file.path;
            const fileName = file.name;
            const whereToPut = currentInQueue + i + 1;

            queue.songs.splice(whereToPut, 0, {
                name: fileName,
                location: filePath,
                out: true
            })
        }
    }
    currentInQueue++;
    diffence = files.length
    updatePlayer("change", {
        songNumber: currentInQueue
    })
})