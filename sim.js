"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/// <reference types="../libs/core/enums" />
var pxsim;
(function (pxsim) {
    var turtle;
    (function (turtle) {
        /**
         * Move the turtle forward
         * @param distance distance to move, eg: 50
         */
        //% weight=90
        //% blockId=turtleForward block="forward %distance steps"
        function forwardAsync(distance) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pxsim.board().move(distance)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        turtle.forwardAsync = forwardAsync;
        /**
         * Move the turtle backward
         * @param distance distance to move, eg: 50
         */
        //% weight=85
        //% blockId=turtleBackward block="backward %distance steps"
        function backwardAsync(distance) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pxsim.board().move(-distance)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        turtle.backwardAsync = backwardAsync;
        /**
         * Turn the turtle to the right
         * @param angle degrees to turn, eg: 90
         */
        //% weight=80
        //% blockId=turtleTurnRight block="turn right by %angle degrees"
        //% angle.min=0 angle.max=360
        function turnRightAsync(angle) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pxsim.board().turn(angle)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        turtle.turnRightAsync = turnRightAsync;
        /**
         * Turn the turtle to the left
         * @param angle degrees to turn, eg: 90
         */
        //% weight=75
        //% blockId=turtleTurnLeft block="turn left by %angle degrees"
        //% angle.min=0 angle.max=360
        function turnLeftAsync(angle) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pxsim.board().turn(-angle)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        turtle.turnLeftAsync = turnLeftAsync;
        /**
         * Pull the pen up
         */
        //% weight=70
        //% blockId=turtlePenUp block="pull the pen up"
        function penUp() {
            pxsim.board().pen = false;
        }
        turtle.penUp = penUp;
        /**
         * Pull the pen down
         */
        //% weight=65
        //% blockId=turtlePenDown block="pull the pen down"
        function penDown() {
            pxsim.board().pen = true;
        }
        turtle.penDown = penDown;
        /**
         * Move the turtle to the origin and set heading to 0
         */
        //% weight=60
        //% blockId=turtleHome block="back to home"
        function homeAsync() {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pxsim.board().moveTo(0, 0, 0)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        turtle.homeAsync = homeAsync;
        /**
         * X position of the turtle
         */
        //% weight=55
        //% blockId=turtleX block="x position"
        function x() {
            return pxsim.board().x;
        }
        turtle.x = x;
        /**
         * Y position of the turtle
         */
        //% weight=54
        //% blockId=turtleY block="y position"
        function y() {
            return pxsim.board().y;
        }
        turtle.y = y;
        /**
         * Heading of the turtle
         */
        //% weight=53
        //% blockId=turtleHeading block="heading"
        function heading() {
            return pxsim.board().heading;
        }
        turtle.heading = heading;
        /**
         * Set the speed of the turtle
         * @param speed turtle speed, eg: Speed.Fast
         */
        //% weight=40
        //% blockId=turtleSpeed block="set speed to %speed"
        function setSpeed(speed) {
            pxsim.board().speed = speed;
        }
        turtle.setSpeed = setSpeed;
        /**
         * Set the pen color
         * @param color pen color, eg: 0x007fff
         */
        //% weight=50
        //% blockId="turtlePenColor" block="set pen color to %color=colorNumberPicker"
        function setPenColor(color) {
            pxsim.board().penColor = color;
        }
        turtle.setPenColor = setPenColor;
        /**
         * Set the pen size
         * @param size pen size, eg: 3
         */
        //% weight=45
        //% blockId="turtlePenSize" block="set pen size to %size"
        //% size.min=1 size.max=10
        function setPenSize(size) {
            pxsim.board().penSize = size;
        }
        turtle.setPenSize = setPenSize;
        /**
         * Show the turtle
         */
        //% weight=30
        //% blockId=turtleShow block="show turtle"
        function show() {
            pxsim.board().turtle = true;
        }
        turtle.show = show;
        /**
         * Hide the turtle
         */
        //% weight=35
        //% blockId=turtleHide block="hide turtle"
        function hide() {
            pxsim.board().turtle = false;
        }
        turtle.hide = hide;
        /**
         * Move the turtle to the given position
         * @param xpos x position
         * @param ypos y position
         */
        //% weight=29
        //% blockId=turtleGoto block="goto x=%xpos and y=%ypos"
        function gotoAsync(xpos, ypos) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pxsim.board().moveTo(xpos, ypos, pxsim.board().heading)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        turtle.gotoAsync = gotoAsync;
        /**
         * Print a text and move forward
         * @param text text to print, eg: "Hello World"
         */
        //% weight=20
        //- blockId=turtlePrintAndMove block="print %text and move forward"
        function printAndMoveAsync(text) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pxsim.board().print(text, true)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        turtle.printAndMoveAsync = printAndMoveAsync;
        /**
         * Print a text and stand still
         * @param text text to print, eg: "Hello World"
         */
        //% weight=25
        //- blockId=turtlePrint block="print %text"
        function printAsync(text) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pxsim.board().print(text, false)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        turtle.printAsync = printAsync;
        /**
         * Clear the canvas
         */
        //% weight=15
        //% blockId=turtleClear block="clear the canvas"
        function clear() {
            pxsim.board().clear();
        }
        turtle.clear = clear;
        /**
         * Draw image
         * @param img image to draw, eg: img``
         */
        //% weight=5
        //% blockId=turtleDrawImage block="draw %img=image_picker"
        function drawImage(img) {
            pxsim.board().drawImage(img);
        }
        turtle.drawImage = drawImage;
    })(turtle = pxsim.turtle || (pxsim.turtle = {}));
})(pxsim || (pxsim = {}));
(function (pxsim) {
    var time;
    (function (time) {
        /**
         * Wait for some time
         * @param delay time to wait in seconds, eg: 5
         */
        //% weight=90
        //% blockId=timeWait block="wait for %delay seconds"
        function waitAsync(delay) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, Promise.delay(delay * 1000)];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        }
        time.waitAsync = waitAsync;
        /**
         * Return the current date and time as seconds since epoch
         */
        //% weight=80
        //- blockId=timeNow block="current date and time"
        function now() {
            return Math.floor(Date.now() / 1000);
        }
        time.now = now;
        /**
         * Return the year of the given timestamp
         * @param ts timestamp
         */
        //% weight=78
        //- blockId=timeYear block="year of %ts"
        function year(ts) {
            return asDate(ts).getFullYear();
        }
        time.year = year;
        /**
         * Return the month of the given timestamp
         * @param ts timestamp
         */
        //% weight=77
        //- blockId=timeMonth block="month of %ts"
        function month(ts) {
            return asDate(ts).getMonth() + 1;
        }
        time.month = month;
        /**
         * Return the day of the given timestamp
         * @param ts timestamp
         */
        //% weight=76
        //- blockId=timeDay block="day of %ts"
        function day(ts) {
            return asDate(ts).getDate();
        }
        time.day = day;
        /**
         * Return the hours of the given timestamp
         * @param ts timestamp
         */
        //% weight=75
        //- blockId=timeHours block="hours of %ts"
        function hours(ts) {
            return asDate(ts).getHours();
        }
        time.hours = hours;
        /**
         * Return the minutes of the given timestamp
         * @param ts timestamp
         */
        //% weight=74
        //- blockId=timeMinutes block="minutes of %ts"
        function minutes(ts) {
            return asDate(ts).getMinutes();
        }
        time.minutes = minutes;
        /**
         * Return the seconds of the given timestamp
         * @param ts timestamp
         */
        //% weight=73
        //- blockId=timeSeconds block="seconds of %ts"
        function seconds(ts) {
            return asDate(ts).getSeconds();
        }
        time.seconds = seconds;
        function asDate(ts) {
            var d = new Date();
            d.setTime(ts * 1000);
            return d;
        }
    })(time = pxsim.time || (pxsim.time = {}));
})(pxsim || (pxsim = {}));
/// <reference types="pxt-core/built/pxtsim" />
var pxsim;
(function (pxsim) {
    pxsim.initCurrentRuntime = function () {
        pxsim.runtime.board = new TurtleBoard();
    };
    function board() {
        return pxsim.runtime.board;
    }
    pxsim.board = board;
    var TurtleBoard = /** @class */ (function (_super) {
        __extends(TurtleBoard, _super);
        function TurtleBoard() {
            var _this = _super.call(this) || this;
            _this.x = 0;
            _this.y = 0;
            _this.heading = 0;
            _this.pen = true;
            _this.penSize = 2;
            _this.delay = delays[1 /* Normal */];
            _this.color = "#ff0000";
            _this.stage = new createjs.Stage("area");
            createjs.Ticker.addEventListener("tick", _this.stage);
            var canvas = _this.stage.canvas;
            _this.xOffset = canvas.width / 2;
            _this.yOffset = canvas.height / 2;
            var rect = _this.stage.addChild(new createjs.Shape());
            rect.graphics.beginFill("white").rect(0, 0, canvas.width, canvas.height);
            return _this;
        }
        TurtleBoard.prototype.initAsync = function (msg) {
            return __awaiter(this, void 0, void 0, function () {
                var sprite;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, pxsim.createTurtleSprite()];
                        case 1:
                            sprite = _a.sent();
                            sprite.x = this.xOffset;
                            sprite.y = this.yOffset;
                            sprite.paused = true;
                            this.turtleSprite = this.stage.addChild(sprite);
                            // avoid flickering on start
                            return [4 /*yield*/, Promise.delay(1000)];
                        case 2:
                            // avoid flickering on start
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        TurtleBoard.prototype.kill = function () {
            createjs.Ticker.removeEventListener("tick", this.stage);
        };
        Object.defineProperty(TurtleBoard.prototype, "speed", {
            set: function (s) {
                this.delay = delays[s];
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TurtleBoard.prototype, "penColor", {
            set: function (color) {
                this.color = "#" + ("00000" + color.toString(16)).substr(-6);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(TurtleBoard.prototype, "turtle", {
            set: function (visible) {
                this.turtleSprite.visible = visible;
            },
            enumerable: true,
            configurable: true
        });
        TurtleBoard.prototype.move = function (distance) {
            var _this = this;
            var x = this.x;
            var y = this.y;
            this.x += distance * Math.sin(this.heading * Math.PI / 180);
            this.y += distance * Math.cos(this.heading * Math.PI / 180);
            var tx = this.xOffset + this.x;
            var ty = this.yOffset - this.y;
            if (this.pen || this.turtleSprite.visible) {
                var line = this.stage.addChild(new createjs.Shape());
                line.visible = this.pen;
                var g = line.graphics
                    .setStrokeStyle(this.penSize)
                    .beginStroke(this.color)
                    .moveTo(this.xOffset + x, this.yOffset - y);
                this.turtleToFront();
                if (this.delay > 0) {
                    var cmd_1 = g.lineTo(this.xOffset + x, this.yOffset - y).command;
                    var duration_1 = this.delay * Math.abs(distance);
                    this.turtleSprite.play();
                    createjs.Tween.get(this.turtleSprite).to({ x: tx, y: ty }, duration_1);
                    return new Promise(function (resolve) {
                        createjs.Tween.get(cmd_1)
                            .to({ x: tx, y: ty }, duration_1)
                            .call(function () {
                            _this.turtleSprite.gotoAndStop(0);
                            resolve();
                        });
                    });
                }
                g.lineTo(tx, ty).endStroke();
            }
            this.turtleSprite.x = tx;
            this.turtleSprite.y = ty;
            return Promise.resolve();
        };
        TurtleBoard.prototype.turn = function (angle) {
            var _this = this;
            var h = (this.heading + angle) % 360;
            var heading = this.heading;
            this.heading = h < 0 ? h + 360 : h;
            if (this.turtleSprite.visible && this.delay > 0) {
                this.turtleSprite.play();
                return new Promise(function (resolve) {
                    createjs.Tween.get(_this.turtleSprite)
                        .to({ rotation: heading + angle }, _this.delay * 0.5 * Math.abs(angle))
                        .call(function () {
                        _this.turtleSprite.gotoAndStop(0);
                        _this.turtleSprite.rotation = _this.heading;
                        resolve();
                    });
                });
            }
            this.turtleSprite.rotation = this.heading;
            return Promise.resolve();
        };
        TurtleBoard.prototype.moveTo = function (nx, ny, nh) {
            return __awaiter(this, void 0, void 0, function () {
                var pen, angle;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!(this.x !== nx || this.y !== ny)) return [3 /*break*/, 3];
                            pen = this.pen;
                            this.pen = false;
                            angle = Math.atan2(this.x - nx, this.y - ny) * 180 / Math.PI;
                            return [4 /*yield*/, this.turn(normalize(angle - this.heading - 180))];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.move(Math.sqrt(Math.pow((this.x - nx), 2) + Math.pow((this.y - ny), 2)))];
                        case 2:
                            _a.sent();
                            this.pen = pen;
                            _a.label = 3;
                        case 3: return [4 /*yield*/, this.turn(normalize(nh - this.heading))];
                        case 4:
                            _a.sent();
                            this.x = nx;
                            this.y = ny;
                            this.heading = nh;
                            this.turtleSprite.x = this.xOffset + nx;
                            this.turtleSprite.y = this.yOffset - ny;
                            this.turtleSprite.rotation = nh;
                            return [2 /*return*/];
                    }
                });
            });
        };
        TurtleBoard.prototype.print = function (text, move) {
            return __awaiter(this, void 0, void 0, function () {
                var t, pen;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            t = this.stage.addChild(new createjs.Text(text, 8 + this.penSize * 2 + "px monospace", this.color));
                            t.x = this.xOffset + this.x;
                            t.y = this.yOffset - this.y;
                            t.rotation = this.heading - 90;
                            t.textBaseline = "middle";
                            this.turtleToFront();
                            if (!move) return [3 /*break*/, 2];
                            pen = this.pen;
                            this.pen = false;
                            return [4 /*yield*/, this.move(t.getBounds().width)];
                        case 1:
                            _a.sent();
                            this.pen = pen;
                            _a.label = 2;
                        case 2: return [2 /*return*/];
                    }
                });
            });
        };
        TurtleBoard.prototype.clear = function () {
            while (this.stage.numChildren > 2) {
                this.stage.removeChildAt(1);
            }
        };
        TurtleBoard.prototype.drawImage = function (img) {
            var bitmap = new createjs.Bitmap(img);
            bitmap.regX = img.width / 2;
            bitmap.regY = img.height / 2;
            bitmap.x = this.xOffset + this.x;
            bitmap.y = this.yOffset - this.y;
            bitmap.rotation = this.heading;
            bitmap.scaleX = bitmap.scaleY = this.penSize;
            this.stage.addChild(bitmap);
            this.turtleToFront();
        };
        TurtleBoard.prototype.turtleToFront = function () {
            this.stage.setChildIndex(this.turtleSprite, this.stage.numChildren - 1);
        };
        return TurtleBoard;
    }(pxsim.BaseBoard));
    pxsim.TurtleBoard = TurtleBoard;
    function normalize(a) {
        a %= 360;
        return a > 180 ? a - 360 : a <= -180 ? a + 360 : a;
    }
    var delays = (_a = {},
        _a[1 /* Normal */] = 15,
        _a[0 /* Slow */] = 30,
        _a[2 /* Fast */] = 1,
        _a[3 /* Fastest */] = 0,
        _a);
    function log(msg) {
        // tslint:disable-next-line:no-console
        console.log("%c" + new Date().toISOString(), "color:blue; font-style: italic", msg);
    }
    pxsim.log = log;
    function toImage(buffer) {
        var width = buffer.data[1];
        var height = buffer.data[2];
        var data = buffer.data.slice(4);
        var array = new Uint8ClampedArray(width * height * 4);
        for (var i = 0; i < data.length; i++) {
            var x = Math.floor(2 * i / height);
            var y = (2 * i) % width;
            setColor(data[i] & 0x0f, array, width, x, y);
            setColor(data[i] >> 4, array, width, x, y + 1);
        }
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").putImageData(new ImageData(array, width, height), 0, 0);
        return canvas;
    }
    pxsim.toImage = toImage;
    var palette = [
        [0x00, 0x00, 0x00],
        [0xff, 0x00, 0x00],
        [0xff, 0x80, 0x00],
        [0xff, 0xff, 0x00],
        [0xff, 0x9d, 0xa5],
        [0x00, 0xff, 0x00],
        [0xb0, 0x9e, 0xff],
        [0x00, 0xff, 0xff],
        [0x00, 0x7f, 0xff],
        [0x65, 0x47, 0x1f],
        [0x00, 0x00, 0xff],
        [0x7f, 0x00, 0xff],
        [0xff, 0x00, 0x80],
        [0xff, 0x00, 0xff],
        [0x99, 0x99, 0x99],
    ];
    function setColor(color, data, width, x, y) {
        if (color > 0) {
            color -= 1;
            var i = 4 * (x + y * width);
            data[i] = palette[color][0];
            data[i + 1] = palette[color][1];
            data[i + 2] = palette[color][2];
            data[i + 3] = 0xff;
        }
    }
    var _a;
})(pxsim || (pxsim = {}));
var pxsim;
(function (pxsim) {
    function createTurtleSprite() {
        return __awaiter(this, void 0, void 0, function () {
            var _a, _b;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _b = (_a = createjs.Sprite).bind;
                        return [4 /*yield*/, turtleSpriteSheet()];
                    case 1: return [2 /*return*/, new (_b.apply(_a, [void 0, _c.sent(), "default"]))()];
                }
            });
        });
    }
    pxsim.createTurtleSprite = createTurtleSprite;
    function turtleSpriteSheet() {
        return __awaiter(this, void 0, void 0, function () {
            var ssb;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (turtleSpriteSheet.cached) {
                            return [2 /*return*/, turtleSpriteSheet.cached];
                        }
                        ssb = new createjs.SpriteSheetBuilder();
                        return [4 /*yield*/, loadImages("turtle1.svg", "turtle2.svg", "turtle3.svg")];
                    case 1:
                        (_a.sent()).map(function (i) {
                            i.regX = 218;
                            i.regY = 265;
                            ssb.addFrame(i, undefined, 0.06);
                        });
                        ssb.addAnimation("default", [0, 1, 0, 2], undefined, 0.4);
                        turtleSpriteSheet.cached = ssb.build();
                        return [2 /*return*/, turtleSpriteSheet.cached];
                }
            });
        });
    }
    (function (turtleSpriteSheet) {
    })(turtleSpriteSheet || (turtleSpriteSheet = {}));
    function loadImages() {
        var sources = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            sources[_i] = arguments[_i];
        }
        return new Promise(function (resolve, reject) {
            var queue = new createjs.LoadQueue();
            for (var _i = 0, sources_1 = sources; _i < sources_1.length; _i++) {
                var src = sources_1[_i];
                queue.loadFile({ src: src, type: createjs.LoadQueue.IMAGE });
            }
            queue.addEventListener("error", function (e) {
                queue.removeAllEventListeners("complete");
                reject(e);
            });
            queue.addEventListener("complete", function () {
                resolve(queue.getItems(true).map(function (i) { return new createjs.Bitmap(i.result); }));
            });
        });
    }
})(pxsim || (pxsim = {}));
