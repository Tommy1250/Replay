var socket = io({
    auth: {
        site: "add"
    }
});

const form = document.getElementById("form");
const downloadURL = document.getElementById("yt-link");
const list = document.getElementById("list")
const statusText = document.getElementById("status");
const percent = document.getElementById("percent");
/**
 * @type {HTMLSelectElement}
 */
const folderTo = document.getElementById("folder");

const report = document.getElementById("report");

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

let pathConfig = "music";
// let toDownload = 0;
// let downloaded = 0;
// let errored = 0;

/**
 * 
 * @param {string} url 
 * @returns 
 */
async function download(url) {
    socket.emit("search", url, pathConfig);
}

socket.on("resetResults", (video) => {
    list.innerHTML = "";
})

socket.on("searchResult", (video) => {
    console.log(video)

    //make a list item with the video name and a button to download it
    let li = document.createElement("li");
    let btn = document.createElement("button");
    let name = document.createElement("label");
    let br = document.createElement("br");
    let img = document.createElement("img");
    let br2 = document.createElement("br");

    btn.innerText = "Download";
    btn.className = "px-3 py-[0.7] text-sm text-blue-600 font-semibold rounded-full border border-blue-200 hover:text-white hover:bg-blue-600 hover:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"

    name.innerText = `[${video.timestamp}]${video.title}`;
    name.style.cursor = "pointer";

    img.src = video.thumbnail;

    img.style.cursor = "pointer";

    img.onclick = () => {
        list.innerHTML = "";

        // toDownload += 1;
        
        socket.emit("download", video.i, pathConfig);
    }

    img.loading = "lazy";

    btn.onclick = () => {
        list.innerHTML = "";

        // toDownload += 1;
        
        socket.emit("download", video.i, pathConfig);
    }

    li.appendChild(name);
    li.appendChild(btn);
    li.appendChild(br2);
    li.appendChild(img);
    li.appendChild(br);

    list.appendChild(li);
})

socket.on("status", (statement) => {
    statusText.innerText += statement + "\n";
})

socket.on("percent", (percentage) => {
    percent.innerText = percentage;
})

socket.emit("getFolders", deFolders => {
    console.log(deFolders);
    folderTo.innerHTML = deFolders.map(folder => `<option>${folder}</option>`).join("\n");
    folderTo.selectedIndex = folderTo.length - 1;
})

folderTo.onchange = (ev) => {
    pathConfig = folderTo[folderTo.selectedIndex].innerText;
    console.log(pathConfig);
}