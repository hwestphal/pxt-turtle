declare const enum Speed {
    //% block=slow
    Slow,
    //% block=normal
    Normal,
    //% block=fast
    Fast,
    //% block=fastest
    Fastest,
}

declare interface Sprite {
    //% shim=.getWidth
    readonly width: number;
    //% shim=.getHeight
    readonly height: number;
}
