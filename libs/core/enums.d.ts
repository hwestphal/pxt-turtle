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
    readonly width: number;
    readonly height: number;
}
