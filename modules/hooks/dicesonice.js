import DSKUtility from "../system/dsk_utility.js";

export function initDSN() {
    Hooks.once('init', () => {
        game.dsk.apps.DiceSoNiceCustomization = new DiceSoNiceCustomization()
    })

    Hooks.once('diceSoNiceReady', (dice3d, b, c, d) => {
        dice3d.addColorset({
            name: 'mu',
            description: 'DSK.mu',
            category: 'DSK.dies',
            foreground: '#FFFFFF',
            background: '#b3241a',
            edge: '#b3241a',
            outline: '#FFFFFF',
            texture: 'none'
        });
        dice3d.addColorset({
            name: 'kl',
            description: 'DSK.kl',
            category: 'DSK.dies',
            foreground: '#FFFFFF',
            background: '#8259a3',
            edge: '#8259a3',
            outline: '#FFFFFF',
            texture: 'none'
        });
        dice3d.addColorset({
            name: 'in',
            description: 'DSK.in',
            category: 'DSK.dies',
            foreground: '#FFFFFF',
            background: '#388834',
            edge: '#388834',
            outline: '#FFFFFF',
            texture: 'none'
        });
        dice3d.addColorset({
            name: 'ch',
            description: 'DSK.ch',
            category: 'DSK.dies',
            foreground: '#FFFFFF',
            background: '#0d0d0d',
            edge: '#0d0d0d',
            outline: '#FFFFFF',
            texture: 'none'
        });
        dice3d.addColorset({
            name: 'ff',
            description: 'DSK.ff',
            category: 'DSK.dies',
            foreground: '#000000',
            background: '#d5b467',
            edge: '#d5b467',
            outline: '#FFFFFF',
            texture: 'none'
        });
        dice3d.addColorset({
            name: 'ge',
            description: 'DSK.ge',
            category: 'DSK.dies',
            foreground: '#000000',
            background: '#688ec4',
            edge: '#688ec4',
            outline: '#FFFFFF',
            texture: 'none'
        });
        dice3d.addColorset({
            name: 'ko',
            description: 'DSK.ko',
            category: 'DSK.dies',
            foreground: '#000000',
            background: '#a3a3a3',
            edge: '#a3a3a3',
            outline: '#FFFFFF',
            texture: 'none'
        });
        dice3d.addColorset({
            name: 'kk',
            description: 'DSK.kk',
            category: 'DSK.dies',
            foreground: '#000000',
            background: '#d6a878',
            edge: '#d6a878',
            outline: '#FFFFFF',
            texture: 'none'
        });
        dice3d.addColorset({
            name: 'attack',
            description: 'DSK.attack',
            category: 'DSK.dies',
            foreground: '#FFFFFF',
            background: '#b3241a',
            edge: '#b3241a',
            outline: '#b3241a',
            texture: 'none'
        });

        game.dsk.apps.DiceSoNiceCustomization.initConfigs()
        DiceSoNiceCustomization.onConnect()
    });
}

export class DiceSoNiceCustomization extends Application {
    static attrs = ["mu", "kl", "in", "ch", "ff", "ge", "ko", "kk", "attack", "damage"]
    initConfigs() {
        const colors = game.dice3d.exports.Utils.prepareColorsetList()
        this.choices = {}
        for (const [key, value] of Object.entries(colors)) {
            mergeObject(this.choices, value)
        }
        const otherKey = { damage: "black" }

        game.settings.registerMenu("dsk", "dicesonicesettings", {
            name: "DiceSoNiceSettings",
            label: "DiceSoNice Settings",
            hint: game.i18n.localize("dsk.SETTINGS.dicesonicesettings"),
            type: DiceSoNiceForm,
            restricted: false
        })
        for (const attr of DiceSoNiceCustomization.attrs) {
            game.settings.register("dsk", `dice3d_${attr}`, {
                name: `CHAR.${attr.toUpperCase()}`,
                scope: "client",
                config: false,
                default: otherKey[attr] || attr,
                type: String
            });
            game.settings.register("dsk", `dice3d_system_${attr}`, {
                name: `CHAR.${attr.toUpperCase()}`,
                scope: "client",
                config: false,
                default: "standard",
                type: String
            });
        }
    }

    getAttributeConfiguration(value) {
        if (DSKUtility.moduleEnabled("dice-so-nice")) {
            return {
                colorset: game.settings.get("dsk", `dice3d_${value}`),
                appearance: {
                    colorset: game.settings.get("dsk", `dice3d_${value}`),
                    system: game.settings.get("dsk", `dice3d_system_${value}`)
                }
            }
        }
        return { colorset: value }
    }

    activateListeners(html) {
        super.activateListeners()
        html.find('[name="entryselection"]').change(async(ev) => {
            await game.settings.set("dsk", `dice3d_${ev.currentTarget.dataset.attr}`, ev.currentTarget.value)
        })
        html.find('[name="systemselection"]').change(async(ev) => {
            await game.settings.set("dsk", `dice3d_system_${ev.currentTarget.dataset.attr}`, ev.currentTarget.value)
            DiceSoNiceCustomization.preloadDiceAssets([ev.currentTarget.value])
            game.socket.emit("system.dsk", {
                type: "preloadDice3d",
                payload: {
                    toPreload: [ev.currentTarget.value]
                }
            })
        })
    }

    static onConnect() {
        game.socket.on("system.dsk", data => {
            switch (data.type) {
                case "preloadDice3d":
                    console.warn("Preloading forced DSK dice assets")
                    DiceSoNiceCustomization.preloadDiceAssets(data.payload)
                    break;
                case "getPreloadDice3d":
                    DiceSoNiceCustomization.requestDicePreloads()
                    break
            }
        })

        this.collectPreloads()
        game.socket.emit("system.dsk", {
            type: "getPreloadDice3d"
        })
    }

    static collectPreloads(loadSelf = true) {
        let payload = new Set()
        for (let attr of DiceSoNiceCustomization.attrs) {
            payload.add(game.settings.get("dsk", `dice3d_system_${attr}`))
        }
        payload = Array.from(payload)

        if (loadSelf) this.preloadDiceAssets(payload)

        game.socket.emit("system.dsk", {
            type: "preloadDice3d",
            payload
        })
    }

    static requestDicePreloads() {
        this.collectPreloads(false)
    }

    static async preloadDiceAssets(names, types = []) {
        console.warn("loading", names)
        for (const name of names) {
            const dieModel = game.dice3d.DiceFactory.systems[name]
            if (!dieModel) continue

            const dieModelsToLoad = dieModel.dice.filter((el) => types.length == 0 || types.includes(el.type))
            for (const model of dieModelsToLoad) {
                try {
                    if (model.modelFile) {
                        await model.loadModel(game.dice3d.DiceFactory.loaderGLTF);
                    } else {
                        await model.loadTextures();
                    }
                } catch (error) {
                    console.warn("Unable to load dice model", name, model)
                }
            }
        }
    }

    async getData(options) {
        const data = await super.getData(options);
        data.choices = this.choices
        data.systems = game.dice3d.DiceFactory.systems
        data.selections = {}
        for (const attr of DiceSoNiceCustomization.attrs) {
            data.selections[attr] = {
                color: game.settings.get("dsk", `dice3d_${attr}`),
                system: game.settings.get("dsk", `dice3d_system_${attr}`)
            }
        }
        return data
    }

    static get defaultOptions() {
        const options = super.defaultOptions
        mergeObject(options, {
            template: 'systems/dsk/templates/wizard/dicesonice-configuration.html',
            title: game.i18n.localize("dsk.SETTINGS.dicesonicesettings"),
            width: 600
        });
        return options
    }
}

class DiceSoNiceForm extends FormApplication {
    render() {
        game.dsk.apps.DiceSoNiceCustomization.render(true)
    }
}