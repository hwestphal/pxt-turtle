let s = 0
let d = 0
function k() {
    if (d > 0) {
        d += -1
        k()
        d += 1
        turtle.turnLeft(60)
        d += -1
        k()
        d += 1
        turtle.turnRight(120)
        d += -1
        k()
        d += 1
        turtle.turnLeft(60)
        d += -1
        k()
        d += 1
    } else {
        turtle.forward(s)
    }
}
turtle.hide()
turtle.setSpeed(Speed.Fastest)
turtle.setPenSize(1)
turtle.goto(-120, 70)
turtle.turnLeft(30)
d = 5
s = 1
for (let i = 0; i < 3; i++) {
    turtle.turnRight(120)
    k()
}
