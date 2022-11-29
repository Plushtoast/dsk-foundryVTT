import DSKChatAutoCompletion from "./chat_autocompletion.js"
import DSKUtility from "./dsk_utility.js"

export default class RequestRoll {
    static async requestRoll(category, name, modifier = 0) {
        const { actor, tokenId } = DSKChatAutoCompletion._getActor()

        if (actor) {
            game.user.updateTokenTargets([])
            let options = { modifier }

            switch (category) {
                case "attribute":
                    let characteristic = Object.keys(game.dsk.config.characteristics).find(
                        (key) => game.i18n.localize(game.dsk.config.characteristics[key]) == name
                    )
                    actor.setupCharacteristic(characteristic, options, tokenId).then((setupData) => {
                        actor.basicTest(setupData)
                    })
                    break
                case "regeneration":
                    actor.setupRegeneration("regenerate", options, tokenId).then((setupData) => {
                        actor.basicTest(setupData)
                    })
                    break
                default:
                    let skill = actor.items.find((i) => i.name == name && i.type == category)
                    actor.setupSkill(skill, options, tokenId).then((setupData) => {
                        actor.basicTest(setupData)
                    })
            }
        }
    }

    static showRQMessage(target, modifier = 0) {
        const mod = modifier < 0 ? ` ${modifier}` : (modifier > 0 ? ` +${modifier}` : "")
        const type = DSKChatAutoCompletion.skills.find(x => x.name == target).type
        const msg = game.i18n.format("dsk.CHATNOTIFICATION.requestRoll", { user: game.user.name, item: `<a class="roll-button request-roll" data-type="${type}" data-modifier="${modifier}" data-name="${target}"><i class="fas fa-dice"></i> ${target}${mod}</a>` })
        ChatMessage.create(DSKUtility.chatDataSetup(msg));
    }

    static async updateInformationRoll(postFunction, result, source) {
        const availableQs = result.result.qualityStep || 0
        if (availableQs > 0) {
            const item = await fromUuid(postFunction.uuid)
            const msg = [`<p><b>${item.name}</b></p>`]
            for (let i = 1; i <= availableQs; i++) {
                const qs = `qs${i}`
                if (item.system[qs]) {
                    msg.push(`<p>${item.system[qs]}</p>`)
                }
            }
            const chatData = DSKUtility.chatDataSetup(msg.join(""))
            if (postFunction.recipients.length) chatData["whisper"] = postFunction.recipients

            ChatMessage.create(chatData);
        }
    }

    static async informationRequestRoll(ev) {
        const modifier = ev.currentTarget.dataset.mod
        const uuid = ev.currentTarget.dataset.uuid
        const { actor, tokenId } = DSKChatAutoCompletion._getActor()
        if (!actor) return

        const recipientsTarget = game.settings.get("dsk", "informationDistribution")
        let recipients = []
        if (recipientsTarget == 1) {
            recipients = game.users.filter((user) => user.isGM).map((x) => x.id)
            recipients.push(game.user.id)
        } else if (recipientsTarget == 2) {
            recipients = game.users.filter((user) => user.isGM).map((x) => x.id)
        }
        const optns = { modifier, postFunction: { functionName: "game.dsk.apps.RequestRoll.updateInformationRoll", uuid, recipients } }
        let skill = actor.items.find((i) => i.name == ev.currentTarget.dataset.skill && i.type == "skill")
        actor.setupSkill(skill, optns, tokenId).then(async(setupData) => {
            setupData.testData.opposable = false
            const res = await actor.basicTest(setupData)
            this.updateInformationRoll(optns.postFunction, res)
        })
    }

    static chatListeners(html) {
        html.on("click", ".request-roll", (ev) => {
            const elem = ev.currentTarget.dataset
            RequestRoll.requestRoll(elem.type, elem.name, Number(elem.modifier) || 0)
        })
        html.on('click', '.informationRequestRoll', ev => RequestRoll.informationRequestRoll(ev))
    }
}