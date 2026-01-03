import DSKStatusEffects from "../status/status_effects.js";
import DSKChatAutoCompletion from "../system/chat_autocompletion.js";
import DSK from "../system/config.js";
import { bindImgToCanvasDragStart } from "./imgTileDrop.js";
import { tinyNotification } from "../system/view_helper.js";

export function setupJournal() {
    Hooks.on("getHeaderControlsJournalEntrySheet", (sheet, buttons) => {
        buttons.unshift({
            label: 'dsk.SHEET.increaseFontSize',
            icon: 'fas fa-arrows-up-down',
            onClick: async () => {
                increaseFontSize($(sheet.element).find('.journal-entry-pages'))
            },
        });

        if (!sheet.document.sceneNote && !sheet.document.pages.some((x) => x.sceneNote)) return;

        buttons.unshift({
            label: 'dsk.SHEET.panMapNote',
            icon: 'fas fa-map-pin',
            onClick: async () => {
                const currentPage = sheet.pageIndex;
                const pages = Array.from(sheet.document.pages);

                let doc;
                if (pages[currentPage].sceneNote) doc = pages[currentPage];
                else if (sheet.document.sceneNote) doc = sheet.document;
                else {
                    doc = pages.find((x) => x.sceneNote);
                    if (!doc) return;
                }
                canvas.notes.panToNote(doc.sceneNote);
            },
        });
    })

    Hooks.on("renderJournalEntryPageSheet", (app, jhtml, data, options) => {
        if (!app.isView) return;

        for (const child of jhtml.children) {
            const html = $(child);
            DSKChatAutoCompletion.bindRollCommands(html)
            DSKStatusEffects.bindButtons(html)
            html.find('img').on('mousedown', ev => {
                if (ev.button == 2)
                    game.dsk.apps.DSKUtility.showArtwork({
                        name: app.document.name,
                        uuid: "",
                        img: ev.currentTarget.getAttribute("src")
                    })
            })
            bindImgToCanvasDragStart(html)
        }
    })
}

export async function increaseFontSize(element) {
    new FontPicker(element).render(true);
}

function setOuterFontSize(element) {
    const index = game.settings.get("dsk", "journalFontSizeIndex")
    const size = DSK.journalFontSizes[index - 1] || 14;
    tinyNotification(game.i18n.format('dsk.CHATNOTIFICATION.fontsize', { size }))
    element.css("fontSize", `${size}px`)
}

class FontPicker extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static DEFAULT_OPTIONS = {
        window: {
            title: 'dsk.SHEET.increaseFontSize',
            icon: 'fas fa-arrows-up-down',
        },
        actions: {
            changeSize: this._changeSize,
        }
    }

    constructor(element) {
        super()
        this.connected_element = element;
    }

    static PARTS = {
        size: {
            template: 'systems/dsk/templates/dialog/fontSize.hbs',
        }
    }

    static async _changeSize(ev, target) {
        const newSize = target.dataset.size;

        if (newSize == "-1") {
            await game.settings.set('dsk', 'journalFontSizeIndex', 0);
            this.connected_element.css('fontSize', '');
            tinyNotification(game.i18n.format('dsk.CHATNOTIFICATION.fontsize', { size: 'Default ' }));
        } else {
            const newIndex = DSK.journalFontSizes.findIndex((x) => x == newSize);
            await game.settings.set('dsk', 'journalFontSizeIndex', newIndex);
            setOuterFontSize(this.connected_element);
        }
    }

    async _prepareContext(_options) {
        const data = await super._prepareContext(_options)
        data.fonts = DSK.journalFontSizes
        data.currentSize = game.settings.get('dsk', 'journalFontSizeIndex')
        return data
    }
}