import ItemDSK from "../item/item_dsk.js";
import DSKStatusEffects from "../status/status_effects.js";
import AdvantageRulesDSK from "../system/advantage-rules.js";
import DSK from "../system/config.js";
import DiceDSK from "../system/dicedsk.js";
import DSKUtility from "../system/dsk_utility.js";
import RuleChaos from "../system/rule_chaos.js";
import { tinyNotification } from "../system/view_helper.js";
import OpposedDSK from "../system/opposeddsk.js";
import SpecialabilityRulesDSK from "../system/specialability-rules.js";
import DSKDialog from "../dialog/dialog-dsk.js";
import TraitRulesDSK from "../system/trait_rules.js"
import DSKActiveEffectConfig from "../status/active_effects.js";

export default class ActorDSK extends Actor {
    static _baseCarryItems = new Set(["armor", "meleeweapon", "ammunition", "rangeweapon", "plant", "poison", "money", "consumable", "equipment"])
    static _mageSpecs = new Set(["ahnen"])

    static async create(data, options) {
        if (data instanceof Array || data.items) return await super.create(data, options);

        if (!data.img || data.img == "icons/svg/mystery-man.svg") data.img = "icons/svg/mystery-man-black.svg";

        const elems = ["skill", "combatskill"]
        if(["character", "npc"].includes(data.type)){
          elems.push("meleeweapon", "specialability")
        }
        data.items = await DSKUtility.allSkills(elems);

        const schipsCounts = {
          "character": 3,
          "npc": 1,
          "creature": 0
        }
        let schipsCount = getProperty(data, "system.stats.schips.current") || schipsCounts[data.type] || 0
        
        data.system = { stats: { schips: { current: schipsCount, value: schipsCount } } }

        if (data.type != "creature" && [undefined, 0].includes(getProperty(data, "system.stats.LeP.value")))
            mergeObject(data, { system: { stats: { LeP: { value: 16 } } } });

        return await super.create(data, options);
    }

    prepareDerivedData() {
        const data = this.system;
        try {
            data.canAdvance = this.isOwner && this.type == "character"
            
            for (let ch of Object.values(data.characteristics)) {
                ch.value = ch.initial + ch.advances + (ch.modifier || 0) + ch.gearmodifier;
            }

            data.totalWeight = 0;
      
            const armor = []

            let containers = new Map();
            const bags = this.items.filter(x => x.type == "equipment" && x.system.category == "bags")
            for (let container of bags) {
              containers.set(container.id, []);
            }

            for(const i of this.items){
              if(ActorDSK._baseCarryItems.has(i.type)){
                let parent_id = getProperty(i, "system.parent_id");
                if (parent_id && parent_id != i._id) {
                  if (containers.has(parent_id)) {
                    containers.get(parent_id).push(i);
                    continue;
                  }
                }
                if(i.type == "armor"){
                  i.system.preparedWeight = parseFloat((i.system.weight * i.system.quantity).toFixed(3));
                  data.totalWeight += parseFloat(
                    (
                      i.system.weight.value * (i.system.worn.value ? Math.max(0, i.system.quantity - 1) : i.system.quantity)
                    ).toFixed(3)
                  );
                  if(i.system.worn.value) armor.push(i)
                } else {
                  i.system.preparedWeight = parseFloat((i.system.weight * i.system.quantity).toFixed(3));
                  data.totalWeight += Number(i.system.preparedWeight);
                }
              } else { 
                switch(i.type){
                  case "ahnengabe":
                  case "ahnengeschenk":
                    data.isMage = true
                    break
                  case "specialability":
                    if(ActorDSK._mageSpecs.has(i.system.category)) data.isMage = true
                    break              
                }
              }
            }

            for(let bag of bags){
              let parent_id = getProperty(bag, "system.parent_id")
              if(!parent_id || !containers.has(parent_id))
                data.totalWeight += this._calcBagweight(bag, containers, true)
            }

            data.carrycapacity = data.characteristics.kk.value * 2 + data.carryModifier

            if (data.canAdvance) {
                data.details.experience.current = data.details.experience.total - data.details.experience.spent;
            }

            if (this.type == "character" || this.type == "npc") {
                data.stats.LeP.current = data.stats.LeP.initial + data.characteristics.ko.value * 2;
                data.stats.AeP.current = (!data.guidevalue || data.guidevalue == "-") ? 0 : ActorDSK._attrFromCharacteristic(data.guidevalue, data)
                data.stats.sk.value =
                    (data.stats.sk.initial || 0) +
                    Math.round((data.characteristics.mu.value + data.characteristics.kl.value + data.characteristics.in.value) / 3) - 10;
                data.stats.zk.value =
                    (data.stats.zk.initial || 0) +
                    Math.round((data.characteristics.ko.value + data.characteristics.ko.value + data.characteristics.kk.value) / 3) - 10;
                data.stats.ini.value =
                    Math.round((data.characteristics.mu.value + data.characteristics.ge.value) / 2) +
                    (data.stats.ini.modifier || 0);

                data.stats.LeP.min = -1 * data.characteristics.ko.value
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
            data.stats.AeP.max =
                data.stats.AeP.current +
                data.stats.AeP.modifier +
                data.stats.AeP.advances +
                data.stats.AeP.gearmodifier;

            data.stats.gs.max = Math.max(0, data.stats.gs.initial + (data.stats.gs.modifier || 0) + data.stats.gs.gearmodifier);
            
            data.stats.sk.max =
                data.stats.sk.value + data.stats.sk.modifier + data.stats.sk.gearmodifier;
            data.stats.zk.max =
                data.stats.zk.value + data.stats.zk.modifier + data.stats.zk.gearmodifier;

            let encumbrance = 0
            data.stats.ini.value += data.stats.ini.gearmodifier - Math.min(4, encumbrance);
            const baseInit = Number((0.01 * data.stats.ini.value).toFixed(2));
            data.stats.ini.value *= data.stats.ini.multiplier || 1;
            data.stats.ini.value = Math.round(data.stats.ini.value) + baseInit;

            if (DSKUtility.isActiveGM()) {
              const pain = this.woundPain(data)
              const currentPain = this.effects.find(x => x.statuses.has("inpain"))?.flags.dsk.auto || 0
      
              const changePain = !this.changingPain && (currentPain != pain)
              this.changingPain = currentPain != pain;
      
              if (changePain && !TraitRulesDSK.hasTrait(this, game.i18n.localize("dsk.LocalizedIDs.painImmunity")))
                this.addCondition("inpain", pain * 2, true).then(() => this.changingPain = undefined);

              let encumbrance = this.getArmorEncumbrance(this, armor);
              if ((this.type != "creature" || this.canAdvance) && !this.isMerchant()) {
                encumbrance += Math.max(0, Math.ceil((data.totalWeight - data.carrycapacity - 5) / 5)) * 2;
              }
      
              const currentEncumbrance =  this.effects.find(x => x.statuses.has("encumbered"))?.flags.dsk.auto || 0
      
              const changeEncumbrance = !this.changingEncumbrance && (currentEncumbrance != encumbrance)
              this.changingEncumbrance = currentEncumbrance != encumbrance;
      
              if(changeEncumbrance) this.addCondition("encumbered", encumbrance, true);
      
              if (AdvantageRulesDSK.hasVantage(this, game.i18n.localize("dsk.LocalizedIDs.blind"))) this.addCondition("blind");
              if (AdvantageRulesDSK.hasVantage(this, game.i18n.localize("dsk.LocalizedIDs.mute"))) this.addCondition("mute");
              if (AdvantageRulesDSK.hasVantage(this, game.i18n.localize("dsk.LocalizedIDs.deaf"))) this.addCondition("deaf");
      
              if (this.isMerchant()) this.prepareMerchant()
            }

            for(let key of Object.keys(data.status)){
              data.status[key] = Math.clamped(data.status[key], 0, 8)
            }

            this.effectivePain(data)

            data.maxDefense = this.maxDefenseValue()
        } catch (error) {
            console.error("Something went wrong with preparing actor data: " + error + error.stack);
            ui.notifications.error(game.i18n.format("dsk.DSKError.PreparationError", { name: this.name }) + error + error.stack);
        }
    }

    effectivePain(data){
      let pain = data.status.inpain || 0
      if (pain < 8)
        pain -= AdvantageRulesDSK.vantageStep(this, game.i18n.localize("dsk.LocalizedIDs.ruggedFighter")) 
      if (pain > 0)
        pain += AdvantageRulesDSK.vantageStep(this, game.i18n.localize("dsk.LocalizedIDs.sensitiveToPain")) 
  
      pain = Math.clamped(pain, 0, 8);
      data.status.inpain = pain
    }

    woundPain(data){
      let pain = 0;
      if (data.stats.LeP.max > 0) {
        const hasDefaultPain = this.type != "creature" || data.stats.LeP.max >= 20;
        if (hasDefaultPain) {
          pain = Math.floor((1 - data.stats.LeP.value / data.stats.LeP.max) * 4);
          if (data.stats.LeP.value <= 5) pain = 4;
        } else {
          pain = Math.floor(5 - (5 * data.stats.LeP.value) / data.stats.LeP.max);
        }
      } 
      return Math.clamped(pain, 0, 4)
    }

    static _calculateCombatSkillValues(i, actorData) {
        i = ActorDSK._calculatePW(i, actorData)
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

    async prepareMerchant() {
      if (getProperty(this, "system.merchant.merchantType") == "loot") {
        if (getProperty(this, "system.merchant.locked") && !this.hasCondition("locked")) {
          await this.addCondition(ActorDSK.lockedCondition());
        } else if (!getProperty(this, "system.merchant.locked")) {
          let ef = this.effects.find((x) => x.statuses.has("locked"));
          if (ef) await this.deleteEmbeddedDocuments("ActiveEffect", [ef.id]);
        }
      }
    }

    static lockedCondition() {
      return {
        id: "locked",
        name: game.i18n.localize("dsk.MERCHANT.locked"),
        icon: "icons/svg/padlock.svg",
        flags: {
          dsk: {
            value: null,
            editable: true,
            noEffect: true,
            hidePlayers: true,
            description: game.i18n.localize("dsk.MERCHANT.locked"),
            custom: true,
          },
        },
      };
    }

    isMerchant() {
      return ["merchant", "loot"].includes(getProperty(this, "system.merchant.merchantType"));
    }

    applyActiveEffects() {
        const overrides = {};

        this.statuses ??= new Set();
      // Identify which special statuses had been active
      const specialStatuses = new Map();
      for ( const statusId of Object.values(CONFIG.specialStatusEffects) ) {
        specialStatuses.set(statusId, this.statuses.has(statusId));
      }
      this.statuses.clear();

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
                        case "trait":
                            apply = !["meleeAttack", "rangeAttack"].includes(item.system.traitType)
                            break
                        case "ammunition":
                        case "combatskill":
                        case "poison":
                        case "ahnengabe":
                        case "ahnengeschenk":
                            apply = false;
                            break;
                        case "specialability":
                            apply = item.system.category != "Combat" || [2, 3].includes(item.system.subcategory);
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
            } else{
              const flag = e.getFlag("dsk", "value")
              if(flag){
                multiply = Number(flag)
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
            for ( const statusId of e.statuses ) this.statuses.add(statusId);
            return changes
        }, []);
        changes.sort((a, b) => a.priority - b.priority);

        for (let change of changes) {
          if ( !change.key ) continue;
          const result = change.effect.apply(this, change);
          Object.assign(overrides, result);
        }

        this.overrides = foundry.utils.expandObject(overrides);
        let tokens;
        for ( const [statusId, wasActive] of specialStatuses ) {
          const isActive = this.statuses.has(statusId);
          if ( isActive === wasActive ) continue;
          tokens ??= this.getActiveTokens();
          for ( const token of tokens ) token._onApplyStatusEffect(statusId, isActive);
        }
    }

    maxDefenseValue(){
      let defense = { parry: 0, name: game.i18n.localize("dsk.noDefense")}
      const combatskills = []
      const wornweapons = []
      for(let cur of this.items){
        if(cur.type == "combatskill"){
          combatskills.push(ActorDSK._calculateCombatSkillValues(cur, this.system))
        } else if(cur.type == "meleeweapon"){
          if(getProperty(cur, "system.worn.value")) wornweapons.push(cur)
        } else if(cur.type == "trait" && cur.system.traitType == "meleeAttack"){
          const trait = ActorDSK._prepareMeleetrait(cur, this)
          if(trait.parry > defense.parry) defense = trait
        }
      }
      
      for(let item of wornweapons){
        const weapon = ActorDSK._prepareMeleeWeapon(
            item,
            combatskills,
            this,
            wornweapons.filter((x) => x._id != item._id && !RuleChaos.isYieldedTwohanded(x))
        )
        if(weapon.parry >= defense.parry) defense = weapon
      }

      return defense
    }

    preparePostRollAction(message) {
      let data = message.flags.data;
      let cardOptions = {
        flags: { img: message.flags.img },
        rollMode: data.rollMode,
        speaker: message.speaker,
        template: data.template,
        title: data.title,
        user: message.user,
      };
      if (data.attackerMessage) cardOptions.attackerMessage = data.attackerMessage;
      if (data.defenderMessage) cardOptions.defenderMessage = data.defenderMessage;
      if (data.unopposedStartMessage) cardOptions.unopposedStartMessage = data.unopposedStartMessage;
      return cardOptions;
    }

    async useFateOnRoll(message, type, schipsource) {
      if (type == "isTalented" || DSKUtility.fateAvailable(this, schipsource == 1)) {
        let data = message.flags.data;
        let cardOptions = this.preparePostRollAction(message);
        let fateAvailable;
        let schipText;
        if (schipsource == 0) {
          fateAvailable = this.system.stats.schips.value - 1;
          schipText = "PointsRemaining";
        } else {
          fateAvailable = game.settings.get("dsk", "groupschips").split("/")[0];
          schipText = "GroupPointsRemaining";
        }
        let infoMsg = `<h3 class="center"><b>${game.i18n.localize("dsk.CHATFATE.fatepointUsed")}</b></h3>
                  ${game.i18n.format("dsk.CHATFATE." + type, {
          character: "<b>" + this.name + "</b>",
        })}<br>
                  <b>${game.i18n.localize(`dsk.CHATFATE.${schipText}`)}</b>: ${fateAvailable}`;
  
        let newTestData = data.preData;
        newTestData.extra.actor = DSKUtility.getSpeaker(newTestData.extra.speaker).toObject(false);
  
        this[`fate${type}`](infoMsg, cardOptions, newTestData, message, data, schipsource);
      }
    }

    resetTargetAndMessage(data, cardOptions) {
      if (data.originalTargets?.size) {
        game.user.targets = data.originalTargets;
        game.user.targets.user = game.user;
      }
      if (!data.defenderMessage && data.startMessagesList) {
        cardOptions.startMessagesList = data.startMessagesList;
      }
    }

    async fatererollDamage(infoMsg, cardOptions, newTestData, message, data, schipsource) {
      cardOptions.fatePointDamageRerollUsed = true;
      this.resetTargetAndMessage(data, cardOptions);
      const html = await renderTemplate("systems/dsk/templates/dialog/fateReroll-dialogDamage.html", {
        testData: newTestData,
        postData: data.postData,
        singleDie: data.postData.characteristics.filter(x => x.char == "damage").length == 1
      });
      new DSKDialog({
        title: game.i18n.localize("dsk.CHATFATE.selectDice"),
        content: html,
        buttons: {
          Yes: {
            icon: '<i class="fa fa-check"></i>',
            label: game.i18n.localize("dsk.ok"),
            callback: async (dlg) => {
              let diesToReroll = dlg.find(".dieSelected").map(function () {return Number($(this).attr("data-index"));}).get();
              if (diesToReroll.length > 0) {
                let oldDamageRoll = Roll.fromData(data.postData.damageRoll);
                let newRoll = await DiceDSK.manualRolls(
                  await new Roll(oldDamageRoll.formula || oldDamageRoll._formula).evaluate({ async: true }),
                  "dsk.CHATCONTEXT.rerollDamage"
                );
                await DiceDSK.showDiceSoNice(newRoll, newTestData.rollMode);
                for (let i = 0; i < newRoll.dice.length; i++) newRoll.dice[i].options.colorset = "black";

                let ind = 0;
                let changedRolls = [];

                const changes = []
                for (let k of diesToReroll) {
                  changedRolls.push(
                    `${oldDamageRoll.terms[(k - 2) * 2].results[0].result}/${newRoll.terms[ind * 2].results[0].result}`
                  );    
                  changes.push({ index: (k-2)*2, val: newRoll.terms[ind * 2].results[0].result })
                  ind += 1;
                }
                oldDamageRoll.editRollAtIndex(changes)
                newTestData.damageRoll = oldDamageRoll
  
                infoMsg += `<br><b>${game.i18n.localize("dsk.Roll")}</b>: ${changedRolls.join(", ")}`;
                ChatMessage.create(DSKUtility.chatDataSetup(infoMsg));

                this[`${data.postData.postFunction}`]({ testData: newTestData, cardOptions }, { rerenderMessage: message });
                await message.update({ "flags.data.fatePointDamageRerollUsed": true });
                await this.reduceSchips(schipsource);
              }
            }
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("dsk.cancel"),
          },
        },
        default: "Yes",
      }).render(true);

      
    }

    async fatereroll(infoMsg, cardOptions, newTestData, message, data, schipsource) {
      cardOptions.fatePointDamageRerollUsed = true;
      this.resetTargetAndMessage(data, cardOptions);
  
      const html = await renderTemplate("systems/dsk/templates/dialog/fateReroll-dialog.html", {
        testData: newTestData,
        postData: data.postData,
        singleDie: data.postData.characteristics.filter(x => x.char != "damage").length == 1
      });
      new DSKDialog({
        title: game.i18n.localize("dsk.CHATFATE.selectDice"),
        content: html,
        buttons: {
          Yes: {
            icon: '<i class="fa fa-check"></i>',
            label: game.i18n.localize("dsk.ok"),
            callback: async (dlg) => {
              let diesToReroll = dlg.find(".dieSelected").map(function () {return Number($(this).attr("data-index"));}).get();
              if (diesToReroll.length > 0) {
                let newRoll = [];
                for (let k of diesToReroll) {
                  let term = newTestData.roll.terms[k * 2];
                  newRoll.push(term.number + "d" + term.faces + "[" + term.options.colorset + "]");
                }
                newRoll = await DiceDSK.manualRolls(
                  await new Roll(newRoll.join("+")).evaluate({ async: true }),
                  "dsk.CHATCONTEXT.Reroll"
                );
                await DiceDSK.showDiceSoNice(newRoll, newTestData.rollMode);
  
                let ind = 0;
                let changedRolls = [];
                const actor = DSKUtility.getSpeaker(newTestData.extra.speaker);
                const phexTradition = game.i18n.localize("dsk.LocalizedIDs.traditionPhex");
                const isPhex = actor.items.some((x) => x.type == "specialability" && x.name == phexTradition);
  
                for (let k of diesToReroll) {
                  const characteristic = newTestData.source.system[`characteristic${k + 1}`];
                  const attr = characteristic ? `${game.i18n.localize(`dsk.characteristics.${characteristic}.abbr`)} - ` : "";
                  changedRolls.push(
                    `${attr}${newTestData.roll.terms[k * 2].results[0].result}/${newRoll.terms[ind * 2].results[0].result}`
                  );
                  if (isPhex)
                    newTestData.roll.terms[k * 2].results[0].result = Math.min(
                      newRoll.terms[ind * 2].results[0].result,
                      newTestData.roll.terms[k * 2].results[0].result
                    );
                  else newTestData.roll.terms[k * 2].results[0].result = newRoll.terms[ind * 2].results[0].result;
  
                  ind += 1;
                }
  
                infoMsg += `<br><b>${game.i18n.localize("dsk.Roll")}</b>: ${changedRolls.join(", ")}`;
                ChatMessage.create(DSKUtility.chatDataSetup(infoMsg));
  
                this[`${data.postData.postFunction}`]({ testData: newTestData, cardOptions }, { rerenderMessage: message });
                await message.update({ "flags.data.fatePointRerollUsed": true});
                await this.reduceSchips(schipsource);
              }
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("dsk.cancel"),
          },
        },
        default: "Yes",
      }).render(true);
    }

    async fateisTalented(infoMsg, cardOptions, newTestData, message, data) {
      cardOptions.talentedRerollUsed = true;
  
      this.resetTargetAndMessage(data, cardOptions);
  
      infoMsg = `<h3 class="center"><b>${game.i18n.localize("dsk.CHATFATE.fatepointUsed")}</b></h3>
              ${game.i18n.format("dsk.CHATFATE.isTalented", {
        character: "<b>" + this.name + "</b>",
      })}<br>`;
      const html = await renderTemplate("systems/dsk/templates/dialog/isTalentedReroll-dialog.html", {
        testData: newTestData,
        postData: data.postData,
      });
      new DSKDialog({
        title: game.i18n.localize("dsk.CHATFATE.selectDice"),
        content: html,
        buttons: {
          Yes: {
            icon: '<i class="fa fa-check"></i>',
            label: game.i18n.localize("dsk.ok"),
            callback: async (dlg) => {
              let diesToReroll = dlg.find(".dieSelected").map(function () {return Number($(this).attr("data-index"));}).get();
              if (diesToReroll.length > 0) {
                let newRoll = [];
                for (let k of diesToReroll) {
                  let term = newTestData.roll.terms[k * 2];
                  newRoll.push(term.number + "d" + term.faces + "[" + term.options.colorset + "]");
                }
                newRoll = await DiceDSK.manualRolls(
                  await new Roll(newRoll.join("+")).evaluate({ async: true }),
                  "dsk.CHATCONTEXT.talentedReroll"
                );
                await DiceDSK.showDiceSoNice(newRoll, newTestData.rollMode);
  
                let ind = 0;
                let changedRolls = [];
  
                for (let k of diesToReroll) {
                  const characteristic = newTestData.source.system[`characteristic${k + 1}`];
                  const attr = characteristic ? `${game.i18n.localize(`dsk.characteristics.${characteristic}.abbr`)} - ` : "";
  
                  changedRolls.push(
                    `${attr}${newTestData.roll.terms[k * 2].results[0].result}/${newRoll.terms[ind * 2].results[0].result}`
                  );
                  newTestData.roll.terms[k * 2].results[0].result = newRoll.terms[ind * 2].results[0].result;
  
                  ind += 1;
                }
                infoMsg += `<b>${game.i18n.localize("dsk.Roll")}</b>: ${changedRolls.join(", ")}`;
                ChatMessage.create(DSKUtility.chatDataSetup(infoMsg));
  
                this[`${data.postData.postFunction}`]({ testData: newTestData, cardOptions }, { rerenderMessage: message });
                await message.update({ "flags.data.talentedRerollUsed": true });
              }
            },
          },
          cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: game.i18n.localize("dsk.cancel"),
          },
        },
        default: "Yes",
      }).render(true);
    }

    async reduceSchips(schipsource) {
      if (schipsource == 0)
        await this.update({"system.stats.schips.value": this.system.stats.schips.value - 1});
      else {
        await ActorDSK.reduceGroupSchip()
      }
    }

    async modifyTokenAttribute(attribute, value, isDelta=false, isBar=true) {
      const current = foundry.utils.getProperty(this.system, attribute);
  
      let updates;
      if ( isBar ) {
        if (isDelta) value = Math.clamped(current.min || 0, Number(current.value) + value, current.max);
        updates = {[`system.${attribute}.value`]: value};
      } else {
        if ( isDelta ) value = Number(current) + value;
        updates = {[`system.${attribute}`]: value};
      }
      const allowed = Hooks.call("modifyTokenAttribute", {attribute, value, isDelta, isBar}, updates);
      return allowed !== false ? this.update(updates) : this;
    }

    static armorValue(actor, options = {}) {
      let wornArmor = actor.items.filter((x) => x.type == "armor" && x.system.worn.value == true);
      if (options.origin) {
        wornArmor = wornArmor.map((armor) => {
          let optnCopy = mergeObject(duplicate(options), { armor });
          return DSKActiveEffectConfig.applyRollTransformation(actor, optnCopy, 4).options.armor;
        });
      }
      const protection = wornArmor.reduce((a, b) => a + b.system.rs, 0);
      const animalArmor = actor.items
        .filter((x) => x.type == "trait" && x.system.traitType == "armor")
        .reduce((a, b) => a + Number(b.system.at), 0);
      return {
        wornArmor,
        armor: protection + animalArmor + (actor.system.totalArmor || 0),
      };
    }

    prepareBaseData() {
        const system = this.system;

        mergeObject(system, {
            skillModifiers: {
                FP: [],
                step: [],
                QL: [],
                TPM: [],
                FW: [],
                botch: 20,
                crit: 1,
                global: [],
                conditional: {
                  AePCost: []
                },
                feature: {
                  FP: [],
                  step: [],
                  QL: [],
                  TPM: [],
                  FW: [],
                  AePCost: [],
                },
                ...["ahnengabe", "skill"].reduce((prev, x) => {
                  prev[x] = {
                    FP: [],
                    step: [],
                    QL: [],
                    TPM: [],
                    FW: [],
                  };
                  return prev;
                }, {}),
              },
            repeatingEffects: {
                startOfRound: {
                    LeP: [],
                    AeP: []
                },
            },
            aepModifier: 0,
            creatureBonus: [],
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
            spellStats: {
                damage: "0",
            },
            meleeStats: {
                parry: 0,
                attack: 0,
                damage: "0",
                defenseMalus: 0,
                botch: 20,
                crit: 1,
            },
            rangeStats: {
                attack: 0,
                damage: "0",
                defenseMalus: 0,
                botch: 20,
                crit: 1,
            },
            totalArmor: 0,
            carryModifier: 0,

        })
        for (const k of Object.values(system.stats)) k.gearmodifier = 0;

        for (let ch of Object.values(system.characteristics)) ch.gearmodifier = 0
    }

    prepareSheet(sheetInfo) {
        let preData = duplicate(this);
        let preparedData = { system: { characteristics: {}} };
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

            for (let [key, ch] of Object.entries(this.system.characteristics)) {
              preparedData.system.characteristics[key] = {
                cost: game.i18n.format("dsk.advancementCost", {
                  cost: DSKUtility._calculateAdvCost(ch.initial + ch.advances, "Eig"),
                }),
                refund: game.i18n.format("dsk.refundCost", {
                  cost: DSKUtility._calculateAdvCost(ch.initial + ch.advances, "Eig", 0),
                })
              };
            }
        }

        return preparedData;
    }

    _perpareItemAdvancementCost(item) {
        item.cost = game.i18n.format("dsk.advancementCost", {
            cost: DSKUtility._calculateAdvCost(item.system.level, item.system.StF),
        });
        item.refund = game.i18n.format("dsk.refundCost", {
            cost: DSKUtility._calculateAdvCost(item.system.level, item.system.StF, 0),
        });
        item.canAdvance = this.system.canAdvance;
        return item;
    }

    static _prepareRangeTrait(item, actor) {
      item.attack = Number(item.system.at) + Number(actor.system.rangeStats.attack);
      item.LZ = Number(item.system.lz);
      if (item.LZ > 0) ActorDSK.buildReloadProgress(item);
  
      return this._parseDmg(item);
    }

    static _prepareRangeWeapon(item, ammunitions, combatskills, actor) {
        let skill = combatskills.find((i) => i.name == item.system.combatskill);
        item.calculatedRange = item.system.rw;
    
        let currentAmmo;
        if (skill) {
         item.attack = Number(skill.system.attack) + Number(actor.system.rangeStats.attack);

   
          if (item.system.ammunitionType != "-") {
            item.ammo = ammunitions.filter((x) => x.system.ammunitionType == item.system.ammunitionType);
    
            currentAmmo = ammunitions.find((x) => x._id == item.system.currentAmmo);
            if (currentAmmo) {
              const rangeMultiplier = Number(currentAmmo.system.rangeMultiplier) || 1;
              item.calculatedRange = item.calculatedRange
                .split("/")
                .map((x) => Math.round(Number(x) * rangeMultiplier))
                .join("/");
              item.attack += Number(currentAmmo.system.atmod) || 0;
              if (currentAmmo.system.ammunitionType == "mag") {
                item.ammoMax = currentAmmo.system.mag.max;
                item.ammoCurrent = currentAmmo.system.mag.value;
              }
            }
          }
          item.LZ = ActorDSK.calcLZ(item, actor);
          if (item.LZ > 0) ActorDSK.buildReloadProgress(item);
        } else {
          ui.notifications.error(
            game.i18n.format("dsk.DSKError.unknownCombatSkill", {
              skill: item.system.combatskill,
              item: item.name,
            })
          );
        }
    
        return this._parseDmg(item, currentAmmo);
      }

    static _prepareMeleetrait(item, actor) {
      item.attack = Number(item.system.at);
      item.parry = Math.max(0, (Number(item.system.pa) || Math.round(item.attack / 4)) + Number(actor.system.meleeStats.parry));
  
      return this._parseDmg(item);
    }

    static _prepareMeleeWeapon(item, combatskills, actorData, wornWeapons = null) {
        let skill = combatskills.find((i) => i.name == item.system.combatskill);
        if (skill) {
          item.attack = Number(skill.system.attack) + Number(item.system.aw);
          item.parry = Math.max(0, skill.system.parry + Number(item.system.vw) + Number(actorData.system.meleeStats.parry) +
            (item.system.combatskill == game.i18n.localize("dsk.LocalizedIDs.Shields") ? Number(item.system.vw) : 0));
    
          item.yieldedTwoHand = RuleChaos.isYieldedTwohanded(item)
          if (!item.yieldedTwoHand) {
            if (!wornWeapons)
              wornWeapons = duplicate(actorData.items).filter(
                (x) => x.type == "meleeweapon" && x.system.worn.value && x._id != item._id && !RuleChaos.isYieldedTwohanded(x)
              );
    
            if (wornWeapons.length > 0) {
              item.parry += Math.max(...wornWeapons.map((x) => x.system.vwoffhand));
              item.attack += Math.max(...wornWeapons.map((x) => x.system.awoffhand));
            }
          }
    
          let extra = 0
          if (item.system.worn.wrongGrip) {
            if (item.yieldedTwoHand) {
              item.parry -= 1
              extra += 1
            }
          }
    
          item = this._parseDmg(item);

          if (extra > 0) {
            item.extraDamage = extra;
            item.damageAdd = Roll.safeEval(item.damageAdd + " + " + Number(extra));
            item.damageAdd = (item.damageAdd > 0 ? "+" : "") + item.damageAdd;
          }
        } else {
          ui.notifications.error(
            game.i18n.format("dsk.DSKError.unknownCombatSkill", {
              skill: item.system.combatskill,
              item: item.name,
            })
          );
        }
        
        return item;
      }

      static _parseDmg(item, modification = undefined) {
        let parseDamage = new Roll(item.system.tp.replace(/[Ww]/g, "d"), { async: false });
    
        let damageDie = "",
          damageTerm = "",
          lastOperator = "+";
        for (let k of parseDamage.terms) {
          if (k.faces) damageDie = k.number + "d" + k.faces;
          else if (k.operator) lastOperator = k.operator;
          else if (k.number) damageTerm += Number(`${lastOperator}${k.number}`);
        }
        if (modification) {
          let damageMod = getProperty(modification, "system.damageMod");
          if (Number(damageMod)) damageTerm += `+${Number(damageMod)}`;
          else if (damageMod)
            item.damageBonusDescription = `, ${damageMod} ${game.i18n.localize("dsk.CHARAbbrev.damage")} ${modification.name}`;
        }
        if (damageTerm) damageTerm = Roll.safeEval(damageTerm);
    
        item.damagedie = damageDie ? damageDie : "0d6";
        item.damageAdd = damageTerm != "" ? (Number(damageTerm) >= 0 ? "+" : "") + damageTerm : "";
    
        return item;
      }

      static calcLZ(item, actor) {
        let factor = 1;
        let modifier = 0;
        if (item.system.combatskill == game.i18n.localize("dsk.LocalizedIDs.Throwing Weapons"))
          modifier = SpecialabilityRulesDSK.abilityStep(actor, game.i18n.localize("dsk.LocalizedIDs.quickdraw")) * -1;
        else if (
          item.system.combatskill == game.i18n.localize("dsk.LocalizedIDs.Crossbows") &&
          SpecialabilityRulesDSK.hasAbility(
            actor,
            game.i18n.localize("dsk.LocalizedIDs.quickload")
          )
        )
          factor = 0.5;
        else {
          modifier =
          SpecialabilityRulesDSK.abilityStep(
              actor,
              game.i18n.localize("dsk.LocalizedIDs.quickload")
            ) * -1;
        }
    
        let reloadTime = `${item.system.lz}`.split("/");
        if (item.system.ammunitionType == "mag") {
          let currentAmmo = actor.items.find((x) => x.id == item.system.currentAmmo || x._id == item.system.currentAmmo);
          let reloadType = 0;
          if (currentAmmo) {
            currentAmmo =  DSKUtility.toObjectIfPossible(currentAmmo)
            if (currentAmmo.system.mag.value <= 0) reloadType = 1;
          }
          reloadTime = reloadTime[reloadType] || reloadTime[0];
        } else {
          reloadTime = reloadTime[0];
        }
    
        return Math.max(0, Math.round(Number(reloadTime) * factor) + modifier);
      }

    _setOnUseEffect(item) {
        if (getProperty(item, "flags.dsk.onUseEffect")) item.OnUseEffect = true;
    }

    static _attrFromCharacteristic(char, actorData) {
        return actorData.characteristics[char].value
    }

    static _calculatePW(item, actorData) {
        item.PW = Math.round((ActorDSK._attrFromCharacteristic(item.system.characteristic1, actorData) + ActorDSK._attrFromCharacteristic(item.system.characteristic2, actorData))/2) + 5 + (item.system.level || 0)
        return item
    }

    static buildReloadProgress(item) {
        const progress = item.system.reloadTimeprogress / item.LZ;
        item.title = game.i18n.format("dsk.WEAPON.loading", {
          status: `${item.system.reloadTimeprogress}/${item.LZ}`,
        });
        item.progress = `${item.system.reloadTimeprogress}/${item.LZ}`;
        if (progress >= 1) {
          item.title = game.i18n.localize("dsk.WEAPON.loaded");
        }
        this.progressTransformation(item, progress);
      }

      static progressTransformation(item, progress) {
        if (progress >= 0.5) {
          item.transformRight = "181deg";
          item.transformLeft = `${Math.round(progress * 360 - 179)}deg`;
        } else {
          item.transformRight = `${Math.round(progress * 360 + 1)}deg`;
          item.transformLeft = 0;
        }
      }

      getArmorEncumbrance(actorData, wornArmors) {
        const encumbrance = wornArmors.reduce((sum, a) => {
          a.calculatedEncumbrance = Number(a.system.encumbrance)
          return (sum += a.calculatedEncumbrance);
        }, 0);
        return Math.max(
          0,
          encumbrance - SpecialabilityRulesDSK.abilityStep(actorData, game.i18n.localize("dsk.LocalizedIDs.inuredToEncumbrance"))
        );
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
        const traits = Object.fromEntries(Object.keys(DSK.traitCategories).map((x) => [x, []]));
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
        let hasTrait = false;

        for (let i of actorData.items) {
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
                        skills[i.system.group].push(ActorDSK._calculatePW(this._perpareItemAdvancementCost(i, actorData.system), actorData.system));
                        break;
                    case "information":
                        information.push(i)
                        break
                    case "ahnengabe":
                        magic[i.type].push(ActorDSK._calculatePW(this._perpareItemAdvancementCost(i), actorData.system));
                        break
                    case "ahnengeschenk":
                        magic[i.type].push(i);
                        break;
                    case "combatskill":
                        combatskills.push(ActorDSK._calculateCombatSkillValues(this._perpareItemAdvancementCost(i, actorData.system), actorData.system));
                        break;
                    case "ammunition":
                        inventory.ammunition.items.push(ActorDSK.prepareMag(i));
                        inventory.ammunition.show = true;
                        break;
                    case "meleeweapon":
                        i.toggleValue = getProperty(i.system, "worn.value") || false;
                        i.toggle = true;
                        this._setOnUseEffect(i);
                        if(!i.system.notInInventory){
                          inventory.meleeweapons.items.push(ActorDSK._prepareitemStructure(i));
                          inventory.meleeweapons.show = true;
                        }
                        if (i.toggleValue) wornweapons.push(i);
                        break;
                    case "rangeweapon":
                        i.toggleValue = getProperty(i.system, "worn.value") || false;
                        i.toggle = true;
                        this._setOnUseEffect(i);
                        inventory.rangeweapons.items.push(ActorDSK._prepareitemStructure(i));
                        inventory.rangeweapons.show = true;
                        break;
                    case "armor":
                        i.toggleValue = getProperty(i.system, "worn.value") || false;
                        inventory.armor.items.push(ActorDSK._prepareitemStructure(i));
                        inventory.armor.show = true;
                        i.toggle = true;
                        this._setOnUseEffect(i);

                        if (i.system.worn.value) {
                            totalArmor += Number(i.system.rs);
                            armor.push(i);
                        }
                        break;
                    case "trait":
                        switch (i.system.traitType) {
                          case "rangeAttack":
                            i = ActorDSK._prepareRangeTrait(i, actorData);
                            break;
                          case "meleeAttack":
                            i = ActorDSK._prepareMeleetrait(i, actorData);
                            break;
                          case "armor":
                            totalArmor += Number(i.system.at);
                            break;
                        }
                        traits[i.system.traitType].push(i);
                        hasTrait = true;
                        break;
                    case "poison":
                        inventory["poison"].items.push(i);
                        inventory["poison"].show = true;
                        break;
                    case "equipment":
                        i.toggle = getProperty(i, "system.worn.wearable") || false;

                        if (i.toggle) i.toggleValue = getProperty(i.system, "worn.value") || false

                        this._setOnUseEffect(i);
                        inventory[i.system.category].items.push(ActorDSK._prepareitemStructure(i));
                        inventory[i.system.category].show = true;
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
            this._setBagContent(elem, containers);
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

        let guidevalues = duplicate(DSK.characteristics);
        guidevalues["-"] = "-";

        return {
            totalWeight: parseFloat(this.system.totalWeight.toFixed(3)),
            armorSum: totalArmor,
            encumbrance: this.system.condition?.encumbered || 0,
            carrycapacity: this.system.carrycapacity,
            wornRangedWeapons: rangeweapons,
            guidevalues,
            wornMeleeWeapons: meleeweapons,
            advantages,
            disadvantages,
            specAbs,
            information,
            combatskills,
            hasTrait,
            traits,
            wornArmor: armor,
            inventory,
            canAdvance: this.system.canAdvance,
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

    setupWeapon(item, mode, options, tokenId) {
        options["mode"] = mode;
        return ItemDSK.getSubClass(item.type).setupDialog(null, options, item, this, tokenId);
      }

    setupSpell(spell, options = {}, tokenId) {
        return ItemDSK.getSubClass(spell.type).setupDialog(null, options, spell, this, tokenId);
      }

    static _prepareitemStructure(item) {
        const enchants = getProperty(item, "flags.dsk.enchantments");
        if (enchants && enchants.length > 0) {
            item.enchantClass = "rar";
        } else if (item.effects.length > 0) {
            item.enchantClass = "common"
        }
        return item;
    }

    async checkEnoughXP(cost) {
        if (!this.system.canAdvance) return true;
        if (isNaN(cost) || cost == null) return true;

        if (Number(this.system.details.experience.total) - Number(this.system.details.experience.spent) >= cost) {
            return true;
        } else if (Number(this.system.details.experience.total == 0)) {
            let template = `<p>${game.i18n.localize("dsk.DSKError.zeroXP")}</p><label>${game.i18n.localize(
                "dsk.APValue"
            )}: </label><input type="number" name="APsel" value="150"/>`;
            let newXp = 0;
            let result = false;

            [result, newXp] = await new Promise((resolve, reject) => {
                new Dialog({
                    title: game.i18n.localize("dsk.DSKError.NotEnoughXP"),
                    content: template,
                    default: "yes",
                    buttons: {
                        Yes: {
                            icon: '<i class="fa fa-check"></i>',
                            label: game.i18n.localize("dsk.yes"),
                            callback: (dlg) => {
                                resolve([true, dlg.find('[name="APsel"]')[0].value]);
                            },
                        },
                        cancel: {
                            icon: '<i class="fas fa-times"></i>',
                            label: game.i18n.localize("dsk.cancel"),
                            callback: () => {
                                resolve([false, 0]);
                            },
                        },
                    },
                }).render(true);
            });
            if (result) {
                await this.update({ "system.details.experience.total": Number(newXp) });
                return true;
            }
        }
        ui.notifications.error(game.i18n.localize("dsk.DSKError.NotEnoughXP"));
        return false;
    }

    getSkillModifier(name, sourceType) {
        let result = [];
        const keys = ["FP", "step", "QL", "TPM", "FW"];
        for (const k of keys) {
          const type = k == "step" ? "" : k;
          result.push(
            ...this.system.skillModifiers[k]
              .filter((x) => x.target == name)
              .map((f) => {
                return {
                  name: f.source,
                  value: f.value,
                  type,
                };
              })
          );
          if (this.system.skillModifiers[sourceType]) {
            result.push(
              ...this.system.skillModifiers[sourceType][k].map((f) => {
                return {
                  name: f.source,
                  value: f.value,
                  type,
                };
              })
            );
          }
        }
        return result;
      }

    setupSkill(skill, options = {}, tokenId) {
        return ItemDSK.getSubClass(skill.type).setupDialog(null, options, skill, this, tokenId);
      }

    static prepareMag(item) {
        if (item.system.ammunitiongroup == "mag") {
            item.structureMax = item.system.mag.max;
            item.structureCurrent = item.system.mag.value;
        }
        return item;
    }

    async _updateAPs(APValue, dataUpdate = {}, options = {}) {
        if (this.system.canAdvance) {
            if (!isNaN(APValue) && !(APValue == null)) {
                const ap = Number(APValue);
                dataUpdate["system.details.experience.spent"] = Number(this.system.details.experience.spent) + ap;
                await this.update(dataUpdate, options);
                const msg = game.i18n.format(ap > 0 ? "dsk.advancementCost" : "dsk.refundCost", { cost: Math.abs(ap) });
                tinyNotification(msg);
            } else {
                ui.notifications.error(game.i18n.localize("dsk.DSKError.APUpdateError"));
            }
        }
    }

    setupRegeneration(statusId, options = {}, tokenId) {
      let title = game.i18n.localize("dsk.regenerationTest");
  
      let testData = {
        source: {
          type: "regenerate",
          system: {},
        },
        opposable: false,
        extra: {
          statusId,
          actor: this.toObject(false),
          options,
          speaker: ItemDSK.buildSpeaker(this.actor, tokenId),
        },
      };
  
      testData.extra.actor.isMage = this.system.isMage;
      let situationalModifiers = DSKStatusEffects.getRollModifiers(testData.extra.actor, testData.source);
      let dialogOptions = {
        title,
        template: "/systems/dsk/templates/dialog/regeneration-dialog.html",
        data: {
          rollMode: options.rollMode,
          regenerationInterruptOptions: DSK.regenerationInterruptOptions,
          regnerationCampLocations: DSK.regnerationCampLocations,
          showAepModifier: this.system.isMage,
          situationalModifiers,
          modifier: options.modifier || 0,
        },
        callback: (html, options = {}) => {
          testData.situationalModifiers = ActorDSK._parseModifiers(html);
          cardOptions.rollMode = html.find('[name="rollMode"]').val();
          testData.situationalModifiers.push(
            {
              name:
                game.i18n.localize("dsk.camplocation") + " - " + html.find('[name="regnerationCampLocations"] option:selected').text(),
              value: html.find('[name="regnerationCampLocations"]').val(),
            },
            {
              name:
                game.i18n.localize("dsk.interruption") +
                " - " +
                html.find('[name="regenerationInterruptOptions"] option:selected').text(),
              value: html.find('[name="regenerationInterruptOptions"]').val(),
            }
          );
          testData.regenerationFactor = html.find('[name="badEnvironment"]').is(":checked") ? 0.5 : 1;
          const attrs = ["LeP", "AeP"]
          const update = {}
          for (let k of attrs) {
            testData[`${k}Modifier`] = Number(html.find(`[name="${k}Modifier"]`).val() || 0);
            testData[`regeneration${k}`] = Number(this.system.stats.regeneration[`${k}max`])
            const regenerate = html.find(`[name="regenerate${k}"]`).is(":checked") ? 1 : 0
            testData[`regenerate${k}`] = regenerate
            if (regenerate) update[`system.stats.regeneration.${k}Temp`] = 0
          }
  
          mergeObject(testData.extra.options, options);
          this.update(update);
          return { testData, cardOptions };
        },
      };
  
      let cardOptions = this._setupCardOptions("systems/dsk/templates/chat/roll/regeneration-card.html", title, tokenId);
  
      return DiceDSK.setupDialog({
        dialogOptions,
        testData,
        cardOptions,
      });
    }

    setupCharacteristic(characteristicId, options = {}, tokenId) {
        let char = this.system.characteristics[characteristicId];
        let title = game.i18n.localize(`dsk.characteristics.${characteristicId}.name`) + " " + game.i18n.localize("dsk.probe");
    
        let testData = {
          opposable: false,
          source: {
            type: "char",
            system: {
                characteristic1: characteristicId,
                characteristic2: characteristicId
            },
          },
          extra: {
            characteristicId,
            actor: this.toObject(false),
            options,
            speaker: ItemDSK.buildSpeaker(this, tokenId)
          },
        };
    
        let dialogOptions = {
          title,
          template: "/systems/dsk/templates/dialog/characteristic-dialog.html",
          data: {
            rollMode: options.rollMode,
            modifier: options.modifier || 0,
            characteristics: [1, 2].map((x) => characteristicId),
            hasSchips: ItemDSK.hasSchips(this)
          },
          callback: (html, options = {}) => {
            cardOptions.rollMode = html.find('[name="rollMode"]').val();
            testData.situationalModifiers = ActorDSK._parseModifiers(html);
            ActorDSK.schipsModifier(html, testData.situationalModifiers)
            if(testData.situationalModifiers.some(x => x.name == game.i18n.localize("dsk.schips"))) this.reduceSchips(0)
            
            ItemDSK.changeChars(testData.source, ...[0, 1].map((x) => html.find(`[name="characteristics${x}"]`).val()))
            mergeObject(testData.extra.options, options);
            return { testData, cardOptions };
          },
        };
    
        let cardOptions = this._setupCardOptions("systems/dsk/templates/chat/roll/characteristic-card.html", title, tokenId);
    
        return DiceDSK.setupDialog({ dialogOptions, testData, cardOptions });
      }

      _setupCardOptions(template, title, tokenId) {
        const token = game.canvas.tokens.get(tokenId)
        let cardOptions = {
          speaker: {
            alias: token ? token.name : this.prototypeToken.name,
            actor: this.id,
          },
          title,
          template,
          flags: {
            img: this.prototypeToken.randomImg ? this.img : this.prototypeToken.img,
          },
        };
        if (this.token) {
          cardOptions.speaker.alias = this.token.name;
          cardOptions.speaker.token = this.token.id;
          cardOptions.speaker.scene = canvas.scene.id;
          cardOptions.flags.img = this.token.img;
        } else {
          let speaker = ChatMessage.getSpeaker();
          if (speaker.actor == this.id) {
            cardOptions.speaker.alias = speaker.alias;
            cardOptions.speaker.token = speaker.token;
            cardOptions.speaker.scene = speaker.scene;
            cardOptions.flags.img = speaker.token ? canvas.tokens.get(speaker.token).img : cardOptions.flags.img;
          }
        }
        return cardOptions;
      }

      static _parseModifiers(html, search) {
        let res = [];
        html.find('[name="situationalModifiers"] option:selected').each(function () {
          const val = $(this).val();
          let data = {
            name: $(this).text().trim().split("[")[0],
            value: isNaN(val) ? val : Number(val),
            type: $(this).attr("data-type"),
          };
          if (data.type == "dmg") {
            data.damageBonus = data.value;
            data.value = 0;
          }
          if ($(this).attr("data-specAbId")) data.specAbId = $(this).attr("data-specAbId");
          if ($(this).attr("data-armorPen")) data.armorPen = $(this).attr("data-armorPen");
    
          res.push(data);
        });
        res.push({
          name: game.i18n.localize("dsk.manual"),
          value: Number(html.find('[name="testModifier"]').val()),
          type: "",
        });
        
        return res;
      }

      static async schipsModifier(html, situationalModifiers){
        if(html.find('[name="schips"]').is(":checked")){
          situationalModifiers.push({
            name: game.i18n.localize("dsk.schips"),
            value: 5,
            type: ""
          })
        }
      }

      async consumeAmmunition(testData) {
        if (testData.extra.ammo && !testData.extra.ammoDecreased) {
          testData.extra.ammoDecreased = true;
    
          if (testData.extra.ammo._id) {
            let ammoUpdate = { _id: testData.extra.ammo._id };
            if (testData.extra.ammo.system.ammunitionType == "mag") {
              if (testData.extra.ammo.system.mag.value <= 0) {
                testData.extra.ammo.system.quantity--;
                ammoUpdate["system.quantity"] = testData.extra.ammo.system.quantity;
                ammoUpdate["system.mag.value"] = testData.extra.ammo.system.mag.max - 1;
              } else {
                ammoUpdate["system.mag.value"] = testData.extra.ammo.system.mag.value - 1;
              }
            } else {
              testData.extra.ammo.system.quantity--;
              ammoUpdate["system.quantity"] = testData.extra.ammo.system.quantity;
            }
            await this.updateEmbeddedDocuments("Item", [ammoUpdate, { _id: testData.source._id, "system.reloadTimeprogress": 0 }]);
          }
        } else if (
          (testData.source.type == "rangeweapon" ||
            (testData.source.type == "trait" && testData.source.system.traitType == "rangeAttack")) &&
          !testData.extra.ammoDecreased
        ) {
          testData.extra.ammoDecreased = true;
          await this.updateEmbeddedDocuments("Item", [{ _id: testData.source._id, "system.reloadTimeprogress": 0 }]);
        } else if (["ahnengabe"].includes(testData.source.type) && testData.extra.speaker.token != "emptyActor") {
          await this.updateEmbeddedDocuments("Item", [
            {
              _id: testData.source._id,
              "system.castingTime.progress": 0,
              "system.castingTime.modified": 0,
            },
          ]);
        }
      }

      async basicTest({ testData, cardOptions }, options = {}) {
        testData = await DiceDSK.rollDices(testData, cardOptions);
        let result = await DiceDSK.rollTest(testData);
    
        if (testData.extra.options.other) {
          if (!result.other) result.other = [];
    
          result.other.push(...testData.extra.options.other);
        }
    
        result.postFunction = "basicTest";
    
        if (game.user.targets.size) {
          cardOptions.isOpposedTest = testData.opposable;
          const opposed = ` - ${game.i18n.localize("dsk.Opposed")}`;
          if (cardOptions.isOpposedTest && cardOptions.title.match(opposed + "$") != opposed) cardOptions.title += opposed;
        }
    
        await this.consumeAmmunition(testData);
    
        if (!options.suppressMessage) {
          const msg = await DiceDSK.renderRollCard(cardOptions, result, options.rerenderMessage);
          await OpposedDSK.handleOpposedTarget(msg);
          result.messageId = msg.id;
        }
    
        return { result, cardOptions, options };
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
                elem.children.push(ActorDSK._prepareitemStructure(child));
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
            : this.effects.filter((x) => allowedEffects.some(y => x.statuses.has(y)));
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

    async addCondition(effect, value = 1, absolute = false, auto = true) {
        if (effect == "bleeding") return await RuleChaos.bleedingMessage(this);

        if(this.isToken && !this.token?.object) {
          console.warn("Actor token object is null for", this.name)
          return
        }
    
        return await DSKStatusEffects.addCondition(this, effect, value, absolute, auto);
      }

    async removeCondition(effect, value = 1, auto = true, absolute = false) {
        return await DSKStatusEffects.removeCondition(this, effect, value, auto, absolute);
    }
    
    hasCondition(conditionKey) {
        return DSKStatusEffects.hasCondition(this, conditionKey);
    }
}