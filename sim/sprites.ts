namespace pxsim {

    export async function createTurtleSprite() {
        return new createjs.Sprite(await turtleSpriteSheet(), "default");
    }

    async function turtleSpriteSheet() {
        if (turtleSpriteSheet.cached) {
            return turtleSpriteSheet.cached;
        }
        const ssb = new createjs.SpriteSheetBuilder();
        (await loadImages("turtle1.svg", "turtle2.svg", "turtle3.svg")).map((i) => {
            i.regX = 218;
            i.regY = 265;
            ssb.addFrame(i, undefined, 0.06);
        });
        ssb.addAnimation("default", [0, 1, 0, 2], undefined, 0.4);
        turtleSpriteSheet.cached = ssb.build();
        return turtleSpriteSheet.cached;
    }

    namespace turtleSpriteSheet {
        export let cached: createjs.SpriteSheet;
    }

    function loadImages(...sources: string[]) {
        return new Promise<createjs.Bitmap[]>((resolve, reject) => {
            const queue = new createjs.LoadQueue();
            for (const src of sources) {
                queue.loadFile({ src, type: createjs.LoadQueue.IMAGE });
            }
            queue.addEventListener("error", (e) => {
                queue.removeAllEventListeners("complete");
                reject(e);
            });
            queue.addEventListener("complete", () => {
                resolve(queue.getItems(true).map((i) => new createjs.Bitmap((i as any).result)));
            });
        });
    }

}
