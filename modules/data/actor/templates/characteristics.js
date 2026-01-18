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
          initial: new NumberField({ initial: 8, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
        }, { label: 'dsk.characteristics.mu.name' }),
        kl: new SchemaField({
          initial: new NumberField({ initial: 8, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
        }, { label: 'dsk.characteristics.kl.name' }),
        in: new SchemaField({
          initial: new NumberField({ initial: 8, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
        }, { label: 'dsk.characteristics.in.name' }),
        ch: new SchemaField({
          initial: new NumberField({ initial: 8, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
        }, { label: 'dsk.characteristics.ch.name' }),
        ff: new SchemaField({
          initial: new NumberField({ initial: 8, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
        }, { label: 'dsk.characteristics.ff.name' }),
        ge: new SchemaField({
          initial: new NumberField({ initial: 8, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
        }, { label: 'dsk.characteristics.ge.name' }),
        ko: new SchemaField({
          initial: new NumberField({ initial: 8, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
        }, { label: 'dsk.characteristics.ko.name' }),
        kk: new SchemaField({
          initial: new NumberField({ initial: 8, label: 'dsk.Initial' }),
          modifier: new NumberField({ initial: 0, label: 'dsk.Modifiers' }),
          advances: new NumberField({ initial: 0, label: 'dsk.Advances' }),
        }, { label: 'dsk.characteristics.kk.name' }),
      }),
      sheetLocked: new BooleanField({ initial: false, label: 'dsk.SHEET.Lock' }),
      playerView: new BooleanField({ initial: false, label: 'dsk.SHEET.switchLimited' }),
    };
  }

  static _migrateData(source) {
    super._migrateData(source);

    const hasPlayerView = foundry.utils.hasProperty(source, 'playerView');
    const merchantPlayerView = foundry.utils.getProperty(source, 'merchant.playerView');
    if (!hasPlayerView && merchantPlayerView !== undefined) {
      foundry.utils.setProperty(source, 'playerView', merchantPlayerView);
    }
  }
}
