import DSKUtility from '../system/dsk_utility.js';

const modifierTypes = {
  '': 'dsk.Modifier',
  defenseMalus: 'dsk.MODS.defenseMalus',
  FW: 'dsk.MODS.FW',
  AeP: 'dsk.AeP',
  FP: 'dsk.MODS.FP',
  QL: 'dsk.MODS.QS',
  dmg: 'dsk.MODS.damage',
  damageBonus: 'dsk.MODS.damage',
  armorPen: 'dsk.MODS.armorPen',
  TPM: 'dsk.MODS.partChecks',
};

export function setupHandlebars() {
  Handlebars.registerHelper({
    roman: (a, max) => {
      if (max != undefined && Number(max) < 2) return '';

      const roman = [' I', ' II', ' III', ' IV', ' V', ' VI', ' VII', ' VIII', ' IX', ' X'];
      return roman[a - 1];
    },
    itemCategory: (a) => {
      return DSKUtility.categoryLocalization(a);
    },
    isWEBM: (a) => /.webm$/.test(a),
    getAttr: (a, b, c) => {
      return a.system.characteristics[b][c];
    },
    diceThingsUp: (a, b) => DSKUtility.replaceDies(a, false),
    replaceConditions: DSKUtility.replaceConditions,
    attrLoc: (a, b) => {
      return _loc(`dsk.characteristics.${a}.${b}`);
    },
    floor: (a) => Math.floor(Number(a)),
    situationalTooltip: (mod) => {
      const key = _loc(`${modifierTypes[mod.type] || 'dsk.Modifier'}`);
      let res = `${mod.name}<br/>${key}: ${mod.value}`;
      if (mod.source) {
        res += `<br/>${_loc('dsk.source')}: ${mod.source}`;
      }
      return res;
    },
    dskMoney: () => {
      return DSKUtility.moneyLocalization();
    },
    dskMoneyValue: () => {
      return _loc('dsk.UNITS.money', { money: DSKUtility.moneyLocalization() });
    },
    hasElem: (a, b) => a.some((x) => b == x),
    oddLength: (x) => {
      return x.length % 2 == 1;
    },
    selfObj: (a) => {
      return a.reduce((acc, val) => {
        acc[val] = val;
        return acc;
      }, {});
    },
  });
}
