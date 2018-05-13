turtle.turnRight(Math.randomRange(-180, 180))
for (let i = 0; i < 2000; i++) {
    turtle.forward(10)
    if (turtle.y() < -145 || turtle.y() > 144) {
        if (turtle.heading() > 180) {
            turtle.turnLeft(180 + 2 * (turtle.heading() - 360))
        } else {
            turtle.turnRight(180 - 2 * turtle.heading())
        }
    } else if (turtle.x() < -145 || turtle.x() > 144) {
        if (turtle.heading() >= 0 && turtle.heading() < 90) {
            turtle.turnLeft(2 * turtle.heading())
        } else if (turtle.heading() >= 90 && turtle.heading() < 180) {
            turtle.turnRight(360 - 2 * turtle.heading())
        } else if (turtle.heading() >= 180 && turtle.heading() < 270) {
            turtle.turnLeft(2 * turtle.heading() - 360)
        } else {
            turtle.turnRight(2 * (360 - turtle.heading()))
        }
    }
}
turtle.home()
