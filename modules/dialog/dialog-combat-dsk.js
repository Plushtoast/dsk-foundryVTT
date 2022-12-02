import ActorDSK from "../actor/actor_dsk.js";
import ItemDSK from "../item/item_dsk.js";
import AdvantageRulesDSK from "../system/advantage-rules.js";
import DiceDSK from "../system/dicedsk.js";
import DSKUtility from "../system/dsk_utility.js";
import SpecialabilityRulesDSK from "../system/specialability-rules.js";
import DSKDialog from "./dialog-dsk.js";
import DialogShared from "./dialog-shared.js";
import DSK from "../system/config.js";

export default class DSKCombatDialog extends DialogShared {
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            width: 700,
            resizable: true,
        });
        return options;
    }

    activateListeners(html) {
        super.activateListeners(html);
        let specAbs = html.find(".specAbs");
        specAbs.mouseenter((ev) => {
            if (ev.currentTarget.getElementsByClassName("hovermenu").length == 0) {
                let div = document.createElement("div");
                div.classList.add("hovermenu");
                let post = document.createElement("i");
                post.classList.add("fas", "fa-comment");
                post.title = game.i18n.localize("dsk.SHEET.PostItem");
                post.addEventListener("mousedown", this._postItem, false);
                div.appendChild(post);
                ev.currentTarget.appendChild(div);
            }
        });
        specAbs.mouseleave((ev) => {
            let e = ev.toElement || ev.relatedTarget;
            if (e.parentNode == this || e == this) return;

            ev.currentTarget.querySelectorAll(".hovermenu").forEach((e) => e.remove());
        });

        html.on("mousedown", ".specAbs", (ev) => {
            if (html.find(".opportunityAttack").is(":checked")) {
                ui.notifications.error(game.i18n.localize("dsk.DSKError.opposedAttackNoSpecAbs"));
                return;
            }
            const elem = $(ev.currentTarget);
            let step = Number(elem.attr("data-step"));
            const maxStep = Number(elem.attr("data-maxStep"));
            const subcategory = Number(elem.attr("data-category"));

            if (ev.button == 0) {
                step = Math.min(maxStep, step + 1);
                if ([0, 1].includes(subcategory) && game.settings.get("dsk", "limitCombatSpecAbs")) {
                    const siblings = elem.siblings(`[data-category="${subcategory}"]`);
                    siblings.removeClass("active").attr("data-step", 0);
                    siblings.find(".step").text(DialogShared.roman[0]);
                }
            } else if (ev.button == 2) {
                step = Math.clamped(maxStep, 0, step - 1)
            }
            elem.attr("data-step", step);
            if (step > 0) {
                elem.addClass("active");
            } else {
                elem.removeClass("active");
            }
            elem.find(".step").text(DialogShared.roman[step]);
            this.calculateModifier()
        });
        html.find(".opportunityAttack").change((ev) => {
            if ($(ev.currentTarget).is(":checked")) {
                for (let k of html.find(".specAbs")) {
                    $(k).removeClass("active").attr("data-step", 0).find(".step").text("");
                }
            }
        });
        html.on("change", "input,select", ev => this.calculateModifier(ev))
        html.find(".modifiers option").mousedown((ev) => {
            this.calculateModifier(ev)
        })
        html.find('.quantity-click').mousedown(ev => this.calculateModifier(ev));
        let targets = this.readTargets();
        this.calculateModifier()
            // not great
        const that = this
        this.checkTargets = setInterval(function() {
            targets = that.compareTargets(html, targets);
        }, 500);
    }

    async close(options = {}) {
        clearInterval(this.checkTargets);
        return await super.close(options);
    }

    _postItem(ev) {
        ev.stopPropagation();
        const elem = $(ev.currentTarget).closest(".specAbs");
        const actorId = elem.attr("data-actor");
        const id = elem.attr("data-id");

        const actor = game.actors.get(actorId);
        actor.items.get(id).postItem();

        return false;
    }

    recallSettings(speaker, source, mode) {
        super.recallSettings(speaker, source, mode)
        this.prepareWeapon()
        return this
    }

    prepareWeapon() {
        let weapon
        const source = this.dialogData.source
        const actor = DSKUtility.getSpeaker(this.dialogData.speaker)

        if (actor) {
            if (["meleeweapon", "rangeweapon"].includes(source.type)) {
                const combatskill = source.system.combatskill
                let skill = ActorDSK._calculateCombatSkillValues(actor.items.find((x) => x.type == "combatskill" && x.name == combatskill).toObject(),
                actor.system)
                
                switch (source.type) {
                    case "meleeweapon":
                        weapon = ActorDSK._prepareMeleeWeapon(source, [skill], actor)
                        break
                    case "rangeweapon":
                        weapon = ActorDSK._prepareRangeWeapon(source, [], [skill], actor)
                        break
                }
                if (this.dialogData.mode == "attack") {
                    this.dialogData.rollValue = weapon.attack
                } 
            } 
             else {
                if (this.dialogData.mode == "attack") {
                    this.dialogData.rollValue = Number(source.system.at)
                } 
            }
        }

    }

    prepareFormRecall(html) {
        super.prepareFormRecall(html);
        if (canvas.scene && game.settings.get("dsk", "sightAutomationEnabled")) {
            const darkness = canvas.scene ? canvas.scene.darkness : 0;
            const threholds = game.settings
                .get("dsk", "sightOptions")
                .split("|")
                .map((x) => Number(x));
            let level = 0;
            while (threholds[level] <= darkness) level += 1;

            const actor = DSKUtility.getSpeaker(this.dialogData.speaker);
            if (actor) {
                const darkSightLevel = AdvantageRulesDSK.vantageStep(actor, game.i18n.localize("dsk.LocalizedIDs.darksight")) + SpecialabilityRulesDSK.abilityStep(actor, game.i18n.localize("dsk.LocalizedIDs.sappeurStyle"));
                const blindCombat = SpecialabilityRulesDSK.abilityStep(actor, game.i18n.localize("dsk.LocalizedIDs.blindFighting"));
                if (level < 4 && level > 0) {
                    if (darkSightLevel > 1) {
                        level = 0;
                    } else {
                        level = Math.max(0, level - darkSightLevel);


                        level = Math.min(
                            4,
                            level + AdvantageRulesDSK.vantageStep(actor, game.i18n.localize("dsk.LocalizedIDs.nightBlind"))
                        );
                    }
                }

                level = Math.max(0, level - blindCombat);
            }

            const elem = html.find(`[name="vision"] option:nth-child(${level + 1})`);
            if (elem.length) elem[0].selected = true;
        }
    }

    
    calculateModifier() {
        if (this.dialogData.mode == "damage") return

        const source = this.dialogData.source
        const isMelee = (source.type == "trait" && getProperty(source, "system.traitType") == "meleeAttack") || source.type == "meleeweapon"
        const testData = { source: this.dialogData.source, extra: { options: {} } }
        const actor = DSKUtility.getSpeaker(this.dialogData.speaker)
        isMelee ? DSKCombatDialog.resolveMeleeDialog(testData, {}, this.element, actor, {}, -3, this.dialogData.mode) :
            DSKCombatDialog.resolveRangeDialog(testData, {}, this.element, actor, {}, this.dialogData.mode)

        this.dialogData.modifier = DiceDSK._situationalModifiers(testData)
        this.updateRollButton(this.readTargets())
    }

    static resolveMeleeDialog(testData, cardOptions, html, actor, options, multipleDefenseValue, mode) {
        this._resolveDefault(testData, cardOptions, html, options);

        //TODO move this to situational modifiers only
        const data = new FormDataExtended(html.find('form')[0]).object
            //testData.rangeModifier = html.find('[name="distance"]').val();
        testData.opposingWeaponSize = data.weaponsize
        testData.narrowSpace = data.narrowSpace
        testData.attackOfOpportunity = this.attackOfOpportunity(testData.situationalModifiers, data);
        testData.situationalModifiers.push(
            ItemDSK.parseValueType(game.i18n.localize("dsk.sight"), data.vision || 0), {
                name: game.i18n.localize("dsk.attackFromBehind"),
                value: data.attackFromBehind ? -4 : 0,
            }, {
                name: game.i18n.localize("dsk.MODS.damage"),
                damageBonus: data.damageModifier,
                value: 0,
                step: 1,
            }, {
                name: game.i18n.format("dsk.defenseCount", { malus: multipleDefenseValue }),
                value: (Number(data.defenseCount) || 0) * multipleDefenseValue,
            }, {
                name: game.i18n.localize("dsk.wrongHand"),
                value: data.wrongHand ? -4 : 0,
            }, {
                name: game.i18n.localize("dsk.advantageousPosition"),
                value: data.advantageousPosition ? 2 : 0,
            },
            {
                name: game.i18n.localize("dsk.sizeCategory"),
                value: DSK.meleeSizeModifier[data.size],
            },
            ...ItemDSK.getSpecAbModifiers(html, mode)
        );
        if (mode == "attack") {
            testData.situationalModifiers.push({
                name: game.i18n.localize("dsk.doubleAttack"),
                value: data.doubleAttack ?
                    -3 + Math.floor(SpecialabilityRulesDSK.abilityStep(actor, game.i18n.localize("dsk.LocalizedIDs.twoWeaponCombat")) * 1.5) : 0,
            });
        }
    }

    static resolveRangeDialog(testData, cardOptions, html, actor, options) {
        this._resolveDefault(testData, cardOptions, html, options);

        //TODO move this to situational modifiers only
        const data = new FormDataExtended(html.find('form')[0]).object
        testData.rangeModifier = data.distance

        testData.situationalModifiers.push({
                name: game.i18n.localize("dsk.target") + " " + html.find('[name="targetMovement"] option:selected').text(),
                value: Number(data.targetMovement) || 0,
            }, {
                name: game.i18n.localize("dsk.shooter") + " " + html.find('[name="shooterMovement"] option:selected').text(),
                value: Number(data.shooterMovement) || 0,
            }, {
                name: game.i18n.localize("dsk.mount") + " " + html.find('[name="mountedOptions"] option:selected').text(),
                value: Number(data.mountedOptions) || 0,
            }, {
                name: game.i18n.localize("dsk.rangeMovementOptions.QUICKCHANGE"),
                value: data.quickChange ? -4 : 0,
            }, {
                name: game.i18n.localize("dsk.MODS.combatTurmoil"),
                value: data.combatTurmoil ? -2 : 0,
            }, {
                name: game.i18n.localize("dsk.aim"),
                value: Number(data.aim) || 0,
            }, {
                name: game.i18n.localize("dsk.MODS.damage"),
                damageBonus: data.damageModifier,
                value: 0,
                step: 1,
            }, {
                name: game.i18n.localize("dsk.sight"),
                value: Number(data.vision || 0),
            },
            ...ItemDSK.getSpecAbModifiers(html, "attack"), 
            {
                name: game.i18n.localize("dsk.sizeCategory"),
                value: DSK.rangeSizeModifier[data.size],
            }
        );
    }

    static _resolveDefault(testData, cardOptions, html, options) {
        cardOptions.rollMode = html.find('[name="rollMode"]').val();
        testData.situationalModifiers = ActorDSK._parseModifiers(html);
        testData.vw = html.find('[name="vw"]').val()
        mergeObject(testData.extra.options, options);
    }

    static attackOfOpportunity(situationalModifiers, formData) {
        let value = formData.opportunityAttack ? -8 : 0;
        if (value) {
            situationalModifiers.push({
                name: game.i18n.localize("dsk.opportunityAttack"),
                value,
            });
            const enemySense = game.i18n.localize("dsk.LocalizedIDs.enemySense")
            game.user.targets.forEach((target) => {
                if (target.actor) {
                    if (target.actor.items.find((x) => x.type == "specialability" && x.name == enemySense)) {
                        situationalModifiers.push({
                            name: enemySense,
                            value,
                        });
                        return;
                    }
                }
            });
        }
        return value != 0;
    }

    static getRollButtons(testData, dialogOptions, resolve, reject) {
        let buttons = DSKDialog.getRollButtons(testData, dialogOptions, resolve, reject);
        if (
            testData.source.type == "rangeweapon" ||
            (testData.source.type == "trait" && testData.source.system.traitType == "rangeAttack")
        ) {
            const LZ =
                testData.source.type == "trait" ?
                Number(testData.source.system.lz) :
                ActorDSK.calcLZ(testData.source, testData.extra.actor)
            const progress = testData.source.system.reloadTimeprogress
            if (progress < LZ) {
                mergeObject(buttons, {
                    reloadButton: {
                        label: `${game.i18n.localize("dsk.WEAPON.reload")} (${progress}/${LZ})`,
                        callback: async() => {
                            const actor = await DSKUtility.getSpeaker(testData.extra.speaker)
                            await actor.updateEmbeddedDocuments("Item", [
                                { _id: testData.source._id, "system.reloadTimeprogress": progress + 1 },
                            ])
                            const infoMsg = game.i18n.format("dsk.WEAPON.isReloading", {
                                actor: testData.extra.actor.name,
                                item: testData.source.name,
                                status: `${progress + 1}/${LZ}`,
                            })
                            await ChatMessage.create(DSKUtility.chatDataSetup(infoMsg))
                        },
                    },
                })
            }
        }
        return buttons
    }
}