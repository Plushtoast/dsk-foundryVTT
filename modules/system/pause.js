export default class DSKPause extends Pause{
    static get defaultOptions() {
        const options = super.defaultOptions;
        options.template = "systems/dsk/templates/system/pause.html";
        return options;
      }
}