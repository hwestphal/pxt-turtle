function k (d: number, s: number) {
    if (d > 0) {
        k(d - 1, s)
        turtle.turnLeft(60)
        k(d - 1, s)
        turtle.turnRight(120)
        k(d - 1, s)
        turtle.turnLeft(60)
        k(d - 1, s)
    } else {
        turtle.forward(s)
    }
}
turtle.hide()
turtle.setSpeed(Speed.Fastest)
turtle.setPenSize(1)
turtle.goto(-120, 70)
turtle.turnLeft(30)
for (let index = 0; index < 3; index++) {
    turtle.turnRight(120)
    k(5, 1)
}
