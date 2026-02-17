// tests go here; this will not be compiled when this package is used as an extension.

/*
const imgfxa = fximg.fromImage(img`
    . . . 1 1 1 2 2 2 3 3 3
    . . . 1 1 1 2 2 2 3 3 3
    . . . 1 1 1 2 2 2 3 3 3
    4 4 4 5 5 5 6 6 6 7 7 7
    4 4 4 5 5 5 6 6 6 7 7 7
    4 4 4 5 5 5 6 6 6 7 7 7
    8 8 8 9 9 9 a a a b b b
    8 8 8 9 9 9 a a a b b b
    8 8 8 9 9 9 a a a b b b
    c c c d d d e e e f f f
    c c c d d d e e e f f f
    c c c d d d e e e f f f
`)

const mySprite = sprites.create(fximg.toImage(imgfxa), 0);

if (1) {
    imgfxa[4] = 0x00
    mySprite.setImage(fximg.toImage(imgfxa))
}
*/