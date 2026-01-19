
namespace FxImg {

    let tmpn: number, tmpn1: number;
    let tbuf: Buffer;

    const NIB_MASK0 = 0xf0;
    const NIB_MASK1 = 0x0f;

    export const _pos2idx = (a: number, amax: number, b: number) => (a * amax) + b

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
        if (!tmpn || (tmpn !== img.height)) tmpn = img.height
        if (!tbuf || (tbuf.length < tmpn)) tbuf = pins.createBuffer(tmpn);
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
        if (!tmpn || (tmpn !== myimg.height)) tmpn = myimg.height;
        if (!tbuf || (tbuf.length < tmpn)) tbuf = pins.createBuffer(tmpn);
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
        const h0 = tmpn1 != null ? tmpn1 : fximg.getNumber(NumberFormat.UInt16LE, 0)
        const len = Math.min(src.length, tmpn1);
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
