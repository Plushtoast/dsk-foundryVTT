import DSK from "../system/config.js";
import DSKUtility from "../system/dsk_utility.js";

export default class ActorDSK extends Actor {
    static async create(data, options) {
        if (data instanceof Array || data.items) return await super.create(data, options);

        if (!data.img || data.img == "icons/svg/mystery-man.svg") data.img = "icons/svg/mystery-man-black.svg";

        data.items = await DSKUtility.allSkills();

        return await super.create(data, options);
    }

    prepareDerivedData() {
        const data = this.system;
        try {
            data.canAdvance = this.type == "character"

            for (let ch of Object.values(data.characteristics)) {
                ch.value = ch.initial + ch.advances + (ch.modifier || 0) + ch.gearmodifier;
                ch.cost = game.i18n.format("dsk.advancementCost", {
                    cost: DSKUtility._calculateAdvCost(ch.initial + ch.advances, "Eig"),
                });
                ch.refund = game.i18n.format("dsk.refundCost", {
                    cost: DSKUtility._calculateAdvCost(ch.initial + ch.advances, "Eig", 0),
                });
            }

            if (data.canAdvance) {
                data.details.experience.current = data.details.experience.total - data.details.experience.spent;
            }

            if (this.type == "character" || this.type == "npc") {
                data.stats.LeP.current = data.stats.LeP.initial + data.characteristics.ko.value * 2;
                console.log(data.guidevalue)
                data.stats.AeP.current = (!data.guidevalue || data.guidevalue == "-") ? 0 : this._attrFromCharacteristic(data.guidevalue)
                data.stats.sk.value =
                    (data.stats.sk.initial || 0) +
                    Math.round((data.characteristics.mu.value + data.characteristics.kl.value + data.characteristics.in.value) / 3) - 10;
                data.stats.zk.value =
                    (data.stats.zk.initial || 0) +
                    Math.round((data.characteristics.ko.value + data.characteristics.ko.value + data.characteristics.kk.value) / 3) - 10;
                data.stats.ini.value =
                    Math.round((data.characteristics.mu.value + data.characteristics.ge.value) / 2) +
                    (data.stats.ini.modifier || 0);
            }

            if (this.type == "creature") {
                data.stats.LeP.current = data.stats.LeP.initial;
                data.stats.AeP.current = data.stats.AeP.initial;
                data.stats.ini.value = data.stats.ini.current + (data.stats.ini.modifier || 0);
            }

            data.stats.schips.max =
                Number(data.stats.schips.current) + Number(data.stats.schips.modifier) + data.stats.schips.gearmodifier

            data.stats.regeneration.LePmax =
                data.stats.regeneration.LePTemp + data.stats.regeneration.LePMod + data.stats.regeneration.LePgearmodifier;
            data.stats.regeneration.AePmax =
                data.stats.regeneration.AePTemp + data.stats.regeneration.AePMod + data.stats.regeneration.AePgearmodifier;

            data.stats.LeP.max = Math.round(
                (data.stats.LeP.current + data.stats.LeP.modifier + data.stats.LeP.advances) * data.stats.LeP.multiplier +
                data.stats.LeP.gearmodifier
            );
            console.log(data.stats.AeP)
            data.stats.AeP.max =
                data.stats.AeP.current +
                data.stats.AeP.modifier +
                data.stats.AeP.advances +
                data.stats.AeP.gearmodifier;

            data.stats.gs.max = data.stats.gs.initial + (data.stats.gs.modifier || 0) + data.stats.gs.gearmodifier;
            data.stats.sk.max =
                data.stats.sk.value + data.stats.sk.modifier + data.stats.sk.gearmodifier;
            data.stats.zk.max =
                data.stats.zk.value + data.stats.zk.modifier + data.stats.zk.gearmodifier;


        } catch (error) {
            console.error("Something went wrong with preparing actor data: " + error + error.stack);
            ui.notifications.error(game.i18n.format("dsk.DSKError.PreparationError", { name: this.name }) + error + error.stack);
        }
    }

    _calculateCombatSkillValues(i, actorData) {
        i = this._calculatePW(i, actorData)
        i.system.attack = i.PW
        if (i.system.weapontype == "melee") {
            i.system.parry = Math.round(i.PW * 0.25);
        } else {
            i.system.parry = 0;
        }
        i.cost = game.i18n.format("dsk.advancementCost", {
            cost: DSKUtility._calculateAdvCost(i.system.level, i.system.StF),
        });
        return i;
    }

    applyActiveEffects() {
        const overrides = {};

        const changes = this.effects.reduce((changes, e) => {
            if (e.disabled) return changes;

            let multiply = 1
            if (e.origin) {
                const id = e.origin.match(/[^.]+$/)[0];
                const item = this.items.get(id);
                if (item) {
                    let apply = true;

                    switch (item.type) {
                        case "meleeweapon":
                        case "rangeweapon":
                        case "armor":
                            apply = item.system.worn.value;
                            break;
                        case "equipment":
                            apply = !item.system.worn.wearable || (item.system.worn.wearable && item.system.worn.value)
                            break;
                        case "ammunition":
                        case "combatskill":
                        case "poison":
                        case "ahnengabe":
                        case "ahnengeschenk":
                            apply = false;
                            break;
                        case "specialability":
                            apply = item.system.category != "combat" || [2, 3].includes(item.system.subcategory);
                            multiply = Number(item.system.level) || 1
                            break
                        case "advantage":
                        case "disadvantage":
                            multiply = Number(item.system.level) || 1
                            break;
                    }
                    e.notApplicable = !apply;

                    if (!apply) return changes;
                }
            }

            for (let i = 0; i < multiply; i++) {
                changes.push(
                    ...e.changes.map((c) => {
                        c = foundry.utils.duplicate(c);
                        c.effect = e;
                        c.priority = c.priority ? c.priority : c.mode * 10;
                        return c;
                    })
                )
            }
            return changes
        }, []);
        changes.sort((a, b) => a.priority - b.priority);

        for (let change of changes) {
            const result = change.effect.apply(this, change);
            if (result !== null) overrides[change.key] = result;
        }

        this.overrides = foundry.utils.expandObject(overrides);
    }

    prepareBaseData() {
        const system = this.system;

        mergeObject(system, {
            skillModifiers: {

            },
            repeatingEffects: {
                startOfRound: {
                    LeP: [],
                    AeP: []
                },
            },
            stats: {
                initiative: {
                    multiplier: 1,
                },
                LeP: {
                    multiplier: 1,
                },
                regeneration: {
                    LePgearmodifier: 0,
                    AePgearmodifier: 0,
                },
            },
            status: {
                encumbered: 0,
                stunned: 0,
                feared: 0,
                inpain: 0,
                selfconfidence: 0
            },
            totalArmor: 0,
            carryModifier: 0,
            
        })
        for (const k of Object.values(system.stats)) k.gearmodifier = 0;

        for (let ch of Object.values(system.characteristics)) ch.gearmodifier = 0
    }

    prepareSheet(sheetInfo) {
        let preData = duplicate(this);
        let preparedData = { system: {} };
        mergeObject(preparedData, this.prepareItems(sheetInfo));
        if (preparedData.canAdvance) {
            const attrs = ["LeP", "AeP"];
            for (const k of attrs) {
                mergeObject(preparedData.system, {
                    stats: {
                        [k]: {
                            cost: game.i18n.format("dsk.advancementCost", {
                                cost: DSKUtility._calculateAdvCost(preData.system.stats[k].advances, "D"),
                            }),
                            refund: game.i18n.format("dsk.refundCost", {
                                cost: DSKUtility._calculateAdvCost(preData.system.stats[k].advances, "D", 0),
                            }),
                        },
                    },
                });
            }
        }

        return preparedData;
    }

    _perpareItemAdvancementCost(item, systemData) {
        item.cost = game.i18n.format("dsk.advancementCost", {
            cost: DSKUtility._calculateAdvCost(item.system.level, item.system.StF),
        });
        item.refund = game.i18n.format("dsk.refundCost", {
            cost: DSKUtility._calculateAdvCost(item.system.level, item.system.StF, 0),
        });
        item.canAdvance = ActorDSK.canAdvance(systemData);
        return item;
    }

    _setOnUseEffect(item) {
        if (getProperty(item, "flags.dsk.onUseEffect")) item.OnUseEffect = true;
    }

    static canAdvance(systemData) {
        return systemData.canAdvance;
    }

    _attrFromCharacteristic(char) {
        return this.system.characteristics[char].value
    }

    _calculatePW(item) {
        item.PW = this._attrFromCharacteristic(item.system.characteristic1) + this._attrFromCharacteristic(item.system.characteristic2) + 5
        return item
    }

    prepareItems(sheetInfo) {
        let actorData = this.toObject(false)
        let combatskills = [];
        let advantages = [];
        let disadvantages = [];
        let information = []
        let armor = [];
        let rangeweapons = [];
        let meleeweapons = [];
        let wornweapons = [];
        let availableAmmunition = [];
        let schips = [];
        const specAbs = Object.fromEntries(Object.keys(DSK.specialAbilityCategories).map((x) => [x, []]));

        const magic = {
            hasSpells: this.system.isMage,
            ahnengabe: [],
            ahnengeschenk: []
        };

        let skills = {
            body: [],
            social: [],
            knowledge: [],
            trade: []
        };

        const inventory = {
            meleeweapons: {
                items: [],
                show: false,
                dataType: "meleeweapon",
            },
            rangeweapons: {
                items: [],
                show: false,
                dataType: "rangeweapon",
            },
            armor: {
                items: [],
                show: false,
                dataType: "armor",
            },
            ammunition: {
                items: [],
                show: false,
                dataType: "ammunition",
            },
            poison: {
                items: [],
                show: false,
                dataType: "poison",
            },
        };

        for (let t in DSK.equipmentTypes) {
            inventory[t] = {
                items: [],
                show: false,
                dataType: t,
            };
        }

        inventory["misc"].show = true;

        for (let i = 1; i <= Number(actorData.system.stats.schips.max); i++) {
            schips.push({
                value: i,
                cssClass: i <= Number(actorData.system.stats.schips.value) ? "fullSchip" : "emptySchip",
            });
        }

        let containers = new Map();
        for (let container of actorData.items.filter((x) => x.type == "equipment" && x.system.category == "bags")) {
            containers.set(container._id, []);
        }

        actorData.items = actorData.items.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        let totalArmor = actorData.system.totalArmor || 0;
        let totalWeight = 0;

        for (let i of this.items) {
            try {
                let parent_id = getProperty(i, "system.parent_id");
                if (i.type == "ammunition") availableAmmunition.push(ActorDSK._prepareitemStructure(i));

                if (parent_id && parent_id != i._id) {
                    if (containers.has(parent_id)) {
                        containers.get(parent_id).push(i);
                        continue;
                    }
                }
                if (sheetInfo.details && sheetInfo.details.includes(i._id)) i.detailed = "shown";

                switch (i.type) {
                    case "skill":
                        skills[i.system.group].push(this._calculatePW(this._perpareItemAdvancementCost(i, actorData.system)));

                        break;
                    case "information":
                        information.push(i)
                        break
                    case "ahnengabe":
                        magic[i.type].push(this._perpareItemAdvancementCost(i));
                        break
                    case "ahnengeschenk":
                        magic[i.type].push(i);
                        break;
                    case "combatskill":
                        combatskills.push(this._calculateCombatSkillValues(this._perpareItemAdvancementCost(i, actorData.system), this.system));
                        break;
                    case "ammunition":
                        i.weight = parseFloat((i.system.weight * i.system.quantity).toFixed(3));
                        inventory.ammunition.items.push(ActorDSK.prepareMag(i));
                        inventory.ammunition.show = true;
                        totalWeight += Number(i.weight);
                        break;
                    case "meleeweapon":
                        i.weight = parseFloat((i.system.weight * i.system.quantity).toFixed(3));
                        i.toggleValue = i.system.worn.value || false;
                        i.toggle = true;
                        this._setOnUseEffect(i);
                        inventory.meleeweapons.items.push(ActorDSK._prepareitemStructure(i));
                        inventory.meleeweapons.show = true;
                        if (i.toggleValue) wornweapons.push(i);
                        totalWeight += Number(i.weight);
                        break;
                    case "rangeweapon":
                        i.weight = parseFloat((i.system.weight * i.system.quantity).toFixed(3));
                        i.toggleValue = i.system.worn.value || false;
                        i.toggle = true;
                        this._setOnUseEffect(i);
                        inventory.rangeweapons.items.push(ActorDSK._prepareitemStructure(i));
                        inventory.rangeweapons.show = true;
                        totalWeight += Number(i.weight);
                        break;
                    case "armor":
                        i.toggleValue = i.system.worn.value || false;
                        inventory.armor.items.push(ActorDSK._prepareitemStructure(i));
                        inventory.armor.show = true;
                        i.toggle = true;
                        this._setOnUseEffect(i);
                        i.weight = parseFloat((i.system.weight * i.system.quantity).toFixed(3));
                        totalWeight += parseFloat(
                            (
                                i.system.weight * (i.toggleValue ? Math.max(0, i.system.quantity - 1) : i.system.quantity.value)
                            ).toFixed(3)
                        );

                        if (i.system.worn.value) {
                            totalArmor += Number(i.system.rs);
                            armor.push(i);
                        }
                        break;
                    case "poison":
                        i.weight = parseFloat((i.system.weight * i.system.quantity).toFixed(3));
                        inventory["poison"].items.push(i);
                        inventory["poison"].show = true;
                        totalWeight += Number(i.weight);
                        break;
                    case "equipment":
                        i.weight = parseFloat((i.system.weight * i.system.quantity).toFixed(3));
                        i.toggle = getProperty(i, "system.worn.wearable") || false;

                        if (i.toggle) i.toggleValue = i.system.worn.value || false;

                        this._setOnUseEffect(i);
                        inventory[i.system.equipmentType.value].items.push(ActorDSK._prepareitemStructure(i));
                        inventory[i.system.equipmentType.value].show = true;
                        totalWeight += Number(i.weight);
                        break;
                    case "advantage":
                        this._setOnUseEffect(i);
                        advantages.push(i);
                        break;
                    case "disadvantage":
                        this._setOnUseEffect(i);
                        disadvantages.push(i);
                        break;
                    case "specialability":
                        this._setOnUseEffect(i);
                        specAbs[i.system.category].push(i);
                        break;
                }
            }
            catch (error) {
                this._itemPreparationError(i, error);
            }
        }

        for (let elem of inventory.bags.items) {
            totalWeight += this._setBagContent(elem, containers);
        }

        for (let wep of inventory.rangeweapons.items) {
            try {
                if (wep.system.worn.value) rangeweapons.push(ActorDSK._prepareRangeWeapon(wep, availableAmmunition, combatskills, this));
            } catch (error) {
                this._itemPreparationError(wep, error);
            }
        }

        for (let wep of wornweapons) {
            try {
                meleeweapons.push(
                    ActorDSK._prepareMeleeWeapon(
                        wep,
                        combatskills,
                        actorData,
                        wornweapons.filter((x) => x._id != wep._id && !RuleChaos.isYieldedTwohanded(x))
                    )
                );
            } catch (error) {
                this._itemPreparationError(wep, error);
            }
        }

        const carrycapacity = actorData.system.characteristics.kk.value * 2 + actorData.system.carryModifier;
        totalWeight = parseFloat(totalWeight.toFixed(3));

        let guidevalues = duplicate(DSK.characteristics);
        guidevalues["-"] = "-";

        return {
            totalWeight,
            armorSum: totalArmor,
            carrycapacity,
            wornRangeWeapons: rangeweapons,
            guidevalues,
            wornMeleeweapons: meleeweapons,
            advantages,
            disadvantages,
            specAbs,
            information,
            combatskills,
            wornArmor: armor,
            inventory,
            canAdvance: ActorDSK.canAdvance(actorData),
            sheetLocked: actorData.system.sheetLocked,
            magic,
            allSkillsLeft: {
                body: skills.body,
                social: skills.social
            },
            allSkillsRight: {
                knowledge: skills.knowledge,
                trade: skills.trade
            },
            schips
        }
    }

    tokenScrollingText(texts) {
        const tokens = this.isToken ? [this.token?.object] : this.getActiveTokens(true);
        for (let t of tokens) {
            if (!t) continue;

            let index = 0;
            for (let k of texts) {
                canvas.interface.createScrollingText(t.center, k.value, {
                    anchor: index,
                    direction: k.value > 0 ? 2 : 1,
                    fontSize: game.settings.get("dsk", "scrollingFontsize"),
                    stroke: k.stroke,
                    strokeThickness: 1,
                    jitter: 0.25,
                    duration: 1000,
                });

                index += 1;
            }
        }
    }

    async _preUpdate(data, options, user) {
        await super._preUpdate(data, options, user);

        const statusText = {
            LeP: 0x8b0000,
            AeP: 0x0b0bd9
        };
        const scolls = [];
        for (let key of Object.keys(statusText)) {
            const value = getProperty(data, `system.stats.${key}.value`);
            if (value)
                scolls.push({
                    value: value - this.system.stats[key].value,
                    stroke: statusText[key],
                });
        }
        if (scolls.length) this.tokenScrollingText(scolls);
    }

    _itemPreparationError(item, error) {
        console.error("Something went wrong with preparing item " + item.name + ": " + error);
        console.warn(error);
        console.warn(item);
        ui.notifications.error("Something went wrong with preparing item " + item.name + ": " + error);
    }

    _setBagContent(elem, containers, topLevel = true) {
        let totalWeight = 0;
        if (containers.has(elem._id)) {
            elem.children = [];
            let bagweight = 0;
            if (!elem.toggleValue && topLevel) totalWeight -= elem.weight;

            for (let child of containers.get(elem._id)) {
                child.weight = Number(parseFloat((child.system.weight * child.system.quantity).toFixed(3)));
                bagweight += child.weight;
                elem.children.push(ActorDSK._prepareitemStructure(ActorDSK._prepareConsumable(child)));
                if (containers.has(child._id)) {
                    bagweight += this._setBagContent(child, containers, false);
                }
            }
            if (elem.toggleValue || !topLevel) totalWeight += bagweight;
            elem.bagweight = `${bagweight.toFixed(3)}/${elem.system.capacity || 0}`;
        }
        return totalWeight;
    }

    async applyDamage(amount) {
        const newVal = Math.min(this.system.stats.LeP.max, this.system.stats.LeP.value - amount);
        await this.update({ "system.stats.LeP.value": newVal });
    }

    async applyRegeneration(LeP, AeP) {
        const update = {
            "system.stats.LeP.value": Math.min(this.system.stats.LeP.max, this.system.stats.LeP.value + (LeP || 0)),
            "system.stats.AeP.value": Math.min(
                this.system.stats.AeP.max,
                this.system.stats.AeP.value + (AeP || 0)
            ),
        };
        await this.update(update);
    }

    async applyMana(amount) {

        const newVal = Math.min(this.system.stats.AeP.max, this.system.stats.AeP.value - amount);
        if (newVal >= 0) {
            await this.update({ [`data.stats.AeP.value`]: newVal });
            return true
        } else {
            ui.notifications.error(game.i18n.localize(`dsk.DSKError.NotEnoughAeP`));
            return false
        }
    }

    async actorEffects() {
        const allowedEffects = ["dead"];
        const isAllowedToSeeEffects =
            game.user.isGM || this.testUserPermission(game.user, "OBSERVER") || !(await game.settings.get("dsk", "hideEffects"));

        return isAllowedToSeeEffects
            ? this.effects.filter((x) => {
                return (
                    !x.disabled &&
                    !x.notApplicable &&
                    (game.user.isGM || !x.getFlag("dsk", "hidePlayers")) &&
                    !x.getFlag("dsk", "hideOnToken") &&
                    (x.origin == this.uuid || !x.origin)
                );
            })
            : this.effects.filter((x) => allowedEffects.includes(x.getFlag("core", "statusId")));
    }

    async _preCreate(data, options, user) {
        await super._preCreate(data, options, user);
        let update = {};

        if (!data.img) update.img = "icons/svg/mystery-man-black.svg";

        if (data.type == "character") {
            mergeObject(update, {
                prototypeToken: {
                    sight: { enabled: true },
                    actorLink: true,
                },
            });
        }
        this.updateSource(update);
    }

    async markDead(dead) {
        const tokens = this.getActiveTokens();

        for (let token of tokens) {
            if (token.combatant) await token.combatant.update({ defeated: dead });
        }
    }
}