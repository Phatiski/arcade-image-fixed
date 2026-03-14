// tests go here; this will not be compiled when this package is used as an extension.

game.stats = true;
control.EventContext.onStats("");

const imgfxa = fximg.fromImage(img`
    1 2 3 4 5
    6 7 8 9 a
    b c d e f
`)
const imgfxb = fximg.create(160, 120);
//fximg.fill(imgfxb, 1)

const mySprite = sprites.create(fximg.toImage(imgfxb), 0);

if (1) {
    //imgfxa[6] = 0x00
    //fximg.blit(imgfxb, 5, 3, 15, 9, imgfxa, 0, 0, 15, 9, false, false);
    //fximg.drawLine(imgfxb, 20, 32, 120, 87, 3);
    //fximg.fillRect(imgfxb, 4, 4, 16, 16, 3);
    fximg.fillTriangle(imgfxb, 80, 30, 130, 80, 120, 20, 3);
    //fximg.drawDistortedImage(imgfxa, imgfxb, 0, 0, 0, 60, 60, 60, 60, 0)
    mySprite.setImage(fximg.toImage(imgfxb))
}

