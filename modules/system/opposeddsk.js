import DSKUtility from "./dsk_utility.js";

export default class OpposedDSK{
    static async handleOpposedTarget(message) {
        if (!message) return;

        let actor = DSKUtility.getSpeaker(message.speaker)
        if (!actor) return

        let testResult = message.flags.data.postData
        let preData = message.flags.data.preData

        if (actor.flags.oppose) {
            console.log("answering opposed")
            //OpposedDsa5.answerOpposedTest(actor, message, testResult, preData)
        } else if (game.user.targets.size && message.flags.data.isOpposedTest && !message.flags.data.defenderMessage && !message.flags.data.attackerMessage) {
            console.log("start opposed")
            //OpposedDsa5.createOpposedTest(actor, message, testResult, preData)
        } else if (message.flags.data.defenderMessage || message.flags.data.attackerMessage) {
            console.log("end opposed")
            //OpposedDsa5.resolveFinalMessage(message)
        } else if (message.flags.data.unopposedStartMessage) {
            console.log("repeat")
            //OposedDsa5.redoUndefended(message)
        } else if (message.flags.data.startMessagesList) {
            console.log("change start")
            //OpposedDsa5.changeStartMessage(message)
        } else {
            console.log("show dmg")
            //await this.showDamage(message)
            //await this.showSpellWithoutTarget(message)
        }
    }
}