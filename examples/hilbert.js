function h (d: number, s: number, a: number) {
    if (d > 0) {
        turtle.turnLeft(a)
        h(d - 1, s, 0 - a)
        turtle.forward(s)
        turtle.turnRight(a)
        h(d - 1, s, a)
        turtle.forward(s)
        h(d - 1, s, a)
        turtle.turnRight(a)
        turtle.forward(s)
        h(d - 1, s, 0 - a)
        turtle.turnLeft(a)
    }
}
turtle.hide()
turtle.setSpeed(Speed.Fastest)
turtle.goto(108, -108)
h(5, 7, 90)
