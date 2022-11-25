import ActorDSK from "../actor/actor_dsk.js";
import { conditionsMatcher } from "../hooks/texteditor.js";
import DSK from "./config.js";

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

    static categoryLocalization(a){
        return game.i18n.localize(`ITEM.Type${a.slice(0,1).toUpperCase()}${a.slice(1).toLowerCase()}`)
    }

    static fateAvailable(actor, group) {
        //if (group)
        //    return game.settings.get("dsa5", "groupschips").split("/").map(x => Number(x))[0] > 0

        return actor.system.stats.schips.value > 0
    }

    static isActiveGM(){
        //Prevent double update with multiple GMs, still unsafe
        const activeGM = game.users.find((u) => u.active && u.isGM);
        
        return activeGM && game.user.id == activeGM.id
    }

    static parseAbilityString(ability) {
        return {
            original: ability.replace(/ (FP|SR|FW|SP)?[+-]?\d{1,2}$/, '').trim(),
            name: ability.replace(/\((.+?)\)/g, "()").replace(/ (FP|SR|FW|SP)?[+-]?\d{1,2}$/, '').trim(),
            step: Number((ability.match(/[+-]?\d{1,2}$/) || [1])[0]),
            special: (ability.match(/\(([^()]+)\)/) || ["", ""])[1],
            type: ability.match(/ (FP|SP)[+-]?\d{1,2}/) ? "FP" : (ability.match(/ (FW|SR)[+-]?\d{1,2}/) ? "FW" : ""),
            bonus: ability.match(/[-+]\d{1,2}$/) != undefined
        }
    }

    static async allSkills(elems =  ["skill", "combatskill", "specialability"]) {
        const pack = game.i18n.lang == "de" ? "dsk.default" : "dsk.defaulten"
        return await this.getCompendiumEntries(pack, elems)
    }

    static escapeRegex(input) {
        const source = typeof input === 'string' || input instanceof String ? input : '';
        return source.replace(/[-[/\]{}()*+?.,\\^$|#\s]/g, '\\$&');
    }

    static replaceDies(content, inlineRoll = false) {
        let regex = /( |^)(\d{1,2})?[wWdD][0-9]+((\+|-)[0-9]+)?/g
        let roll = inlineRoll ? "" : "/roll "
        return content.replace(regex, function(str) {
            return ` [[${roll}${str.replace(/[DwW]/,"d")}]]`
        })
    }

    static toObjectIfPossible(source) {
        return typeof source.toObject === 'function' ? source.toObject(false) : duplicate(source)
    }

    static async allSkillsList(elems =  ["skill", "combatskill", "specialability"]) {
        const data = await this.allSkills(elems)
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

    static replaceConditions(content) {
        if (!content) return content

        return content.replace(DSK.statusRegex.regex, (str) => conditionsMatcher([str]))
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

    static async skillByName(name) {
        const pack = game.packs.get(game.i18n.lang == "de" ? "dsk.default" : "dsk.defaulten")
        await pack.getIndex();
        const entry = pack.index.find(i => i.name === name);
        return await pack.getDocument(entry._id)
    }

    static async emptyActor(attrs = 12) {
        if (!Array.isArray(attrs)) {
            attrs = [attrs, attrs, attrs, attrs, attrs, attrs, attrs, attrs]
        }

        const actor = await ActorDSK.create({
            name: "Alricat",
            type: "npc",
            items: [],
            system: {
                stats: { LeP: { value: 50 }, schips: {} },
                characteristics: {
                    mu: { initial: attrs[0] },
                    kl: { initial: attrs[1] },
                    in: { initial: attrs[2] },
                    ch: { initial: attrs[3] },
                    ff: { initial: attrs[4] },
                    ge: { initial: attrs[5] },
                    ko: { initial: attrs[6] },
                    kk: { initial: attrs[7] }
                },

            }
        }, { temporary: true, noHook: true })
        actor.prepareData()
        return actor
    }

    static calcTokenSize(actorData, data) {
        let tokenSize = game.dsk.config.tokenSizeCategories[actorData.system.details.size]
        if (tokenSize) {
            if (tokenSize < 1) {
                mergeObject(data, {
                    texture: {
                        scaleX: tokenSize,
                        scaleY: tokenSize
                    },
                    width: 1,
                    height: 1
                })
            } else {
                const int = Math.floor(tokenSize);
                const scale = Math.max(tokenSize / int, 0.25)
                mergeObject(data, {
                    width: int,
                    height: int,
                    texture: {
                        scaleX: scale,
                        scaleY: scale
                    }
                })
            }
        }
    }

    static _calculateAdvCost(currentAdvances, type, modifier = 1) {
        return DSK.advancementCosts[type][Number(currentAdvances) + modifier]
    }

    static async getCompendiumEntries(compendium, itemType) {
        const pack = await game.packs.get(compendium)
        if (!pack) {
            ui.notifications.error("No content found")
            return []
        }

        const search = Array.isArray(itemType) ? itemType : [itemType]
        const items = (await pack.getDocuments({ type: { $in: search} }))
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