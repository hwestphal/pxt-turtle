/// <reference types="../libs/core/enums" />

namespace pxsim.turtle {
    /**
     * Move the turtle forward
     * @param distance distance to move, eg: 50
     */
    //% weight=90
    //% blockId=turtleForward block="forward %distance steps"
    export async function forwardAsync(distance: number) {
        await board().move(distance);
    }

    /**
     * Move the turtle backward
     * @param distance distance to move, eg: 50
     */
    //% weight=85
    //% blockId=turtleBackward block="backward %distance steps"
    export async function backwardAsync(distance: number) {
        await board().move(-distance);
    }

    /**
     * Turn the turtle to the right
     * @param angle degrees to turn, eg: 90
     */
    //% weight=80
    //% blockId=turtleTurnRight block="turn right by %angle degrees"
    //% angle.min=0 angle.max=360
    export async function turnRightAsync(angle: number) {
        await board().turn(angle);
    }

    /**
     * Turn the turtle to the left
     * @param angle degrees to turn, eg: 90
     */
    //% weight=75
    //% blockId=turtleTurnLeft block="turn left by %angle degrees"
    //% angle.min=0 angle.max=360
    export async function turnLeftAsync(angle: number) {
        await board().turn(-angle);
    }

    /**
     * Pull the pen up
     */
    //% weight=70
    //% blockId=turtlePenUp block="pull the pen up"
    export function penUp() {
        board().pen = false;
    }

    /**
     * Pull the pen down
     */
    //% weight=65
    //% blockId=turtlePenDown block="pull the pen down"
    export function penDown() {
        board().pen = true;
    }

    /**
     * Move the turtle to the origin and set heading to 0
     */
    //% weight=60
    //% blockId=turtleHome block="back to home"
    export async function homeAsync() {
        await board().moveTo(0, 0, 0);
    }

    /**
     * X position of the turtle
     */
    //% weight=55
    //% blockId=turtleX block="x position"
    export function x() {
        return board().x;
    }

    /**
     * Y position of the turtle
     */
    //% weight=54
    //% blockId=turtleY block="y position"
    export function y() {
        return board().y;
    }

    /**
     * Heading of the turtle
     */
    //% weight=53
    //% blockId=turtleHeading block="heading"
    export function heading() {
        return board().heading;
    }

    /**
     * Set the speed of the turtle
     * @param speed turtle speed, eg: Speed.Fast
     */
    //% weight=40
    //% blockId=turtleSpeed block="set speed to %speed"
    export function setSpeed(speed: Speed) {
        board().speed = speed;
    }

    /**
     * Set the pen color
     * @param color pen color, eg: 0x007fff
     */
    //% weight=50
    //% blockId="turtlePenColor" block="set pen color to %color=colorNumberPicker"
    export function setPenColor(color: number) {
        board().penColor = color;
    }

    /**
     * Set the pen size
     * @param size pen size, eg: 3
     */
    //% weight=45
    //% blockId="turtlePenSize" block="set pen size to %size"
    //% size.min=1 size.max=10
    export function setPenSize(size: number) {
        board().penSize = size;
    }

    /**
     * Show the turtle
     */
    //% weight=30
    //% blockId=turtleShow block="show turtle"
    export function show() {
        board().turtle = true;
    }

    /**
     * Hide the turtle
     */
    //% weight=35
    //% blockId=turtleHide block="hide turtle"
    export function hide() {
        board().turtle = false;
    }

    /**
     * Move the turtle to the given position
     * @param xpos x position
     * @param ypos y position
     */
    //% weight=29
    //% blockId=turtleGoto block="goto x=%xpos and y=%ypos"
    export async function gotoAsync(xpos: number, ypos: number) {
        await board().moveTo(xpos, ypos, board().heading);
    }

    /**
     * Print a text and move forward
     * @param text text to print, eg: "Hello World"
     */
    //% weight=20
    //% blockId=turtlePrintAndMove block="print %text and move forward"
    export async function printAndMoveAsync(text: string) {
        await board().print(text, true);
    }

    /**
     * Print a text and stand still
     * @param text text to print, eg: "Hello World"
     */
    //% weight=25
    //% blockId=turtlePrint block="print %text"
    export async function printAsync(text: string) {
        await board().print(text, false);
    }

    /**
     * Clear the canvas
     */
    //% weight=15
    //% blockId=turtleClear block="clear the canvas"
    export function clear() {
        board().clear();
    }

    /**
     * Draw image
     * @param img image to draw, eg: img``
     */
    //% weight=5
    //% blockId=turtleDrawImage block="draw %img=image_picker"
    export function drawImage(img: Image) {
        board().drawImage(img);
    }

}

namespace pxsim.time {
    /**
     * Wait for some time
     * @param delay time to wait in seconds, eg: 5
     */
    //% weight=90
    //% blockId=timeWait block="wait for %delay seconds"
    export async function waitAsync(delay: number) {
        await Promise.delay(delay * 1000);
    }

    /**
     * Return the current date and time as seconds since epoch
     */
    //% weight=80
    //% blockId=timeNow block="current date and time"
    export function now() {
        return Math.floor(Date.now() / 1000);
    }

    /**
     * Return the year of the given timestamp
     * @param ts timestamp
     */
    //% weight=78
    //% blockId=timeYear block="year of %ts"
    export function year(ts: number) {
        return asDate(ts).getFullYear();
    }

    /**
     * Return the month of the given timestamp
     * @param ts timestamp
     */
    //% weight=77
    //% blockId=timeMonth block="month of %ts"
    export function month(ts: number) {
        return asDate(ts).getMonth() + 1;
    }

    /**
     * Return the day of the given timestamp
     * @param ts timestamp
     */
    //% weight=76
    //% blockId=timeDay block="day of %ts"
    export function day(ts: number) {
        return asDate(ts).getDate();
    }

    /**
     * Return the hours of the given timestamp
     * @param ts timestamp
     */
    //% weight=75
    //% blockId=timeHours block="hours of %ts"
    export function hours(ts: number) {
        return asDate(ts).getHours();
    }

    /**
     * Return the minutes of the given timestamp
     * @param ts timestamp
     */
    //% weight=74
    //% blockId=timeMinutes block="minutes of %ts"
    export function minutes(ts: number) {
        return asDate(ts).getMinutes();
    }

    /**
     * Return the seconds of the given timestamp
     * @param ts timestamp
     */
    //% weight=73
    //% blockId=timeSeconds block="seconds of %ts"
    export function seconds(ts: number) {
        return asDate(ts).getSeconds();
    }

    function asDate(ts: number) {
        const d = new Date();
        d.setTime(ts * 1000);
        return d;
    }

}
