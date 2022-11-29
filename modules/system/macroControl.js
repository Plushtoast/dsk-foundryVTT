import DSKChatListeners from "./chat_listeners.js";
import RequestRoll from "./request-roll.js";

export default class MacroDSK {
 
    static requestRoll(skill, modifier = 0) {
        RequestRoll.showRQMessage(skill, modifier)
    }

    static rollCh(skill, options = {}) {
        DSKChatListeners.check3D20(undefined, skill, options)
    }

    static itemMacroById(actorId, itemName, itemType, bypassData) {
        let actor = game.actors.get(actorId)
        let item = actor ? actor.items.find(i => i.name === itemName && i.type == itemType) : null;
        this.runItem(actor, item, itemName, bypassData)
    }

    static itemMacro(itemName, itemType, bypassData) {
        const speaker = ChatMessage.getSpeaker();
        let actor;
        if (speaker.token) actor = game.actors.tokens[speaker.token];
        if (!actor) actor = game.actors.get(speaker.actor);

        let item = actor ? actor.items.find(i => i.name === itemName && i.type == itemType) : null;
        this.runItem(actor, item, itemName, bypassData, speaker.token)
    }

    static runItem(actor, item, itemName, bypassData, tokenId) {
        if (!actor) return ui.notifications.error(game.i18n.format("dsk.DSKError.MacroItemMissing", { item: itemName }));

        switch (item.type) {
            case "combatskill":
            case "trait":
            case "meleeweapon":
                return actor.setupWeapon(item, bypassData.mod, bypassData, tokenId).then(setupData => {
                    actor.basicTest(setupData)
                });
            case "rangeweapon":
                return actor.setupWeapon(item, "attack", bypassData, tokenId).then(setupData => {
                    actor.basicTest(setupData)
                });
            case "skill":
                return actor.setupSkill(item, bypassData, tokenId).then(setupData => {
                    actor.basicTest(setupData)
                });
            case "ahnengabe":
                return actor.setupSpell(item, bypassData, tokenId).then(setupData => {
                    actor.basicTest(setupData)
                });
        }
    }
}