function tree (d: number) {
    if (d > 0) {
        turtle.setPenSize(d)
        turtle.setPenColor((10 - d) * 6400)
        turtle.forward(4 * d)
        turtle.turnLeft(20)
        tree(d - 1)
        turtle.turnRight(40)
        tree(d - 1)
        turtle.turnLeft(20)
        turtle.penUp()
        turtle.backward(4 * d)
        turtle.penDown()
    }
}
turtle.hide()
turtle.setSpeed(Speed.Fastest)
turtle.penUp()
turtle.backward(100)
turtle.penDown()
tree(10)
