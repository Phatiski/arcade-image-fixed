
namespace FxImage {

    let tmpn: number, tmpn0: number;
    let tbuf: Buffer;

    const NIB_MASK0 = 0xf0;
    const NIB_MASK1 = 0x0f;

    export const _pos2idx = (a: number, amax: number, b: number) => (a * amax) + b

    export function create(width: number, height: number): Buffer {
        const fximg = pins.createBuffer(4 + ((1 + (width * height)) >>> 1))
        fximg.setNumber(NumberFormat.UInt16LE, 0, height);
        fximg.setNumber(NumberFormat.UInt16LE, 2, width)
        return fximg;
    }

    export function fromImage(img: Image) {
        const fximg = pins.createBuffer(4 + ((1 + (img.width * img.height)) >>> 1));
        fximg.setNumber(NumberFormat.UInt16LE, 0, img.height);
        fximg.setNumber(NumberFormat.UInt16LE, 2, img.width);
        if (!tmpn || (tmpn !== img.height)) tmpn = img.height
        if (!tbuf || (tbuf.length < tmpn)) tbuf = pins.createBuffer(tmpn);
        tmpn0 = tmpn;
        for (let x = 0; x < img.width; x++) {
            img.getRows(x, tbuf);
            setRow(fximg, x, tbuf);
        }
        tmpn0 = null;
        return fximg;
    }

    export function toImage(fximg: Buffer): Image {
        const img = image.create(fximg.getNumber(NumberFormat.UInt16LE, 2), fximg.getNumber(NumberFormat.UInt16LE, 0));
        if (!tmpn || (tmpn !== img.height)) tmpn = img.height;
        if (!tbuf || (tbuf.length < tmpn)) tbuf = pins.createBuffer(tmpn);
        tmpn0 = tmpn;
        for (let x = 0; x < img.width; x++) {
            getRow(fximg, x, tbuf);
            img.setRows(x, tbuf);
        }
        tmpn0 = null;
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
        if (!tmpn || (tmpn !== allSize.height)) tmpn = allSize.height;
        if (!tbuf || (tbuf.length < tmpn)) tbuf = pins.createBuffer(tmpn);
        tmpn0 = tmpn;
        let nw = 0;
        for (const img of imgs) {
            for (let x = 0; x < img.width; x++) {
                img.getRows(x, tbuf);
                setRow(fximgs, nw + x, tbuf)
            }
            nw += allSize.width
        }
        tmpn0 = null;
        return fximgs;
    }

    export function toFrame(fximgs: Buffer) {
        const imgs = []
        const img = image.create(fximgs.getNumber(NumberFormat.UInt16LE, 2), fximgs.getNumber(NumberFormat.UInt16LE, 0));
        if (!tmpn || (tmpn !== img.height)) tmpn = img.height;
        if (!tbuf || (tbuf.length < tmpn)) tbuf = pins.createBuffer(tmpn);
        tmpn0 = tmpn;
        for (let nw = 0; (((1 + (nw * img.height)) >> 1) + 4) < fximgs.length; nw += img.width) {
            for (let x = 0; x < img.width; x++) {
                getRow(fximgs, nw + x, tbuf);
                img.setRows(x, tbuf);
            }
            imgs.push(img.clone())
        }
        tmpn0 = null;
        return imgs.slice();
    }

    export function setPixel(fximg: Buffer, x: number, y: number, c: number) {
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
        const h0 = tmpn0 != null ? tmpn0 : fximg.getNumber(NumberFormat.UInt16LE, 0);
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
        const h0 = tmpn0 != null ? tmpn0 : fximg.getNumber(NumberFormat.UInt16LE, 0)
        const len = Math.min(src.length, tmpn0);
        if (len < 1) return;
        let i = x * h0,
            y = 0;
        if (i & 1) {
            const ih4 = (i >>> 1) + 4;
            fximg[ih4] = (fximg[ih4] & NIB_MASK0) | (src[y] & NIB_MASK1);
            i++, y++;
        }
        for (; y < len; y += 2) {
            const ih4 = (i >>> 1) + 4;
            fximg[ih4] = (src[y] << 4) | (src[y + 1] & NIB_MASK1);
            i += 2;
        }
        if (y < len) {
            const ih4 = (i >>> 1) + 4;
            fximg[ih4] = (src[y] << 4) | (fximg[ih4] & NIB_MASK1);
        }
    }
}
/* // test zone
const imgfxa = FxImage.fromImage(img`
    ..........666666666666..........
    ........6667777777777666........
    ......66677777777777777666......
    .....6677777779999777777766.....
    ....667777779966669977777766....
    ....677777799668866117777776....
    ...66777779966877861197777766...
    ...66777799668677686699777766...
    ...88777796688888888669777788...
    ...88777788888888888888777788...
    ...88977888679999997688877988...
    ...88977886777777777768877988...
    ...88997777777777777777779988...
    ...88799777777777777777711788...
    ...88679997777777777779117688...
    ..cc866679999999999999976668cc..
    .ccbc6666679999999999766666cbcc.
    .fcbcc66666666666666666666ccbcf.
    .fcbbcc666666666666666666ccbdcf.
    .f8bbbccc66666666666666cccbddcf.
    .f8cbbbbccccccccccccccccbdddbcf.
    .f8ccbbbbbccccccccccccb111ddccf.
    .f6ccccbbbddddddddddddd111dcccf.
    .f6ccccccbbddddddddddddddbbcccf.
    .f6cccccccccccccbbbbbbbbbdbcccf.
    ..f6cccccccccbbbbbbbbbbbddbccf..
    ..f6cccccccccbbbbbbbbbbbddbccf..
    ..ff6ccccccccbbbbbbbbbbbddbcff..
    ...ff6cccccccbbbbbbbbbbbddbff...
    ....ffcccccccbbbbbbbbbbbdbff....
    ......ffccccbbbbbbbbbbbbff......
    ........ffffffffffffffff........
`)

const imgfxas = FxImage.fromFrame([
    img`
        ..........666666666666..........
        ........6667777777777666........
        ......66677777777777777666......
        .....6677777779999777777766.....
        ....667777779966669977777766....
        ....677777799668866117777776....
        ...66777779966877861197777766...
        ...66777799668677686699777766...
        ...88777796688888888669777788...
        ...88777788888888888888777788...
        ...88977888679999997688877988...
        ...88977886777777777768877988...
        ...88997777777777777777779988...
        ...88799777777777777777711788...
        ...88679997777777777779117688...
        ..cc866679999999999999976668cc..
        .ccbc6666679999999999766666cbcc.
        .fcbcc66666666666666666666ccbcf.
        .fcbbcc666666666666666666ccbdcf.
        .f8bbbccc66666666666666cccbddcf.
        .f8cbbbbccccccccccccccccbdddbcf.
        .f8ccbbbbbccccccccccccb111ddccf.
        .f6ccccbbbddddddddddddd111dcccf.
        .f6ccccccbbddddddddddddddbbcccf.
        .f6cccccccccccccbbbbbbbbbdbcccf.
        ..f6cccccccccbbbbbbbbbbbddbccf..
        ..f6cccccccccbbbbbbbbbbbddbccf..
        ..ff6ccccccccbbbbbbbbbbbddbcff..
        ...ff6cccccccbbbbbbbbbbbddbff...
        ....ffcccccccbbbbbbbbbbbdbff....
        ......ffccccbbbbbbbbbbbbff......
        ........ffffffffffffffff........
    `,
    img`
        ................................
        ................................
        ................................
        ................................
        ................................
        ..........888888888888..........
        ........8887777777777888........
        ......88877666666666677888......
        .....8877666667777666667788.....
        ....887666667788887766666788....
        ....866666677888888996666678....
        ...88666667788877889976666688...
        ...88666677888677688877666688...
        ...88666778888888888887766688...
        ...88667788888888888888776688...
        ..cc866788866777777668887668cc..
        .ccbc8668866666666666688668cbcc.
        .fcbcc86666666666666666668ccbcf.
        .fcbbcc886666666666666688ccbdcf.
        .f8bbbccc88888888888888cccbddcf.
        .f8cbbbbccccccccccccccccbdddbcf.
        .f8ccbbbbbccccccccccccb11dddccf.
        .f6ccccbbbdddddddddddd111ddcccf.
        .f6ccccccbbddddddddddd11dbbcccf.
        .f6cccccccccccccbbbbbbbbbdbcccf.
        ..f6cccccccccbbbbbbbbbbbddbccf..
        ..f6cccccccccbbbbbbbbbbbddbccf..
        ..ff6ccccccccbbbbbbbbbbbddbcff..
        ...ff6cccccccbbbbbbbbbbbddbff...
        ....ffcccccccbbbbbbbbbbbdbff....
        ......ffccccbbbbbbbbbbbbff......
        ........ffffffffffffffff........
    `
])

let mySprite = sprites.create(FxImage.toImage(imgfxa), SpriteKind.Player)

// animation.runImageAnimation(mySprite, FxImage.toFrame(imgfxas), 100, true)
*/