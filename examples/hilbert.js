let s = 0
let y = 0
let a = 0
let d = 0
let x = 0
function goto() {
    turtle.home()
    turtle.penUp()
    turtle.turnRight(90)
    turtle.forward(x)
    turtle.turnLeft(90)
    turtle.forward(y)
    turtle.penDown()
}
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
x = 108
y = -108
goto()
s = 7
a = 90
d = 5
ha()
