

import { showPopout } from "../hooks/imagepopouttochat.js"
import DSK from "./config.js"
import DSKUtility from "./dsk_utility.js"
import { showPatchViewer } from "./migrator.js"
import RuleChaos from "./rule_chaos.js"

export default class DSKChatListeners {
    static chatListeners(html) {
        html.on('click', '.openJournalBrowser', () => game.dsk.apps.journalBrowser.render(true))
        let helpButton = $('<a class="button showHelp" data-tooltip="dsk.HELP.showHelp"><i class="fas fa-question"></i></a>')
        helpButton.click(() => { DSKChatListeners.getHelp() })
        $(html.find('.control-buttons')).prepend(helpButton)
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
        let effect = CONFIG.statusEffects.find(x => x.id == id)
        let msg = `<h2><a class="chat-condition chatButton" data-id="${id}"><img class="sender-image" style="background-color:black;margin-right: 8px;" src="${effect.icon}"/>${game.i18n.localize(effect.label)}</h2></a><p>${game.i18n.localize(effect.description)}</p>`
        ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
    }

    static getHelp() {
            let msg = DSK.helpContent.map(x => `<h2>${game.i18n.localize(`dsk.HELP.${x.name}`)}</h2>
            <p><b>${game.i18n.localize("dsk.HELP.command")}</b>: ${x.command}</p>
            <p><b>${game.i18n.localize("dsk.HELP.example")}</b>: ${x.example}</p>
            <p><b>${game.i18n.localize("dsk.description")}</b>: ${game.i18n.localize(`dsk.HELP.descr${x.name}`)}`).join("") + `<br>
            <p>${game.i18n.localize("dsk.HELP.default")}</p>`
        ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
    }

    static showConditions(){
        let effects = duplicate(CONFIG.statusEffects).map(x => {
            x.label = game.i18n.localize(x.label)
            return x
        }).sort((a, b) => { return a.label.localeCompare(b.label) })
        let msg = effects.map(x => `<a class="chat-condition chatButton" data-id="${x.id}"><img src="${x.icon}"/>${x.label}</a>`).join(" ")
        ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
    }

    static async check3D20(target, skill, options = {}){
        let attrs = 12
        if(target){
            target = target.get(0)
            skill = await DSKUtility.skillByName(target.textContent)
            if(target.dataset.attrs) attrs = target.dataset.attrs.split("|")
        }else if(skill){
            skill = await DSKUtility.skillByName(skill)
        }
        if(skill) skill= skill.toObject()

        if(!skill){
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

    static async showTables(){
        const msg = await renderTemplate('systems/dsk/templates/tables/systemtables.html', {tables: DSK.systemTables})
        ChatMessage.create(DSKUtility.chatDataSetup(msg, "roll"))
    }
}