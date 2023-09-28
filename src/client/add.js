const form = document.getElementById("form");
const downloadURL = document.getElementById("yt-link");
const list = document.getElementById("list")
const status = document.getElementById("status");
const percent = document.getElementById("percent");
/**
 * @type {HTMLSelectElement}
 */
const folderTo = document.getElementById("folder");

const minimiseButton = document.getElementById("minimise-button");
const fullscreenButton = document.getElementById("fullscreen-button");
const closeButton = document.getElementById("close-button");

const report = document.getElementById("report");

//const Mutex = require("async-mutex").Mutex;
//const FFmpeg = require("@ffmpeg/ffmpeg/dist/ffmpeg.min");
const ytdl = require("@distube/ytdl-core");
const ID3Writer = require("browser-id3-writer");

//const {
//    createFFmpeg
//} = FFmpeg;
//const ffmpeg = createFFmpeg({
//    log: true,
//    logger: () => {}, // console.log,
//    progress: () => {}, // console.log,
//});
//const ffmpegMutex = new Mutex();

const {
    shell,
    ipcRenderer,
    nativeImage,
    clipboard,
    NativeImage
} = require("electron");

const fs = require("fs");
const path = require("path");
//const selectedFolder = document.getElementById("folders");

const ytfps = require('ytfps');

const ytsearch = require("yt-search");
const videoFinder = async (query) => {
    const resault = await ytsearch(query);
    return (resault.videos.length > 1) ? resault.videos : null
}

const {
    getFolders
} = require("../gallery");

// const lyricsFinder = require("lyrics-finder");
const Genius = require("genius-lyrics");
const genius = new Genius.Client();

const {
    execSync, exec
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

downloadURL.oncontextmenu = () => {
    const copied = clipboard.readText("clipboard");
    downloadURL.value += copied;
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
let folders = [];

ipcRenderer.send("getFolder");

ipcRenderer.on("savesFolder", (event, data) => {
    savesPath = data;
    musicFolder = fs.readFileSync(path.join(savesPath, "folder.txt"), "utf-8");
    settings = JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8"));
    getFolders(musicFolder).then(deFolders => {
        folders = deFolders;
        folderTo.innerHTML = deFolders.map(folder => `<option>${folder}</option>`).join("\n");
        folderTo.selectedIndex = deFolders.indexOf(path.parse(musicFolder).base);
    })
});

let pathConfig = path.parse(musicFolder).base;
let toDownload = 0;
let downloaded = 0;
let errored = 0;

let toDownloadVideos = new Map();

/**
 * 
 * @param {string} url 
 * @returns 
 */
async function download(url) {
    if (!fs.existsSync(musicFolder)) return addStatus("please choose a folder then restart this window to be able to download songs");

    if (url.match(/^https?:\/\/(www.youtube.com|music.youtube.com|youtube.com)\/playlist(.*)$/)) {
        const playlist = await ytfps(url)
        await fs.mkdirSync(`${musicFolder}/${changeName(playlist.title)}`);

        let index = 0;
        let index2 = 0;
        toDownload += playlist.video_count;
        for (const video of playlist.videos) {
            try {
                toDownloadVideos.set(`${++index2}- ${video.title}`, 0);
                report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
                await downloadAudio({
                    url: video.url,
                    title: `${++index}- ${video.title}`,
                    thumbnail: video.thumbnail_url,
                    artist: video.author.name,
                    originalTitle: video.title,
                    album: playlist.title
                }, true, changeName(playlist.title));
            } catch (error) {
                console.warn(`an error happened\n${error}`);
                addStatus(`an error happened\n${error}`);
                errored++;
                report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
            }
        }
    } else if (ytdl.validateURL(url)) {
        const video = await ytdl.getInfo(url);
        
        toDownload += 1;
        report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
        
        await downloadAudio({
            url: video.videoDetails.video_url,
            title: video.videoDetails.title,
            thumbnail: video.videoDetails.thumbnails[3].url,
            artist: video.videoDetails.author.name,
            originalTitle: video.videoDetails.title,
            album: video.videoDetails.videoId
        })
    } else {
        const videos = await videoFinder(url);
        list.innerHTML = "";
        ipcRenderer.send("resetResults");

        for (let i = 0; i < videos.length; i++) {
            const video = videos[i];
            //make a list item with the video name and a button to download it
            let li = document.createElement("li");
            let btn = document.createElement("button");
            // let btn2 = document.createElement("button");
            let btn3 = document.createElement("button");
            let name = document.createElement("label");
            let br = document.createElement("br");
            let img = document.createElement("img");
            let br2 = document.createElement("br");

            btn.innerText = "Download";
            btn.id = `${i}download`;
            btn.className = "px-3 py-[0.7] text-sm text-blue-600 font-semibold rounded-full border border-blue-200 hover:text-white hover:bg-blue-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"

            // btn2.innerText = "Stream";
            // btn2.id = `${i}stream`;
            // btn2.className = "px-3 py-[0.7] text-sm text-blue-600 font-semibold rounded-full border border-blue-200 hover:text-white hover:bg-blue-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"

            btn3.innerText = "Open";
            btn3.id = `${i}open`;
            //btn3.style.visibility = "hidden";
            btn3.style.display = "none";

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

                toDownload += 1;
                report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;

                downloadAudio({
                    url: video.url,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    artist: video.author.name,
                    originalTitle: video.title,
                    album: video.videoId
                })
            }

            img.loading = "lazy";

            btn.onclick = () => {
                list.innerHTML = "";

                toDownload += 1;
                report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
                
                downloadAudio({
                    url: video.url,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    artist: video.author.name,
                    originalTitle: video.title,
                    album: video.videoId
                })
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

            // btn2.onclick = () => {
            //     ipcRenderer.send("stream", {
            //         url: `http://195.201.26.179:5050/stream?url=${video.url}`,
            //         title: video.title,
            //         youtube: video.url,
            //         image: video.thumbnail
            //     });
            // }

            li.appendChild(name);
            li.appendChild(btn);
            // li.appendChild(btn2);
            li.appendChild(btn3);
            li.appendChild(br2);
            li.appendChild(img);
            li.appendChild(br);

            list.appendChild(li);

            ipcRenderer.send("searchResult", {
                title: video.title,
                timestamp: video.timestamp,
                thumbnail: video.thumbnail,
                i
            });
        }

        
    }
}

ipcRenderer.on("search", (event, arg) => {
    // console.log(arg);
    pathConfig = arg.pathConfig;
    download(arg.url);
})

exec("ffmpeg -version", (error, stdout, stderr) => {
    if (stderr) {
        addStatus("ffmpeg not found downloading without conversion");
    } else {
        addStatus("ffmpeg found downloading with conversion and metadata");
    }
})

ipcRenderer.on("download", (event, args) => {
    document.getElementById(`${args}download`).click();
})

// ipcRenderer.on("stream", (event, args) => {
//     document.getElementById(`${args}stream`).click();
// })

ipcRenderer.on("download-to", (event, args) => {
    console.log(args);
    pathConfig = args.path;
    folderTo.selectedIndex = folders.indexOf(args.path);
    document.getElementById(`${args.number}download`).click();
})

folderTo.onchange = (ev) => {
    pathConfig = folders[folderTo.selectedIndex];
    console.log(pathConfig);
}

ipcRenderer.on("open-link", (event, args) => {
    document.getElementById(`${args}open`).click();
})

/**
 * @param {string} realname 
 * @returns {string} an edited title that operating systems love
 */
function changeName(realname) {
    for (let i = 0; i < illegalChars.length; i++) {
        realname = realname.split(illegalChars[i]).join("");
    }

    return realname.split(/ +/g).join(" ");
}

/**
 * 
 * @param {NativeImage} image 
 * @returns 
 */
const cropMaxWidth = (image) => {
    const imageSize = image.getSize();
    if (imageSize.width > imageSize.height) {
        return image.crop({
            x: parseInt((imageSize.width - imageSize.height) / 2),
            y: 0,
            width: imageSize.height,
            height: imageSize.height
        });
    }else{
        return image;
    }
}

/**
 * 
 * @param {string} src 
 * @returns {nativeImage}
 */
const getImage = async (src) => {
    const result = await fetch(src);
    const buffer = Buffer.from(await result.arrayBuffer());
    const output = nativeImage.createFromBuffer(buffer);
    if (output.isEmpty() && !src.endsWith(".jpg") && src.includes(".jpg")) {
        return getImage(src.slice(0, src.lastIndexOf(".jpg") + 4));
    } else {
        return output;
    }
};

/**
 * a function that starts the video download and make it into an mp3 file
 * if it's a playlist the videos will be put inside a folder with the playlist name
 * and a numeric order for the playlist videos
 * @param {{url: string, title: string, thumbnail: string, artist: string, originalTitle: string, album: string}} video 
 * @param {boolean} playlist
 * @param {string} plname
 */
async function downloadAudio({
    url,
    title,
    thumbnail,
    artist,
    originalTitle,
    album
}, playlist = false, plname = null) {
    let thepath = "";
    //const releaseFFmpegMutex = await ffmpegMutex.acquire();
    //let path2 = "";
    /*if (pathConfig === "random") {
        thepath = playlist ? path.join(musicFolder, plname, `${changeName(title)}.mp4`) : path.join(musicFolder, `${changeName(title)}.mp4`);
        path2 = playlist ? path.join(musicFolder, plname, `${changeName(title)}.mp3`) : path.join(musicFolder, `${changeName(title)}.mp3`);
    } else {
        thepath = playlist ? path.join(musicFolder, plname, `${changeName(title)}.mp4`) : path.join(musicFolder, pathConfig, `${changeName(title)}.mp4`);
        path2 = playlist ? path.join(musicFolder, plname, `${changeName(title)}.mp3`) : path.join(musicFolder, pathConfig, `${changeName(title)}.mp3`);
    }*/
    if (pathConfig === path.parse(musicFolder).base) {
        thepath = playlist ? path.join(musicFolder, plname) : musicFolder;
    } else {
        thepath = playlist ? path.join(musicFolder, plname) : path.join(musicFolder, pathConfig);
    }

    if (!playlist) addStatus(`Downloading to ${pathConfig}...`);
    let videoReadableStream;
    try {
        videoReadableStream = ytdl(url, {
            filter: "audioonly",
            quality: "highestaudio",
            highWaterMark: 32 * 1024 * 1024, // 32 MB
            requestOptions: { maxRetries: 3 },
        });
    } catch (err) {
        addStatus(`An error happened:\n${err}`);
        errored++;
        report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
        return;
    }

    const originalPath = path.join(thepath, changeName(title) + ".temp");
    const outPath = path.join(thepath, changeName(title) + ".mp3");

    let bitrate = "";
    const chunks = [];
    videoReadableStream
        .on("data", (chunk) => {
            chunks.push(chunk);
        })
        .on("progress", (_chunkLength, downloaded, total) => {
            const ratio = downloaded / total;
            const progress = Math.floor(ratio * 100);
            if (!playlist) {
                percent.innerText = `${title}: ${progress}%`
            } else {
                percent.innerText = ""
                toDownloadVideos.set(title, progress);
                toDownloadVideos.forEach((videoProgress, title) => {
                    percent.innerText += `${title}: ${videoProgress}%\n`
                })
            }
            ipcRenderer.send("percent", percent.innerText);
        })
        .on("info", (info, format) => {
            console.log(
                "Downloading video - name:",
                title,
                "- quality:",
                format.audioBitrate + "kbits/s"
            );
            bitrate = `${format.audioBitrate}k`
        })
        .on("error", err => {
            addStatus(`An error happened while downloading: ${title}\n${err.name}: ${err.message}`);
            errored++;
            report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
        })
        .on("end", async () => {
            exec("ffmpeg -version", async (error, stdout, stderr) => {
                console.log("Tring to get ffmpeg")

                console.log(stdout)
                console.log(stderr)

                if (stderr) {
                    const buffer = Buffer.concat(chunks);
                    try {
                        fs.writeFileSync(originalPath, buffer)

                        let fileBuffer = fs.readFileSync(originalPath);

                        const songMetadata = {
                            title: originalTitle,
                            artist: artist,
                            image: cropMaxWidth(await getImage(thumbnail)),
                            album: album
                        }

                        try {
                            const coverBuffer = songMetadata.image && !songMetadata.image.isEmpty() ?
                                songMetadata.image.toPNG() : null;

                            const writer = new ID3Writer(fileBuffer);

                            // Create the metadata tags
                            writer
                                .setFrame("TIT2", songMetadata.title)
                                .setFrame("TPE1", [songMetadata.artist])
                                .setFrame("TALB", songMetadata.album);
                            if (coverBuffer) {
                                writer.setFrame("APIC", {
                                    type: 3,
                                    data: coverBuffer,
                                    description: ""
                                });
                            }

                            writer.addTag();
                            fileBuffer = Buffer.from(writer.arrayBuffer);
                        } catch (error) {
                            console.error(error);
                        }

                        fs.writeFileSync(outPath, fileBuffer);
                    } catch (error) {
                        console.log(e);
                        errored++;
                        addStatus(e);
                        report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
                    } finally {
                        downloaded++;
                        report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
                        fs.rmSync(originalPath)
                        addStatus(`${title} has been downloaded`);
                        toDownloadVideos.clear();
                        if (settings["search"].status)
                            searchLyrics(originalTitle, fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8"));
                    }
                } else {
                    const buffer = Buffer.concat(chunks);
                    try {
                        //if (!ffmpeg.isLoaded()) { 
                        //    await ffmpeg.load();
                        //}

                        //ffmpeg.FS("writeFile", changeName(title), buffer);

                        fs.writeFileSync(originalPath, buffer)

                        addStatus(`converting ${title}`);
                        const metadata = `-metadata title="${changeName(originalTitle)}" -metadata artist="${artist}"`
                        //await ffmpeg.run(
                        //    "-i",
                        //    changeName(title),
                        //    changeName(title) + ".mp3"
                        //);

                        execSync(`ffmpeg -i "${originalPath}" ${metadata} -b:a ${bitrate} "${outPath}"`)

                        let fileBuffer = fs.readFileSync(outPath);

                        const songMetadata = {
                            title: originalTitle,
                            artist: artist,
                            image: cropMaxWidth(await getImage(thumbnail)),
                            album: album
                        }

                        try {
                            const coverBuffer = songMetadata.image && !songMetadata.image.isEmpty() ?
                                songMetadata.image.toPNG() : null;

                            const writer = new ID3Writer(fileBuffer);

                            // Create the metadata tags
                            writer
                                .setFrame("TIT2", songMetadata.title)
                                .setFrame("TPE1", [songMetadata.artist])
                                .setFrame("TALB", songMetadata.album);
                            if (coverBuffer) {
                                writer.setFrame("APIC", {
                                    type: 3,
                                    data: coverBuffer,
                                    description: ""
                                });
                            }

                            writer.addTag();
                            fileBuffer = Buffer.from(writer.arrayBuffer);
                        } catch (error) {
                            console.error(error);
                        }

                        fs.writeFileSync(outPath, fileBuffer);

                    } catch (e) {
                        console.log(e);
                        errored++;
                        addStatus(e);
                        report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
                    } finally {
                        downloaded++;
                        report.innerText = `Done: ${downloaded}, Error: ${errored}, Total: ${downloaded + errored}, of: ${toDownload}`;
                        fs.rmSync(originalPath)
                        addStatus(`${title} has been downloaded`);
                        toDownloadVideos.clear();
                        if (settings["search"].status)
                            if(!playlist)
                                searchLyrics(originalTitle, fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8"));
                            else
                                searchLyrics(originalTitle, fs.readFileSync(path.join(savesPath, "lyrics.txt"), "utf-8"), title)
                    }
                }
            });
        })
}

async function searchLyrics(title, lyricsFolder, fileTitle) {
    console.log(`searching for lyrics for ${title}`);
    addStatus(`searching for lyrics for ${title}`);

    // lyricsFinder("", title)
    //     .then(lyrics => {
    //         if (lyrics) {
    //             console.log(`found lyrics for ${title}`);
    //             addStatus(`found lyrics for ${title}`);
    //             fs.writeFileSync(path.join(lyricsFolder, fileTitle ? `${changeName(fileTitle)}.txt` : `${changeName(title)}.txt`), lyrics);
    //             addStatus(`lyrics for ${title} was saved`);
    //         } else {
    //             console.log(`couldn't find lyrics for ${title}`);
    //             addStatus(`couldn't find lyrics for ${title}`);
    //         }
    //     }).catch(err => {
    //         console.error(err);
    //         addStatus(err);
    //     })

    try{
        const song = await genius.songs.search(title);
        const lyrics = await song[0].lyrics(false)

        console.log(`found lyrics for ${title}`);
        addStatus(`found lyrics for ${title}`);
        fs.writeFileSync(path.join(lyricsFolder, fileTitle ? `${changeName(fileTitle)}.txt` : `${changeName(title)}.txt`), lyrics);
        addStatus(`lyrics for ${title} was saved`);
    }catch (e) {
        console.log(e);
        addStatus(err);
    }
}

function addStatus(statement) {
    status.innerText += statement + "\n";
    ipcRenderer.send("addStatus", statement);
}