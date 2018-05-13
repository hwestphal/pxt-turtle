let s = 0
let a = 0
let d = 0
function ha() {
    if (d > 0) {
        turtle.turnLeft(a)
        d += -1
        hb()
        d += 1
        turtle.forward(s)
        turtle.turnRight(a)
        d += -1
        ha()
        d += 1
        turtle.forward(s)
        d += -1
        ha()
        d += 1
        turtle.turnRight(a)
        turtle.forward(s)
        d += -1
        hb()
        d += 1
        turtle.turnLeft(a)
    }
}
function hb() {
    if (d > 0) {
        turtle.turnRight(a)
        d += -1
        ha()
        d += 1
        turtle.forward(s)
        turtle.turnLeft(a)
        d += -1
        hb()
        d += 1
        turtle.forward(s)
        d += -1
        hb()
        d += 1
        turtle.turnLeft(a)
        turtle.forward(s)
        d += -1
        ha()
        d += 1
        turtle.turnRight(a)
    }
}
turtle.hide()
turtle.setSpeed(Speed.Fastest)
turtle.goto(108, -108)
s = 7
a = 90
d = 5
ha()
