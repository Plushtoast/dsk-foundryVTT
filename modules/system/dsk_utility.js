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

    static async allSkills() {
        const pack = game.i18n.lang == "de" ? "dsk.default" : "dsk.defaulten"
        return await this.getCompendiumEntries(pack, ["skill", "combatskill", "specialability"])
    }

    static async allSkillsList() {
        const data = await this.allSkills()
        const skills = []
        const rangeSkills = []
        const meleeSkills = []
        for(const dat of data){
            if(dat.type == "skill") skills.push(dat.name)
            else if(dat.type == "combatskill") {
                if(dat.system.weapontype == "melee") meleeSkills.push(dat.name)
                else rangeSkills.push(dat.name)
            }
        }
        return {
            skills: skills.sort((a,b) => a.localeCompare(b)), 
            rangeSkills: rangeSkills.sort((a,b) => a.localeCompare(b)),
            meleeSkills: meleeSkills.sort((a,b) => a.localeCompare(b))
        }
    }

    static moduleEnabled(id) {
        return game.modules.get(id) && game.modules.get(id).active
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

    static renderToggle(elem) {
        if (elem.rendered) {
            if (elem._minimized) elem.maximize();
            else elem.close()
        } else elem.render(true);
    }

    static async getCompendiumEntries(compendium, itemType) {
        const pack = await game.packs.get(compendium)
        if (!pack) {
            ui.notifications.error("No content found")
            return []
        }

        const search = Array.isArray(itemType) ? itemType : [itemType]
        const items = (await pack.getDocuments({ type: search}))
        return items.map(x => x.toObject());
    }

    static async getFolderForType(documentType, parent = null, folderName = null, sort = 0, color = "", sorting = undefined) {
        let folder = await game.folders.contents.find(x => x.name == folderName && x.type == documentType && x.folder?.id == parent)
        if (!folder) {
            folder = await Folder.create({
                name: folderName,
                type: documentType,
                sorting: sorting || (documentType == "JournalEntry" ? "a" : "m"),
                color,
                sort,
                parent
            })
        }
        return folder
    }
}