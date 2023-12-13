import { DSKCombatTracker } from "../hooks/combat_tracker.js";

export default class DSKIniTracker extends Application {
    static get defaultOptions() {
        const options = super.defaultOptions;
        mergeObject(options, {
            classes: options.classes.concat(["dsk", "initTracker"]),
            template: "systems/dsk/templates/system/initracker.html",
            dragDrop: [{ dragSelector: ".iniItem", dropSelector: [".iniTrackerList"] }],
            top: 100,
            left: 170,
            title: "dsk.DSKIniTracker"
        });
        const position = game.settings.get("dsk", "iniTrackerPosition")
        mergeObject(options, position)
        return options;
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
        game.settings.set("dsk", "iniTrackerPosition", { left: currentPosition.left, top: currentPosition.top })
        return currentPosition
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

    async getData(options) {
        const data = this.combatData
        let itemWidth = game.settings.get("dsk", "iniTrackerSize")

        const combatStarted = data.round
        const turnsToUse = data.turns

        const waitingTurns = []
        const skipDefeated = game.settings.get("core", Combat.CONFIG_SETTING).skipDefeated

       
        let unRolled = data.turns.some(x => x.owner && !x.hasRolled && (!game.user.isGM || data.combat.combatants.get(x.id).isNPC))
        if (turnsToUse.length) {
            const filteredTurns = []

            let toAdd = 5
            let started = false
            let startIndex = -1
            let index = 0
            let loops = 0
            let currentRound
            while (!(toAdd == 0 || loops == 5)) {
                const turn = duplicate(turnsToUse[index])
                const combatant = data.combat.combatants.get(turn.id)
                if (started && (index == startIndex)) turn.css = turn.css.replace("active", "")

                if (!combatStarted || (turn.active && !started)) {
                    started = true
                    startIndex = index
                } else if (combatant.getFlag("dsk", "waitInit") == data.round + loops && !combatant.defeated && (game.user.isGM || !combatant.hidden)) {
                    waitingTurns.push(turn)
                }

                if (started && !(skipDefeated && combatant.defeated) && (game.user.isGM || !combatant.hidden)) {
                    turn.round = data.round + loops
                    if (turn.owner && combatant.token?.actor) {
                        turn.maxLP = combatant.token.actor.system.stats.LeP.max
                        turn.currentLP = combatant.token.actor.system.stats.LeP.value
                    }
                    if (currentRound && currentRound != turn.round) turn.newRound = "newRound"

                    currentRound = turn.round
                    filteredTurns.push(turn)
                    toAdd--
                }
                index++
                if (index >= turnsToUse.length) {
                    index = 0
                    loops++
                }
            }
            data.turns = filteredTurns
        }
        //if(!data.round) itemWidth = 20

        data.isLastRound = data.turns[1]?.newRound

        this.position.width = itemWidth * 5 + 95
        this.position.height = itemWidth + 10

        mergeObject(data, {
            itemWidth,
            unRolled,
            waitingTurns
        })
                
        this.conditionalPanToCurrentCombatant(data)

        return data
    }

    hasChangedTurn(data){
        const res = data.turn != this.lastTurnUpdate || data.round != this.lastRoundUpdate
        this.lastTurnUpdate = data.turn
        this.lastRoundUpdate = data.round
        return res
    }

    async conditionalPanToCurrentCombatant(data) {
        if (!game.settings.get("dsk", "enableCombatPan")) return

        const firstTurn = data.turns[0]
        if(!firstTurn) return
        
        const combatant = data.combat.combatants.get(firstTurn.id)

        if(!combatant || !this.hasChangedTurn(data)) return

        setTimeout(() => {
            const token = combatant.token;
            if (!token || !token.object || !token.object.isVisible) return;
            canvas.animatePan({ x: token.x, y: token.y });
    
            if (!combatant.actor || !combatant.actor.isOwner) return
            token.object.control({ releaseOthers: true });
        }, 300)        
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

    activateListeners(html) {
        super.activateListeners(html)

        const container = html.find(".dragHandler");
        new Draggable(this, html, container[0], this.options.resizable);

        container.on('wheel', async(ev) => {
            ev.stopPropagation()
            ev.preventDefault()
            await this._onWheelResize(ev)
            return false
        })

        html.find('.combat-control').click(ev => this._onCombatControl(ev))
        const turns = html.find('.iniItem')
        turns.hover(this._onCombatantHoverIn.bind(this), this._onCombatantHoverOut.bind(this));
        turns.click(this._onCombatantMouseDown.bind(this));

        html.find('.waitingTackerList .iniItem').mousedown(ev => this._onRightClick(ev))

        html.find('.combatant-control').click(ev => this._onCombatantControl(ev));

        html.find('.combatant .aggroButton').click(ev => {
            ev.preventDefault()
            ev.stopPropagation()
            DSKCombatTracker.runActAttackDialog()
        })
        html.find('.rollMine').click(ev => this.rollMyChars())

        if (!game.user.isGM) return

        html.find('.rolledInit').click(ev => this.editCombatant(ev))
    }

    rollMyChars() {
        if (game.user.isGM) {
            this._getCombatApp().viewed.rollNPC({})
        } else {
            this._getCombatApp().viewed.rollAll({})
        }
    }

    _onRightClick(ev) {
        if (ev.button == 2) {
            const combatant = game.combat.combatants.get(ev.currentTarget.dataset.combatantId)
            if (combatant.isOwner) {
                combatant.unsetFlag("dsk", "waitInit")
            }
        }
    }

    editCombatant(ev) {
        this._getCombatApp()._onConfigureCombatant($(ev.currentTarget))
    }

    _onCombatantControl(ev) {
        this._getCombatApp()._onCombatantControl(ev)
    }

    _onCombatControl(ev) {
        if (ev.currentTarget.dataset.control == "waitInit") {
            this.waitInit(ev)
        } else {
            this._getCombatApp()._onCombatControl(ev)
        }
    }

    async waitInit(ev) {
        const combatant = game.combat.combatants.get(game.combat.current.combatantId)
        await combatant.setFlag("dsk", "waitInit", game.combat.current.round)
        ev.currentTarget.dataset.control = "nextTurn"
        this._getCombatApp()._onCombatControl(ev)
    }

    _onCombatantHoverOut(ev) {
        this._getCombatApp()._onCombatantHoverOut(ev)
    }

    _onCombatantHoverIn(ev) {
        this._getCombatApp()._onCombatantHoverIn(ev)
    }

    _onCombatantMouseDown(ev) {
        this._getCombatApp()._onCombatantMouseDown(ev)
    }

    _getCombatApp() {
        return game.combats.apps[0]
    }

    _canDragStart(selector) {
        return false // game.user.isGM;
    }

    _canDragDrop(selector) {
        return false // game.user.isGM;
    }

    _onDragStart(event) {
        const combatantId = $(event.currentTarget).closestData('combatant-id');
        event.dataTransfer.setData("text/plain", JSON.stringify({
            type: "IniChange",
            combatantId: combatantId,
        }));
    }

    _onDrop(event) {
        const data = JSON.parse(event.dataTransfer.getData("text/plain"));

        if (data.type == "IniChange") {
            //TODO init tracker resorting
        }
    }
}