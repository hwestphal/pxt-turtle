let minutes = 0
let seconds = 0
let hours = 0
let ts = 0
function drawHands() {
    turtle.setPenColor(0x000000)
    turtle.turnRight((hours + minutes / 60 + seconds / 3600) * 30)
    turtle.forward(45)
    turtle.home()
    turtle.turnRight((minutes + seconds / 60) * 6)
    turtle.forward(60)
    turtle.home()
    turtle.turnRight(seconds * 6)
    turtle.forward(75)
    turtle.home()
}
function drawDial() {
    turtle.setPenColor(0xff0000)
    for (let i = 0; i <= 11; i++) {
        turtle.turnRight(i * 30)
        turtle.penUp()
        turtle.forward(100)
        turtle.penDown()
        if (i == 0) {
            turtle.backward(20)
        } else {
            turtle.backward(10)
        }
        turtle.home()
    }
}
turtle.hide()
turtle.setSpeed(Speed.Fastest)
while (true) {
    turtle.clear()
    drawDial()
    ts = time.now()
    hours = time.hours(ts)
    minutes = time.minutes(ts)
    seconds = time.seconds(ts)
    drawHands()
    time.wait(1)
}
