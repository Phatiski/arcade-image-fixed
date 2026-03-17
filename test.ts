// tests go here; this will not be compiled when this package is used as an extension.

game.stats = true;
control.EventContext.onStats("");

const imgfxa = fximg.fromImage(img`
    . . . . . . . e c 7 . . . . . .
    . . . . e e e c 7 7 e e . . . .
    . . c e e e e c 7 e 2 2 e e . .
    . c e e e e e c 6 e e 2 2 2 e .
    . c e e e 2 e c c 2 4 5 4 2 e .
    c e e e 2 2 2 2 2 2 4 5 5 2 2 e
    c e e 2 2 2 2 2 2 2 2 4 4 2 2 e
    c e e 2 2 2 2 2 2 2 2 2 2 2 2 e
    c e e 2 2 2 2 2 2 2 2 2 2 2 2 e
    c e e 2 2 2 2 2 2 2 2 2 2 2 2 e
    c e e 2 2 2 2 2 2 2 2 2 2 4 2 e
    . e e e 2 2 2 2 2 2 2 2 2 4 e .
    . 2 e e 2 2 2 2 2 2 2 2 4 2 e .
    . . 2 e e 2 2 2 2 2 4 4 2 e . .
    . . . 2 2 e e 4 4 4 2 e e . . .
    . . . . . 2 2 e e e e . . . . .
`)
const imgfxb = fximg.fromImage(scene.backgroundImage());
//fximg.fill(imgfxb, 1)
const w = fximg.widthOf(imgfxb), h = fximg.heightOf(imgfxb);

if (1) {
    //imgfxa[6] = 0x00
    //fximg.blit(imgfxb, 5, 3, 15, 9, imgfxa, 0, 0, 15, 9, false, false);
    //fximg.drawLine(imgfxb, 20, 32, 140, 100, 3);
    //fximg.fillRect(imgfxb, 4, 4, 16, 16, 3);
    //fximg.fillTriangle(imgfxb, 80, 30, 130, 80, 120, 20, 3);
    //fximg.drawDistortedImage(imgfxa, imgfxb, 20, 10, 20, 60, 10, 80, 80, 60)
    //fximg.fillPolygon4(imgfxb, 20, 10, 20, 60, 10, 80, 80, 60, 3);
    fximg.drawTransDistortedImage(imgfxa, imgfxb,
        randint(0, w - 1), randint(0, h - 1),
        randint(0, w - 1), randint(0, h - 1),
        randint(0, w - 1), randint(0, h - 1),
        randint(0, w - 1), randint(0, h - 1),
    )
    //fximg.fillRect(imgfxb, 50, 30, 60, 60, 3)
    scene.setBackgroundImage(fximg.toImage(imgfxb))
}

/*
basic.forever(() => {
    let j = 8//randint(1, 16);
    for (let i = 0; i < j; i++) {
        //fximg.fillPolygon4(imgfxb,
        //    randint(0, w - 1), randint(0, h - 1),
        //    randint(0, w - 1), randint(0, h - 1),
        //    randint(0, w - 1), randint(0, h - 1),
        //    randint(0, w - 1), randint(0, h - 1),
        //    randint(0x0, 0xf)
        //)
        fximg.fillTriangle(imgfxb,
            randint(0, w - 1), randint(0, h - 1),
            randint(0, w - 1), randint(0, h - 1),
            randint(0, w - 1), randint(0, h - 1),
            randint(0x0, 0xf),
        )
    }
    scene.setBackgroundImage(fximg.toImage(imgfxb));
})
*/
