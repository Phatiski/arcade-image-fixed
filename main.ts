
namespace FxImg {

    export const _pos2idx = (a: number, amax: number, b: number) => (a * amax) + b;   

    export function create(width: number, height: number): Buffer {
        const dst = pins.createBuffer(4 + ((1 + (width * height)) >> 1))
        dst.setNumber(NumberFormat.UInt16LE, 0, height);
        dst.setNumber(NumberFormat.UInt16LE, 2, width)
        return dst;
    }

    export function fromImage(img: Image) {
        const dst = pins.createBuffer(4 + ((1 + (img.width * img.height)) >> 1));
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
        const i = _pos2idx(x, fximg.getNumber(NumberFormat.UInt16LE, 0), y)
        const ih = i >> 1;
        const curv = fximg[ih + 4]
        let nib0 = curv & 0xf,
            nib1 = curv >> 4;
        if (i & 1 ? nib0 === c : nib1 === c) return;
        if (i & 1) nib0 = c;
        else nib1 = c;
        fximg[ih + 4] = (nib1 << 4) + nib0;

    }

    export function getPixel(fximg: Buffer, x: number, y: number) {
        const i = _pos2idx(x, fximg.getNumber(NumberFormat.UInt16LE, 0), y);
        const ih = i >> 1;
        const curv = fximg[ih + 4]
        return (i & 0x1 ? curv & 0xf : curv >> 4)
    }

    export function getRow(fximg: Buffer, x: number, dst: Buffer) {
        const len = Math.min(dst.length, fximg.getNumber(NumberFormat.UInt16LE, 0));
        if (len < 1) return;
        const i0 = x * fximg.getNumber(NumberFormat.UInt16LE, 0)
        for (let y = 0; y < len; y++) {
            const i1 = i0 + y;
            const ih = i1 >> 1;
            const val = fximg[ih + 4];
            if (i1 & 0x1) dst[y] = val & 0xf;
            else dst[y] = val >> 4;
        }
    }

    export function setRow(fximg: Buffer, x: number, src: Buffer) {
        const len = Math.min(src.length, fximg.getNumber(NumberFormat.UInt16LE, 0));
        if (len < 1) return;
        const i0 = x * fximg.getNumber(NumberFormat.UInt16LE, 0)
        for (let y = 0; y < len; y++) {
            const i1 = i0 + y;
            const ih = i1 >> 1;
            let val = fximg[ih + 4];
            if (i1 & 0x1) val = (val & 0xf0) | (src[y] & 0x0f);
            else val = (src[y] << 4) | (val & 0x0f);
            fximg[ih + 4] = val;
        }
    }
}
