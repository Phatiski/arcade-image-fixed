
namespace FxImage {

    let tmpns: number[] = [], tmpnl: number = 0;
    let tbufs: Buffer[] = [];

    const NIB_MASK0 = 0xf0;
    const NIB_MASK1 = 0x0f;

    export const _pos2idx = (a: number, amax: number, b: number) => (a * amax) + b;

    export const isEmptyImage = (img: Image) => img.equals(image.create(img.width, img.height));

    export function create(width: number, height: number): Buffer {
        const fximg = pins.createBuffer(4 + ((1 + (width * height)) >>> 1))
        fximg.setNumber(NumberFormat.UInt16LE, 0, height);
        fximg.setNumber(NumberFormat.UInt16LE, 2, width)
        return fximg;
    }

    export function fromImage(img: Image) {
        if (isEmptyImage(img)) return create(img.width, img.height);
        const fximg = pins.createBuffer(4 + ((1 + (img.width * img.height)) >>> 1));
        fximg.setNumber(NumberFormat.UInt16LE, 0, img.height);
        fximg.setNumber(NumberFormat.UInt16LE, 2, img.width);
        const tmpn = img.height
        tmpns.push(tmpn), tbufs.push(pins.createBuffer(tmpn)), tmpnl++;
        for (let x = 0; x < img.width; x++) {
            img.getRows(x, tbufs[tmpnl - 1]);
            setRow(fximg, x, tbufs[tmpnl - 1]);
        }
        tmpnl--, tbufs.pop(), tmpns.pop();
        return fximg;
    }

    export function toImage(fximg: Buffer): Image {
        const img = image.create(fximg.getNumber(NumberFormat.UInt16LE, 2), fximg.getNumber(NumberFormat.UInt16LE, 0));
        const tmpn = img.height;
        tmpns.push(tmpn), tbufs.push(pins.createBuffer(tmpn)), tmpnl++;
        for (let x = 0; x < img.width; x++) {
            getRow(fximg, x, tbufs[tmpnl - 1]);
            img.setRows(x, tbufs[tmpnl - 1]);
        }
        tmpnl--, tmpns.pop(), tbufs.pop();
        return img.clone();
    }

    const maxImgSizes = (imgs: Image[]) => {
        const cur = { width: imgs[0].width, height: imgs[0].height, area: 0 };
        for (const img of imgs)
            cur.width = Math.max(cur.width, img.width),
            cur.height = Math.max(cur.height, img.height);
        cur.area = cur.width * cur.height;
        return cur
    }

    export function fromFrame(imgs: Image[]) {
        const allSize = maxImgSizes(imgs);
        const fximgs = pins.createBuffer(4 + ((1 + (allSize.area * imgs.length)) >> 1));
        fximgs.setNumber(NumberFormat.UInt16LE, 0, allSize.height);
        fximgs.setNumber(NumberFormat.UInt16LE, 2, allSize.width);
        const tmpn = allSize.height;
        tmpns.push(tmpn), tbufs.push(pins.createBuffer(tmpn)), tmpnl++;
        let nw = 0;
        for (const img of imgs) {
            for (let x = 0; x < img.width; x++) {
                img.getRows(x, tbufs[tmpnl - 1]);
                setRow(fximgs, nw + x, tbufs[tmpnl - 1])
            }
            nw += allSize.width
        }
        tmpnl--, tmpns.pop(), tbufs.pop();
        return fximgs;
    }

    export function toFrame(fximgs: Buffer) {
        const imgs = []
        const img = image.create(fximgs.getNumber(NumberFormat.UInt16LE, 2), fximgs.getNumber(NumberFormat.UInt16LE, 0));
        const tmpn = img.height;
        tmpns.push(tmpn), tbufs.push(pins.createBuffer(tmpn)), tmpnl++;
        for (let nw = 0; (((1 + (nw * img.height)) >> 1) + 4) < fximgs.length; nw += img.width) {
            for (let x = 0; x < img.width; x++) {
                getRow(fximgs, nw + x, tbufs[tmpnl - 1]);
                img.setRows(x, tbufs[tmpnl - 1]);
            }
            imgs.push(img.clone())
        }
        tmpnl--, tmpns.pop(), tbufs.pop();
        return imgs.slice();
    }

    export function setPixel(fximg: Buffer, x: number, y: number, c: number) {
        if (c > 0xf || c < 0x0) c &= 0xf;
        const i = _pos2idx(x, fximg.getNumber(NumberFormat.UInt16LE, 0), y)
        const ih4 = (i >>> 1) + 4;
        const curv = fximg[ih4]
        let nib0 = curv & 0xf,
            nib1 = curv >>> 4;
        if (i & 1 ? nib0 === c : nib1 === c) return;
        if (i & 1) nib0 = c;
        else nib1 = c;
        fximg[ih4] = (nib1 << 4) + nib0;
    }

    export function getPixel(fximg: Buffer, x: number, y: number) {
        const i = _pos2idx(x, fximg.getNumber(NumberFormat.UInt16LE, 0), y);
        const ih = i >>> 1;
        const ih4 = ih + 4;
        const curv = fximg[ih4];
        return (i & 1 ? curv & 0xf : curv >>> 4)
    }

    export function getRow(fximg: Buffer, x: number, dst: Buffer) {
        const h0 = tmpnl > 0 ? tmpns[tmpnl - 1] : fximg.getNumber(NumberFormat.UInt16LE, 0);
        const len = Math.min(dst.length, h0);
        if (len < 1) return;
        let i = x * h0,
            y = 0;
        if (i & 1) {
            const ih4 = (i >>> 1) + 4;
            dst[y] = fximg[ih4] & NIB_MASK1;
            i++, y++;
        }
        for (;y < len - 1; y += 2) {
            const ih4 = (i >>> 1) + 4;
            const val = fximg[ih4];
            dst[y + 1] = val & NIB_MASK1;
            dst[y] = val >>> 4;
            i += 2;
        }
        if (y < len) {
            const ih4 = (i >>> 1) + 4;
            dst[y] = (i & 1) ? (fximg[ih4] & NIB_MASK1) : (fximg[ih4] >>> 4);
        }
    }

    export function setRow(fximg: Buffer, x: number, src: Buffer) {
        const h0 = tmpnl > 0 ? tmpns[tmpnl - 1] : fximg.getNumber(NumberFormat.UInt16LE, 0)
        const len = Math.min(src.length, h0);
        if (len < 1) return;
        let i = x * h0,
            y = 0;
        if (i & 1) {
            if (src[y] > 0xf || src[y] < 0x0) src[y] &= 0xf;
            const ih4 = (i >>> 1) + 4;
            fximg[ih4] = (fximg[ih4] & NIB_MASK0) | (src[y] & NIB_MASK1);
            i++, y++;
        }
        for (; y < len - 1; y += 2) {
            if (src[y] > 0xf || src[y] < 0x0) src[y] &= 0xf; if (src[y + 1] > 0xf || src[y + 1] < 0x0) src[y + 1] &= 0xf;
            const ih4 = (i >>> 1) + 4;
            fximg[ih4] = (src[y] << 4) | (src[y + 1] & NIB_MASK1);
            i += 2;
        }
        if (y < len) {
            if (src[y] > 0xf || src[y] < 0x0) src[y] &= 0xf;
            const ih4 = (i >>> 1) + 4;
            fximg[ih4] = (i & 1) ? (src[y] << 4) | (fximg[ih4] & NIB_MASK1) : (fximg[ih4] & NIB_MASK0) | (src[y] & NIB_MASK1);
        }
    }
}
/*
// test zone: mutitask test
scene.setBackgroundColor(1)

let mySpriteA = sprites.create(img`
    4 4 4 . . 4 4 4 4 4 . . . . . .
    4 5 5 4 4 5 5 5 5 5 4 4 . . . .
    b 4 5 5 1 5 1 1 1 5 5 5 4 . . .
    . b 5 5 5 5 1 1 5 5 1 1 5 4 . .
    . b d 5 5 5 5 5 5 5 5 1 1 5 4 .
    b 4 5 5 5 5 5 5 5 5 5 5 1 5 4 .
    c d 5 5 5 5 5 5 5 5 5 5 5 5 5 4
    c d 4 5 5 5 5 5 5 5 5 5 5 1 5 4
    c 4 5 5 5 d 5 5 5 5 5 5 5 5 5 4
    c 4 d 5 4 5 d 5 5 5 5 5 5 5 5 4
    . c 4 5 5 5 5 d d d 5 5 5 5 5 b
    . c 4 d 5 4 5 d 4 4 d 5 5 5 4 c
    . . c 4 4 d 4 4 4 4 4 d d 5 d c
    . . . c 4 4 4 4 4 4 4 4 5 5 5 4
    . . . . c c b 4 4 4 b b 4 5 4 4
    . . . . . . c c c c c c b b 4 .
`, SpriteKind.Player)
mySpriteA.x += 32
let mySpriteB = sprites.create(img`
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
`, SpriteKind.Player)
mySpriteB.x -= 32

basic.forever(() => {
    const imgfxa = FxImage.fromImage(mySpriteA.image)
    mySpriteA.image.fill(0)
    //basic.pause(20)
    mySpriteA.setImage(FxImage.toImage(imgfxa))
})
basic.forever(() => {
    const imgfxb = FxImage.fromImage(mySpriteB.image)
    mySpriteB.image.fill(0)
    //basic.pause(20)
    mySpriteB.setImage(FxImage.toImage(imgfxb))
})
*/