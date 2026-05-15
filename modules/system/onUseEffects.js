import RuleChaos from "./rule_chaos.js";
import DSKSoundEffect from "./dsk-soundeffect.js";
import DSKUtility from "./dsk_utility.js";
const { duplicate } = foundry.utils

export default class OnUseEffect {
    constructor(item) {
        this.item = item;
    }

    async callMacro(packName, name, args = {}) {
        const pack = game.packs.get(packName);
        let documents = await pack.getDocuments({ name });
        if (!documents.length) {
            for (let pack of game.packs.filter(x => x.documentName == "Macro" && /\(internal\)/.test(x.metadata.label))) {
                documents = await pack.getDocuments({ name });
                if (documents.length) break
            }
        }
        let result = {};
        if (documents.length) {
            const body = `(async () => {${documents[0].command}})()`;
            const fn = Function("args", "actor", "item", body);
            try {
                args.result = result;
                await fn.call(this, args, this.item.actor, this.item);
            } catch (err) {
                ui.notifications.error(
                    `There was an error in your macro syntax. See the console (F12) for details`
                );
                console.error(err);
                result.error = true;
            }
        } else {
            ui.notifications.error(
                _loc("dsk.DSKError.macroNotFound", { name })
            );
        }
        return result;
    }

    async executeOnUseEffect() {
        if (!game.user.can("MACRO_SCRIPT")) {
            return ui.notifications.warn(
                `You are not allowed to use JavaScript macros.`
            );
        }
        if (!this.item.actor) return;

        const macro = OnUseEffect.getOnUseEffect(this.item);
        const body = `(async () => {${macro}})()`;
        const fn = Function("item", "actor", body);
        try {
            await fn.call(this, this.item, this.item.actor);
        } catch (err) {
            ui.notifications.error(
                `There was an error in your macro syntax. See the console (F12) for details`
            );
            console.error(err);
            console.warn(err.stack);
        }
    }

    static getOnUseEffect(item) {
        return item.getFlag("dsk", "onUseEffect");
    }

    async automatedAnimation(successLevel, options = {}) {
        if (DSKUtility.moduleEnabled("autoanimations")) {
            console.warn("Animations for on use effects not enabled yet");
        }
    }

    effectDummy(name, changes, duration) {
        return {
            name,
            img: "icons/svg/aura.svg",
            system: { changes: changes.map(change => ({ ...change, type: change.type ?? OnUseEffect.modeToType(change.mode) })) },
            duration,
            flags: {
                dsk: {
                    value: null,
                    description: name
                },
            },
        };
    }

    static modeToType(mode) {
        return ["custom", "multiply", "add", "downgrade", "upgrade", "override"][Number(mode)] ?? mode;
    }

    async socketedConditionAddActor(actors, data) {
        if (game.user.isGM) {
            const systemCon = typeof data === "string";
            if (systemCon) {
                data = duplicate(CONFIG.statusEffects[data]);
                data.name = _loc(data.name);
            }

            const names = [];
            for (let actor of actors) {
                if (systemCon) await actor.addCondition(data, 1, false, false);
                else await actor.addCondition(data);

                names.push(actor.name);
            }
            await this.createInfoMessage(data, names);
        } else {
            const payload = {
                id: this.item.uuid,
                data,
                actors: actors.map((x) => x.id),
            };
            game.socket.emit("system.dsk", {
                type: "socketedConditionAddActor",
                payload,
            });
        }
    }

    async createInfoMessage(data, names, added = true) {
        if (names.length) {
            const format = added ? "ActiveEffects.appliedEffect" : "ActiveEffects.removedEffect"
            const infoMsg = _loc(format, {
                source: data.label,
                target: names.join(", "),
            });
            await ChatMessage.create(DSKUtility.chatDataSetup(infoMsg));
        }
    }

    async socketedRemoveCondition(targets, coreId, amount = 1) {
        if (game.user.isGM) {
            const names = [];
            for (let target of targets) {
                const token = canvas.tokens.get(target);
                if (token.actor) {
                    await token.actor.removeCondition(coreId, amount, false);
                    names.push(token.name);
                }
            }
            const data = CONFIG.statusEffects[coreId];
            data.name = _loc(data.name);
            await this.createInfoMessage(data, names, false);
        } else {
            const payload = {
                id: this.item.uuid,
                coreId,
                targets,
            };
            game.socket.emit("system.dsk", {
                type: "socketedRemoveCondition",
                payload,
            });
        }
    }

    async socketedActorTransformation(targets, update) {
        if (game.user.isGM) {
            for (let target of targets) {
                const token = canvas.tokens.get(target);
                if (token.actor) {
                    await token.actor.update(update)
                }
            }
        } else {
            const payload = {
                id: this.item.uuid,
                targets,
                update
            };
            game.socket.emit("system.dsk", {
                type: "socketedActorTransformation",
                payload,
            });
        }
    }

    async socketedConditionAdd(targets, data) {
        if (game.user.isGM) {
            const systemCon = typeof data === "string";
            if (systemCon) {
                data = duplicate(CONFIG.statusEffects[data]);
                data.name = _loc(data.name);
            }

            const names = [];
            for (let target of targets) {
                const token = canvas.tokens.get(target);
                if (token.actor) {
                    if (systemCon) await token.actor.addCondition(data, 1, false, false);
                    else await token.actor.addCondition(data);

                    names.push(token.name);
                }
            }
            await this.createInfoMessage(data, names);
        } else {
            const payload = {
                id: this.item.uuid,
                data,
                targets,
            };
            game.socket.emit("system.dsk", {
                type: "socketedConditionAdd",
                payload,
            });
        }
    }
}