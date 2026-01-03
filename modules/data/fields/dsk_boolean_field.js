const { BooleanField } = foundry.data.fields;

/**
 * A boolean field with additional string parsing
 */
export default class DSKBooleanField extends BooleanField {
  _cast(value) {
    if (typeof value === 'string') {
      return value === 'true' || value === '1';
    }
    return super._cast(value);
  }
}
