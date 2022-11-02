export default class DSKUtility {
    static chatDataSetup(content, modeOverride, forceWhisper) {
        let chatData = {
            user: game.user.id,
            rollMode: modeOverride || game.settings.get("core", "rollMode"),
            content: content
        };

        if (["gmroll", "blindroll"].includes(chatData.rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM").map(u => u.id);
        if (chatData.rollMode === "blindroll") chatData["blind"] = true;
        else if (chatData.rollMode === "selfroll") chatData["whisper"] = [game.user];

        if (forceWhisper) {
            chatData["speaker"] = ChatMessage.getSpeaker();
            chatData["whisper"] = ChatMessage.getWhisperRecipients(forceWhisper);
        }

        return chatData;
    }

    static getSpeaker(speaker) {
        let actor = ChatMessage.getSpeakerActor(speaker)
        if (!actor && canvas.tokens) {
            let token = canvas.tokens.get(speaker.token)
            if (token) actor = token.actor
        }
        if (!actor) {
            let scene = game.scenes.get(speaker.scene)
            try {
                if (scene) actor = new Token(scene.getEmbeddedDocument("Token", speaker.token))?.actor
            } catch (error) {}
        }

        return actor
    }

    static async showArtwork({ img, name, uuid, isOwner }, hide = false) {
        new ImagePopout(img, {
            title: hide ? (isOwner ? name : "-") : name,
            shareable: true,
            uuid
        }).render(true)
    }
}