const fs = require("fs");
const path = require("path");
const {
    promisify
} = require("util")
const readdir = promisify(fs.readdir);

async function getGallery(defolder) {
    /**
     * @type {{folders: string[], playlists: {string: [{name: string, location: string}]}}}
     */
    let all = {
        folders: [],
        playlists: []
    };
    const files = await readdir(defolder, {
        withFileTypes: true
    })

    /**
     * 
     * @param {string} file 
     * @returns {boolean}
     */
     const filter = (file) => {
        return file.endsWith(".mp3") ||
        file.endsWith(".flac") ||
        file.endsWith(".m4a") ||
        file.endsWith(".wav") ||
        file.endsWith(".ogg")
    }

    let mp3files = files.filter(f => f.isFile() && filter(f.name)).map(f => f.name);
    let folders = files.filter(f => f.isDirectory() && !f.name.startsWith(".")).map(f => f.name);

    all.folders = folders;

    /**
     * @type {{string: [{name: string, location: string}]}}
     */
    let songsMap = {};
    const basepath = path.parse(defolder).base;
    songsMap[basepath] = mp3files.map(file => {
        return {
            name: file,
            location: path.join(defolder, file)
        }
    });

    for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        const songs = await readdir(`${defolder}/${folder}`)
        let realSongs = songs.filter(f => filter(f));
        let realSongsSorted = realSongs.sort(function (a, b) {
            return a.localeCompare(b, undefined, {
                numeric: true,
                sensitivity: 'base'
            });
        });
        if (realSongsSorted) songsMap[folder] = realSongsSorted.map(file => {
            return {
                name: file,
                location: path.join(defolder, folder, file)
            }
        });
    }

    all.playlists = songsMap;
    all.folders.push(basepath);

    return all;
}

async function getFolders(defolder){
    const files = await readdir(defolder, {
        withFileTypes: true
    })

    let folders = files.filter(f => f.isDirectory() && !f.name.startsWith(".")).map(f => f.name);
    const basepath = path.parse(defolder).base;

    return [...folders, basepath];

}

module.exports = {
    getGallery,
    getFolders
};