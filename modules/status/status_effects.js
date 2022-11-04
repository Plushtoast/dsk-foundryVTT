import DSKChatListeners from "../system/chat_listeners.js";

export default class DSKStatusEffects{
    static bindButtons(html) {
        html.find('.chat-condition').each(function(i, cond) {
            cond.setAttribute("draggable", true);
            cond.addEventListener("dragstart", ev => {
                const dataTransfer = {
                    data: {
                        type: "condition",
                        payload: {
                            id: $(ev.currentTarget).attr("data-id")
                        }
                    }
                }
                ev.dataTransfer.setData("text/plain", JSON.stringify(dataTransfer));
            });
        })
        html.find('.chat-condition').click(ev => DSKChatListeners.postStatus($(ev.currentTarget).attr("data-id")))
    }

    static prepareActiveEffects(target, data) {
        let systemConditions = duplicate(CONFIG.statusEffects) //.filter(x => x.flags.dsk.editable)
        let appliedSystemConditions = []
        data.conditions = []
        data.transferedConditions = []
        for (let condition of target.effects.filter(e => { return game.user.isGM || target.documentName == "Item" || !e.getFlag("dsk", "hidePlayers") })) {
            condition.disabled = condition.disabled
            condition.boolean = condition.getFlag("dsk", "value") == null
            condition.label = condition.label
            condition.icon = condition.icon
            const statusId = condition.getFlag("core", "statusId")
            if (statusId) {
                condition.value = condition.getFlag("dsk", "value")
                condition.editable = condition.getFlag("dsk", "editable")
                condition.descriptor = statusId
                condition.manual = condition.getFlag("dsk", "manual")
                appliedSystemConditions.push(statusId)
            }
            if ((condition.origin == target.uuid || !condition.origin) && !condition.notApplicable)
                data.conditions.push(condition)
            else if (!condition.notApplicable) {
                data.transferedConditions.push(condition)
            }
        }
        data.manualConditions = systemConditions.filter(x => !appliedSystemConditions.includes(x.id))
    }
}