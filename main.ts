
namespace FxImg {

    let tmpn: number, tmpn1: number;
    let tbuf: Buffer;

    const NIB_MASK0 = 0xf0;
    const NIB_MASK1 = 0x0f;

    export const _pos2idx = (a: number, amax: number, b: number) => (a * amax) + b;

    const isEmptyOrUpdate = <T>(cur: T, next: T) => (cur == null || (cur != null && cur !== next))

    export function create(width: number, height: number): Buffer {
        const dst = pins.createBuffer(4 + ((1 + (width * height)) >>> 1))
        dst.setNumber(NumberFormat.UInt16LE, 0, height);
        dst.setNumber(NumberFormat.UInt16LE, 2, width)
        return dst;
    }

    export function fromImage(img: Image) {
        const dst = pins.createBuffer(4 + ((1 + (img.width * img.height)) >>> 1));
        dst.setNumber(NumberFormat.UInt16LE, 0, img.height);
        dst.setNumber(NumberFormat.UInt16LE, 2, img.width);
        if (isEmptyOrUpdate(tmpn, img.height)) tmpn = img.height
        if (isEmptyOrUpdate(tbuf.length, tmpn)) tbuf = pins.createBuffer(tmpn);
        tmpn1 = tmpn;
        for (let x = 0; x < img.width; x++) {
            img.getRows(x, tbuf);
            setRow(dst, x, tbuf);
        }
        tmpn1 = null;
        return dst;
    }

    export function toImage(src: Buffer): Image {
        const myimg = image.create(src.getNumber(NumberFormat.UInt16LE, 2), src.getNumber(NumberFormat.UInt16LE, 0));
        if (isEmptyOrUpdate(tmpn, myimg.height)) tmpn = myimg.height;
        if (isEmptyOrUpdate(tbuf.length, tmpn)) tbuf = pins.createBuffer(tmpn);
        tmpn1 = tmpn;
        for (let x = 0; x < myimg.width; x++) {
            getRow(src, x, tbuf);
            myimg.setRows(x, tbuf);
        }
        tmpn1 = null;
        return myimg.clone();
    }

    export function setPixel(fximg: Buffer, x: number, y: number, c: number) {
        const i = _pos2idx(x, fximg.getNumber(NumberFormat.UInt16LE, 0), y)
        const ih = i >>> 1;
        const ih4 = ih + 4;
        const curv = fximg[ih4]
        let nib0 = curv & 0xf,
            nib1 = curv >> 4;
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
        return (i & 0x1 ? curv & 0xf : curv >>> 4)
    }

    export function getRow(fximg: Buffer, x: number, dst: Buffer) {
        const h0 = tmpn1 != null ? tmpn1 : fximg.getNumber(NumberFormat.UInt16LE, 0);
        const len = Math.min(dst.length, h0);
        if (len < 1) return;
        const i0 = x * h0;
        for (let y = 0; y < len; y++) {
            const i1 = i0 + y;
            const ih = i1 >>> 1;
            const ih4 = ih + 4;
            const val = fximg[ih4];
            if (i1 & 0x1) dst[y] = val & 0xf;
            else dst[y] = val >>> 4;
        }
    }

    export function setRow(fximg: Buffer, x: number, src: Buffer) {
        const h0 = tmpn1 != null ? tmpn1 : fximg.getNumber(NumberFormat.UInt16LE, 0)
        const len = Math.min(src.length, tmpn1);
        if (len < 1) return;
        const i0 = x * h0;
        for (let y = 0; y < len; y++) {
            const i1 = i0 + y;
            const ih = i1 >>> 1;
            const ih4 = ih + 4;
            let val = fximg[ih4];
            if (i1 & 0x1) val = (val & NIB_MASK0) | (src[y] & NIB_MASK1);
            else val = (src[y] << 4) | (val & NIB_MASK1);
            fximg[ih4] = val;
        }
    }
}
