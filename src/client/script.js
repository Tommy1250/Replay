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
const currentTime = document.getElementById("currentTime");

const lyricsHTML = document.getElementById("lyrics");

const loop = document.getElementById("loop");
const loopOne = document.getElementById("loopone");
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

let played = [];

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
    current = {
        number: 0,
        playlist: path.parse(folder).base
    }
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
            loop.style.color = "#175aa2";
            loopOne.classList.add("invisible");
            settings["loop"].status = "all"
            doLoop = 2
            break;
        case 2:
            loop.style.color = "#FFFFFF";
            loopOne.classList.add("invisible");
            settings["loop"].status = "0"
            doLoop = 0
            break;
        case 0:
            loop.style.color = "#175aa2";
            loopOne.classList.remove("invisible");
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
                if (current.playlist !== currentPlaylist.innerText) getplaylist(current.playlist);
                nodes[current.number].focus();
            }

            /**
             * @type {{title: string, artist: string, album: string, artwork: {src: string, type: string, sizes: string}[]}}
             */
            const trackInfo = {};
            trackInfo.title = nowplaying.innerText;

            if (current.playlist === path.parse(folder).base) {
                let songPath = path.join(folder, songs.playlists[current.playlist][current.number]);
                player.src = songPath;
                if (settings["metadata"].status) {
                    musicMetadata.parseFile(songPath).then(data => {
                        if (data.common.picture) {
                            coverImg.src = `data:image/png;base64,${data.common.picture[0].data.toString("base64")}`
                            coverImg.style.display = "initial";

                            trackInfo.artwork = [
                                {
                                    src: `data:image/png;base64,${data.common.picture[0].data.toString("base64")}`
                                }
                            ]
                        } else {
                            coverImg.style.display = "none";
                        }

                        if (data.common.artist) {
                            const artistName = document.createElement("p");
                            artistName.className = "text-gray-500 font-normal text-sm";
                            nowplaying.appendChild(artistName);
                            artistName.innerText = data.common.artist;
                            trackInfo.artist = data.common.artist;
                        }
                        let mediaMD = new MediaMetadata(trackInfo);

                        // We assign our mediaMD to MediaSession.metadata property
                        navigator.mediaSession.metadata = mediaMD
                    })
                }else{
                    let mediaMD = new MediaMetadata(trackInfo);

                    // We assign our mediaMD to MediaSession.metadata property
                    navigator.mediaSession.metadata = mediaMD
                }
            } else {
                let songPath = path.join(folder, current.playlist, songs.playlists[current.playlist][current.number]);
                player.src = songPath;
                if (settings["metadata"].status) {
                    musicMetadata.parseFile(songPath).then(data => {
                        if (data.common.picture) {
                            coverImg.src = `data:image/png;base64,${data.common.picture[0].data.toString("base64")}`
                            coverImg.style.display = "initial";

                            trackInfo.artwork = [
                                {
                                    src: `data:image/png;base64,${data.common.picture[0].data.toString("base64")}`
                                }
                            ]
                        } else {
                            coverImg.style.display = "none";
                        }

                        if (data.common.artist) {
                            const artistName = document.createElement("p");
                            artistName.className = "text-gray-500 font-normal text-sm";
                            nowplaying.appendChild(artistName)
                            artistName.innerText = data.common.artist;
                            trackInfo.artist = data.common.artist;
                        }

                        let mediaMD = new MediaMetadata(trackInfo);

                        // We assign our mediaMD to MediaSession.metadata property
                        navigator.mediaSession.metadata = mediaMD
                    })
                }else{
                    let mediaMD = new MediaMetadata(trackInfo);

                    // We assign our mediaMD to MediaSession.metadata property
                    navigator.mediaSession.metadata = mediaMD
                }
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

navigator.mediaSession.setActionHandler("play", () => {
    player.play();
});

navigator.mediaSession.setActionHandler("pause", () => {
    player.pause();
});

navigator.mediaSession.setActionHandler("nexttrack", nextSong);

navigator.mediaSession.setActionHandler("previoustrack", previousSong);

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

player.oncanplay = () => {
    if(player.duration >= 3600) {
        const playerDurationHours = Math.floor(player.duration / 3600);
        const playerDurationMinutes = Math.floor(player.duration / 60) % 60;
        const playerDurationSeconds = Math.floor(player.duration) % 60;
        timeValue.innerText = `${playerDurationHours > 10 ? playerDurationHours : `0${playerDurationHours}`}:${playerDurationMinutes > 10 ? playerDurationMinutes : `0${playerDurationMinutes}`}:${playerDurationSeconds > 10 ? playerDurationSeconds : `0${playerDurationSeconds}`}`;
    }else{
        const playerDurationMinutes = Math.floor(player.duration / 60) % 60;
        const playerDurationSeconds = Math.floor(player.duration) % 60;
        timeValue.innerText = `${playerDurationMinutes > 10 ? playerDurationMinutes : `0${playerDurationMinutes}`}:${playerDurationSeconds > 10 ? playerDurationSeconds : `0${playerDurationSeconds}`}`;
    }
}

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

//make an event listener that listens for the player when it gets muted
player.onvolumechange = () => {
    if (player.muted) {
        // volumeValue.innerText = "Unmute";
        volumeValue.innerText = "";
        volumeValue.classList.add("fa-solid", "fa-volume-xmark");
        ipcRenderer.send("mute", true);
    } else {
        volumeValue.classList.remove("fa-solid", "fa-volume-xmark");
        volumeValue.innerText = `${Math.round(player.volume * 100)}%`;
        ipcRenderer.send("mute", false);
    }
}

player.onpause = () => {
    ipcRenderer.send("pause");
    // pause.innerText = "Play";
    pause.classList.remove("fa-circle-pause");
    pause.classList.add("fa-circle-play");
    navigator.mediaSession.playbackState = "paused";
}

player.onplay = () => {
    ipcRenderer.send("play", {
        name: songs.playlists[current.playlist][current.number],
        playlist: current.playlist
    });
    // pause.innerText = "Pause";
    pause.classList.remove("fa-circle-play");
    pause.classList.add("fa-circle-pause");
    navigator.mediaSession.playbackState = "playing";
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
                 * @type {string}
                 */
                const song = songs.playlists[songsFolder][j];

                if (song.toLowerCase().includes(searchValue.toLowerCase())) {

                    songsConut++;
                    const btn = document.createElement("button");
                    const songname = document.createElement("p");
                    const songDuration = document.createElement("p");
                    const songPhoto = document.createElement("img");
                    const artist = document.createElement("p");

                    songname.innerText = filter(song);
                    btn.style.gridTemplateColumns = "1fr auto";
                    btn.appendChild(songname);

                    if (settings["metadata"].status) {
                        let songPath = ""

                        if (songsFolder === path.parse(folder).base) {
                            songPath = path.join(folder, songs.playlists[songsFolder][j]);
                        } else {
                            songPath = path.join(folder, songsFolder, songs.playlists[songsFolder][j]);
                        }

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
        const hours = Math.floor(player.currentTime / 3600);
        const minutes = Math.floor(player.currentTime / 60) % 60;
        const seconds = Math.floor(player.currentTime) % 60;
        currentTime.innerText = `${hours > 10 ? hours : `0${hours}`}:${minutes > 10 ? minutes : `0${minutes}`}:${seconds > 10 ? seconds : `0${seconds}`}`
    } else {
        const minutes = Math.floor(player.currentTime / 60) % 60;
        const seconds = Math.floor(player.currentTime) % 60;
        currentTime.innerText = `${minutes > 10 ? minutes : `0${minutes}`}:${seconds > 10 ? seconds : `0${seconds}`}`
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
            loop.style.color = "#175aa2";
            loopOne.classList.remove("invisible");
            doLoop = 1
            break;
        case "all":
            loop.style.color = "#175aa2";
            loopOne.classList.add("invisible");
            doLoop = 2
            break;
        case "0":
            loop.style.color = "#FFFFFF";
            loopOne.classList.add("invisible");
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
    //playlist.style.visibility = "hidden";
    //htmlsongs.style.visibility = "visible";

    search.value = "";

    removePlaylist();

    let playlistLength = 0;
    let songsCount = 0;
    for (let i = 0; i < songs.playlists[plname].length; i++) {
        const songName = songs.playlists[plname][i];
        songsCount++;

        const btn = document.createElement("button");
        const songname = document.createElement("p");
        const songDuration = document.createElement("p");
        const songPhoto = document.createElement("img");
        const artist = document.createElement("p");

        songname.innerText = filter(songName);
        btn.style.gridTemplateColumns = "1fr auto";
        btn.appendChild(songname);

        if (settings["metadata"].status) {
            let songPath = ""

            if (plname === path.parse(folder).base) {
                songPath = path.join(folder, songs.playlists[plname][i]);
            } else {
                songPath = path.join(folder, plname, songs.playlists[plname][i]);
            }

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
            updatePlayer("change", {
                songNumber: {
                    number: i,
                    playlist: plname
                }
            });
        }
        btn.oncontextmenu = (e) => {
            console.log("right click on ", songName, i);
            ipcRenderer.send("makeSongMenu", {
                name: songName,
                playlist: plname,
                number: i,
                addShow: false
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
    /*const btn = document.createElement("button");
    btn.style.visibility = "hidden";
    btn.id = "removable";
    htmlsongs.appendChild(btn);
    nodes.push(btn);*/
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

            if (element === latestPlaylist) btn.classList.add("clicked");

            playlist.appendChild(btn);

            const br = document.createElement("br");
            playlist.appendChild(br);

            playlistshtml.push(btn);
            playlistshtml.push(br);
        }

        if (currentPlaylist.innerText === "Album songs") {
            getplaylist(JSON.parse(fs.readFileSync(path.join(savesPath, "latest.json"), "utf-8")).playlist);
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
    const filePath = files[0].path;

    if (isAudio(files[0].name)) {
        if (settings["metadata"].status) {
            musicMetadata.parseFile(filePath).then(data => {
                if (data.common.picture) {
                    coverImg.src = `data:image/png;base64,${data.common.picture[0].data.toString("base64")}`
                    coverImg.style.display = "initial";
                } else {
                    coverImg.style.display = "none";
                }
            })
        }
        nowplaying.innerText = filter(files[0].name);
        const parsedPath = path.parse(filePath);
        nowplaying.onclick = () => {
            shell.openPath(parsedPath.dir);
        }
        player.src = filePath;
        player.play();
    }
})