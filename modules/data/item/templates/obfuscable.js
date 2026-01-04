import { DSKDataModel } from "../../abstract.js";

const { SchemaField, BooleanField } = foundry.data.fields;

export default class ObfuscableTemplate extends DSKDataModel {
  
    static defineSchema() {
        return {
            obfuscation: new SchemaField({
                details: new BooleanField({ initial: false }),
                description: new BooleanField({ initial: false }),
                enchantment: new BooleanField({ initial: false }),
                effects: new BooleanField({ initial: false }),
            })
        }
    }
}
