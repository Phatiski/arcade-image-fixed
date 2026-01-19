
namespace FxImg {

    export const _pos2idx = (a: number, amax: number, b: number) => (a * amax) + b;   

    export function create(width: number, height: number): Buffer {
        const dst = pins.createBuffer(4 + (width * height))
        dst.setNumber(NumberFormat.UInt16LE, 0, height);
        dst.setNumber(NumberFormat.UInt16LE, 2, width)
        return dst;
    }

    export function fromImage(img: Image) {
        const dst = pins.createBuffer(4 + (img.width * img.height));
        dst.setNumber(NumberFormat.UInt16LE, 0, img.height);
        dst.setNumber(NumberFormat.UInt16LE, 2, img.width);
        const tbuf = pins.createBuffer(img.height);
        for (let x = 0; x < img.width; x++) {
            img.getRows(x, tbuf);
            setRow(dst, x, tbuf);
        }
        return dst;
    }

    export function toImage(src: Buffer): Image {
        const myimg = image.create(src.getNumber(NumberFormat.UInt16LE, 2), src.getNumber(NumberFormat.UInt16LE, 0));
        const tbuf = pins.createBuffer(myimg.height);
        for (let x = 0; x < myimg.width; x++) {
            getRow(src, x, tbuf);
            myimg.setRows(x, tbuf);
        }
        return myimg.clone();
    }

    export function setPixel(fximg: Buffer, x: number, y: number, c: number) {
        fximg[4 + _pos2idx(x, fximg.getNumber(NumberFormat.UInt16LE, 0), y)] = c;
    }

    export function getPixel(fximg: Buffer, x: number, y: number) {
        return fximg[4 + _pos2idx(x, fximg.getNumber(NumberFormat.UInt16LE, 0), y)];
    }

    export function getRow(fximg: Buffer, x: number, dst: Buffer) {
        const len = Math.min(dst.length, fximg.getNumber(NumberFormat.UInt16LE, 0));
        if (len < 1) return;
        const i0 = x * fximg.getNumber(NumberFormat.UInt16LE, 0)
        for (let y = 0; y < len; y++) {
            const i1 = i0 + y;
            dst[y] = fximg[i1 + 4];
        }
    }

    export function setRow(fximg: Buffer, x: number, src: Buffer) {
        const len = Math.min(src.length, fximg.getNumber(NumberFormat.UInt16LE, 0));
        if (len < 1) return;
        const i0 = x * fximg.getNumber(NumberFormat.UInt16LE, 0)
        for (let y = 0; y < len; y++) {
            const i1 = i0 + y;
            fximg[i1 + 4] = src[y];
        }
    }
}
