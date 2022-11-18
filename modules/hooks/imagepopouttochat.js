import DSKUtility from "../system/dsk_utility.js";

export function initImagePopoutTochat(){
    Hooks.on("getImagePopoutHeaderButtons", (app, buttons) => {
        buttons.unshift({
            class: "posttochat",
            icon: `fas fa-comment`,
            onclick: async() => postImage(app)
        })
    })
}

async function postImage(app){
    const image  = app.object
    const template = await renderTemplate("systems/dsk/templates/chat/imagetochat.html", {image})
    ChatMessage.create(DSKUtility.chatDataSetup(template));
}

export function showPopout(ev){
    const dataset = ev.currentTarget.dataset
    DSKUtility.showArtwork(dataset, false)
}