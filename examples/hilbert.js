let s = 0
let d = 0
function ha() {
    if (d > 0) {
        turtle.turnLeft(90)
        d += -1
        hb()
        d += 1
        turtle.forward(s)
        turtle.turnRight(90)
        d += -1
        ha()
        d += 1
        turtle.forward(s)
        d += -1
        ha()
        d += 1
        turtle.turnRight(90)
        turtle.forward(s)
        d += -1
        hb()
        d += 1
        turtle.turnLeft(90)
    }
}
function hb() {
    if (d > 0) {
        turtle.turnRight(90)
        d += -1
        ha()
        d += 1
        turtle.forward(s)
        turtle.turnLeft(90)
        d += -1
        hb()
        d += 1
        turtle.forward(s)
        d += -1
        hb()
        d += 1
        turtle.turnLeft(90)
        turtle.forward(s)
        d += -1
        ha()
        d += 1
        turtle.turnRight(90)
    }
}
turtle.hide()
turtle.setSpeed(Speed.Fastest)
turtle.goto(108, -108)
s = 7
d = 5
ha()
