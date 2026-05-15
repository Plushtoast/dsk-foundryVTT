import { showPopout } from "../hooks/imagepopouttochat.js"
import DSK from "./config.js"
import DSKUtility from "./dsk_utility.js"
import { showPatchViewer } from "./migrator.js"
import RuleChaos from "./rule_chaos.js"
const { duplicate } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;

export default class DSKChatListeners {
    static chatListeners(html) {
        html.on('click', '.openJournalBrowser', () => game.dsk.apps.journalBrowser.render(true))
        const helpButton = $(`<button type="button" class="ui-control icon fas fa-question" data-tooltip="dsk.HELP.showHelp" aria-label="Help"></button>`);
        helpButton.on('click', () => DSKChatListeners.getHelp());
        html.find('.control-buttons').prepend(helpButton);
        html.on('click', '.showPatchViewer', () => showPatchViewer())
        html.on('click', '.functionswitch', (ev) => RuleChaos[ev.currentTarget.dataset.function](ev))
        html.on('click', '.panToToken', ev => DSKChatListeners.panToToken(ev))
        html.on('click', '.popoutImage', ev => showPopout(ev))
    }

    static async panToToken(ev) {
        const token = await fromUuid(ev.currentTarget.dataset.uuid)
        if (!token) return

        canvas.animatePan({ x: token.x, y: token.y });

        if (!token.isOwner) return

        token.object.control({ releaseOthers: true });
    }

    static postStatus(id) {
        let effect = CONFIG.statusEffects[id]
        let msg = `<h2><a class="chat-condition chatButton" data-id="${id}"><img class="sender-image" style="background-color:black;margin-right: 8px;" src="${effect.img}"/>${_loc(effect.name)}</h2></a><p>${_loc(effect.description)}</p>`
        ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
    }

    static getHelp() {
        let msg = DSK.helpContent.map(x => `<h2>${_loc(`dsk.HELP.${x.name}`)}</h2>
            <p><b>${_loc("dsk.HELP.command")}</b>: ${x.command}</p>
            <p><b>${_loc("dsk.HELP.example")}</b>: ${x.example}</p>
            <p><b>${_loc("dsk.description")}</b>: ${_loc(`dsk.HELP.descr${x.name}`)}`).join("") + `<br>
            <p>${_loc("dsk.HELP.default")}</p>`
        ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
    }

    static showConditions() {
        let effects = duplicate(Object.values(CONFIG.statusEffects)).map(x => {
            x.name = _loc(x.name)
            return x
        }).sort((a, b) => { return a.name.localeCompare(b.name) })
        let msg = effects.map(x => `<a class="chat-condition chatButton" data-id="${x.id}"><img src="${x.img}"/>${x.name}</a>`).join(" ")
        ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
    }

    static async check3D20(target, skill, options = {}) {
        let attrs = 12
        if (target) {
            target = target.get(0)
            skill = await DSKUtility.skillByName(target.textContent)
            if (target.dataset.attrs) attrs = target.dataset.attrs.split("|")
        } else if (skill) {
            skill = await DSKUtility.skillByName(skill)
        }
        if (skill) skill = skill.toObject()

        if (!skill) {
            skill = {
                name: "2d20",
                type: "skill",
                system: {
                    "level": 0,
                    "characteristic1": "mu",
                    "characteristic2": "kl",
                    "encumbers": "no"
                }
            }
        }

        const actor = await DSKUtility.emptyActor(attrs)
        actor.setupSkill(skill, options, "emptyActor").then(setupData => {
            actor.basicTest(setupData)
        })
    }

    static async showTables() {
        const msg = await renderTemplate('systems/dsk/templates/tables/systemtables.hbs', { tables: DSK.systemTables })
        ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
    }
}