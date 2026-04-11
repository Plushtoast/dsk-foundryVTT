import DSKChatAutoCompletion from "./chat_autocompletion.js"
import DSKUtility from "./dsk_utility.js"

const { renderTemplate } = foundry.applications.handlebars
const { TextEditor } = foundry.applications.ux

export default class InformationQueryService {
    static REQUEST_TEMPLATE = "systems/dsk/templates/chat/information/query-request.hbs"
    static APPROVAL_TEMPLATE = "systems/dsk/templates/chat/information/query-approval.hbs"

    static async informationEnricherRoll(ev) {
        const uuid = ev.currentTarget.dataset.uuid
        const modifier = Number(ev.currentTarget.dataset.mod) || 0
        const skillName = ev.currentTarget.dataset.skill
        const { actor, tokenId } = DSKChatAutoCompletion._getActor()
        if (!actor) return

        const item = await fromUuid(uuid)
        if (!item || item.type != "information") return

        const skill = actor.items.find(x => x.name == skillName && x.type == "skill")
        if (!skill) {
            ui.notifications.error(game.i18n.format("dsk.DSKError.notFound", {
                category: game.i18n.localize("TYPES.Item.skill"),
                name: skillName,
            }))
            return
        }

        const setupData = await actor.setupSkill(skill, { modifier }, tokenId)
        setupData.testData.opposable = false
        const result = await actor.basicTest(setupData)

        const payload = {
            itemUuid: uuid,
            itemName: item.name,
            playerId: game.user.id,
            playerName: game.user.name,
            actorName: result.result?.speaker?.alias || actor.name,
            skillName,
            rolledQS: result.result.qualityStep || 0,
            successLevel: result.result.successLevel || 0,
        }

        const whisperTargets = [...new Set(game.users.filter(x => x.isGM).map(x => x.id).concat(game.user.id))]
        const content = await renderTemplate(this.REQUEST_TEMPLATE, payload)
        const chatData = DSKUtility.chatDataSetup(content)
        chatData.whisper = whisperTargets
        await ChatMessage.create(chatData)
    }

    static async handleApproval(ev) {
        const el = ev.currentTarget
        const uuid = el.dataset.uuid
        const playerId = el.dataset.playerId
        const rolledQS = Number(el.dataset.rolledQs) || 0
        const successLevel = Number(el.dataset.successLevel) || 0

        const item = await fromUuid(uuid)
        if (!item || item.type != "information") return

        const dialogData = await this.getDialogData(item, { rolledQS, successLevel })
        const content = await renderTemplate(this.APPROVAL_TEMPLATE, dialogData)

        try {
            const response = await foundry.applications.api.DialogV2.wait({
                window: {
                    title: game.i18n.format("dsk.INFORMATIONQUERY.dialogTitle", { item: item.name }),
                },
                content,
                buttons: [
                    {
                        action: "approve",
                        icon: "fas fa-check",
                        label: "dsk.INFORMATIONQUERY.approve",
                        default: true,
                        callback: (_event, button) => {
                            const form = button.form || button.closest("form")
                            return {
                                action: "approve",
                                selection: InformationQueryService.readSelection(form, dialogData),
                            }
                        },
                    },
                    {
                        action: "reject",
                        icon: "fas fa-times",
                        label: "dsk.INFORMATIONQUERY.reject",
                        callback: () => ({ action: "reject" }),
                    },
                ],
            })

            if (response?.action !== "approve") return

            if (!this.hasSelection(response.selection)) {
                ui.notifications.info("dsk.INFORMATIONQUERY.noInformationSelected", { localize: true })
                return
            }

            await this.postApprovedResult(item, response.selection, playerId)
        } catch (_error) {
            return
        }
    }

    static async getDialogData(item, { rolledQS, successLevel }) {
        const qsEntries = []
        for (let i = 1; i <= 6; i++) {
            const text = item.system[`qs${i}`]
            if (!text) continue

            qsEntries.push({
                key: `qs${i}`,
                qs: i,
                text: await TextEditor.enrichHTML(text, {}),
                included: i <= rolledQS,
            })
        }

        return {
            rolledQS,
            qsEntries,
            critText: item.system.crit ? await TextEditor.enrichHTML(item.system.crit, {}) : "",
            critIncluded: successLevel > 1,
            botchText: item.system.botch ? await TextEditor.enrichHTML(item.system.botch, {}) : "",
            botchIncluded: successLevel < -1,
            failText: item.system.fail ? await TextEditor.enrichHTML(item.system.fail, {}) : "",
            failIncluded: successLevel <= 0 && rolledQS < 1,
        }
    }

    static readSelection(form, dialogData) {
        const selection = {}

        for (const entry of dialogData.qsEntries) {
            selection[entry.key] = form?.querySelector(`[name="${entry.key}"]`)?.checked || false
        }

        selection.crit = form?.querySelector('[name="crit"]')?.checked || false
        selection.botch = form?.querySelector('[name="botch"]')?.checked || false
        selection.fail = form?.querySelector('[name="fail"]')?.checked || false

        return selection
    }

    static hasSelection(selection) {
        return Object.values(selection).some(Boolean)
    }

    static async postApprovedResult(item, selection, playerId) {
        const sections = []

        for (let i = 1; i <= 6; i++) {
            const key = `qs${i}`
            if (selection[key] && item.system[key]) {
                sections.push(await TextEditor.enrichHTML(item.system[key], {}))
            }
        }

        if (selection.crit && item.system.crit) sections.push(await TextEditor.enrichHTML(item.system.crit, {}))
        if (selection.botch && item.system.botch) sections.push(await TextEditor.enrichHTML(item.system.botch, {}))
        if (selection.fail && item.system.fail) sections.push(await TextEditor.enrichHTML(item.system.fail, {}))
        if (!sections.length) return

        const whisperRecipients = [...new Set(game.users.filter(x => x.isGM).map(x => x.id).concat(playerId))]
        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker(),
            content: [`<p><b>${item.name}</b></p>`, ...sections].join(""),
            whisper: whisperRecipients,
        })
    }

    static chatListeners(html) {
        html.on("click", ".informationQueryApprove", ev => InformationQueryService.handleApproval(ev))
    }
}