// Auto-generated from simulator. Do not edit.
declare namespace turtle {
    /**
     * Move the turtle forward
     * @param distance distance to move, eg: 50
     */
    //% weight=90
    //% blockId=turtleForward block="forward %distance steps"
    //% shim=turtle::forwardAsync promise
    function forward(distance: number): void;

    /**
     * Move the turtle backward
     * @param distance distance to move, eg: 50
     */
    //% weight=85
    //% blockId=turtleBackward block="backward %distance steps"
    //% shim=turtle::backwardAsync promise
    function backward(distance: number): void;

    /**
     * Turn the turtle to the right
     * @param angle degrees to turn, eg: 90
     */
    //% weight=80
    //% blockId=turtleTurnRight block="turn right by %angle degrees"
    //% angle.min=0 angle.max=360
    //% shim=turtle::turnRightAsync promise
    function turnRight(angle: number): void;

    /**
     * Turn the turtle to the left
     * @param angle degrees to turn, eg: 90
     */
    //% weight=75
    //% blockId=turtleTurnLeft block="turn left by %angle degrees"
    //% angle.min=0 angle.max=360
    //% shim=turtle::turnLeftAsync promise
    function turnLeft(angle: number): void;

    /**
     * Pull the pen up
     */
    //% weight=70
    //% blockId=turtlePenUp block="pull the pen up"
    //% shim=turtle::penUp
    function penUp(): void;

    /**
     * Pull the pen down
     */
    //% weight=65
    //% blockId=turtlePenDown block="pull the pen down"
    //% shim=turtle::penDown
    function penDown(): void;

    /**
     * Move the turtle to the origin and set heading to 0
     */
    //% weight=60
    //% blockId=turtleHome block="back to home"
    //% shim=turtle::homeAsync promise
    function home(): void;

    /**
     * X position of the turtle
     */
    //% weight=55
    //% blockId=turtleX block="x position"
    //% shim=turtle::x
    function x(): number;

    /**
     * Y position of the turtle
     */
    //% weight=54
    //% blockId=turtleY block="y position"
    //% shim=turtle::y
    function y(): number;

    /**
     * Heading of the turtle
     */
    //% weight=53
    //% blockId=turtleHeading block="heading"
    //% shim=turtle::heading
    function heading(): number;

    /**
     * Set the speed of the turtle
     * @param speed turtle speed, eg: Speed.Fast
     */
    //% weight=40
    //% blockId=turtleSpeed block="set speed to %speed"
    //% shim=turtle::setSpeed
    function setSpeed(speed: Speed): void;

    /**
     * Set the pen color
     * @param color pen color, eg: 0x007fff
     */
    //% weight=50
    //% blockId="turtlePenColor" block="set pen color to %color=colorNumberPicker"
    //% shim=turtle::setPenColor
    function setPenColor(color: number): void;

    /**
     * Set the pen size
     * @param size pen size, eg: 3
     */
    //% weight=45
    //% blockId="turtlePenSize" block="set pen size to %size"
    //% size.min=1 size.max=10
    //% shim=turtle::setPenSize
    function setPenSize(size: number): void;

    /**
     * Show the turtle
     */
    //% weight=30
    //% blockId=turtleShow block="show turtle"
    //% shim=turtle::show
    function show(): void;

    /**
     * Hide the turtle
     */
    //% weight=35
    //% blockId=turtleHide block="hide turtle"
    //% shim=turtle::hide
    function hide(): void;

    /**
     * Move the turtle to the given position
     * @param xpos x position
     * @param ypos y position
     */
    //% weight=29
    //% blockId=turtleGoto block="goto x=%xpos and y=%ypos"
    //% shim=turtle::gotoAsync promise
    function goto(xpos: number, ypos: number): void;

    /**
     * Print a text and move forward
     * @param text text to print, eg: "Hello World"
     */
    //% weight=20
    //% blockId=turtlePrintAndMove block="print %text and move forward"
    //% shim=turtle::printAndMoveAsync promise
    function printAndMove(text: string): void;

    /**
     * Print a text and stand still
     * @param text text to print, eg: "Hello World"
     */
    //% weight=25
    //% blockId=turtlePrint block="print %text"
    //% shim=turtle::printAsync promise
    function print(text: string): void;

}

// Auto-generated. Do not edit. Really.
