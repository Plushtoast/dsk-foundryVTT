const DSK = {}

DSK.statusEffects = [
    {
        icon: "icons/svg/skull.svg",
        id: "dead",
        label: "dsk.CONDITION.defeated",
        description: "dsk.CONDITIONDESCRIPTION.defeated",
    },
    {
        id: "inpain",
        label: "dsk.CONDITION.inpain",
        icon: "icons/svg/blood.svg",
        description: "dsk.CONDITIONDESCRIPTION.inpain",
    },
    {
        id: "encumbered",
        label: "dsk.CONDITION.encumbered",
        icon: "icons/svg/anchor.svg",
        description: "dsk.CONDITIONDESCRIPTION.encumbered",
        changes: [ { "key": "system.status.encumbered", "mode": 2, "value": -1 }]
    },
    {
        id: "stunned",
        label: "dsk.CONDITION.stunned",
        icon: "icons/svg/daze.svg",
        description: "dsk.CONDITIONDESCRIPTION.stunned",
        changes: [ { "key": "system.status.stunned", "mode": 2, "value": -1 }]
    },
    {
        id: "feared",
        label: "dsk.CONDITION.feared",
        icon: "icons/svg/terror.svg",
        description: "dsk.CONDITIONDESCRIPTION.feared",
        changes: [ { "key": "system.status.feared", "mode": 2, "value": -1 }]
    },
    {
        id: "selfconfidence",
        label: "dsk.CONDITION.selfconfidence",
        icon: "icons/svg/terror.svg",
        description: "dsk.CONDITIONDESCRIPTION.selfconfidence",
        changes: [ { "key": "system.status.selfconfidence", "mode": 2, "value": 1 }]
    },
    {
        id: "prone",
        label: "dsk.CONDITION.prone",
        icon: "icons/svg/falling.svg",
        description: "dsk.CONDITIONDESCRIPTION.prone"
    },
    {
        id: "rooted",
        label: "dsk.CONDITION.rooted",
        icon: "icons/svg/net.svg",
        description: "dsk.CONDITIONDESCRIPTION.rooted"
    },
    {
        id: "unconscious",
        label: "dsk.CONDITION.unconscious",
        icon: "icons/svg/unconscious.svg",
        description: "dsk.CONDITIONDESCRIPTION.unconscious"
    },
    {
        id: "blind",
        label: "CONDITION.blind",
        icon: "icons/svg/blind.svg",
        description: "CONDITIONDESCRIPTION.blind"
    },
    {
        id: "constricted",
        label: "dsk.CONDITION.constricted",
        icon: "icons/svg/cave.svg",
        description: "dsk.CONDITIONDESCRIPTION.constricted"
    },
    {
        id: "fixated",
        label: "dsk.CONDITION.fixated",
        icon: "icons/svg/padlock.svg",
        description: "dsk.CONDITIONDESCRIPTION.fixated"
    },
    {
        id: "hallucinating",
        label: "dsk.CONDITION.hallucinating",
        icon: "icons/svg/padlock.svg",
        description: "dsk.CONDITIONDESCRIPTION.hallucinating"
    },
    {
        id: "incapacitated",
        label: "dsk.CONDITION.incapacitated",
        icon: "icons/svg/sleep.svg",
        description: "dsk.CONDITIONDESCRIPTION.incapacitated"
    },
    {
        id: "panic",
        label: "dsk.CONDITION.panic",
        icon: "icons/svg/terror.svg",
        description: "dsk.CONDITIONDESCRIPTION.panic"
    },
    {
        id: "bloodrush",
        label: "dsk.CONDITION.rage",
        icon: "icons/svg/bones.svg",
        description: "dsk.CONDITIONDESCRIPTION.rage"
    },
    {
        id: "mute",
        label: "dsk.CONDITION.mute",
        icon: "icons/svg/silenced.svg",
        description: "dsk.CONDITIONDESCRIPTION.mute"
    },
    {
        id: "deaf",
        label: "dsk.CONDITION.deaf",
        icon: "icons/svg/deaf.svg",
        description: "dsk.CONDITIONDESCRIPTION.deaf"
    },
    {
        id: "surprised",
        label: "dsk.CONDITION.surprised",
        icon: "icons/svg/hazard.svg",
        description: "dsk.CONDITIONDESCRIPTION.surprised"
    },
    {
        id: "invisible",
        label: "CONDITION.invisible",
        icon: "icons/svg/circle.svg",
        description: "CONDITIONDESCRIPTION.invisible"
    },
    {
        id: "poisoned",
        label: "dsk.CONDITION.poisoned",
        icon: "icons/svg/poison.svg",
        description: "dsk.CONDITIONDESCRIPTION.poisoned"
    }
]

DSK.StFs = {
    "A": "A",
    "B": "B",
    "C": "C",
    "D": "D",
    "E": "E"
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
};

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
    "ahnen": "dsk.SPECIALABILITYCATEGORIES.ahnen"
}

//TODO Revisit
DSK.combatSkillSubCategories = {
    "0": "dsk.COMBATSKILLCATEGORY.0",
    "1": "dsk.COMBATSKILLCATEGORY.1",
    "2": "dsk.COMBATSKILLCATEGORY.2",
    "3": "dsk.COMBATSKILLCATEGORY.3",
    "4": "dsk.COMBATSKILLCATEGORY.4"
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
    "blessed": "dsk.Equipment.blessed"
};

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

DSK.skillGroups = {
    "body": "dsk.SKILL.body",
    "social": "dsk.SKILL.social",
    "knowledge": "dsk.SKILL.knowledge",
    "trade": "dsk.SKILL.trade"
};

CONFIG.time.roundTime = 5
CONFIG.time.turnTime = 0

export default DSK