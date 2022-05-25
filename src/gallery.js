const fs = require("fs");
const {
    promisify
} = require("util")
const readdir = promisify(fs.readdir);

async function getGallery(defolder) {
    /**
     * @type {{folders: string[], playlists: {string: string[]}}}
     */
    let all = {
        folders: [],
        playlists: []
    };
    const files = await readdir(defolder, {
        withFileTypes: true
    })

    let mp3files = files.filter(f => f.isFile() && f.name.endsWith(".mp3")).map(f => f.name);
    let folders = files.filter(f => f.isDirectory()).map(f => f.name);

    all.folders = folders;

    /**
     * @type {{string: string[]}}
     */
    let songsMap = {};
    songsMap["random"] = mp3files;

    for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        const songs = await readdir(`${defolder}/${folder}`)
        let realSongs = songs.filter(f => f.split(".").pop() === "mp3" || f.split(".").pop() === "flac");
        let realSongsSorted = realSongs.sort(function (a, b) {
            return a.localeCompare(b, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        });
        if (realSongsSorted) songsMap[folder] = realSongsSorted;
    }

    all.playlists = songsMap;
    all.folders.push("random");

    return all;
}

module.exports = {
    getGallery
};