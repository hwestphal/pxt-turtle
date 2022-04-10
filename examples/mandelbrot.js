function mand (r: number, i: number) {
    c = 0
    zr = 0
    zi = 0
    while (Math.sqrt(zr * zr + zi * zi) <= 2 && c < 100) {
        t = zr
        zr = zr * zr - zi * zi + r
        zi = 2 * t * zi + i
        c += 1
    }
    c = c / 100
}
let t = 0
let zi = 0
let zr = 0
let c = 0
turtle.hide()
turtle.setSpeed(Speed.Fastest)
turtle.goto(-125, 125)
turtle.turnRight(90)
turtle.setPenSize(5)
for (let y = 0; y <= 49; y++) {
    for (let index = 0; index < 50; index++) {
        mand(-2 + (turtle.x() + 125) / 250 * 3, -1 + (turtle.y() + 125) / 250 * 2)
        turtle.setPenColor(65793 * (255 - Math.floor(c * 255)))
        turtle.forward(5)
    }
    turtle.penUp()
    if (y % 2 == 0) {
        turtle.turnRight(90)
        turtle.forward(5)
        turtle.turnRight(90)
    } else {
        turtle.turnLeft(90)
        turtle.forward(5)
        turtle.turnLeft(90)
    }
    turtle.penDown()
}
