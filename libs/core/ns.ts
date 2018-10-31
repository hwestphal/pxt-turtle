//% color=#00bcd4 weight=100 icon="\uf044"
namespace turtle {

    //% blockId=spriteEditor block="%sprite"
    //% sprite.fieldEditor="sprite"
    //% sprite.fieldOptions.sizes="32,32;16,16;8,8"
    //% shim=TD_ID
    //% weight=4
    export function __sprite(sprite: Sprite) {
        return sprite;
    }

}

//% shim=@f4
//% blockIdentity="turtle.__sprite"
//% helper=toSprite
//% groups=["0.","1#","2","3","4","5","6","7","8","9","aA","bB","cC","dD","eE","fF"]
declare function img(lits: string[], ...values: any[]): Sprite;

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
