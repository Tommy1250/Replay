const ytdl = require("@distube/ytdl-core");
const ytfps = require('ytfps');
const { ipcRenderer } = require("electron");

const minimiseButton = document.getElementById("minimise-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const closeButton = document.getElementById("close-button");

const playlistForm = document.getElementById("playlist");
const playlistInput = document.getElementById("pl");

const queueUl = document.getElementById("queue");

minimiseButton.onclick = () => {
    ipcRenderer.send("minimise-button-lt");
}

fullscreenButton.onclick = () => {
    ipcRenderer.send("fullscreen-button-lt");
}

closeButton.onclick = () => {
    ipcRenderer.send("close-button-lt")
}

const {io} = require("socket.io-client");

const socket = io("http://localhost:6000");

socket.on("connect", () => {
    console.log("connected");
})

/**
 * @type {string[]}
 */
const queue = [];
let current = 0;

ipcRenderer.on("next", () => {
    sendStream(queue[++current].url);
    queueUl.childNodes.item(current - 1).firstChild.classList.remove("bold");
    queueUl.childNodes.item(current).firstChild.classList.add("bold");

    //send to server the update
})

ipcRenderer.on("prevoius", () => {
    sendStream(queue[--current].url);
    queueUl.childNodes.item(current + 1).firstChild.classList.remove("bold");
    queueUl.childNodes.item(current).firstChild.classList.add("bold");

    //send to server the update
})

ipcRenderer.on("play", (ev, time) => {
    //make code to send to all others that i played with the time
})

ipcRenderer.on("pause", (ev, time) => {
    //make code to send to all others that i paused with the time
})

playlistForm.onsubmit = async (ev) => {
    ev.preventDefault();
    const playlistLink = playlistInput.value;

    if (playlistLink.match(/^https?:\/\/(www.youtube.com|music.youtube.com|youtube.com)\/playlist(.*)$/)) {
        //send to other clients to fetch the playlist
        const playlist = await ytfps(playlistLink);
        queue.push(...playlist.videos);
        current = 0;
        console.log(queue);
        queue.map(video => {
            const li = document.createElement("li");
            const title = document.createElement("p");

            title.innerText = video.title;
            li.appendChild(title);
            queueUl.appendChild(li);
        })
        sendStream(queue[0].url);
        queueUl.childNodes.item(current).firstChild.classList.add("bold");
    } else if (ytdl.validateURL(playlistLink)) {
        //send to other clients to play the link
        sendStream(playlistLink);
    }
}

function sendStream(url) {
    ytdl.getInfo(url).then(res => {
        
    })
}