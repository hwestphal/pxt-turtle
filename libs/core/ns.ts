//% color=#00bcd4 weight=100 icon="\uf044"
namespace turtle {

    //% blockId=image_picker block="%image"
    //% image.fieldEditor="sprite"
    //% image.fieldOptions.sizes="32,32"
    //% shim=TD_ID
    //% weight=4
    export function __image(image: Image) {
        return image;
    }

}

//% shim=@f4
//% helper=toImage
//% groups=["0.","1#","2","3","4","5","6","7","8","9","aA","bB","cC","dD","eE","fF"]
declare function img(lits: string[], ...values: any[]): Image;

//% color=#ff8000 weight=50 icon="\uf017" advanced=true
namespace time {
}

declare namespace console {
    /**
     * Print out message in browser console
     */
    //% shim=log
    function log(msg: string): void;
}
