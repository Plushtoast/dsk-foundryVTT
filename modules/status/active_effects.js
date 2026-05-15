import DSKUtility from "./../system/dsk_utility.js"
import DSK from "./../system/config.js"
import DiceDSK from "../system/dicedsk.js";
const { mergeObject, getProperty, duplicate, setProperty } = foundry.utils
const { renderTemplate } = foundry.applications.handlebars;

function automatedAnimation(successLevel, options = {}) {
    if (DSKUtility.moduleEnabled("autoanimations")) {
        console.warn("Animations for on use effects not enabled yet");
    }
}

async function callMacro(packName, name, actor, item, qs, args = {}) {
    let result = {};
    if (!game.user.can("MACRO_SCRIPT")) {
        ui.notifications.warn(`You are not allowed to use JavaScript macros.`);
    } else {
        const pack = game.packs.get(packName);
        let documents = await pack.getDocuments({ name });
        if (!documents.length) {
            for (let pack of game.packs.filter(x => x.documentName == "Macro" && /\(internal\)/.test(x.metadata.label))) {
                documents = await pack.getDocuments({ name });
                if (documents.length) break
            }
        }

        if (documents.length) {
            const body = `(async () => {${documents[0].command}})()`;
            const fn = Function("actor", "item", "qs", "automatedAnimation", "args", body);
            try {
                args.result = result;
                const context = mergeObject({ automatedAnimation }, this)
                await fn.call(context, actor, item, qs, automatedAnimation, args);
            } catch (err) {
                ui.notifications.error(`There was an error in your macro syntax. See the console (F12) for details`);
                console.error(err);
                result.error = true;
            }
        } else {
            ui.notifications.error(
                _loc("dsk.DSKError.macroNotFound", { name })
            );
        }
    }
    return result;
};

export default class DSKActiveEffectConfig extends foundry.applications.sheets.ActiveEffectConfig {
    static macroIndexes = [2, 6, 7];
    
    static DEFAULT_OPTIONS = {
        window: {
            resizable: true,
        },
        position: {
            width: 700,
        },
    };

    static PARTS = {
        header: super.PARTS.header,
        tabs: super.PARTS.tabs,
        details: super.PARTS.details,
        duration: super.PARTS.duration,
        changes: { template: 'systems/dsk/templates/status/changes.hbs', scrollable: [''] },
        advanced: { template: 'systems/dsk/templates/status/advanced_effect.hbs' },
        footer: super.PARTS.footer,
    };

    static TABS = {
        sheet: {
            tabs: [
                { id: 'details', icon: 'fa-solid fa-book', label: 'dsk.details' },
                { id: 'duration', icon: 'fa-solid fa-clock', label: 'dsk.duration' },
                { id: 'changes', icon: 'fa-solid fa-cogs', label: 'dsk.changes' },
                { id: 'advanced', icon: 'fa-solid fa-shield-alt', label: 'dsk.advanced' },
            ],
            initial: 'details',
        },
    };

    static async onEffectRemove(actor, effect) {
        const onRemoveMacro = getProperty(effect, "flags.dsk.onRemove");
        if (onRemoveMacro) {
            if (!game.user.can("MACRO_SCRIPT")) {
                ui.notifications.warn(`You are not allowed to use JavaScript macros.`);
            } else {
                try {
                    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor
                    const fn = new AsyncFunction("effect", "actor", onRemoveMacro)
                    await fn.call(this, effect, actor);
                } catch (err) {
                    ui.notifications.error(
                        `There was an error in your macro syntax. See the console (F12) for details`
                    );
                    console.error(err);
                    console.warn(err.stack);
                }
            }
        }
    }

    async _preparePartContext(partId, context) {
        const partContext = await super._preparePartContext(partId, context);
        if (partId in partContext.tabs) partContext.tab = partContext.tabs[partId];
        const document = this.document;
        switch (partId) {
            case 'changes': {
                const changeFields = document.system.schema.fields.changes.element.fields;
                const changeTypes = Object.entries(ActiveEffect.CHANGE_TYPES)
                    .map(([type, { label }]) => ({ type, label: _loc(label) }))
                    .sort((a, b) => a.label.localeCompare(b.label, game.i18n.lang))
                    .reduce((types, { type, label }) => {
                        types[type] = label;
                        return types;
                    }, {});
                const changePriorities = Object.fromEntries(
                    Object.entries(ActiveEffect.CHANGE_TYPES).map(([type, { defaultPriority }]) => [type, defaultPriority]),
                );
                const changePhases = Object.fromEntries(
                    Object.entries(ActiveEffect.CHANGE_PHASES).map(([phase, { label }]) => [phase, _loc(label)]),
                );
                const changes = foundry.utils.deepClone(context.source.system?.changes ?? document.system.changes ?? []);
                for (const change of changes) {
                    if (typeof change.value !== "string") change.value = JSON.stringify(change.value);
                }
                mergeObject(partContext, { changeFields, changeTypes, changePriorities, changePhases, changes });
                break;
            }
            case 'advanced':
                let index = -1;
                const advancedFunctions = ["none", "systemEffect", "macro", "creature"].map((x) => {
                    return { name: `dsk.ActiveEffects.advancedFunctions.${x}`, index: (index += 1) };
                });
                const itemType = document.parent.type;
                const item = document.parent;
                const effectConfigs = {
                    hasSpellEffects: [
                        "ahnengabe",
                        "consumable",
                        "poison",
                        "ammunition",
                        "meleeweapon",
                        "rangeweapon",
                    ].includes(itemType) ||
                        (["specialability"].includes(itemType) && getProperty(item, "parent.system.category") == "Combat") ||
                        (itemType == "trait" && ["meleeAttack", "rangeAttack"].includes(getProperty(item, "parent.system.traitType")))
                    ,
                    hasDamageTransformation: ["ammunition"].includes(itemType),
                };
                if (effectConfigs.hasDamageTransformation) {
                    advancedFunctions.push({ name: "ActiveEffects.advancedFunctions.armorPostprocess", index: 4 }, { name: "ActiveEffects.advancedFunctions.damagePostprocess", index: 5 });
                }
                
                mergeObject(partContext, {  
                    advancedFunctions,
                    effectConfigs,
                    config: this.getConfig(),
                    macroIndexes: DSKActiveEffectConfig.macroIndexes,
                })
                break
        }

        return partContext;
    }

    getConfig() {
        return {
            systemEffects: this.getStatusEffects(),
            canEditMacros: game.user.isGM || game.settings.get('dsk', 'playerCanEditSpellMacro'),
        };
    }

    getStatusEffects() {
        return duplicate(Object.values(CONFIG.statusEffects)).map((x) => {
            return { id: x.id, name: _loc(x.name) };
        }).sort((a, b) => a.name.localeCompare(b.name))
    }

    static applyRollTransformation(actor, options, functionID) {
        let msg = "";
        let source = options.origin;
        for (const ef of source.effects) {
            try {
                if (Number(getProperty(ef, "flags.dsk.advancedFunction")) == functionID) {
                    if (!game.user.can("MACRO_SCRIPT")) {
                        ui.notifications.warn(`You are not allowed to use JavaScript macros.`);
                    } else {
                        try {
                            const syncFunction = Object.getPrototypeOf(function () { }).constructor
                            const fn = new syncFunction("ef", "callMacro", "actor", "msg", "source", getProperty(ef, "flags.dsk.args3"))
                            fn.call(this, ef, callMacro, actor, msg, source);
                        } catch (err) {
                            ui.notifications.error(
                                `There was an error in your macro syntax. See the console (F12) for details`
                            );
                            console.error(err);
                            console.warn(err.stack);
                        }
                    }
                }
            } catch (exception) {
                console.warn("Unable to apply advanced effect", exception, ef);
            }
        }
        options.origin = source;
        return { msg, options };
    }

    static async applyAdvancedFunction(actor, effects, source, testData, sourceActor, skipResistRolls = true) {
        let msg = "";
        const resistRolls = [];
        let effectApplied = false;
        const effectsWithChanges = [];
        const effectNames = new Set()

        for (const ef of effects) {
            if (ef.origin) delete ef.origin

            const specStep = Number(getProperty(ef, "flags.dsk.specStep")) || 0
            try {
                const customEf = Number(getProperty(ef, "flags.dsk.advancedFunction"));
                const qs = Math.min(testData.qualityStep || 0, 6);
                const resistRoll = getProperty(ef, "flags.dsk.resistRoll");

                if (resistRoll && !skipResistRolls) {
                    const skills = resistRoll.split(" ");
                    const mod = `${skills.pop()}`;
                    resistRolls.push({
                        skill: skills.join(" "),
                        mod: Math.round(Roll.safeEval(`${mod}`.replace(/q(l|s)/i, qs).replace("step", specStep))) || 0,
                        effect: ef,
                        target: actor,
                        token: actor.token ? actor.token.id : undefined
                    });
                } else {
                    effectApplied = true;
                    if (!effectNames.has(ef.name)) effectNames.add(ef.name)
                    if (ef.changes && ef.changes.length > 0) {
                        effectsWithChanges.push(ef);
                    }
                    if (customEf) {
                        switch (customEf) {
                            case 1: //Systemeffekt
                                {
                                    const effect = duplicate(CONFIG.statusEffects[getProperty(ef, "flags.dsk.args0")]);
                                    let value = `${getProperty(ef, "flags.dsk.args1")}` || "1";
                                    effect.duration = ef.duration;
                                    if (/,/.test(value)) {
                                        value = Number(value.split(",")[qs - 1]);
                                    } else {
                                        value = Number(value.replace(_loc("dsk.CHARAbbrev.QS"), qs));
                                    }
                                    await actor.addCondition(effect, value, false, false);
                                }
                                break;
                            case 2: //Macro
                                if (!game.user.can("MACRO_SCRIPT")) {
                                    ui.notifications.warn(`You are not allowed to use JavaScript macros.`);
                                } else {
                                    try {
                                        const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor
                                        const fn = new AsyncFunction("effect", "actor", "callMacro", "msg", "source", "actor", "sourceActor", "testData", "qs", getProperty(ef, "flags.dsk.args3"))
                                        await fn.call(this, ef, actor, callMacro, msg, source, actor, sourceActor, testData, qs);
                                    } catch (err) {
                                        ui.notifications.error(
                                            `There was an error in your macro syntax. See the console (F12) for details`
                                        );
                                        console.error(err);
                                        console.warn(err.stack);
                                    }
                                }
                                break;
                            case 3: // Creature Link
                                let creatures = (getProperty(ef, "flags.dsk.args4") || "")
                                    .split(",")
                                    .map((x) => `@Compendium[${x.trim().replace(/(@Compendium\[|\])/)}]`)
                                    .join(" ");
                                msg += `<p><b>${_loc("dsk.ActiveEffects.advancedFunctions.creature")}</b>:</p><p>${creatures}</p>`;
                                break;
                        }
                    }
                }
            } catch (exception) {
                console.warn("Unable to apply advanced effect");
                console.warn(exception);
                console.warn(ef);
            }
        }
        await actor.createEmbeddedDocuments(
            "ActiveEffect",
            effectsWithChanges.map((x) => {
                x.origin = actor.uuid;
                return x;
            })
        );
        return { msg, resistRolls, effectApplied, effectNames: Array.from(effectNames) };
    }

    static async resistEffect(ev) {
        const data = ev.currentTarget.dataset;
        const target = { token: data.token, actor: data.actor, scene: canvas.id }
        const actor = DSKUtility.getSpeaker(target)
        if (actor) {
            const skill = actor.items.find((x) => x.type == "skill" && x.name == data.skill);
            actor.setupSkill(skill, { modifier: data.mod }, data.token).then(async (setupData) => {
                setupData.testData.opposable = false;
                const res = await actor.basicTest(setupData);
                const availableQs = res.result.qualityStep || 0;
                //this.automatedAnimation(res.result.successLevel);

                if (availableQs < 1) {
                    await this.applyEffect(data.message, data.mode, [target], { effectIds: [data.effect], skipResistRolls: true })
                }
            });
        } else {
            console.warn("Actor not found for resist roll.")
        }
    }

    static async applyEffect(id, mode, targets, options = {}) {
        const message = game.messages.get(id);
        const source = message.flags.data.preData.source;
        const testData = message.flags.data.postData;
        const speaker = message.speaker;

        if (["poison", "disease"].includes(source.type)) {
            testData.qualityStep = testData.successLevel > 0 ? 2 : 1;
        }

        const attacker = DSKUtility.getSpeaker(speaker) ||
            DSKUtility.getSpeaker(getProperty(message.flags, "data.preData.extra.speaker")) ||
            game.actors.get(getProperty(message.flags, "data.preData.extra.actor.id"))

        let sourceActor = attacker;
        let effects = await this._parseEffectDuration(source, testData, message.flags.data.preData, attacker);
        if (options.effectIds) effects = effects.filter(x => options.effectIds.includes(x._id))
        let actors = [];
        if (mode == "self") {
            if (attacker) actors.push(attacker);
        } else {
            if (targets) actors = targets.map((x) => DSKUtility.getSpeaker(x));
            else if (game.user.targets.size) {
                game.user.targets.forEach((target) => {
                    if (target.actor) actors.push(target.actor);
                });
            }
        }
        if (game.user.isGM) {
            for (let actor of actors) {
                const { msg, resistRolls, effectApplied, effectNames } = await DSKActiveEffectConfig.applyAdvancedFunction(
                    actor,
                    effects,
                    source,
                    testData,
                    sourceActor,
                    options.skipResistRolls || false
                );
                if (effectApplied) {
                    const appliedEffect = _loc("dsk.ActiveEffects.appliedEffect", { target: actor.token?.name || actor.name, source: effectNames.join(", ") });
                    const infoMsg = `${appliedEffect}${msg || ""}`;
                    await ChatMessage.create(DSKUtility.chatDataSetup(infoMsg));
                }
                if (resistRolls.length) {
                    await this.createResistRollMessage(resistRolls, id, mode);
                }
            }
        } else {
            game.socket.emit("system.dsk", {
                type: "addEffect",
                payload: {
                    mode,
                    id,
                    actors: actors.map((x) => {
                        return { token: x.token ? x.token.id : undefined, actor: x.id, scene: canvas.scene.id };
                    }),
                },
            });
        }
    }

    static async createResistRollMessage(resistRolls, id, mode) {
        for (const resist of resistRolls) {
            const template = await renderTemplate("systems/dsk/templates/chat/roll/resist-roll.hbs", {
                resist,
                id,
                mode
            });
            await ChatMessage.create(DSKUtility.chatDataSetup(template));
        }
    }

    static async _parseEffectDuration(source, testData, preData, attacker) {
        const specAbIds = {}
        for (let spec of preData.situationalModifiers.filter((x) => x.specAbId)) {
            specAbIds[spec.specAbId] = spec.step
        }
        const specKeys = Object.keys(specAbIds)
        const specAbs = attacker ? attacker.items.filter((x) => specKeys.includes(x.id)) : [];
        let effects = source.effects ? duplicate(source.effects) : [];
        for (const spec of specAbs) {
            const specEffects = duplicate(spec).effects
            for (let specEf of specEffects) {
                setProperty(specEf, "flags.dsk.specStep", specAbIds[spec.id])
            }
            effects.push(...specEffects);
        }

        let duration = getProperty(source, "system.duration") || "";
        duration = duration.replace(" x ", " * ").replace(_loc("dsk.CHARAbbrev.QS"), testData.qualityStep);
        try {
            const regexes = [
                { regEx: new RegExp(_loc("dsk.DSKREGEX.combatRounds"), "gi"), seconds: 5 },
                { regEx: new RegExp(_loc("dsk.DSKREGEX.minutes"), "gi"), seconds: 60 },
                { regEx: new RegExp(_loc("dsk.DSKREGEX.hours"), "gi"), seconds: 3600 },
                { regEx: new RegExp(_loc("dsk.DSKREGEX.days"), "gi"), seconds: 3600 * 24 },
                { regEx: new RegExp(_loc("dsk.DSKREGEXmaintain.weeks"), "gi"), seconds: 3600 * 24 * 7 },
                { regEx: new RegExp(_loc("dsk.DSKREGEXmaintain.months"), "gi"), seconds: 3600 * 24 * 30 },
                { regEx: new RegExp(_loc("dsk.DSKREGEXmaintain.years"), "gi"), seconds: 3600 * 24 * 350 }
            ];
            for (const reg of regexes) {
                if (reg.regEx.test(duration)) {
                    const dur = duration.replace(reg.regEx, "").trim()
                    const time = await DiceDSK._stringToRoll(dur);
                    if (!isNaN(time)) {
                        for (let ef of effects) {
                            let calcTime = time * reg.seconds;
                            const customDuration = getProperty(ef, "flags.dsk.customDuration");
                            if (customDuration) {
                                let qsDuration = customDuration.split(",")[testData.qualityStep - 1];
                                if (qsDuration && qsDuration != "-") calcTime = Number(qsDuration);
                            }
                            ef.duration ??= {};
                            ef.duration.value = calcTime;
                            ef.duration.units = "seconds";
                        }
                    }
                    break;
                }
            }
        } catch (e) {
            console.error(`Could not parse duration '${duration}' of '${source.name}'`);
        }
        return effects;
    }

    dropDownMenu() {
        const FW = _loc("dsk.MODS.FW");
        const skill = _loc("TYPES.Item.skill");
        const regenerate = _loc("dsk.regenerate")
        const FP = _loc("dsk.MODS.FP");
        const stepValue = _loc("dsk.stepValue");
        const QS = _loc("dsk.MODS.QS");
        const partChecks = _loc("dsk.MODS.partChecks");
        const demo = `${_loc("dsk.LocalizedIDs.perception")} 1`;
        const democs = `${_loc("dsk.LocalizedIDs.wrestle")} 1`;
        const closeCombat = _loc("dsk.closeCombatAttacks");
        const rangeCombat = _loc("dsk.rangeCombatAttacks");
        const combatReg = `${regenerate} (${_loc("dsk.CHARAbbrev.CR")})`;
        const AePCost = _loc("dsk.AePCost");
        const descriptor = `${_loc("dsk.description")} 1`
        const feature = `${_loc("Healing")} 1`

        let optns = [
            { name: _loc("dsk.protection"), val: "system.totalArmor", mode: 2, ph: "1" },
            {
                name: `${_loc("dsk.resistanceModifier")} (${_loc("dsk.condition")})`,
                val: "system.resistances.effects",
                mode: 0,
                ph: "inpain 1",
            },
            { name: _loc("dsk.carrycapacity"), val: "system.carryModifier", mode: 2, ph: "1" },
            {
                name: `${closeCombat} - ${_loc("dsk.CHARAbbrev.AW")}`,
                val: "system.meleeStats.attack",
                mode: 2,
                ph: "1",
            },
            {
                name: `${closeCombat} - ${_loc("dsk.CHARAbbrev.VW")}`,
                val: "system.meleeStats.parry",
                mode: 2,
                ph: "1",
            },
            {
                name: `${closeCombat} - ${_loc("dsk.CHARAbbrev.damage")}`,
                val: "system.meleeStats.damage",
                mode: 2,
                ph: "1d6",
            },
            {
                name: `${closeCombat} - ${_loc("dsk.MODS.defenseMalus")}`,
                val: "system.meleeStats.defenseMalus",
                mode: 2,
                ph: "1",
            },
            {
                name: _loc("dsk.MODS.creatureBonus"),
                val: "system.creatureBonus",
                mode: 0,
                ph: `Elementar 1`,
            },
            {
                name: `${rangeCombat} - ${_loc("dsk.CHARAbbrev.AW")}`,
                val: "system.rangeStats.attack",
                mode: 2,
                ph: "1",
            },
            {
                name: `${rangeCombat} - ${_loc("dsk.CHARAbbrev.damage")}`,
                val: "system.rangeStats.damage",
                mode: 2,
                ph: "1d6",
            },
            {
                name: `${rangeCombat} - ${_loc("dsk.MODS.defenseMalus")}`,
                val: "system.rangeStats.defenseMalus",
                mode: 2,
                ph: "1",
            },
            {
                name: `${_loc("TYPES.Item.ahnengabe")} - ${_loc("dsk.CHARAbbrev.damage")}`,
                val: "system.spellStats.damage",
                mode: 2,
                ph: "1",
            },
            { name: AePCost, val: "system.aepModifier", mode: 2, ph: "1" },
            { name: `${skill} - ${FW}`, val: "system.skillModifiers.FW", mode: 0, ph: demo },
            { name: `${skill} - ${FP}`, val: "system.skillModifiers.FP", mode: 0, ph: demo },
            { name: `${skill} - ${stepValue}`, val: "system.skillModifiers.step", mode: 0, ph: demo },
            { name: `${skill} - ${QS}`, val: "system.skillModifiers.QL", mode: 0, ph: demo },
            { name: `${skill} - ${partChecks}`, val: "system.skillModifiers.TPM", mode: 0, ph: demo },
            {
                name: `${_loc("dsk.vulnerability")} - ${_loc("TYPES.Item.combatskill")}`,
                val: "system.vulnerabilities.combatskill",
                mode: 0,
                ph: democs,
            },

            { name: `${skill} - ${_loc("dsk.MODS.global")}`, val: "system.skillModifiers.global", mode: 0, ph: "1" },
            {
                name: `${combatReg} - ${_loc("dsk.LeP")}`,
                val: "system.repeatingEffects.startOfRound.LeP",
                mode: 0,
                ph: "1d6",
            },
            {
                name: `${combatReg} - ${_loc("dsk.AeP")}`,
                val: "system.repeatingEffects.startOfRound.AeP",
                mode: 0,
                ph: "1d6",
            },
            {
                name: `${regenerate} - ${_loc("dsk.LeP")}`,
                val: "system.stats.regeneration.LePgearmodifier",
                mode: 2,
                ph: "1",
            },
            {
                name: `${regenerate} - ${_loc("dsk.AeP")}`,
                val: "system.stats.regeneration.AePgearmodifier",
                mode: 2,
                ph: "1"
            },
            {
                name: `${_loc("dsk.advanced")} - ${AePCost}`,
                val: `system.skillModifiers.conditional.AePCost`,
                mode: 0,
                ph: descriptor,
            }
        ];
        const models = ["ahnengabe", "skill", "feature"];
        for (const k of models) {
            let key = k == "skill" ? "skillglobal" : k;
            const el = DSKUtility.categoryLocalization(key)
            optns.push({ name: `${el} - ${FW}`, val: `system.skillModifiers.${k}.FW`, mode: 0, ph: demo }, { name: `${el} - ${FP}`, val: `system.skillModifiers.${k}.FP`, mode: 0, ph: demo }, { name: `${el} - ${stepValue}`, val: `system.skillModifiers.${k}.step`, mode: 0, ph: demo }, { name: `${el} - ${QS}`, val: `system.skillModifiers.${k}.QL`, mode: 0, ph: demo }, { name: `${el} - ${partChecks}`, val: `system.skillModifiers.${k}.TPM`, mode: 0, ph: demo });
        }

        const cummulativeEffects = ["inpain", "selfconfidence", "encumbered", "stunned", "feared"]
        for (const k of cummulativeEffects) {
            optns.push({
                name: _loc(`dsk.CONDITION.${k}`),
                val: `system.status.${k}`,
                mode: 2,
                ph: 1
            })
        }

        for (const k of Object.keys(DSK.characteristics))
            optns.push({
                name: _loc(`dsk.characteristics.${k}.name`),
                val: `system.characteristics.${k}.gearmodifier`,
                mode: 2,
                ph: "1",
            });

        for (const k of DSK.gearModifyableCalculatedAttributes)
            optns.push({ name: _loc(`dsk.${k}`), val: `system.stats.${k}.gearmodifier`, mode: 2, ph: "1" });

        optns = optns.sort((a, b) => {
            return a.name.localeCompare(b.name);
        });

        for (let optn of optns) {
            if (!optn.ph || optn.mode == undefined) console.warn(optn);
        }

        optns = optns
            .map((x) => {
                const type = x.type ?? ({ 0: "custom", 1: "multiply", 2: "add", 3: "subtract", 4: "downgrade", 5: "override" }[x.mode] ?? "add");
                const phase = x.phase ?? "initial";
                return `<option value="${x.val}" data-type="${type}" data-phase="${phase}" data-ph="${x.ph}">${x.name}</option>`;
            })
            .join("\n");
        return `<select class="selMenu">${optns}</select>`;
    }

    async _onRender(context, options) {
        await super._onRender(context, options);

        const html = $(this.element);

        html.find('.advancedSelector').on('change', (ev) => {
            let effect = this.document;
            effect.flags.dsk.advancedFunction = Number($(ev.currentTarget).val());

            renderTemplate('systems/dsk/templates/status/advanced_functions.hbs', {
                document: this.document,
                config: this.getConfig(),
                macroIndexes: DSKActiveEffectConfig.macroIndexes,
            }).then((template) => {
                html.find('.advancedFunctions').html(template);
            });
        });
        if (this.document.statuses.size && game.i18n.has(this.document.description)) {
            html.find('[data-tab="details"] .editor').replaceWith(`<p>${_loc(this.document.description)}</p>`);
        }
        const dropDown = this.dropDownMenu();
        html.find('.changes .ol .key').append(dropDown);
        html
            .find('.selMenu')
            .select2({ width: 'element' })
            .on('change', (ev) => {
                const elem = $(ev.currentTarget);
                elem.siblings('input').val(elem.val());
                const parent = elem.closest('.row-section');
                const data = elem.find('option:selected');
                const exampleValue = data.attr('data-ph') || '';
                parent.find('.type select').val(data.attr('data-type'));
                parent.find('.phase select').val(data.attr('data-phase') || 'initial');
                parent.find('.value input').val(exampleValue).attr('placeholder', '');
                elem.trigger('blur');
            });
        html.find('.select2').each((i, el) => {
            $(el)[0].style.removeProperty('width');
        });
    }
}