import { DSKCombatTracker } from "../hooks/combat_tracker.js";
const { mergeObject, duplicate } = foundry.utils

export default class DSKIniTracker extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2) {
    static DEFAULT_OPTIONS = {
        position: {
            width: 440,
            top: 100,
            left: 170,
        },
        window: {
            title: 'dsk.DSKIniTracker',
            resizable: true,
            frame: false,
        },
        actions: {
            aggroButton: function () {
                DSKCombatTracker.runActAttackDialog();
            },
            rollMine: this.rollMyChars,
            waitInit: this.waitInit,
            restoreInit: { handler: this.restoreInit, buttons: [0, 2] },
            panToCombatant: this.#onCombatantControl,
            pingCombatant: this.#onCombatantControl,
            rollInitiative: this.#onCombatantControl,
            toggleDefeated: this.#onCombatantControl,
            toggleHidden: this.#onCombatantControl,
            activateCombatant: this.#onCombatantMouseDown,
        },
        classes: ['dsk', 'initTracker'],
    };

    static PARTS = {
        main: {
            template: 'systems/dsk/templates/system/initracker.hbs',
        },
    };

    setPosition(position) {
        const currentPosition = super.setPosition(position);
        game.settings.set('dsk', 'iniTrackerPosition', {
            left: currentPosition.left,
            top: currentPosition.top,
        });
        return currentPosition;
    }

    static connectHooks() {
        Hooks.on("renderDSKCombatTracker", (app, html, data) => {
            if (!game.settings.get("dsk", "enableCombatFlow")) return

            if (game.combat) {
                if (!game.dsk.apps.initTracker) {
                    game.dsk.apps.initTracker = new DSKIniTracker()
                }
                game.dsk.apps.initTracker.updateTracker(data)
            } else {
                if (game.dsk.apps.initTracker) {
                    game.dsk.apps.initTracker.close()
                    game.dsk.apps.initTracker = undefined
                }
            }
        })
    }

    updateTracker(data) {
        this.combatData = data
        this.render(true)
    }

    _onClickAction(event, target) {
        ui.combat._onClickAction(event, target);
    }

    async _prepareContext(options) {
        const data = this.combatData;
        mergeObject(options, { position: game.settings.get('dsk', 'iniTrackerPosition') });
        const itemWidth = game.settings.get('dsk', 'iniTrackerSize');
        const actorCount = game.settings.get('dsk', 'iniTrackerCount');

        const combatStarted = data.combat.round;
        const turnsToUse = data.turns;

        const waitingTurns = [];
        const skipDefeated = game.settings.get('core', Combat.CONFIG_SETTING).skipDefeated;


        const anyActive = turnsToUse.some((x) => x.active);
        let unRolled = data.turns.some((x) => x.isOwner && !x.initiative && (!game.user.isGM || data.combat.combatants.get(x.id).isNPC));
        if (turnsToUse.length) {
            const filteredTurns = [];

            let toAdd = actorCount;
            let started = false;
            let startIndex = -1;
            let index = 0;
            let loops = 0;
            let currentRound;
            while (!(toAdd == 0 || loops == actorCount)) {
                const turn = duplicate(turnsToUse[index]);
                const combatant = data.combat.combatants.get(turn.id);
                if (started && index == startIndex) turn.css = turn.css.replace('active', '');

                if (!combatStarted || (turn.active && !started) || (!anyActive && !started)) {
                    started = true;
                    startIndex = index;
                } else if (combatant.getFlag('dsk', 'waitInit') == data.combat.round + loops && !combatant.defeated && (game.user.isGM || !combatant.hidden)) {
                    waitingTurns.push(turn);
                }

                if (started && !(skipDefeated && combatant.defeated) && (game.user.isGM || !combatant.hidden)) {
                    turn.round = data.combat.round + loops;
                    if (turn.isOwner && combatant.token?.actor) {
                        turn.maxLP = combatant.token.actor.system.stats.LeP.max;
                        turn.currentLP = combatant.token.actor.system.stats.LeP.value;
                    }
                    if (currentRound && currentRound != turn.round) turn.newRound = 'newRound';

                    currentRound = turn.round;
                    filteredTurns.push(turn);
                    toAdd--;
                }
                index++;
                if (index >= turnsToUse.length) {
                    index = 0;
                    loops++;
                }
            }
            data.turns = filteredTurns;
        }

        data.isLastRound = data.turns[1]?.newRound;

        options.position.width = itemWidth * actorCount + actorCount * 3 + 75;
        options.position.height = itemWidth + 10;

        Object.assign(data, {
            itemWidth,
            unRolled,
            waitingTurns,
        });

        this.conditionalPanToCurrentCombatant(data);

        return data;
    }

    hasChangedTurn(data) {
        const res = data.turn != this.lastTurnUpdate || data.round != this.lastRoundUpdate;
        this.lastTurnUpdate = data.turn;
        this.lastRoundUpdate = data.round;
        return res;
    }

    async conditionalPanToCurrentCombatant(data) {
        if (!game.settings.get('dsk', 'enableCombatPan')) return;

        const firstTurn = data.turns[0];
        if (!firstTurn) return;

        const combatant = data.combat.combatants.get(firstTurn.id);

        if (!combatant || !this.hasChangedTurn(data)) return;

        setTimeout(() => {
            const token = combatant.token;
            if (!token || !token.object || !token.object.isVisible) return;
            canvas.animatePan({ x: token.x, y: token.y });

            if (!combatant.actor || !combatant.actor.isOwner) return;
            token.object.control({ releaseOthers: true });
        }, 300);
    }

    async _onWheelResize(ev) {
        let newVal = game.settings.get("dsk", "iniTrackerSize")
        if (ev.originalEvent.deltaY > 0) {
            newVal = Math.min(140, newVal + 5)
        } else {
            newVal = Math.max(30, newVal - 5)
        }
        await game.settings.set("dsk", "iniTrackerSize", newVal)
        await this.render(true)
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        const html = $(this.element);

        const container = html.find(".dragHandler");
        new foundry.applications.ux.Draggable(this, html, container[0], this.options.resizable);

        container.on('wheel', async (ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            await this._onWheelResize(ev)
            return false
        })

        const turns = html.find('.iniItem');
        turns.on('pointerover', this._onCombatantHoverIn.bind(this))
        turns.on('pointerout', this._onCombatantHoverOut.bind(this));
        turns.on('dblclick', this._onCombatantMouseDown.bind(this));

        if (!game.user.isGM) return;

        html.find('.rolledInit').on('click', (ev) => this.editCombatant(ev));
    }

    static rollMyChars() {
        if (game.user.isGM) {
            ui.combat.viewed.rollNPC({});
        } else {
            ui.combat.viewed.rollAll({});
        }
    }

    async _onFirstRender(context, options) {
        await super._onFirstRender(context, options);

        this._createContextMenu(this._getDskIniTrackerEntryContextOptions, ".iniTrackerList:not(.waitingTackerList) .combatant", { fixed: true });
    }

    _getDskIniTrackerEntryContextOptions() {
        return ui.combat._getEntryContextOptions();
    }

    static #onCombatantControl(event, target) {
        ui.combat._onCombatantControl(event, target);
    }

    static async waitInit(ev, target) {
        const combatant = game.combat.combatants.get(game.combat.current.combatantId);
        await combatant.setFlag('dsk', 'waitInit', game.combat.current.round);
        target.dataset.action = 'nextTurn';
        this._onClickAction(ev, target);
    }

    static async restoreInit(ev, target) {
        const combatant = game.combat.combatants.get(target.dataset.combatantId);
        if (ev.button == 2 && combatant.isOwner) {
            const currentTurn = game.combat.combatants.get(game.combat.current.combatantId);
            const roundInitiative = currentTurn.properInitiative;
            await combatant.unsetFlag('dsk', 'waitInit');
            await combatant.update({
                "system.roundInitiative": roundInitiative + 0.00001,
            });
            await game.combat.update({ turn: game.combat.turn - 1 })
        }
        else ui.combat._onCombatantMouseDown(ev, target);
    }

    _onCombatantHoverOut(ev) {
        ui.combat._onCombatantHoverOut(ev);
    }

    _onCombatantHoverIn(ev) {
        ui.combat._onCombatantHoverIn(ev);
    }

    static #onCombatantMouseDown(ev, target) {
        ui.combat._onCombatantMouseDown(ev, target);
    }

    editCombatant(ev) {
        ui.combat.viewed.combatants.get(ev.currentTarget.dataset.combatantId)?.sheet.render(true)
    }

    _onCombatantMouseDown(ev) {
        ui.combat._onCombatantMouseDown(ev, ev.target.closest("[data-combatant-id]"));
    }

}