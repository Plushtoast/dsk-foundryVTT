import DSKChatListeners from "./chat_listeners.js"
import DSKUtility from "./dsk_utility.js"
import RequestRoll from "./request-roll.js"
import { UserMultipickDialog } from "../dialog/addTargetDialog.js"

export default class DSKChatAutoCompletion {
    static skills = []
    static cmds = ["sk", "at", "ah", "rq", "w", "ch"]
    static KEY = {
        UP: "ArrowUp",
        DOWN: "ArrowDown",
        ENTER: "Enter",
        TAB: "Tab",
        ESC: "Escape"
    };

    constructor() {
        if (DSKChatAutoCompletion.skills.length == 0) {
            DSKUtility.allSkills(["skill"]).then(res => {
                DSKChatAutoCompletion.skills = res.map(x => { return { name: x.name, type: "skill" } })
                    .concat(Object.values(game.dsk.config.characteristics).map(x => {
                        return { name: _loc(x), type: "attribute" }
                    }).concat({ name: _loc('dsk.regenerate'), type: "regeneration" }))
            })
        }
        this.regex
        this.filtering = false
    }

    get regex() {
        ///^\/(sk |at |pa |sp |li |rq |w |ch)/
        return new RegExp(`^\/(${DSKChatAutoCompletion.cmds.join(" |")})`)
    }

    async chatListeners(html) {
        const root = html?.jquery ? html[0] : html;
        const chatInput = root?.matches?.('.chat-input') ? root : root?.querySelector?.('.chat-input') ?? document.querySelector('.chat-input');
        if (!chatInput) return;
        this._boundParseInput ??= this._parseInput.bind(this);
        this._boundBlur ??= (ev) => {
            if ($(ev.relatedTarget).closest('.quickfind').length || $(ev.relatedTarget).closest('.quick-item').length || $(ev.relatedTarget).hasClass('quick-item')) return;
            this._closeQuickfind(ev);
        };
        chatInput.removeEventListener('keyup', this._boundParseInput);
        chatInput.addEventListener('keyup', this._boundParseInput);

        chatInput.removeEventListener('focusout', this._boundBlur);
        chatInput.addEventListener('focusout', this._boundBlur);
    }

    _parseInput(ev) {
        const val = this._getChatInputText(this.getContainer(ev.currentTarget ?? ev.target));
        const key = this._eventKey(ev);

        if (this.filtering && [DSKChatAutoCompletion.KEY.UP, DSKChatAutoCompletion.KEY.DOWN,
        DSKChatAutoCompletion.KEY.ENTER, DSKChatAutoCompletion.KEY.TAB].includes(key)) {
            return this._navigateQuickFind(ev);
        }

        if (key === DSKChatAutoCompletion.KEY.ESC) {
            this._closeQuickfind(ev);
            return false;
        }

        if (!this.regex.test(val)) {
            this._closeQuickfind(ev);
            return true;
        }

        const cmd = this._getCmd(val);
        const search = val.substring(1 + cmd.length).toLowerCase().trim();

        const filterMethod = `_filter${cmd}`;
        if (typeof this[filterMethod] === 'function') {
            this[filterMethod](search, ev);
            this.filtering = true;
        }

        return true;
    }

    _getCmd(val) {
        return val.substring(1, 3).toUpperCase().trim()
    }

    _completeCurrentEntry(target) {
        const container = this.getContainer(target);
        const cmdText = this._getChatInputText(container).split(' ')[0];

        let newVal = cmdText + ' ';
        if (/^\/w$/i.test(cmdText)) {
            newVal += `[${target.text()}] `;
        } else {
            newVal += target.text();
        }

        this._setChatInputText(container, newVal);
    }

    _eventKey(ev) {
        if (ev.key) return ev.key;

        const keyMap = {
            38: DSKChatAutoCompletion.KEY.UP,
            40: DSKChatAutoCompletion.KEY.DOWN,
            13: DSKChatAutoCompletion.KEY.ENTER,
            9: DSKChatAutoCompletion.KEY.TAB,
            27: DSKChatAutoCompletion.KEY.ESC
        };
        return keyMap[ev.which];
    }

    _getChatInputText(container) {
        const root = container?.jquery ? container[0] : container;
        const pmDiv = root?.querySelector?.('.chat-input .ProseMirror');
        if (pmDiv) return pmDiv.textContent?.trim() ?? '';

        const chatInput = root?.querySelector?.('.chat-input') ?? container?.find?.('.chat-input')?.[0];
        return chatInput?.value?.trim() ?? '';
    }

    _setChatInputText(container, text) {
        const root = container?.jquery ? container[0] : container;
        const pmDiv = root?.querySelector?.('.chat-input .ProseMirror');
        if (pmDiv) {
            const paragraph = pmDiv.querySelector('p');
            if (!paragraph) return;

            pmDiv.focus();
            if (text) {
                paragraph.textContent = text;
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(paragraph);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            } else {
                paragraph.innerHTML = '<br>';
            }
            return;
        }

        const chatInput = root?.querySelector?.('.chat-input') ?? container?.find?.('.chat-input')?.[0];
        if (chatInput) chatInput.value = text;
    }

    getContainer(target) {
        let element = target?.jquery ? target.closest('.chat-form') : target?.closest?.('.chat-form');
        if (element?.jquery) {
            if (!element.length) element = document.querySelector('#chat-notifications');
        } else if (!element) {
            element = document.querySelector('#chat-notifications');
        }
        return $(element);
    }

    isChatNotifications(target) {
        return target.id === 'chat-notifications'
    }

    _closeQuickfind(ev) {
        this.filtering = false;
        this.getContainer(ev.currentTarget ?? ev.target).find('.quickfind').remove();
    }

    _filterW(search, ev) {
        const result = game.users.contents
            .filter(user => user.active && user.name.toLowerCase().includes(search))
            .map(user => ({ name: user.name, type: 'user' }));

        this._setFilteredList(result, 'W', ev);
    }

    _filterAT(search, ev) {
        const { actor, tokenId } = DSKChatAutoCompletion._getActor()

        if (!actor) return;

        let types = ["meleeweapon", "rangeweapon"]
        let traitTypes = ["meleeAttack", "rangeAttack"]
        let result = actor.items.filter(x => {
            return ((types.includes(x.type) && x.system.worn.value == true) || (x.type == "trait" && traitTypes.includes(x.system.traitType))) &&
                x.name.toLowerCase().trim().indexOf(search) != -1
        }).slice(0, 5).map(x => { return { name: x.name, type: "item" } })
        this._setFilteredList(result, 'AT', ev);

    }

    _filterAH(search, ev) {
        const { actor, tokenId } = DSKChatAutoCompletion._getActor()

        if (!actor) return;

        let types = ["ahnengabe"]
        let result = actor.items.filter(x => { return types.includes(x.type) && x.name.toLowerCase().trim().indexOf(search) != -1 }).slice(0, 5).map(x => { return { name: x.name, type: "item" } })
        this._setFilteredList(result, 'SP', ev);
    }

    _setFilteredList(result, cmd, ev) {
        if (!result.length) {
            result.push({
                name: _loc('dsk.DSKError.noMatch'),
                type: 'none',
            });
        }
        this._setList(result, cmd, ev);
    }

    _getSkills(search, type = undefined) {
        search = search.replace(/(-|\+)?\d+/g, '').trim()
        let result = DSKChatAutoCompletion.skills.filter(x => { return x.name.toLowerCase().trim().indexOf(search) != -1 && (type == undefined || type == x.type) }).slice(0, 5)
        if (!result.length) {
            result.push({
                name: _loc('dsk.DSKError.noMatch'),
                type: 'none',
            });
        }
        return result
    }

    _filterCH(search, ev) {
        this._setList(this._getSkills(search), "CH", ev)
    }

    _filterSK(search, ev) {
        this._setList(this._getSkills(search), "SK", ev)
    }

    _filterRQ(search, ev) {
        this._setList(this._getSkills(search), "RQ", ev)
    }

    _setList(result, cmd, ev) {
        let html = $(`<div class="quickfind dsklist"><ul>${result.map(x => `<li data-type="${x.type}" data-category="${cmd}" class="quick-item">${x.name}</li>`).join("")}</ul></div>`)

        html.find(`.quick-item:first`).addClass('focus');
        html.find('.quick-item').on('mousedown', ev => {
            ev.preventDefault();
            this._quickSelect($(ev.currentTarget));
        });

        const container = this.getContainer(ev.currentTarget || ev.target);
        const existing = container.find('.quickfind');

        if (existing.length) {
            existing.replaceWith(html);
        } else {
            if (this.isChatNotifications(container[0])) {
                container.find('.overflow').after(html);
            } else {
                container.append(html);
            }
        }
    }

    _navigateQuickFind(ev) {
        if (!this.filtering) return true;

        const container = this.getContainer(ev.currentTarget ?? ev.target);
        const target = container.find('.focus');

        if (!target.length) return true;

        switch (this._eventKey(ev)) {
            case DSKChatAutoCompletion.KEY.UP:
                if (target.prev('.quick-item').length) {
                    target.removeClass('focus');
                    target.prev('.quick-item').addClass('focus');
                }
                ev.preventDefault();
                return false;

            case DSKChatAutoCompletion.KEY.DOWN:
                if (target.next('.quick-item').length) {
                    target.removeClass('focus');
                    target.next('.quick-item').addClass('focus');
                }
                ev.preventDefault();
                return false;

            case DSKChatAutoCompletion.KEY.ENTER:
                if (target.attr('data-category') !== 'W') {
                    ev.stopPropagation();
                    ev.preventDefault();
                    this._quickSelect(target);
                    return false;
                }
                break;

            case DSKChatAutoCompletion.KEY.TAB:
                ev.stopPropagation();
                ev.preventDefault();
                this._completeCurrentEntry(target);
                this._closeQuickfind(ev);
                return false;
        }

        return true;
    }

    static _getActor() {
        const speaker = ChatMessage.getSpeaker();
        let actor;
        if (speaker.token) actor = game.actors.tokens[speaker.token];
        if (!actor) actor = game.actors.get(speaker.actor);

        if (!actor) {
            ui.notifications.error("dsk.DSKError.noProperActor", { localize: true })
            return {}
        }
        return {
            actor,
            tokenId: speaker.token
        }
    }

    _quickSelect(target) {
        let cmd = target.attr("data-category")
        switch (cmd) {
            case "NM":
            case "RQ":
            case "CH":
                this[`_quick${cmd}`](target)
                break
            case "W":
                this._completeCurrentEntry(target)
                break
            default:
                const { actor, tokenId } = DSKChatAutoCompletion._getActor()
                if (actor) {
                    this._resetChatAutoCompletion(target)
                    this[`_quick${cmd}`](target, actor, tokenId)
                }
        }
    }

    _quickW(target, actor, tokenId) {

    }

    _quickCH(target) {
        DSKChatListeners.check3D20(target)
        this._resetChatAutoCompletion(target)
    }

    _quickSK(target, actor, tokenId) {
        switch (target.attr("data-type")) {
            case "skill":
                let skill = actor.items.find(i => i.name == target.text() && i.type == "skill")
                if (skill) actor.setupSkill(skill, {}, tokenId).then(setupData => { actor.basicTest(setupData) });
                break
            case "attribute":
                let characteristic = Object.keys(game.dsk.config.characteristics).find(key => _loc(game.dsk.config.characteristics[key]) == target.text())
                actor.setupCharacteristic(characteristic, {}, tokenId).then(setupData => { actor.basicTest(setupData) });
                break
            case "regeneration":
                actor.setupRegeneration("regenerate", {}, tokenId).then(setupData => { actor.basicTest(setupData) });
                break
        }

    }

    _resetChatAutoCompletion(target) {
        const container = this.getContainer(target);
        this._setChatInputText(container, '');
        container.find('.quickfind').remove();
    }

    getNumberFromChat(target) {
        const container = this.getContainer(target);
        const val = this._getChatInputText(container);
        return Number(val.match(/(-|\+)?\d+/g)) || 0;
    }

    _quickRQ(target) {
        const modifier = this.getNumberFromChat(target);
        this._resetChatAutoCompletion(target)
        RequestRoll.showRQMessage(target.text(), modifier)
    }

    _quickAT(target, actor, tokenId) {
        const types = ["meleeweapon", "rangeweapon"]
        const traitTypes = ["meleeAttack", "rangeAttack"]
        let result = actor.items.find(x => { return types.includes(x.type) && x.name == target.text() })
        if (!result) result = actor.items.find(x => { return x.type == "trait" && x.name == target.text() && traitTypes.includes(x.system.traitType) })

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

    static async infoItemAsync(uuid) {
        const item = await fromUuid(uuid)
        item.postItem()
    }

    static bindRollCommands(html) {
        html.on('click', '.request-roll', ev => {
            RequestRoll.showRQMessage(ev.currentTarget.dataset.name, Number(ev.currentTarget.dataset.modifier) || 0)
            ev.stopPropagation()
            return false
        })
        html.on('click', '.postInfo', ev => {
            const item = fromUuidSync(ev.currentTarget.dataset.uuid)
            if (item) {
                if (typeof item.postItem === 'function') {
                    item.postItem()
                } else {
                    this.infoItemAsync(ev.currentTarget.dataset.uuid)
                }
            }

            ev.stopPropagation()
            return false
        })
        html.on('click', '.postContentChat', async (ev) => {
            const content = $(ev.currentTarget).closest('.postChatSection').find('.postChatContent').html()
            UserMultipickDialog.getDialog(content)
        })
        html.on('click', '.request-CH', ev => {
            DSKChatListeners.check3D20(undefined, ev.currentTarget.dataset.name, { modifier: Number(ev.currentTarget.dataset.modifier) || 0 })
            ev.stopPropagation()
            return false
        })
        html.on('click', '.informationEnricherRoll', ev => {
            game.dsk.apps.InformationQueryService.informationEnricherRoll(ev)
            ev.stopPropagation()
            return false
        })
    }

}