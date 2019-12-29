/// <reference types="pxt-core/built/pxtsim" />

namespace pxsim {

    initCurrentRuntime = () => {
        runtime.board = new TurtleBoard();
    };

    export function board() {
        return runtime.board as TurtleBoard;
    }

    export class TurtleBoard extends BaseBoard {
        x = 0;
        y = 0;
        heading = 0;
        pen = true;
        penSize = 2;

        private readonly stage: createjs.Stage;
        private readonly xOffset: number;
        private readonly yOffset: number;
        private delay = delays[Speed.Normal];
        private color = "#ff0000";
        private turtleSprite?: createjs.Sprite;

        constructor() {
            super();
            this.stage = new createjs.Stage("area");
            createjs.Ticker.addEventListener("tick", this.stage);
            const canvas = this.stage.canvas as HTMLCanvasElement;
            this.xOffset = canvas.width / 2;
            this.yOffset = canvas.height / 2;
            const rect = this.stage.addChild(new createjs.Shape());
            rect.graphics.beginFill("white").rect(0, 0, canvas.width, canvas.height);
        }

        async initAsync(msg: SimulatorRunMessage) {
            const sprite = await createTurtleSprite();
            sprite.x = this.xOffset;
            sprite.y = this.yOffset;
            sprite.paused = true;
            this.turtleSprite = this.stage.addChild(sprite);
            // avoid flickering on start
            await Promise.delay(1000);
        }

        kill() {
            createjs.Ticker.removeEventListener("tick", this.stage as any);
        }

        set speed(s: Speed) {
            this.delay = delays[s];
        }

        set penColor(color: number) {
            this.color = `#${("00000" + color.toString(16)).substr(-6)}`;
        }

        set turtle(visible: boolean) {
            this.turtleSprite!.visible = visible;
        }

        move(distance: number) {
            const x = this.x;
            const y = this.y;
            this.x += distance * Math.sin(this.heading * Math.PI / 180);
            this.y += distance * Math.cos(this.heading * Math.PI / 180);
            const tx = this.xOffset + this.x;
            const ty = this.yOffset - this.y;
            if (this.pen || this.turtleSprite!.visible) {
                const line = this.stage.addChild(new createjs.Shape());
                line.visible = this.pen;
                const g = line.graphics
                    .setStrokeStyle(this.penSize)
                    .beginStroke(this.color)
                    .moveTo(this.xOffset + x, this.yOffset - y);
                this.turtleToFront();
                if (this.delay > 0) {
                    const cmd = g.lineTo(this.xOffset + x, this.yOffset - y).command;
                    const duration = this.delay * Math.abs(distance);
                    this.turtleSprite!.play();
                    createjs.Tween.get(this.turtleSprite!).to({ x: tx, y: ty }, duration);
                    return new Promise<void>((resolve) => {
                        createjs.Tween.get(cmd)
                            .to({ x: tx, y: ty }, duration)
                            .call(() => {
                                this.turtleSprite!.gotoAndStop(0);
                                resolve();
                            });
                    });
                }
                g.lineTo(tx, ty).endStroke();
            }
            this.turtleSprite!.x = tx;
            this.turtleSprite!.y = ty;
            return Promise.resolve();
        }

        turn(angle: number) {
            const h = (this.heading + angle) % 360;
            const heading = this.heading;
            this.heading = h < 0 ? h + 360 : h;
            if (this.turtleSprite!.visible && this.delay > 0) {
                this.turtleSprite!.play();
                return new Promise<void>((resolve) => {
                    createjs.Tween.get(this.turtleSprite!)
                        .to({ rotation: heading + angle }, this.delay * 0.5 * Math.abs(angle))
                        .call(() => {
                            this.turtleSprite!.gotoAndStop(0);
                            this.turtleSprite!.rotation = this.heading;
                            resolve();
                        });
                });
            }
            this.turtleSprite!.rotation = this.heading;
            return Promise.resolve();
        }

        async moveTo(nx: number, ny: number, nh: number) {
            if (this.x !== nx || this.y !== ny) {
                const pen = this.pen;
                this.pen = false;
                const angle = Math.atan2(this.x - nx, this.y - ny) * 180 / Math.PI;
                await this.turn(normalize(angle - this.heading - 180));
                await this.move(Math.sqrt((this.x - nx) ** 2 + (this.y - ny) ** 2));
                this.pen = pen;
            }
            await this.turn(normalize(nh - this.heading));
            this.x = nx;
            this.y = ny;
            this.heading = nh;
            this.turtleSprite!.x = this.xOffset + nx;
            this.turtleSprite!.y = this.yOffset - ny;
            this.turtleSprite!.rotation = nh;
        }

        async print(text: string, move: boolean) {
            const t = this.stage.addChild(new createjs.Text(text, `${8 + this.penSize * 2}px monospace`, this.color));
            t.x = this.xOffset + this.x;
            t.y = this.yOffset - this.y;
            t.rotation = this.heading - 90;
            t.textBaseline = "middle";
            this.turtleToFront();
            if (move) {
                const pen = this.pen;
                this.pen = false;
                await this.move(t.getBounds().width);
                this.pen = pen;
            }
        }

        clear() {
            while (this.stage.numChildren > 2) {
                this.stage.removeChildAt(1);
            }
        }

        drawSprite(sprite: SpriteImpl) {
            const bitmap = new createjs.Bitmap(sprite.canvas);
            bitmap.regX = sprite.width / 2;
            bitmap.regY = sprite.height / 2;
            bitmap.x = this.xOffset + this.x;
            bitmap.y = this.yOffset - this.y;
            bitmap.rotation = this.heading;
            bitmap.scaleX = bitmap.scaleY = this.penSize;
            this.stage.addChild(bitmap);
            this.turtleToFront();
        }

        private turtleToFront() {
            this.stage.setChildIndex(this.turtleSprite!, this.stage.numChildren - 1);
        }

    }

    function normalize(a: number) {
        a %= 360;
        return a > 180 ? a - 360 : a <= -180 ? a + 360 : a;
    }

    const delays = {
        [Speed.Normal]: 15,
        [Speed.Slow]: 30,
        [Speed.Fast]: 1,
        [Speed.Fastest]: 0,
    };

    export function log(msg: string) {
        // tslint:disable-next-line:no-console
        console.log(`%c${toLocalISOString(new Date())} %c[TURTLE]`, "color: blue; font-style: italic", "font-weight: bold", msg);
    }

    function toLocalISOString(date: Date) {
        const modDate = new Date();
        modDate.setTime(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
        return modDate.toISOString().slice(0, -1);
    }

    export function toSprite(buffer: RefBuffer): Sprite {
        const width = buffer.data[2] + (buffer.data[3] << 8);
        const height = buffer.data[4] + (buffer.data[5] << 8);
        const dataHeight = Math.ceil(height / 8) * 8;
        const data = buffer.data.slice(8);
        const array = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < data.length; i++) {
            const x = Math.floor(2 * i / dataHeight);
            const y = (2 * i) % dataHeight;
            setColor(data[i] & 0x0f, array, width, x, y);
            setColor(data[i] >> 4, array, width, x, y + 1);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d")!.putImageData(new ImageData(array, width, height), 0, 0);
        return new SpriteImpl(canvas);
    }

    export class SpriteImpl implements Sprite {
        constructor(public canvas: HTMLCanvasElement) { }

        get width() {
            return this.canvas.width;
        }

        get height() {
            return this.canvas.height;
        }

        private getWidth() {
            return this.width;
        }

        private getHeight() {
            return this.height;
        }
    }

    const palette = [
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

    function setColor(color: number, data: Uint8Array, width: number, x: number, y: number) {
        if (color > 0) {
            color -= 1;
            const i = 4 * (x + y * width);
            data[i] = palette[color][0];
            data[i + 1] = palette[color][1];
            data[i + 2] = palette[color][2];
            data[i + 3] = 0xff;
        }
    }

}
