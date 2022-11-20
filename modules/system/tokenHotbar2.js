import ActorDSK from "../actor/actor_dsk.js"
import OnUseEffect from "./onUseEffects.js";

export default class TokenHotbar2 extends Application {
    static registerTokenHotbar() {
        if (!game.dsk.apps.tokenHotbar) game.dsk.apps.tokenHotbar = new TokenHotbar2()
    }

    constructor(options) {
        super(options);

        this.combatSkills = ["selfControl", "featOfStrength", "bodyControl", "perception"].map(x => game.i18n.localize(`LocalizedIDs.${x}`))
        this.defaultSkills = [game.i18n.localize("dsk.LocalizedIDs.perception")]

        const parentUpdate = (source) => {
            const id = source.parent ? source.parent.id : undefined
            if (id) TokenHotbar2.hookUpdate(id)
        }

        Hooks.on("controlToken", (elem, controlTaken) => {
            this.updateDSKHotbar()
        })

        Hooks.on("updateActor", (actor, updates) => {
            TokenHotbar2.hookUpdate(actor.id)
        });

        Hooks.on("updateToken", (scene, token, updates) => {
            if (token._id == getProperty(game.dsk.apps.tokenHotbar, "actor.prototypeToken.id"))
                this.updateDSKHotbar()
        });

        Hooks.on("updateOwnedItem", (source, item) => {
            TokenHotbar2.hookUpdate(source.data.id)
        });

        Hooks.on("createOwnedItem", (source, item) => {
            TokenHotbar2.hookUpdate(source.data.id)
        });

        Hooks.on("deleteOwnedItem", (source, item) => {
            TokenHotbar2.hookUpdate(source.data.id)
        });

        Hooks.on("updateItem", (source, item) => {
            parentUpdate(source)
        });

        Hooks.on("createItem", (source, item) => {
            parentUpdate(source)
        });

        Hooks.on("deleteItem", (source, item) => {
            parentUpdate(source)
        });
    }

    static hookUpdate(changeId) {
        if (changeId == getProperty(game.dsk.apps.tokenHotbar, "actor.id"))
            game.dsk.apps.tokenHotbar.updateDSKHotbar()
    }

    resetPosition() {
        const hotbarPosition = $('#hotbar').first().position()
        const itemWidth = game.settings.get("dsk", "tokenhotbarSize")
        this.position.left = hotbarPosition.left + 8
        this.position.top = hotbarPosition.top - itemWidth - 25
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        const hotbarPosition = $('#hotbar').first().position()
        const itemWidth = game.settings.get("dsk", "tokenhotbarSize")
        const position = game.settings.get("dsk", "tokenhotbarPosition")

        mergeObject(options, {
            classes: options.classes.concat(["dsk", "tokenQuickHot"]),
            itemWidth,
            resizable: false,
            height: itemWidth + 45,
            zIndex: 61,
            left: hotbarPosition.left + 8,
            top: hotbarPosition.top - itemWidth - 25,
            template: "systems/dsk/templates/status/tokenHotbar.html",
            title: "TokenHotbar"
        });
        mergeObject(options, position)
        return options;
    }

    async _onWheelResize(ev) {
        let newVal = game.settings.get("dsk", "tokenhotbarSize")
        if (ev.originalEvent.deltaY > 0) {
            newVal = Math.min(100, newVal + 5)
        } else {
            newVal = Math.max(15, newVal - 5)
        }
        await game.settings.set("dsk", "tokenhotbarSize", newVal)
        await this.render(true)
    }

    async _cycleLayout(ev) {
        if (ev.button == 2) {
            let newVal = game.settings.get("dsk", "tokenhotbarLayout") + 1
            if (newVal == 4) newVal = 0
            await game.settings.set("dsk", "tokenhotbarLayout", newVal)
            await this.render(true)
        }
    }

    activateListeners(html) {
        super.activateListeners(html);
        const container = html.find(".dragHandler");
        new Draggable(this, html, container[0], this.options.resizable);

        container.on('wheel', async(ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            await this._onWheelResize(ev)
            return false
        })

        container.on('mousedown', async(ev) => {
            await this._cycleLayout(ev)
        })

        html.on('mousedown', 'li', async(ev) => {
            ev.stopPropagation()
            await this.executeQuickButton(ev)
            return false
        })
                 
        html.on('mouseenter', 'li.primary', ev => {
            const cat = ev.currentTarget.dataset.category
            this.category = cat
            setTimeout(() => {
                html.find('.secondary').removeClass('shown')
                if(cat==this.category) 
                    html.find(`.secondary[data-category="${cat}"]`).addClass("shown")
            }, 700)
        })
        html.on('mouseleave', 'li.primary', ev => {
            const cat = ev.currentTarget.dataset.category
            this.category = undefined
            setTimeout(()=>{
                if(cat!=this.category) 
                    html.find(`.secondary[data-category="${cat}"]`).removeClass("shown")
            },50)
        })
    }

    async executeQuickButton(ev) {
        const actor = canvas.tokens.controlled[0].actor
        const tokenId = canvas.tokens.controlled[0].id
        const id = ev.currentTarget.dataset.id
        const subFunction = ev.currentTarget.dataset.subfunction
        switch (subFunction) {
            case "addEffect":
                AddEffectDialog.showDialog()
                break
            case "effect":
                const effect = actor.effects.get(id)
                const isSystemEffect = effect.getFlag("core", "statusId")
                if (ev.button == 0) {
                    if (isSystemEffect) await actor.addCondition(isSystemEffect, 1, false, false)
                    else effect.sheet.render(true)
                } else if (ev.button == 2) {
                    if (isSystemEffect) await actor.removeCondition(isSystemEffect, 1, false)
                    else await actor.sheet._deleteActiveEffect(id)
                }
                await this.render(true)
                break
            case "onUse":
                let item = actor.items.get(id)
                const onUse = new OnUseEffect(item)
                onUse.executeOnUseEffect()
                break
            default:
                let result = actor.items.get(id)
                if (result) {
                    if(ev.button == 2) return result.sheet.render(true)

                    switch (result.type) {
                        case "meleeweapon":
                        case "rangeweapon":
                        case "trait":
                            actor.setupWeapon(result, "attack", {}, tokenId).then(setupData => { actor.basicTest(setupData) });
                            break
                        case "ahnengabe":
                            actor.setupSpell(result, {}, tokenId).then(setupData => { actor.basicTest(setupData) });
                            break
                        case "skill":
                            actor.setupSkill(result, {}, tokenId).then(setupData => { actor.basicTest(setupData) })
                            break
                    }
                }
        }
    }

    subWidth(items, itemWidth, defaultCount = 7) {
        return `style="width:${Math.ceil(items.length / defaultCount) * 200}px"`
    }

    async getData() {
        const data = await super.getData()
        const actor = this.actor
        const items = {
            attacks: [],
            spells: [],
            default: [],
            skills: []
        }
        let consumable
        let onUse
        const consumables = []
        const onUsages = []
        let effects = []
        const direction = game.settings.get("dsk", "tokenhotbarLayout")
        const vertical = direction % 2
        const itemWidth = TokenHotbar2.defaultOptions.itemWidth
        const spellTypes = ["ahnengabe"]
        if (actor) {
            const moreSkills = []
            let moreSpells = []
            effects = (await actor.actorEffects()).map(x => { return { name: x.label, id: x.id, icon: x.icon, cssClass: "effect", abbrev: `${x.label[0]} ${x.getFlag("dsk","value") || ""}`, subfunction: "effect" } })
            if (game.combat) {
                const combatskills = actor.items.filter(x => x.type == "combatskill").map(x => ActorDSK._calculateCombatSkillValues(x.toObject(), actor.system))

                const attacktypes = ["meleeweapon", "rangeweapon"]
                const traitTypes = ["meleeAttack", "rangeAttack"]                

                for (const x of actor.items) {
                    if (x.type == "trait" && traitTypes.includes(x.system.traitType)) {
                        const preparedItem = ActorDSK._parseDmg(x.toObject())
                        items.attacks.push({ name: x.name, id: x.id, icon: x.img, cssClass: `weapon ${x.id}`, abbrev: x.name[0], attack: x.system.at, damage: preparedItem.damagedie, dadd: preparedItem.damageAdd})
                    }
                    else if (attacktypes.includes(x.type) && x.system.worn.value == true) {
                        const preparedItem = x.type == "meleeweapon" ? ActorDSK._prepareMeleeWeapon(x.toObject(), combatskills, actor) : ActorDSK._prepareRangeWeapon(x.toObject(), [], combatskills, actor)
                        items.attacks.push({ name: x.name, id: x.id, icon: x.img, cssClass: `weapon ${x.id}`, abbrev: x.name[0], attack: preparedItem.attack, damage: preparedItem.damagedie, dadd: preparedItem.damageAdd })
                    } else if (spellTypes.includes(x.type)) {
                        if (x.system.effectFormula) items.spells.push({ name: x.name, id: x.id, icon: x.img, cssClass: "spell", abbrev: x.name[0] })
                        else moreSpells.push({ name: x.name, id: x.id, icon: x.img, cssClass: "spell", abbrev: x.name[0] })
                    } else if (["skill"].includes(x.type) && this.combatSkills.includes(x.name)) {
                        items.default.push({ name: `${x.name} (${x.system.level})`, id: x.id, icon: x.img, cssClass: "skill", abbrev: x.name[0] })
                    } 
                    else if (["skill"].includes(x.type)){
                        const elem = { name: `${x.name} (${x.system.level})`, id: x.id, icon: x.img, cssClass: "skill",addClass: x.system.group, abbrev: x.name[0], tw: x.system.level }
                        moreSkills.push(elem)
                    }
                    else if (x.type == "consumable") {
                        consumables.push({ name: x.name, id: x.id, icon: x.img, cssClass: "consumable", abbrev: x.system.quantity })
                    }

                    if (x.getFlag("dsk", "onUseEffect")) {
                        onUsages.push({ name: x.name, id: x.id, icon: x.img, cssClass: "onUse", abbrev: x.name[0], subfunction: "onUse" })
                    }
                }
                consumable = consumables.pop()
            } else {
                let descendingSkills = []
                for (const x of actor.items) {
                    if (["skill"].includes(x.type) && this.defaultSkills.includes(x.name)) {
                        items.default.push({ name: `${x.name} (${x.system.level})`, id: x.id, icon: x.img, cssClass: "skill", abbrev: x.name[0] })
                    } else if (["skill"].includes(x.type)) {
                        const elem = { name: `${x.name} (${x.system.level})`, id: x.id, icon: x.img, cssClass: "skill",addClass: x.system.group, abbrev: x.name[0], tw: x.system.level }
                        if(x.system.level > 0) descendingSkills.push(elem)

                        moreSkills.push(elem)
                    }else if (spellTypes.includes(x.type)) {
                        if (x.system.effectFormula) items.spells.push({ name: x.name, id: x.id, icon: x.img, cssClass: "spell", abbrev: x.name[0] })
                        else moreSpells.push({ name: x.name, id: x.id, icon: x.img, cssClass: "spell", abbrev: x.name[0] })
                    }

                    if (x.getFlag("dsk", "onUseEffect")) {
                        onUsages.push({ name: x.name, id: x.id, icon: x.img, cssClass: "onUse", abbrev: x.name[0], subfunction: "onUse" })
                    }
                }
                items.skills.push(...descendingSkills.sort((a, b) => { return b.tw - a.tw }).slice(0, 5))
            }

            onUse = onUsages.pop()

            if (items.spells.length == 0 && moreSpells.length > 0) {
                items.spells.push(moreSpells.pop())
            }
            if (items.spells.length > 0 && moreSpells.length > 0) {
                items.spells[0].more = moreSpells.sort((a, b) => { return a.name.localeCompare(b.name) })
                items.spells[0].subwidth = this.subWidth(moreSpells, itemWidth)
            }
            if (items.default.length > 0 && moreSkills.length > 0) {
                items.default[0].more = moreSkills.sort((a, b) => { return a.addClass.localeCompare(b.addClass) || a.name.localeCompare(b.name) })
                items.default[0].subwidth = this.subWidth(moreSkills, itemWidth, 20)
            }

            if (consumable) {
                if (consumables.length > 0) {
                    consumable.more = consumables
                    consumable.subwidth = this.subWidth(consumables, itemWidth)
                }
                items.consumables = [consumable]
            }

            if (onUse) {
                if (onUsages.length > 0) {
                    onUse.more = onUsages
                    onUse.subwidth = this.subWidth(onUsages, itemWidth)
                }
                items.onUsages = [onUse]
            }
        }

        if (this.showEffects) {
            const label = game.i18n.localize("dsk.CONDITION.add")
            let effect = { name: label, id: "", icon: "icons/svg/aura.svg", cssClass: "effect", abbrev: label[0], subfunction: "addEffect" }
            if (effects.length > 0) {
                effect.more = effects
                effect.subwidth = this.subWidth(effects, itemWidth)
            }
            items.effects = [effect]
        }

        const count = Object.keys(items).reduce((prev, cur) => { return prev + items[cur].length }, 0)

        if (vertical) {
            this.position.width = itemWidth
            this.position.height = itemWidth * count + 14
        } else {
            this.position.width = itemWidth * count + 14
            this.position.height = itemWidth
        }

        mergeObject(data, { items, itemWidth, direction, count })
        return data
    }

    async render(force, options = {}) {
        const rend = await super.render(force, options)
        if (this._element) {
            this._element.css({ zIndex: 61 });
        }
        return rend
    }

    setPosition({ left, top, width, height, scale } = {}) {
        const currentPosition = super.setPosition({ left, top, width, height, scale })
        const el = this.element[0];

        if (!el.style.width || width) {
            const tarW = width || el.offsetWidth;
            const maxW = el.style.maxWidth || window.innerWidth;
            currentPosition.width = width = Math.clamped(tarW, 0, maxW);
            el.style.width = width + "px";
            if ((width + currentPosition.left) > window.innerWidth) left = currentPosition.left;
        }
        game.settings.set("dsk", "tokenhotbarPosition", { left: currentPosition.left, top: currentPosition.top })
        return currentPosition
    }

    async updateDSKHotbar() {
        const controlled = canvas.tokens.controlled
        this.actor = undefined
        this.showEffects = false
        if (controlled.length === 1) {
            const actor = controlled[0].actor
            if (actor && actor.isOwner) {
                this.actor = actor
            }
        }

        if (controlled.length >= 1) {
            this.showEffects = true
        }
        await this.render(true)
    }
}

class AddEffectDialog extends Dialog {
    static async showDialog() {
        const effects = duplicate(CONFIG.statusEffects).map(x => {
            return {
                label: game.i18n.localize(x.label),
                icon: x.icon,
                description: game.i18n.localize(x.description),
                id: x.id
            }
        }).sort((a, b) => a.label.localeCompare(b.label))

        const dialog = new AddEffectDialog({
            title: game.i18n.localize("dsk.CONDITION.add"),
            content: await renderTemplate('systems/dsk/templates/dialog/addstatusdialog.html', { effects }),
            buttons: {}
        })
        dialog.position.height = Math.ceil(effects.length / 3) * 36 + 170
        dialog.render(true)
    }

    activateListeners(html) {
        super.activateListeners(html);
        html.find('.reactClick').click(ev => this.addEffect(ev))

        let filterConditions = ev => this._filterConditions($(ev.currentTarget), html)

        let search = html.find('.conditionSearch')
        search.keyup(event => this._filterConditions($(event.currentTarget), html))
        search[0] && search[0].addEventListener("search", filterConditions, false);
    }

    _filterConditions(tar, html) {
        if (tar.val() != undefined) {
            let val = tar.val().toLowerCase().trim()
            let conditions = html.find('.filterable')
            html.find('.filterHide').removeClass('filterHide')
            conditions.filter(function() {
                return $(this).find('span').text().toLowerCase().trim().indexOf(val) == -1
            }).addClass('filterHide')
        }
    }

    async addEffect(ev) {
        for (let token of canvas.tokens.controlled) {
            await token.actor.addCondition(ev.currentTarget.dataset.value, 1, false, false)
        }
        game.dsk.apps.tokenHotbar.render(true)
        this.close()
    }

    static get defaultOptions() {
        const options = super.defaultOptions;
        const height = Math.ceil(CONFIG.statusEffects.length / 3) * 32

        mergeObject(options, {
            classes: ["dsk", "tokenStatusEffects"],
            width: 700,
            resizable: true,
            height
        });
        return options;
    }
}