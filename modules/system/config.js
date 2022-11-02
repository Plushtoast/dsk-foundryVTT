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

CONFIG.time.roundTime = 5
CONFIG.time.turnTime = 0

export default DSK