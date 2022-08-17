const form = document.getElementById("form");
const downloadURL = document.getElementById("yt-link");
const list = document.getElementById("list")
const status = document.getElementById("status");

const minimiseButton = document.getElementById("minimise-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const closeButton = document.getElementById("close-button");

const report = document.getElementById("report");

const {
    ipcRenderer,
    shell
} = require('electron');

const http = require('http');
const fs = require("fs");
const path = require("path");
//const selectedFolder = document.getElementById("folders");

const ytdl = require('ytdl-core');
const ytkey = fs.readFileSync(path.join(__dirname, "../saves/ytkey.txt"), "utf-8");
const YouTube = require("simple-youtube-api");
const youtube = new YouTube(ytkey);

const ytsearch = require("yt-search");
const videoFinder = async (query) => {
    const resault = await ytsearch(query);
    return (resault.videos.length > 1) ? resault.videos : null
}

/*const {
    getGallery
} = require("../gallery");*/

const lyricsFinder = require("lyrics-finder");

const {
    exec
} = require("child_process");
const illegalChars = [
    "|",
    "?",
    "*",
    "<",
    ">",
    "/",
    `"`,
    ":"
]

minimiseButton.onclick = () => {
    ipcRenderer.send("minimise-button-add");
}

fullscreenButton.onclick = () => {
    ipcRenderer.send("fullscreen-button-add");
}

closeButton.onclick = () => {
    ipcRenderer.send("close-button-add")
}

form.onsubmit = async (event) => {
    event.preventDefault();
    downloadSong();
}

function downloadSong() {
    const url = downloadURL.value;
    if (!url) return;
    downloadURL.value = "";

    download(url);
}

let savesPath = "";
let musicFolder = "";
let settings = {};
let pathConfig = "random";

ipcRenderer.send("getFolder");

ipcRenderer.on("savesFolder", (event, data) => {
    savesPath = data;
    musicFolder = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8");
    settings = JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8"));
    /*getGallery(musicFolder).then(songs => {
        let options = songs.folders.map(folder => `<option value=${folder}>${folder}</option>`).join('\n');

        options += `<option value="use default">use default</option>`

        selectedFolder.innerHTML = options;
    });*/
});

let toDownload = 0;
let downloaded = 0;
let errored = 0;

/**
 * 
 * @param {string} url 
 * @returns 
 */
async function download(url) {
    if(!fs.existsSync(musicFolder)) return status.innerText = "please choose a folder then restart this window to be able to download songs\n";
    
    if (url.match(/^https?:\/\/(www.youtube.com|youtube.com)\/playlist(.*)$/)) {
        const playlist = await youtube.getPlaylist(url);
        const videos = await playlist.getVideos();

        await fs.mkdirSync(`${musicFolder}/${changeName(playlist.title)}`);
        let index = 0
        toDownload += videos.length;
        
        for (const video of videos) {
            let video2
            try {
                video2 = await ytdl.getInfo(video.url)
                await downloadAudio({
                    url: video2.videoDetails.video_url,
                    title: `${++index}- ${video2.videoDetails.title}`
                }, true, changeName(playlist.title));
            } catch (error) {
                console.warn(`an error happened\n${error}`);
                status.innerText = `an error happened\n${error}\n`;
                errored++;
            }
        } 
        report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
    } else if (ytdl.validateURL(url)) {
        const video = await ytdl.getInfo(url);

        await downloadAudio({
            url: video.videoDetails.video_url,
            title: video.videoDetails.title
        })
        toDownload += 1;
        report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
    } else {
        const videos = await videoFinder(url);
        list.innerHTML = "";

        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            //make a list item with the video name and a button to download it
            let li = document.createElement("li");
            let btn = document.createElement("button");
            let btn2 = document.createElement("button");
            let btn3 = document.createElement("button");
            let name = document.createElement("label");
            let br = document.createElement("br");
            let img = document.createElement("img");
            let br2 = document.createElement("br");

            btn.innerText = "Download";
            btn.id = `${i}download`;
            btn.className = "px-3 py-[0.7] text-sm text-blue-600 font-semibold rounded-full border border-blue-200 hover:text-white hover:bg-blue-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            
            btn2.innerText = "Stream";
            btn2.id = `${i}stream`;
            btn2.className = "px-3 py-[0.7] text-sm text-blue-600 font-semibold rounded-full border border-blue-200 hover:text-white hover:bg-blue-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"

            btn3.innerText = "Open";
            btn3.id = `${i}open`;
            btn3.style.visibility = "hidden";

            btn3.onclick = () => {
                shell.openExternal(video.url);
            }

            name.innerText = `[${video.timestamp}]${video.title}`;
            name.htmlFor = `${i}download`;
            name.style.cursor = "pointer";

            img.src = video.thumbnail;

            img.style.cursor = "pointer";

            img.onclick = () => {
                list.innerHTML = "";
                downloadAudio({
                    url: video.url,
                    title: video.title
                })
                toDownload += 1;
                report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
            }

            img.loading = "lazy";
            
            btn.onclick = () => {
                list.innerHTML = "";
                downloadAudio({
                    url: video.url,
                    title: video.title
                })
                toDownload += 1;
                report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
            }

            btn.oncontextmenu = () => {
                ipcRenderer.send("context-downloader", i);
            }

            img.oncontextmenu = () => {
                ipcRenderer.send("context-downloader", i);
            }

            name.oncontextmenu = () => {
                ipcRenderer.send("context-downloader", i);
            }

            btn2.onclick = () => {
                ipcRenderer.send("stream", {
                    url: `http://195.201.26.179:5050/stream?url=${video.url}`,
                    title: video.title,
                    youtube: video.url
                });
            }
            
            li.appendChild(name);
            li.appendChild(btn);
            li.appendChild(btn2);
            li.appendChild(btn3);
            li.appendChild(br2);
            li.appendChild(img);
            li.appendChild(br);

            list.appendChild(li);
        }
    }
}


ipcRenderer.on("download", (event, args) => {
    document.getElementById(`${args}download`).click();
})

ipcRenderer.on("stream", (event, args) => {
    document.getElementById(`${args}stream`).click();
})

ipcRenderer.on("download-to", (event, args) => {
    console.log(args);
    pathConfig = args.path
    document.getElementById(`${args.number}download`).click();
})

ipcRenderer.on("open-link", (event, args) => {
    document.getElementById(`${args}open`).click();
})

/**
 * @param {string} realname 
 * @returns {string} an edited title that code loves
 */
function changeName(realname) {
    for (let i = 0; i < illegalChars.length; i++) {
        realname = realname.split(illegalChars[i]).join("");
    }

    return realname.split(/ +/g).join(" ");
}

/**
 * a function that starts the video download and make it into an mp3 file
 * if it's a playlist the videos will be put inside a folder with the playlist name
 * and a numeric order for the playlist videos
 * @param {{url: string, title: string}} video 
 * @param {boolean} playlist
 * @param {string} plname
 */
async function downloadAudio({
    url,
    title
}, playlist = false, plname = null) {
    let thepath = "";
    let path2 = "";
    if(pathConfig === "random"){
        thepath = playlist ? path.join(musicFolder, plname, `${changeName(title)}.mp4`) : path.join(musicFolder, `${changeName(title)}.mp4`);
        path2 = playlist ? path.join(musicFolder, plname, `${changeName(title)}.mp3`) : path.join(musicFolder, `${changeName(title)}.mp3`);
    }else{
        thepath = playlist ? path.join(musicFolder, plname, `${changeName(title)}.mp4`) : path.join(musicFolder, pathConfig, `${changeName(title)}.mp4`);
        path2 = playlist ? path.join(musicFolder, plname, `${changeName(title)}.mp3`) : path.join(musicFolder, pathConfig, `${changeName(title)}.mp3`);
    }
    
    if(!playlist) status.innerText += `Downloading to ${pathConfig}...\n`;

    exec("ffmpeg -version", async(error, stdout, stderr) => {
        console.log("Tring to get ffmpeg")

        console.log(stdout)
        console.log(stderr)

        if (stderr) {
            console.log("ffmpeg not found");

            status.innerText += `ffmpeg not found trying to download via the server\n`;
            status.innerHTML += `<br>it is recommended to download ffmpeg to get the faster download speeds and be able to download playlists consistently
            download ffmpeg <a href="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip">From here</a> any version works but I use this\n`

            const file = fs.createWriteStream(path2);

            http.get(`http://195.201.26.179:5050/download?url=${url}`, function(response) {
                response.pipe(file);

                response.on("open", () => {
                    status.innerText += `downloading ${title}\n`;
                });

                // after download completed close filestream
                file.on("finish", () => {
                    file.close();
                    status.innerText += `downloaded: ${title}.\n`;
                    console.log("Download Completed");
                    if(settings["search"].status)
                        searchLyrics(title, fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8"));

                    downloaded++;
                    if((downloaded + errored) === toDownload) 
                        status.innerText += `Download complete.\nDownloaded: ${downloaded} out of ${toDownload}\nErrors: ${errored}\n`;

                    report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
                });
            }).on("error", (err) => {
                status.innerText += err;
                errored++;
                if((downloaded + errored) === toDownload) 
                    status.innerText += `Download complete.\nDownloaded: ${downloaded} out of ${toDownload}\nErrors: ${errored}\n`;

                report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
            });
    
            return;
        }else{
            await ytdl(url, {
                filter: "audioonly",
                quality: "highestaudio"
            })
            .pipe(
                fs.createWriteStream(thepath)
                .on("ready", () => {
                    console.log(`downloading: ${title}...`);
                    status.innerText += `downloading: ${title}...\n`;
                })
                .on("finish", () => {
                    console.log(`downloaded: ${title}.`);
                    status.innerText += `downloaded: ${title}.\n`;
                    exec(`ffmpeg -i "${thepath}" "${path2}"`, (err, sout, serr) => {
                        if (err) console.error(err);
                        console.log("converted the file with the right metadata");
                        status.innerText += "converted the file with the right metadata\n";
                        fs.rm(thepath, (err) => {
                            if (err) return console.error(`there was an error with deleting the file ${thepath}\n${err.message}\n`);
                            status.innerText += `${title} was deleted successfully and replaced with the mp3 file\n(basically the file was converted)\n`;
                            console.log(`${title} was deleted successfully and replaced with the mp3 file`);
                            if(settings["search"].status)
                                searchLyrics(title, fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8"));

                            downloaded++;
                            if((downloaded + errored) === toDownload) 
                                status.innerText += `Download complete.\nDownloaded: ${downloaded} out of ${toDownload}\nErrors: ${errored}\n`;

                            report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
                        })
                    })
                })
                .on("error", (err) => {
                    console.error(`there was an error while downloading ${title}\n${err}`)
                    status.innerText += `\nthere was an error while downloading ${title}\n${err}\n`

                    errored++;
                    if((downloaded + errored) === toDownload)
                        status.innerText += `Download complete.\nDownloaded: ${downloaded} out of ${toDownload}\nErrors: ${errored}\n`;

                    report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
                })
            );
        }
    });
}

function searchLyrics(title, lyricsFolder){
    console.log(`searching for lyrics for ${title}`);
    status.innerText += `searching for lyrics for ${title}\n`;

    lyricsFinder("", title)
    .then(lyrics => {
        if (lyrics) {
            console.log(`found lyrics for ${title}`);
            status.innerText += `found lyrics for ${title}\n`;
            fs.writeFileSync(path.join(lyricsFolder, `${changeName(title)}.txt`), lyrics);
            status.innerText += `lyrics for ${title} was saved\n`;
        } else {
            console.log(`couldn't find lyrics for ${title}`);
            status.innerText += `couldn't find lyrics for ${title}\n`;
        }
    }).catch(err => {
        console.error(err);
        status.innerText += `${err}\n`;
    })
}