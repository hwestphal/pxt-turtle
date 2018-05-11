turtle.turnRight(Math.randomRange(-180, 180))
while (turtle.heading() != 0) {
    turtle.forward(10)
    if (turtle.x() < -145 || turtle.x() > 145 || turtle.y() < -145 || turtle.y() > 145) {
        turtle.backward(10)
        turtle.turnRight(Math.randomRange(90, 180))
    }
}
