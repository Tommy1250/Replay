var socket = io();
/**
 * @type {{folders: string[], playlists: {string: string[]}}}
 */
let songs = {};

const pausebtn = document.getElementById("pause");
const mutebtn = document.getElementById("mute");
const prevbtn = document.getElementById("prev");
const nextbtn = document.getElementById("next");
const seek5forward = document.getElementById("seek5");
const seek5backward = document.getElementById("seek5back");

const nowplaying = document.getElementById("np");
/**
 * @type {HTMLInputElement}
 */
const slider = document.getElementById("volume");
const volumeValue = document.getElementById("davolume");

const playlist = document.getElementById("playlists");
const htmlsongs = document.getElementById("songs");
const remover = document.getElementById("remover");

const loopbtn = document.getElementById("loop");
const shufflebtn = document.getElementById("shuffle");

const timeline = document.getElementById("timeline");
const timeValue = document.getElementById("time");

const currentplaylist = document.getElementById("cpl");

const search = document.getElementById("search");
const clearSearch = document.getElementById("clearSearch");
const searchForm = document.getElementById("searchForm");

let current = {
    number: 0,
    playlist: "random"
};
let playerDone = false;
let galleryDone = false;
let playlistshtml = [];

let recieved = false;

let fullTime;
let currentTime;

let latestPlaylist = "";

/**
 * 
 * @param {string} file 
 * @returns {string}
 */
const filter = (file) => {
    return file.replace(".mp3", "").replace(".flac", "").replace(".m4a", "").replace(".wav", "").replace(".ogg", "")
}

socket.on("connect", () => {
    socket.emit("get-gallery", lesongs => {
        makegallery(lesongs);
    })
})

slider.addEventListener("input", () => {
    updatePlayer("volume", {
        volume: slider.value / 100
    });
})

seek5forward.onclick = () => {
    updatePlayer("seek", {
        currentTime: 5
    });
}

seek5backward.onclick = () => {
    updatePlayer("seek", {
        currentTime: -5
    });
}

pausebtn.onclick = () => {
    socket.emit("pause");
}

mutebtn.onclick = () => {
    socket.emit("mute");
};

nextbtn.onclick = () => {
    if (!socket.connected) return;

    socket.emit("next");
}

prevbtn.onclick = () => {
    if (!socket.connected) return;

    socket.emit("previous");
}

socket.on("changeSong", (song) => {
    recieved = true;
    updatePlayer("change", {
        songNumber: song
    });
})

socket.on("loop", (status) => {
    handleLoop(status);
})

socket.on("shuffle", (state) => {
    shufflebtn.innerText = state ? "Shuffle on" : "Shuffle off";
})

socket.on("timeLineChange", (time) => {
    currentTime = time.currentTime;
    fullTime = time.fullTime;

    const percentagePosition = (100 * currentTime) / fullTime;
    timeline.style.backgroundSize = `${percentagePosition}% 100%`;
    timeline.value = percentagePosition;
    
    //make the time diffent if the duration is bigger than an hour
    if (fullTime > 3600) {
        timeValue.innerText = `${Math.floor(currentTime / 3600)}:${Math.floor(currentTime / 60) % 60}:${Math.floor(currentTime) % 60}/${Math.floor(fullTime / 3600)}:${Math.floor(fullTime / 60) % 60}:${Math.floor(fullTime) % 60}`;
    } else {
        timeValue.innerText = `${Math.floor(currentTime / 60) % 60}:${Math.floor(currentTime) % 60}/${Math.floor(fullTime / 60) % 60}:${Math.floor(fullTime) % 60}`;
    }
})

timeline.addEventListener('input', () => {
    const time = (timeline.value * fullTime) / 100;
    socket.emit("timeChange", time);
});

loopbtn.onclick = () => {
    if (!socket.connected) return;

    socket.emit("doloop");
}

shufflebtn.onclick = () => {
    if(!socket.connected) return;

    socket.emit("doshuffle");
}

/**
 * @param {"change" | "pause" | "play" | "seek" | "volume"} event
 * @param {{songNumber?: {number: number, playlist: string}, currentTime?: number, volume?: number}} param1
 */
function updatePlayer(event, {
    songNumber,
    currentTime,
    volume
}) {
    if (!socket.connected) return;

    switch (event) {
        case "change":
            current = songNumber
            nowplaying.innerText = filter(songs.playlists[current.playlist][current.number]);
            nowplaying.onclick = () => {
                if(latestPlaylist !== current.playlist) {
                    removePlaylist();
                    getplaylist(current.playlist);
                }
                nodes[current.number * 2].focus();
            }
            if (!recieved) {
                socket.emit("song-change", current);
            } else {
                setTimeout(() => {
                    recieved = false;
                }, 100);
            }
            break;
        case "volume":
            volumeValue.innerText = `${Math.round(volume * 100)}%`;
            socket.emit("volume", volume);
            break;
        case "seek":
            socket.emit("seek", currentTime);
            break;
    }
}

socket.on("volumeChange", volume => {
    volumeValue.innerText = `${Math.round(volume * 100)}%`;
    slider.value = volume * 100
})

socket.on("change", data => {
    updatePlayer("change", data);
})

socket.on("mute", data => {
    mutebtn.innerText = data ? "UnMute" : "Mute";
})

socket.on("play", () => {
    pausebtn.innerText = "Pause";
})

socket.on("pause", () => {
    pausebtn.innerText = "Play";
})

/**
 * 
 * @param {{folders: string[], playlists: {string: string[]}}} lesongs 
 */
function setupPlayer(lesongs) {
    socket.emit("get-latest", async cb => {
        current = cb.song;
        let volume = 0.5; // default volume
        await fetch("/volume").then(res => res.json()).then(data => volume = data.volume);

        slider.value = volume * 100;

        volumeValue.innerText = `${Math.round(volume * 100)}%`;
        recieved = true;
        updatePlayer("change", {
            songNumber: cb.song
        });

        handleLoop(cb.loop);

        shufflebtn.innerText = cb.shuffle ? "Shuffle on" : "Shuffle off";
        mutebtn.innerText = cb.mute ? "UnMute" : "Mute";
        pausebtn.innerText = cb.play ? "Pause" : "Play";
    })

    playerDone = true;
}

function handleLoop(status) {
    switch (status) {
        case "one":
            loopbtn.innerText = "Loop one"
            break;
        case "all":
            loopbtn.innerText = "Loop all"
            break;
        case "0":
            loopbtn.innerText = "Loop off"
            break;
    }
}

let nodes = [];
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
        btn.textContent = filter(element);
        btn.onclick = () => {
            updatePlayer("change", {
                songNumber: {
                    number: i,
                    playlist: plname
                }
            });
        }
        btn.id = "removable";
        btn.className = "px-4 py-1 text-sm text-white font-semibold rounded-full border border-white hover:bg-white hover:bg-opacity-40 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-40"
        htmlsongs.appendChild(btn);

        //make a br element
        const br = document.createElement("br");
        br.id = "removable";
        htmlsongs.appendChild(br);

        nodes.push(btn);
        nodes.push(br);
    }
    currentplaylist.innerText = plname;
    const btn = document.createElement("button");
    btn.style.visibility = "hidden";
    btn.id = "removable";
    htmlsongs.appendChild(btn);
    nodes.push(btn);
    for (let i = 0; i < playlistshtml.length; i++) {
        const element = playlistshtml[i];
        playlist.removeChild(element);
    }
    latestPlaylist = plname;
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

/**
 * 
 * @param {string} searchValue 
 */
 function searchPlaylist(searchValue){
    console.log(`Starting search for ${searchValue}`);

    if(searchValue === ""){
        if(latestPlaylist === "none"){
            removePlaylist();
        }else{
            getplaylist(latestPlaylist);
        }
    }else{
        removePlaylist();
        currentplaylist.innerText = "Search results"
        playlist.style.visibility = "hidden";
        htmlsongs.style.visibility = "visible";
        
        for (let i = 0; i < songs.folders.length; i++) {
            const folder = songs.folders[i];
            
            for (let j = 0; j < songs.playlists[folder].length; j++) {
                /**
                 * @type {string}
                 */
                const song = songs.playlists[folder][j];
        
                if(song.toLowerCase().includes(searchValue.toLowerCase())){
                    const btn = document.createElement("button");
                    btn.textContent = filter(song);
                    btn.onclick = () => {
                        updatePlayer("change", {
                            songNumber: {
                                number: j,
                                playlist: folder
                            }
                        });
                    }
                    btn.id = "removable";
                    btn.className = "px-4 py-1 text-sm text-white font-semibold rounded-full border border-white hover:bg-white hover:bg-opacity-40 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-40"
                    htmlsongs.appendChild(btn);
            
                    //make a br element
                    const br = document.createElement("br");
                    br.id = "removable";
                    htmlsongs.appendChild(br);
            
                    nodes.push(btn);
                    nodes.push(br);
                }
            }
        }
        const btn = document.createElement("button");
        btn.style.visibility = "hidden";
        btn.id = "removable";
        htmlsongs.appendChild(btn);
        nodes.push(btn);
        for (let i = 0; i < playlistshtml.length; i++) {
            const element = playlistshtml[i];
            playlist.removeChild(element);
        }
    }
}

remover.onclick = () => {
    removePlaylist();
}

function removePlaylist() {
    currentplaylist.innerText = "Your Albums"
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

    latestPlaylist = "none";
}

/**
 * 
 * @param {{folders: string[], playlists: {string: string[]}}} lesongs 
 */
function makegallery(lesongs) {
    songs = lesongs

    removePlaylist();
    playlist.innerHTML = "";
    playlistshtml = [];

    for (let i = 0; i < lesongs.folders.length; i++) {
        const element = lesongs.folders[i];

        /**
         * @type {HTMLButtonElement}
         */
        const btn = document.createElement("button");
        btn.textContent = element;
        btn.onclick = () => getplaylist(element);
        btn.className = "px-4 py-1 text-sm text-white font-semibold rounded-full border border-white hover:bg-white hover:bg-opacity-40 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-40"

        playlist.appendChild(btn);

        const br = document.createElement("br");
        playlist.appendChild(br);

        playlistshtml.push(btn);
        playlistshtml.push(br);
    }

    if (!galleryDone) {
        setupPlayer(lesongs);
        galleryDone = true;
    }
}