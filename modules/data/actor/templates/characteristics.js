import { DSKDataModel } from '../../abstract.js';

const { SchemaField, NumberField, BooleanField } = foundry.data.fields;

/**
 * Template for actor characteristics (the 8 base attributes)
 */
export default class CharacteristicsTemplate extends DSKDataModel {
  
  static defineSchema() {
    return {
      characteristics: new SchemaField({
        mu: new SchemaField({
          initial: new NumberField({ initial: 8 }),
          modifier: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
        }),
        kl: new SchemaField({
          initial: new NumberField({ initial: 8 }),
          modifier: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
        }),
        in: new SchemaField({
          initial: new NumberField({ initial: 8 }),
          modifier: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
        }),
        ch: new SchemaField({
          initial: new NumberField({ initial: 8 }),
          modifier: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
        }),
        ff: new SchemaField({
          initial: new NumberField({ initial: 8 }),
          modifier: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
        }),
        ge: new SchemaField({
          initial: new NumberField({ initial: 8 }),
          modifier: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
        }),
        ko: new SchemaField({
          initial: new NumberField({ initial: 8 }),
          modifier: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
        }),
        kk: new SchemaField({
          initial: new NumberField({ initial: 8 }),
          modifier: new NumberField({ initial: 0 }),
          advances: new NumberField({ initial: 0 }),
        }),
      }),
      sheetLocked: new BooleanField({ initial: false }),
    };
  }
}
