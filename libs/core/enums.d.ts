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

declare interface Image {
    readonly width: number;
    readonly height: number;
}
