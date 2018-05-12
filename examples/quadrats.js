function Quadrat() {
    for (let i = 0; i < 4; i++) {
        turtle.forward(100)
        turtle.turnRight(90)
    }
}
for (let i = 0; i < 12; i++) {
    Quadrat()
    turtle.turnRight(30)
}
