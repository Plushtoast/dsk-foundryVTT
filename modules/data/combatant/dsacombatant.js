import { DSKDataModel } from '../abstract.js';

const { NumberField, SchemaField, StringField } = foundry.data.fields;

export class DSACombatantDataModel extends DSKDataModel {
  static defineSchema() {
    return this.mergeSchema(super.defineSchema(), {
      defenseCount: new NumberField({ initial: 0, min: 0 }),
      roundInitiative: new NumberField({ initial: -1 }),
    });
  }
}
