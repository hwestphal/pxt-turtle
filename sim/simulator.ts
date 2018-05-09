/// <reference types="pxt-core/built/pxtsim" />

namespace pxsim {

    initCurrentRuntime = () => {
        runtime.board = new TurtleBoard();
    };

    export function board() {
        return runtime.board as TurtleBoard;
    }

    export class TurtleBoard extends BaseBoard {
        private static readonly delays = {
            [Speed.Normal]: 15,
            [Speed.Slow]: 30,
            [Speed.Fast]: 1,
            [Speed.Fastest]: 0,
        };

        x = 0;
        y = 0;
        heading = 0;
        pen = true;
        penSize = 2;
        turtle = true;

        private readonly stage: createjs.Stage;
        private readonly xOffset: number;
        private readonly yOffset: number;
        private delay = TurtleBoard.delays[Speed.Normal];
        private color = "#ff0000";

        constructor() {
            super();
            this.stage = new createjs.Stage("area");
            createjs.Ticker.addEventListener("tick", this.stage);
            const canvas = this.stage.canvas as HTMLCanvasElement;
            this.xOffset = canvas.width / 2;
            this.yOffset = canvas.height / 2;
        }

        async initAsync(msg: SimulatorRunMessage) {
        }

        kill() {
            createjs.Ticker.removeEventListener("tick", this.stage as any);
        }

        move(distance: number) {
            const x = this.x;
            const y = this.y;
            this.x += distance * Math.sin(this.heading * Math.PI / 180);
            this.y += distance * Math.cos(this.heading * Math.PI / 180);
            if (this.pen) {
                const g = this.stage.addChild(new createjs.Shape())
                    .graphics
                    .setStrokeStyle(this.penSize)
                    .beginStroke(this.color)
                    .moveTo(this.xOffset + x, this.yOffset - y);
                if (this.delay > 0) {
                    const cmd = g.lineTo(this.xOffset + x, this.yOffset - y).command;
                    return new Promise<void>((resolve, reject) => {
                        createjs.Tween.get(cmd)
                            .to({ x: this.xOffset + this.x, y: this.yOffset - this.y }, this.delay * Math.abs(distance))
                            .call(resolve);
                    });
                }
                g.lineTo(this.xOffset + this.x, this.yOffset - this.y).endStroke();
            }
            return Promise.resolve();
        }

        async turn(angle: number) {
            const h = (this.heading + angle) % 360;
            this.heading = h > 180 ? h - 360 : h <= -180 ? h + 360 : h;
        }

        async home() {
            this.x = this.y = this.heading = 0;
        }

        set speed(s: Speed) {
            this.delay = TurtleBoard.delays[s];
        }

        set penColor(color: number) {
            this.color = `#${("00000" + color.toString(16)).substr(-6)}`;
        }
    }

}
