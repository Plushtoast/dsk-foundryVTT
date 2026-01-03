import { AppV2Mixin } from "./mixins/appv2_mixin.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class DefaultAppv2 extends AppV2Mixin(HandlebarsApplicationMixin(ApplicationV2)) {}
