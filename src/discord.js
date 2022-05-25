const RPC = require("discord-rpc");
const client = new RPC.Client({
    transport: "ipc"
});

client.on("ready", () => {
    console.log("the rpc client is ready to work")
})

const fs = require("fs");
const path = require("path");

const {app} = require("electron")

const savesPath = path.join(app.getPath("userData"), "saves");
const activate = JSON.parse(fs.readFileSync(path.join(savesPath, "settings.json"), "utf-8")).discord.status;

function discordLogin(){
    if (activate === "1") {
        try {
            client.login({
                clientId: "967112565656260619"
            })
        } catch {
            setTimeout(() => {
                client.login({
                    clientId: "967112565656260619"
                })
            }, 5000);
        }
    }
}

/**
 * 
 * @param {string} songname 
 * @param {string} playlist 
 */
function changeActivity(songname, playlist) {
    if (activate === "1") {
        const activity = {
            state: `${songname.replace(".mp3", "").replace(".flac", "")}`,
            details: `${playlist}`,
            largeImageKey: "discord",
            instance: true
        };

        client.setActivity(activity).then(console.log(`the activity changed for ${client.user.username}`)).catch(e => console.error(e))
    }
}

function stopActivity() {
    if (activate === "1") {
        client.clearActivity().then(console.log("cleared the user activity")).catch(e => console.error(e));
    }
}

module.exports = {
    changeActivity,
    stopActivity,
    discordLogin
}