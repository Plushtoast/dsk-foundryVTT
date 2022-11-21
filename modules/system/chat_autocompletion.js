import DSKChatListeners from "./chat_listeners.js"
import DSKUtility from "./dsk_utility.js"
import RequestRoll from "./request-roll.js"

export default class DSKChatAutoCompletion {
    static skills = []
    static cmds = ["sk", "at", "ah", "rq", "gc", "w", "ch"]

    constructor() {
        if (DSKChatAutoCompletion.skills.length == 0) {
            DSKUtility.allSkills(["skill"]).then(res => {
                DSKChatAutoCompletion.skills = res.map(x => { return { name: x.name, type: "skill" } })
                    .concat(Object.values(game.dsk.config.characteristics).map(x => {
                        return { name: game.i18n.localize(x), type: "attribute" }
                    }).concat({ name: game.i18n.localize('dsk.regenerate'), type: "regeneration" }))
            })
        }
        this.regex
        this.filtering = false
    }

    get regex() {
        ///^\/(sk |at |pa |sp |li |rq |gc |w |ch)/
        return new RegExp(`^\/(${DSKChatAutoCompletion.cmds.join(" |")})`)
    }

    async chatListeners(html) {
        let target = this

        this.anchor = $('#chat-message').parent()
            //$('#chat-message').off('keydown')
        $("#chat-message").off("keydown", ui.chat._onChatKeyDownBinding);
        html.on('keyup', '#chat-message', async function(ev) {
            target._parseInput(ev)
        })

        html.on('click', '.quick-item', async function(ev) {
            target._quickSelect($(ev.currentTarget))
        })

        html.on('keydown', '#chat-message', function(ev) {
            target._navigateQuickFind(ev)
        })
    }

    _parseInput(ev) {
        let val = ev.target.value
        if (this.regex.test(val)) {
            if ([38, 40, 13, 9].includes(ev.which))
                return false
            else if (ev.which == 27) {
                this._closeQuickfind()
                return false
            }

            const cmd = this._getCmd(val)
            const search = val.substring(1 + cmd.length).toLowerCase().trim()
            this[`_filter${cmd}`](search)
            this.filtering = true
        } else {
            this._closeQuickfind()
        }
    }

    _getCmd(val) {
        return val.substring(1, 3).toUpperCase().trim()
    }

    _completeCurrentEntry(target) {
        $('#chat-message').val($('#chat-message').val().split(" ")[0] + " " + target.text()) + " "
    }

    _closeQuickfind() {
        this.filtering = false
        this.anchor.find(".quickfind").remove()
    }

    _filterW(search) {
        let result = game.users.contents.filter(x => x.active && x.name.toLowerCase().trim().indexOf(search) != -1).map(x => { return { name: x.name, type: "user" } })
        this._checkEmpty(result)
        this._setList(result, "W")
    }

    _filterAT(search) {
        const { actor, tokenId } = DSKChatAutoCompletion._getActor()
        if (actor) {
            let types = ["meleeweapon", "rangeweapon"]
            let traitTypes = ["meleeAttack", "rangeAttack"]
            let result = actor.items.filter(x => {
                    return ((types.includes(x.type) && x.system.worn.value == true) || (x.type == "trait" && traitTypes.includes(x.system.traitType))) &&
                        x.name.toLowerCase().trim().indexOf(search) != -1
                }).slice(0, 5).map(x => { return { name: x.name, type: "item" } })
            this._checkEmpty(result)
            this._setList(result, "AT")
        }
    }

    _filterAH(search) {
        const { actor, tokenId } = DSKChatAutoCompletion._getActor()
        if (actor) {
            let types = ["ahnengabe"]
            let result = actor.items.filter(x => { return types.includes(x.type) && x.name.toLowerCase().trim().indexOf(search) != -1 }).slice(0, 5).map(x => { return { name: x.name, type: "item" } })
            this._checkEmpty(result)
            this._setList(result, "SP")
        }
    }

    _checkEmpty(result) {
        if (!result.length) result.push({ name: game.i18n.localize("dsk.DSKError.noMatch"), type: "none" })
    }

    _getSkills(search, type = undefined) {
        search = search.replace(/(-|\+)?\d+/g, '').trim()
        let result = DSKChatAutoCompletion.skills.filter(x => { return x.name.toLowerCase().trim().indexOf(search) != -1 && (type == undefined || type == x.type) }).slice(0, 5)
        this._checkEmpty(result)
        return result
    }

    _filterCH(search) {
        this._setList(this._getSkills(search), "CH")
    }

    _filterSK(search) {
        this._setList(this._getSkills(search), "SK")
    }

    _filterRQ(search) {
        this._setList(this._getSkills(search), "RQ")
    }

    _filterGC(search) {
        this._setList(this._getSkills(search, "skill"), "GC")
    }

    _setList(result, cmd) {
            let html = $(`<div class="quickfind dsklist"><ul>${result.map(x=> `<li data-type="${x.type}" data-category="${cmd}" class="quick-item">${x.name}</li>`).join("")}</ul></div>`)

        html.find(`.quick-item:first`).addClass("focus")
        let quick = this.anchor.find(".quickfind")
        if (quick.length) {
            quick.replaceWith(html)
        } else {
            this.anchor.append(html)
        }
    }

    _navigateQuickFind(ev) {
        if (this.filtering) {
            let target = this.anchor.find('.focus')
            switch (ev.which) {
                case 38: // Up
                    if (target.prev(".quick-item").length)
                        target.removeClass("focus").prev(".quick-item").addClass("focus")
                    return false;
                case 40: // Down
                    if (target.next(".quick-item").length)
                        target.removeClass("focus").next(".quick-item").addClass("focus")
                    return false;
                case 13: // Enter
                    if (target.attr("data-category") == "W"){
                        break
                    }else{
                        ev.stopPropagation()
                        ev.preventDefault()
                        this._quickSelect(target);
                        return false;
                    }
                case 9:
                    ev.stopPropagation()
                    ev.preventDefault()
                    this._completeCurrentEntry(target)
                    return false
            }
        }
        ui.chat._onChatKeyDown(ev);
    }

    static _getActor() {
        const speaker = ChatMessage.getSpeaker();
        let actor;
        if (speaker.token) actor = game.actors.tokens[speaker.token];
        if (!actor) actor = game.actors.get(speaker.actor);

        if (!actor) {
            ui.notifications.error(game.i18n.localize("dsk.DSKError.noProperActor"))
            return{}
        }
        return {
            actor,
            tokenId: speaker.token
        }
    }

    _quickSelect(target) {
        let cmd = target.attr("data-category")
        switch(cmd){
            case "NM":
            case "GC":
            case "RQ":
            case "CH":
                this[`_quick${cmd}`](target)
                break
            case "W":
                this._completeCurrentEntry(target)
                break
            default:
                const {actor, tokenId} = DSKChatAutoCompletion._getActor()
                if (actor) {
                    this._resetChatAutoCompletion()
                    this[`_quick${cmd}`](target, actor, tokenId)
                }
        }
    }

    _quickW(target, actor, tokenId){

    }

    _quickCH(target){
        DSKChatListeners.check3D20(target)
        this._resetChatAutoCompletion()
    }

    _quickSK(target, actor, tokenId) {
        switch(target.attr("data-type")){
            case "skill":
                let skill = actor.items.find(i => i.name == target.text() && i.type == "skill")
                if (skill) actor.setupSkill(skill, {}, tokenId).then(setupData => {actor.basicTest(setupData)});
                break
            case "attribute":
                let characteristic = Object.keys(game.dsk.config.characteristics).find(key => game.i18n.localize(game.dsk.config.characteristics[key]) == target.text())
                actor.setupCharacteristic(characteristic, {}, tokenId).then(setupData => { actor.basicTest(setupData) });
                break
            case "regeneration":
                actor.setupRegeneration("regenerate", {}, tokenId).then(setupData => { actor.basicTest(setupData) });
                break
        }

    }

    _resetChatAutoCompletion(){
        $('#chat-message').val("")
        this.anchor.find(".quickfind").remove()
    }

    _quickGC(target){
        const modifier = Number($('#chat-message').val().match(/(-|\+)?\d+/g)) || 0
        this._resetChatAutoCompletion()
        RequestRoll.showGCMessage(target.text(), modifier)
    }

    _quickRQ(target){
        const modifier = Number($('#chat-message').val().match(/(-|\+)?\d+/g)) || 0
        this._resetChatAutoCompletion()
        RequestRoll.showRQMessage(target.text(), modifier)
    }

    _quickAT(target, actor, tokenId) {
        const types = ["meleeweapon", "rangeweapon"]
        const traitTypes = ["meleeAttack", "rangeAttack"]
        let result = actor.items.find(x => { return types.includes(x.type) && x.name == target.text() })
        if(!result) result = actor.items.find(x => { return x.type == "trait" && x.name == target.text() && traitTypes.includes(x.system.traitType) })

        if (result) {
            actor.setupWeapon(result, "attack", {}, tokenId).then(setupData => {
                actor.basicTest(setupData)
            });
        }
    }
    
    _quickSP(target, actor, tokenId) {
        const types = ["ahnengabe"]
        const result = actor.items.find(x => { return types.includes(x.type) && x.name == target.text() })
        if (result) {
            actor.setupSpell(result, {}, tokenId).then(setupData => {
                actor.basicTest(setupData)
            });
        }
    }

    static async infoItemAsync(uuid){
        const item = await fromUuid(uuid)
        item.postItem()
    }

    static bindRollCommands(html){
        html.on('click', '.request-roll', ev => {
            RequestRoll.showRQMessage(ev.currentTarget.dataset.name, Number(ev.currentTarget.dataset.modifier) || 0)
            ev.stopPropagation()
            return false
        })
        html.on('click', '.postInfo', ev => {
            const item = fromUuidSync(ev.currentTarget.dataset.uuid)
            if(item) {
                if(typeof item.postItem === 'function'){
                    item.postItem()
                }else{
                    this.infoItemAsync(ev.currentTarget.dataset.uuid)
                }
            }

            ev.stopPropagation()
            return false
        })
        html.on('click', '.request-GC', ev => {
            RequestRoll.showGCMessage(ev.currentTarget.dataset.name, Number(ev.currentTarget.dataset.modifier) || 0)
            ev.stopPropagation()
            return false
        })
        html.on('click', '.request-CH', ev => {
            DSKChatListeners.check3D20(undefined, ev.currentTarget.dataset.name, { modifier: Number(ev.currentTarget.dataset.modifier) || 0 })
            ev.stopPropagation()
            return false
        })
    }

}