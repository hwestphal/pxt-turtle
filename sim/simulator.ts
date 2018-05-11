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
                this.stage.setChildIndex(this.turtleSprite!, this.stage.numChildren - 1);
                if (this.delay > 0) {
                    const cmd = g.lineTo(this.xOffset + x, this.yOffset - y).command;
                    const duration = this.delay * Math.abs(distance);
                    this.turtleSprite!.play();
                    createjs.Tween.get(this.turtleSprite!).to({ x: tx, y: ty }, duration);
                    return new Promise<void>((resolve, reject) => {
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
                return new Promise<void>((resolve, reject) => {
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

        async home() {
            const pen = this.pen;
            this.pen = false;
            const angle = Math.atan2(this.x, this.y) * 180 / Math.PI;
            await this.turn(normalize(angle - this.heading - 180));
            await this.move(Math.sqrt(this.x * this.x + this.y * this.y));
            await this.turn(normalize(-this.heading));
            this.pen = pen;
            this.x = this.y = this.heading = 0;
            this.turtleSprite!.x = this.xOffset;
            this.turtleSprite!.y = this.yOffset;
            this.turtleSprite!.rotation = 0;
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

}
