const DSK = {}

DSK.statusEffects = [
    {
        icon: "icons/svg/skull.svg",
        id: "dead",
        label: "dsk.CONDITION.defeated",
        description: "dsk.CONDITIONDESCRIPTION.defeated",
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "inpain",
        label: "dsk.CONDITION.inpain",
        icon: "icons/svg/blood.svg",
        description: "dsk.CONDITIONDESCRIPTION.inpain",
        changes: [ { "key": "system.status.inpain", "mode": 2, "value": 1 }],
        flags: {
            dsk: {
                "value": 1,
                "editable": true,
                "max": 8
            }
        }
    },
    {
        id: "encumbered",
        label: "dsk.CONDITION.encumbered",
        icon: "icons/svg/anchor.svg",
        description: "dsk.CONDITIONDESCRIPTION.encumbered",
        changes: [ { "key": "system.status.encumbered", "mode": 2, "value": 1 }],
        flags: {
            dsk: {
                "value": 1,
                "editable": true,
                "max": 8
            }
        }
    },
    {
        id: "stunned",
        label: "dsk.CONDITION.stunned",
        icon: "icons/svg/daze.svg",
        description: "dsk.CONDITIONDESCRIPTION.stunned",
        changes: [ { "key": "system.status.stunned", "mode": 2, "value": 1 }],
        flags: {
            dsk: {
                "value": 1,
                "editable": true,
                "max": 8
            }
        }
    },
    {
        id: "feared",
        label: "dsk.CONDITION.feared",
        icon: "icons/svg/terror.svg",
        description: "dsk.CONDITIONDESCRIPTION.feared",
        changes: [ { "key": "system.status.feared", "mode": 2, "value": 1 }],
        flags: {
            dsk: {
                "value": 1,
                "editable": true,
                "max": 8
            }
        }
    },
    {
        id: "selfconfidence",
        label: "dsk.CONDITION.selfconfidence",
        icon: "icons/svg/up.svg",
        description: "dsk.CONDITIONDESCRIPTION.selfconfidence",
        changes: [ { "key": "system.status.selfconfidence", "mode": 2, "value": 1 }],
        flags: {
            dsk: {
                "value": 1,
                "editable": true,
                "max": 8
            }
        }
    },
    {
        id: "prone",
        label: "dsk.CONDITION.prone",
        icon: "icons/svg/falling.svg",
        description: "dsk.CONDITIONDESCRIPTION.prone",
        changes: [ 
            { "key": "system.stats.gs.gearmodifier", "mode": 2, "value": -500 },
            { "key": "system.meleeStats.attack", "mode": 2, "value": -4 },
            { "key": "system.rangeStats.attack", "mode": 2, "value": -4 },
            { "key": "system.meleeStats.parry", "mode": 2, "value": -2 }
        ],
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "rooted",
        label: "dsk.CONDITION.rooted",
        icon: "icons/svg/net.svg",
        changes: [ 
            { "key": "system.stats.gs.gearmodifier", "mode": 2, "value": -500 },
        ],
        description: "dsk.CONDITIONDESCRIPTION.rooted",
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "unconscious",
        label: "dsk.CONDITION.unconscious",
        icon: "icons/svg/unconscious.svg",
        description: "dsk.CONDITIONDESCRIPTION.unconscious",
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "blind",
        label: "dsk.CONDITION.blind",
        icon: "icons/svg/blind.svg",
        description: "dsk.CONDITIONDESCRIPTION.blind",
        changes: [ 
            { "key": "system.meleeStats.attack", "mode": 2, "value": -8 },
            { "key": "system.rangeStats.attack", "mode": 2, "value": -100 },
            { "key": "system.meleeStats.parry", "mode": 2, "value": -100 },
        ],
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "constricted",
        label: "dsk.CONDITION.constricted",
        icon: "icons/svg/cave.svg",
        description: "dsk.CONDITIONDESCRIPTION.constricted",
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "fixated",
        label: "dsk.CONDITION.fixated",
        icon: "icons/svg/padlock.svg",
        description: "dsk.CONDITIONDESCRIPTION.fixated",
        changes: [ 
            { "key": "system.stats.gs.gearmodifier", "mode": 2, "value": -500 },
            { "key": "system.meleeStats.parry", "mode": 2, "value": -2 },
        ],
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "hallucinating",
        label: "dsk.CONDITION.hallucinating",
        icon: "icons/svg/padlock.svg",
        description: "dsk.CONDITIONDESCRIPTION.hallucinating",
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "incapacitated",
        label: "dsk.CONDITION.incapacitated",
        icon: "icons/svg/sleep.svg",
        description: "dsk.CONDITIONDESCRIPTION.incapacitated",
        changes: [{ "key": "system.stats.gs.gearmodifier", "mode": 2, "value": -500 }],
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "panic",
        label: "dsk.CONDITION.panic",
        icon: "icons/svg/terror.svg",
        description: "dsk.CONDITIONDESCRIPTION.panic",
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "bloodrush",
        label: "dsk.CONDITION.rage",
        icon: "icons/svg/bones.svg",
        description: "dsk.CONDITIONDESCRIPTION.rage",
        changes: [
            { "key": "system.meleeStats.attack", "mode": 2, "value": 4 },
            { "key": "system.meleeStats.parry", "mode": 2, "value": -100 },
            { "key": "system.rangeStats.attack", "mode": 2, "value": -100 },
        ],
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "mute",
        label: "dsk.CONDITION.mute",
        icon: "icons/svg/silenced.svg",
        description: "dsk.CONDITIONDESCRIPTION.mute",
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "deaf",
        label: "dsk.CONDITION.deaf",
        icon: "icons/svg/deaf.svg",
        description: "dsk.CONDITIONDESCRIPTION.deaf",
        changes: [
            { "key": "system.skillModifiers.step", "mode": 0, "value": "Sinnesschärfe -4;Perception -4" },
        ],
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "surprised",
        label: "dsk.CONDITION.surprised",
        icon: "icons/svg/hazard.svg",
        description: "dsk.CONDITIONDESCRIPTION.surprised",
        changes: [
            { "key": "system.meleeStats.parry", "mode": 2, "value": -100 },
        ],
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "invisible",
        label: "dsk.CONDITION.invisible",
        icon: "icons/svg/circle.svg",
        description: "dsk.CONDITIONDESCRIPTION.invisible",
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    },
    {
        id: "poisoned",
        label: "dsk.CONDITION.poisoned",
        icon: "icons/svg/poison.svg",
        description: "dsk.CONDITIONDESCRIPTION.poisoned",
        flags: {
            dsk: {
                "value": null,
                "editable": true
            }
        }
    }
]

DSK.StFs = {
    "A": "A",
    "B": "B",
    "C": "C",
    "D": "D",
    "E": "E"
}

DSK.helpContent = [{
    name: "pay",
    command: "/pay [0-9]+",
    example: "/pay 5.03",
}, {
    name: "getPaid",
    command: "/getPaid [0-9]+",
    example: "/getPaid 5.03",
},
{
    name: "quickAbility",
    command: "/sk [a-z]*, /ah [a-z]*, /at [a-z]*, /pa [a-z]*",
    example: "/sk sinnesschärfe",
},
{
    name: "conditions",
    command: "/conditions",
    example: "/conditions"
},
{
    name: "tables",
    command: "/tables",
    example: "/tables"
},
{
    name: "request",
    command: "/rq",
    example: "/rq betören"
},
{
    name: "twoD20Check",
    command: "/ch",
    example: "/ch"
},
{
    name: "groupcheck",
    command: "/gc",
    example: "/gc"
}
]

DSK.meleeRangeVision = () => {
    return {
        "+0": "dsk.meleeVisionDisruption.0",
        "-1": "dsk.meleeVisionDisruption.1",
        "-2": "dsk.meleeVisionDisruption.2",
        "-3": "dsk.meleeVisionDisruption.3",
        "-5000": "dsk.meleeVisionDisruption.4"
    }
}

DSK.addvantageRules = {}
DSK.removevantageRules = {}
DSK.vantagesNeedingAdaption = {}

DSK.addAbilityRules = {}
DSK.removeAbilityRules = {}
DSK.AbilitiesNeedingAdaption = {}

DSK.advancementCosts = {
    "A": [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
    "B": [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28],
    "C": [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42],
    "D": [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 8, 12, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56],
    "E": [5, 5, 5, 5, 5 ,5 ,5 ,5 ,5 ,5 ,5 ,5 ,5 ,10, 15, 20, 25, 30, 35, 40 ,45 ,50, 55, 60, 65, 70],
    "Eig": [20, 20, 20, 20, 20, 20, 20 ,20 ,20 ,20 ,20 ,20 ,20, 20, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240]
}

//TODO Revisit
DSK.specialAbilityCategories = {
    "general": "dsk.SPECIALABILITYCATEGORIES.general",
    "Combat": "dsk.SPECIALABILITYCATEGORIES.combat",
    "ahnen": "dsk.SPECIALABILITYCATEGORIES.ahnen",
    "language": "dsk.SPECIALABILITYCATEGORIES.language",
}

DSK.shieldSizes = {
    "short": "dsk.SIZE.small",
    "medium": "dsk.SIZE.average",
    "long": "dsk.SIZE.big"
}

//TODO Revisit
DSK.combatSkillSubCategories = {
    "0": "dsk.COMBATSKILLCATEGORY.0",
    "1": "dsk.COMBATSKILLCATEGORY.1",
    "2": "dsk.COMBATSKILLCATEGORY.2",
    "3": "dsk.COMBATSKILLCATEGORY.3",
    "4": "dsk.COMBATSKILLCATEGORY.4"
}

DSK.gearModifyableCalculatedAttributes = ["schips", "ini", "gs", "AeP", "LeP", "sk", "zk"]

DSK.rangeWeaponModifiers = {
    "short": "dsk.RangeMod.short",
    "medium": "dsk.RangeMod.medium",
    "long": "dsk.RangeMod.long",
    "rangesense": "dsk.RangeMod.rangesense",
    "extreme": "dsk.RangeMod.extreme"
}

DSK.rangeMods = {
    "short": {
        "damage": 1,
        "attack": 2
    },
    "medium": {
        "damage": 0,
        "attack": 0
    },
    "long": {
        "damage": -1,
        "attack": -2
    },
    "rangesense": {
        "damage": -1,
        "attack": -1
    },
    "extreme": {
        "damage": -2,
        "attack": -4
    }
}

DSK.regnerationCampLocations = {
    "0": "dsk.regnerationCampLocations.normal",
    "-1": "dsk.regnerationCampLocations.bad",
    "1": "dsk.regnerationCampLocations.good"
}

DSK.regenerationInterruptOptions = {
    "0": "dsk.regenerationInterruptOptions.none",
    "-1": "dsk.regenerationInterruptOptions.small",
    "-2": "dsk.regenerationInterruptOptions.big"
}

DSK.equipmentCategories = ["meleeweapon", "rangeweapon", "equipment", "ammunition", "armor", "poison"]

DSK.rangeSizeModifier = {
    "tiny": -8,
    "small": -4,
    "average": 0,
    "big": 4,
    "giant": 8
}

DSK.aimOptions = {
    "0": "dsk.aimOptions.0",
    "2": "dsk.aimOptions.1",
    "4": "dsk.aimOptions.2"
}

DSK.rangeVision = {
    "0": "dsk.VisionDisruption.step0",
    "-2": "dsk.VisionDisruption.step1",
    "-4": "dsk.VisionDisruption.step2",
    "-6": "dsk.VisionDisruption.step3",
    "-5000": "dsk.VisionDisruption.step4"
}

DSK.targetMomevementOptions = {
    "0": "dsk.rangeMovementOptions.SLOW",
    "-2": "dsk.rangeMovementOptions.FAST",
    "2": "dsk.rangeMovementOptions.STATIONARY",
}

DSK.shooterMovementOptions = {
    "0": "dsk.rangeMovementOptions.SHOOTERSTATIONARY",
    "-2": "dsk.rangeMovementOptions.SHOOTERMOVING",
    "-4": "dsk.rangeMovementOptions.SHOOTERRUNNING"
}

DSK.mountedRangeOptions = {
    "0": "dsk.mountedRangeOptions.STATIONARY",
    "-4": "dsk.mountedRangeOptions.SCHRITT",
    "-8": "dsk.mountedRangeOptions.GALOPP",
}

DSK.rangeSizeCategories = {
    "tiny": "dsk.RANGESIZE.tiny",
    "small": "dsk.RANGESIZE.small",
    "average": "dsk.RANGESIZE.average",
    "big": "dsk.RANGESIZE.big",
    "giant": "dsk.RANGESIZE.giant"
},

DSK.meleeSizeCategories = {
    "tiny": "dsk.MELEESIZE.tiny",
    "small": "dsk.MELEESIZE.small",
    "average": "dsk.MELEESIZE.average",
    "big": "dsk.MELEESIZE.big",
    "giant": "dsk.MELEESIZE.giant"
}

DSK.narrowSpaceModifiers = {
    "weaponshort": {
        "attack": 2,
        "parry": 0,
        "label": "dsk.NarrowSpaceModifiers.weapon.short"
    },
    "weaponmedium": {
        "attack": 0,
        "parry": 0,
        "label": "dsk.NarrowSpaceModifiers.weapon.medium"
    },
    "weaponlong": {
        "attack": -2,
        "parry": 0,
        "label": "dsk.NarrowSpaceModifiers.weapon.long"
    },
    "shieldshort": {
        "attack": 0,
        "parry": 2,
        "label": "dsk.NarrowSpaceModifiers.shield.short"
    },
    "shieldmedium": {
        "attack": 0,
        "parry": 0,
        "label": "dsk.NarrowSpaceModifiers.shield.medium"
    },
    "shieldlong": {
        "attack": -2,
        "parry": -2,
        "label": "dsk.NarrowSpaceModifiers.shield.long"
    }
}

DSK.meleeSizeModifier = {
    "tiny": -4,
    "small": 0,
    "average": 0,
    "big": 0,
    "giant": 0
}

DSK.sizeCategories = {
    "tiny": "dsk.SIZE.tiny",
    "small": "dsk.SIZE.small",
    "average": "dsk.SIZE.average",
    "big": "dsk.SIZE.big",
    "giant": "dsk.SIZE.giant"
}

DSK.equipmentTypes = {
    "misc": "dsk.Equipment.misc",
    "clothes": "dsk.Equipment.clothes",
    "tools": "dsk.Equipment.tools",
    "light": "dsk.Equipment.light",
    "healing": "dsk.Equipment.healing",
    "bags": "dsk.Equipment.bags",
    "wealth": "dsk.Equipment.wealth",
    "writing": "dsk.Equipment.writing",
    "alchemy": "dsk.Equipment.alchemy",
    "service": "dsk.Equipment.service",
    "luxus": "dsk.Equipment.luxus",
    "blessed": "dsk.Equipment.blessed",
    "food": "dsk.Equipment.food",
    "animals": "dsk.Equipment.animals"
};

DSK.systemTables = [
    { name: "Melee", attrs: "data-weaponless=\"false\"", roll: "botch-roll", pack: { de: "dsk.patzer", en: "dsk.botch" }, setting: { module: "", key: "" } },
    { name: "Range", attrs: "data-weaponless=\"false\"", roll: "botch-roll", pack: { de: "dsk.patzer", en: "dsk.botch" }, setting: { module: "", key: "" } },
    { name: "Ahnen", attrs: "", roll: "botch-roll", pack: { de: "dsk.patzer", en: "dsk.botch" }, setting: { module: "", key: "" } },
]

DSK.tokenSizeCategories = {
    "tiny": 0.5,
    "small": 0.8,
    "average": 1,
    "big": 2,
    "giant": 4
}

DSK.effectTextStyle = CONFIG.canvasTextStyle.clone();
DSK.effectTextStyle.fontSize = "30";
DSK.effectTextStyle.fontFamily = "GentiumBasic"

DSK.ammunitiongroups = {
    "-": "-",
    "arrow": "dsk.ammunition.arrow",
    "bolt": "dsk.ammunition.bolt",
    "bullet": "dsk.ammunition.bullet",
    "stone": "dsk.ammunition.stone",
    "dart": "dsk.ammunition.dart",
    "mag": "dsk.ammunition.mag",
    "infinite": "dsk.ammunition.infinite"
}

DSK.traitCategories = {
    "meleeAttack": "dsk.closeCombatAttacks",
    "rangeAttack": "dsk.rangeCombatAttacks",
    "armor": "ITEM.TypeArmor",
    "force": "dsk.force",
    "specialty": "dsk.specialty"
}

DSK.meleeRanges = {
    "short": "dsk.Range.short",
    "medium": "dsk.Range.medium",
    "long": "dsk.Range.long"
};

DSK.magicResistanceModifiers = {
    "-": "-",
    "sk": "dsk.soulpower",
    "zk": "dsk.toughness"
}

DSK.weapontypes = {
    "melee": "ITEM.TypeMeleeweapon",
    "range": "ITEM.TypeRangeweapon"
}

DSK.characteristics = {
    "mu": "dsk.characteristics.mu.name",
    "kl": "dsk.characteristics.kl.name",
    "in": "dsk.characteristics.in.name",
    "ch": "dsk.characteristics.ch.name",
    "ff": "dsk.characteristics.ff.name",
    "ge": "dsk.characteristics.ge.name",
    "ko": "dsk.characteristics.ko.name",
    "kk": "dsk.characteristics.kk.name"
}

DSK.skillBurdens = {
    "yes": "dsk.yes",
    "no": "dsk.no",
    "maybe": "dsk.maybe"
}

DSK.skillDifficultyLabels = {
    "eeasy": "dsk.Skill-eeasy",
    "veasy": "dsk.Skill-veasy",
    "easy": "dsk.Skill-easy",
    "challenging": "dsk.Skill-challenging",
    "difficult": "dsk.Skill-difficult",
    "hard": "dsk.Skill-hard",
    "vhard": "dsk.Skill-vhard"
}

DSK.skillDifficultyModifiers = {
    "eeasy": 16,
    "veasy": 8,
    "easy": 4,
    "challenging": 0,
    "difficult": -4,
    "hard": -8,
    "vhard": -16
}

DSK.skillGroups = {
    "body": "dsk.SKILL.body",
    "social": "dsk.SKILL.social",
    "knowledge": "dsk.SKILL.knowledge",
    "trade": "dsk.SKILL.trade"
};

CONFIG.time.roundTime = 2
CONFIG.time.turnTime = 0

export default DSK