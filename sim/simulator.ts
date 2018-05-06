/// <reference types="pxt-core/built/pxtsim" />

namespace pxsim {

    initCurrentRuntime = () => {
        runtime.board = new TurtleBoard();
    };

    export function board(): TurtleBoard {
        return runtime.board as TurtleBoard;
    }

    const delays = {
        [Speed.Normal]: 250,
        [Speed.Slow]: 500,
        [Speed.Fast]: 100,
        [Speed.Fastest]: 0,
    };

    export class TurtleBoard extends BaseBoard {
        x = 0;
        y = 0;
        heading = 0;
        pen = true;
        penSize = 1;
        turtle = true;

        private readonly stage: createjs.Stage;
        private readonly xOffset: number;
        private readonly yOffset: number;
        private delay = delays[Speed.Normal];
        private color = "#000000";

        constructor() {
            super();
            this.stage = new createjs.Stage("area");
            // clean canvas
            this.stage.update();
            const canvas = this.stage.canvas as HTMLCanvasElement;
            this.xOffset = canvas.width / 2;
            this.yOffset = canvas.height / 2;
        }

        async initAsync(msg: SimulatorRunMessage) {
        }

        async move(distance: number) {
            const newX = this.x + distance * Math.sin(this.heading * Math.PI / 180);
            const newY = this.y + distance * Math.cos(this.heading * Math.PI / 180);
            if (this.pen) {
                const line = new createjs.Shape();
                this.stage.addChild(line);
                const g = line.graphics;
                g.setStrokeStyle(this.penSize).beginStroke(this.color);
                g.moveTo(this.xOffset + this.x, this.yOffset - this.y);
                g.lineTo(this.xOffset + newX, this.yOffset - newY);
                g.endStroke();
                this.stage.update();
            }
            this.x = newX;
            this.y = newY;
        }

        async turn(angle: number) {
            const h = (this.heading + angle) % 360;
            this.heading = h > 180 ? h - 360 : h <= -180 ? h + 360 : h;
        }

        async home() {
            this.x = this.y = this.heading = 0;
        }

        set speed(s: Speed) {
            this.delay = delays[s];
        }

        set penColor(color: number) {
            this.color = `#${("00000" + color.toString(16)).substr(-6)}`;
        }
    }

}
