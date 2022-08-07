const {
    default: axios
} = require("axios");

const {
    dialog,
    app,
    shell
} = require("electron");

const fs = require("fs");
const path = require("path");

module.exports = (savesPath) => {
    const currnet = `/Tommy1250/Replay/releases/tag/v${app.getVersion()}`

    axios.get("https://github.com/Tommy1250/Replay/releases/latest")
        .then(response => {
            console.log("got a response");
            if (response.request.path !== currnet) {
                const dialogOpts = {
                    type: 'info',
                    buttons: ['Go to download page', "Don't notify again", "Later"],
                    title: 'Update Avalable',
                    detail: 'There is an update avalable for Replay do you want to download the update?',
                    icon: path.join(__dirname, "..", "favicon.ico")
                }
                dialog.showMessageBox(dialogOpts).then((returnValue) => {
                    if (returnValue.response === 0) {
                        shell.openExternal("https://github.com/Tommy1250/Replay/releases/latest");
                        app.exit();
                    } else if (returnValue.response === 1) {
                        settings["update"].status = "0";
                        fs.writeFile(path.join(savesPath, 'settings.json'), JSON.stringify(settings), (err) => {
                            if (err) console.error(err);
                        })
                    }
                })
            }
        })
        .catch(err => {
            console.error(err)
        })
}