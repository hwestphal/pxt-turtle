let a = 0
let ps: number[] = []
turtle.penUp()
ps = [2, 3, 5, 7]
a = 1
while (a < 100) {
    turtle.setPenSize(a * 0.1)
    turtle.setPenColor(0xff0000)
    for (let p of ps) {
        if (a % p == 0 && a != p || a == 1) {
            turtle.setPenColor(0x000000)
        }
    }
    turtle.print("" + a)
    turtle.forward(a)
    turtle.turnRight(30)
    a += 1
}
