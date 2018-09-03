//% color=#00bcd4 weight=100 icon="\uf044"
namespace turtle {
}

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
