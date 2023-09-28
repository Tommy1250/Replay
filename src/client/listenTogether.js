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

/**
 * @type {string[]}
 */
const queue = [];
let current = 0;

ipcRenderer.on("next", () => {
    sendStream(queue[++current].url);
    queueUl.childNodes.item(current - 1).firstChild.classList.remove("bold");
    queueUl.childNodes.item(current).firstChild.classList.add("bold");
})

playlistForm.onsubmit = async (ev) => {
    ev.preventDefault();
    const playlistLink = playlistInput.value;

    if (playlistLink.match(/^https?:\/\/(www.youtube.com|music.youtube.com|youtube.com)\/playlist(.*)$/)) {
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
        sendStream(playlistLink);
    }
}

function sendStream(url) {
    ytdl.getInfo(url).then(res => {
        const formats = res.player_response.streamingData.adaptiveFormats;

        for (let i = 0; i < formats.length; i++) {
            const video = formats[i];
            if (!video.audioQuality)
                continue;
            if (video.audioQuality === "AUDIO_QUALITY_MEDIUM" && video.mimeType.includes("opus")) {
                console.log("found heighest audio", video);
                ipcRenderer.send("stream", {
                    image: res.videoDetails.thumbnails.at(-1).url,
                    title: res.videoDetails.title,
                    youtube: res.baseUrl,
                    url: video.url,
                    artist: res.videoDetails.author.name,
                    youtube: queue[current].url
                })
                break;
            }
        }
    })
}