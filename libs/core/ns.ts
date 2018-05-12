//% color=#00bcd4 weight=100 icon="\uf044"
namespace turtle {

    //% blockId=colorNumberPicker block="%value"
    //% blockHidden=true
    //% value.fieldEditor="colornumber"
    //% value.defl="#ff0000"
    //% value.fieldOptions.decompileLiterals=true
    //% value.fieldOptions.colours='["#ff0000", "#ff8000", "#ffff00", "#00ff00", "#00ffff", "#0080ff", "#0000ff", "#8000ff", "#ff00ff", "#aaaaaa", "#555555", "#000000"]'
    //% value.fieldOptions.columns=3
    //% value.fieldOptions.className="rgbColorPicker"
    export function __colorNumberPicker(value: number) {
        return value;
    }

}

declare namespace console {
    /**
     * Print out message in browser console
     */
    //% shim=log
    function log(msg: string): void;
}
