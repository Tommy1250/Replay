var socket = io();
/**
 * @type {{folders: string[], playlists: {string: string[]}}}
 */
let songs = {};

const pausebtn = document.getElementById("pause");
const resumebtn = document.getElementById("resume");
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

let current = {
    number: 0,
    playlist: "random"
};
let playerDone = false;
let galleryDone = false;
let playlistshtml = [];

let recieved = false;

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

resumebtn.onclick = () => {
    socket.emit("play");
}

mutebtn.onclick = () => {
    socket.emit("mute");
};

nextbtn.onclick = () => {
    if (!socket.connected) return;

    current.number++;
    if (!songs.playlists[current.playlist][current.number]) return current.number--;
    updatePlayer("change", {
        songNumber: current,
        currentTime: null
    });
}

prevbtn.onclick = () => {
    if (!socket.connected) return;

    current.number--;
    if (!songs.playlists[current.playlist][current.number]) return current.number++;
    updatePlayer("change", {
        songNumber: current,
        currentTime: null
    });
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
            nowplaying.innerText = songs.playlists[current.playlist][current.number].replace(".mp3", "").replace(".flac", "");
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

socket.on("change", data => {
    updatePlayer("change", data);
})

/**
 * 
 * @param {{folders: string[], playlists: {string: string[]}}} lesongs 
 */
function setupPlayer(lesongs) {
    socket.emit("get-latest", async cb => {
        current = cb;
        let volume = 0.5; // default volume
        await fetch("/volume").then(res => res.json()).then(data => volume = data.volume);

        slider.value = volume * 100;

        volumeValue.innerText = `${Math.round(volume * 100)}%`;
        recieved = true;
        updatePlayer("change", {
            songNumber: cb
        });
    })

    playerDone = true;
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
        btn.textContent = element.replace(".mp3", "").replace(".flac", "");
        btn.onclick = () => {
            updatePlayer("change", {
                songNumber: {
                    number: i,
                    playlist: plname
                }
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
    for (let i = 0; i < playlistshtml.length; i++) {
        const element = playlistshtml[i];
        playlist.removeChild(element);
    }
}

remover.onclick = () => {
    if (!socket.connected) return;

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

/**
 * 
 * @param {{folders: string[], playlists: {string: string[]}}} lesongs 
 */
function makegallery(lesongs) {
    songs = lesongs

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
        btn.className = "px-4 py-1 text-sm text-purple-600 font-semibold rounded-full border border-purple-200 hover:text-white hover:bg-purple-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"

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