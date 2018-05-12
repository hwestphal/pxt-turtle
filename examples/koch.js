let y = 0
let s = 0
let x = 0
let d = 0
function goto() {
    turtle.home()
    turtle.penUp()
    turtle.turnRight(90)
    turtle.forward(x)
    turtle.turnLeft(90)
    turtle.forward(y)
    turtle.penDown()
}
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
x = -120
y = 70
goto()
turtle.turnLeft(30)
turtle.setPenSize(1)
d = 5
s = 1
for (let i = 0; i < 3; i++) {
    turtle.turnRight(120)
    k()
}
