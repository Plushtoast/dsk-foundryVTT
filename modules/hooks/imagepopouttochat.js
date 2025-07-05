import DSKUtility from "../system/dsk_utility.js";
const { renderTemplate } = foundry.applications.handlebars;

export function initImagePopoutTochat() {
    Hooks.on('getHeaderControlsImagePopout', (app, buttons) => {
        buttons.unshift({
            action: 'posttochat',
            icon: 'fas fa-comment',
            label: 'dsk.SHEET.PostItem',
            onClick: async () => postImage(app),
        });
    });
}

async function postImage(app) {
    const image = app.options.src
    const template = await renderTemplate("systems/dsk/templates/chat/imagetochat.hbs", { image })
    ChatMessage.create(DSKUtility.chatDataSetup(template));
}

export function showPopout(ev) {
    const dataset = ev.currentTarget.dataset
    DSKUtility.showArtwork(dataset, false)
}