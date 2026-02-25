
namespace helper {

    export function fximgRoCheck(fxpic: Buffer) {
        if (fximgIsReadonly(fxpic)) { throw "this fixed image is read-only"; return true; };
        return false
    }

    export function fximgCreateFrame(width: number, height: number, length: number, ro?: boolean): Buffer {
        if (!length) length = 1;
        return fximgInit(width, height, length, ro);
    }

    export function fximgCreate(width: number, height: number, ro?: boolean): Buffer {
        return fximgCreateFrame(width, height, 1, ro);
    }

    export function fximgFromImage(pic: Image, ro?: boolean): Buffer {
        const fxpic = fximgCreate(pic.width, pic.height);
        if (fximgIsEmptyImage(pic)) return fxpic;
        const h = pic.height
        const buf = pins.createBuffer(h);
        for (let x = 0; x < pic.width; x++) {
            pic.getRows(x, buf);
            fximgSetRows(fxpic, x, buf, h);
        }
        if (ro) fximgSetReadonly(fxpic, true);
        return fxpic;
    }

    export function fximgToImage(fxpic: Buffer): Image {
        const pic = image.create(fximgWidthOf(fxpic), fximgHeightOf(fxpic));
        const h = pic.height;
        const buf = pins.createBuffer(h);
        for (let x = 0; x < pic.width; x++) {
            fximgGetRows(fxpic, x, buf, h);
            pic.setRows(x, buf);
        }
        return pic.clone();
    }

    const fximgMaxImgSizes = (pics: Image[]) => {
        const cur = { width: pics[0].width, height: pics[0].height, area: 0, empty: 0 };
        for (const pic of pics) {
            cur.width = Math.max(cur.width, pic.width),
                cur.height = Math.max(cur.height, pic.height);
            if (fximgIsEmptyImage(pic)) cur.empty++;
        }
        cur.area = cur.width * cur.height;
        return cur
    }

    export function fximgFromFrame(pics: Image[], ro?: boolean): Buffer {
        const allSize = fximgMaxImgSizes(pics);
        const fxpics = fximgCreateFrame(allSize.width, allSize.height, pics.length);
        if (allSize.empty >= pics.length) return fxpics;
        const h = allSize.height;
        const buf = pins.createBuffer(h);
        let nw = 0;
        for (const pic of pics) {
            const _buf = pins.createBuffer(pic.height)
            const sx = (allSize.width === pic.width ? 0 : (allSize.width - pic.width) >>> 1),
                sy = (allSize.height === pic.height ? 0 : (allSize.height - pic.height) >>> 1);
            for (let x = 0; x < pic.width; x++) {
                pic.getRows(x, _buf);
                buf.write(sy, _buf);
                fximgSetRows(fxpics, nw + x + sx, buf, h)
            }
            buf.fill(0);
            nw += allSize.width;
        }
        if (ro) fximgSetReadonly(fxpics, ro);
        return fxpics;
    }

    export function fximgToFrame(fxpics: Buffer): Image[] {
        const pics: Image[] = []
        const pic = image.create(fximgWidthOf(fxpics), fximgHeightOf(fxpics));
        const h = pic.height;
        const buf = pins.createBuffer(h);
        const startIdx = fximgStartIndex(fxpics);
        for (let nw = 0; (((1 + (nw * pic.height)) >> 1) + startIdx) < fxpics.length; nw += pic.width) {
            for (let x = 0; x < pic.width; x++) {
                fximgGetRows(fxpics, nw + x, buf, h);
                pic.setRows(x, buf);
            }
            pics.push(pic.clone())
        }
        return pics.slice();
    }

    export function fximgGetFrame(fxpics: Buffer, idx: number) {
        const w = fximgWidthOf(fxpics);
        const h = fximgHeightOf(fxpics);
        const fxpic = fximgCreate(w, h);
        const idxw = idx * w;
        const tbuf = pins.createBuffer(h);
        for (let x = 0; x < w; x++) {
            fximgGetRows(fxpics, x + idxw, tbuf, h);
            fximgSetRows(fxpic, x, tbuf, h);
        }
        return fxpic.slice();
    }

    export function fximgSetFrame(fxpics: Buffer, idx: number, fxpic: Buffer) {
        if (fximgRoCheck(fxpics)) return;
        const fw = fximgWidthOf(fxpics), fh = fximgHeightOf(fxpics);
        const vw = fximgWidthOf(fxpic), vh = fximgHeightOf(fxpic);
        const idxw = idx * fw;
        const buf = pins.createBuffer(fh);
        const _buf = pins.createBuffer(vh)
        const sx = (fw === vw ? 0 : (fw - vw) >>> 1),
            sy = (fh === vh ? 0 : (fh - vh) >>> 1);
        for (let x = 0; x < vw; x++) {
            fximgGetRows(fxpic, x, _buf, vh);
            buf.write(sy, _buf);
            fximgSetRows(fxpics, idxw + x + sx, buf, fh)
        }
    }

    export function fximgSetPixel(fxpic: Buffer, x: number, y: number, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        if (fximgIsOutOfArea(x, y, fximgWidthOf(fxpic), fximgHeightOf(fxpic))) return;
        idx = idx || 0; idx *= fximgWidthOf(fxpic)
        color &= 0xf;
        const i = fximgPos2idx(x + idx, fximgHeightOf(fxpic), y);
        const ih4 = (i >>> 1) + fximgStartIndex(fxpic);
        const curv = fxpic[ih4]
        let nib0 = curv & 0xf,
            nib1 = curv >>> 4;
        if (i & 1 ? nib0 === color : nib1 === color) return;
        if (i & 1) nib0 = color;
        else nib1 = color;
        fxpic[ih4] = (nib1 << 4) + nib0;
    }

    export function fximgGetPixel(fxpic: Buffer, x: number, y: number, idx?: number) {
        if (fximgIsOutOfArea(x, y, fximgWidthOf(fxpic), fximgHeightOf(fxpic))) return 0;
        idx = idx || 0; idx *= fximgWidthOf(fxpic);
        const i = fximgPos2idx(x + idx, fximgHeightOf(fxpic), y);
        const ih = i >>> 1;
        const ih4 = ih + fximgStartIndex(fxpic);
        const curv = fxpic[ih4];
        return (i & 1 ? curv & 0xf : curv >>> 4)
    }

    export function fximgSetRows(fxpic: Buffer, x: number, src: Buffer, h?: number) {
        if (fximgRoCheck(fxpic)) return;
        h = h || fximgHeightOf(fxpic);
        const len = Math.min(src.length, h);
        if (len <= 0 || fximgIsOutOfRange(x, fximgWidthOf(fxpic) * fximgLengthOf(fxpic))) return;

        const start = fximgStartIndex(fxpic);
        const colStartBit = (x * h) & 1;   // 0 = even (aligned), 1 = odd (misaligned)
        const pixelCount = len;

        let srcIdx = 0;
        let dstByteIdx = start + ((x * h) >>> 1);

        if (colStartBit === 0) {
            // Fast path: aligned → copy byte-wise ได้เลย
            // src[0] ไป nybble สูงของ byte แรก, src[1] ไป nybble ต่ำ, ฯลฯ
            while (srcIdx < pixelCount - 1) {
                fxpic[dstByteIdx] = (src[srcIdx] << 4) | (src[srcIdx + 1] & 0xF);
                srcIdx += 2;
                dstByteIdx++;
            }
            // เหลือพิกเซลสุดท้าย (ถ้า len เป็น odd)
            if (srcIdx < pixelCount) {
                fxpic[dstByteIdx] = (src[srcIdx] << 4) | (fxpic[dstByteIdx] & 0x0F);
            }
            return;
        }
        // Misaligned path: เริ่มจาก nybble ต่ำของ byte แรก
        // จัดการ byte แรกแยก (merge กับ nybble เดิม)
        if (srcIdx < pixelCount) {
            fxpic[dstByteIdx] = (fxpic[dstByteIdx] & 0xF0) | (src[srcIdx] & 0xF);
            srcIdx++;
            dstByteIdx++;
        }
        // จากนั้น copy แบบ aligned เหมือน fast path
        while (srcIdx < pixelCount - 1) {
            fxpic[dstByteIdx] = (src[srcIdx] << 4) | (src[srcIdx + 1] & 0xF);
            srcIdx += 2;
            dstByteIdx++;
        }
        // เหลือตัวสุดท้าย (ถ้ามี)
        if (srcIdx < pixelCount) {
            fxpic[dstByteIdx] = (src[srcIdx] << 4) | (fxpic[dstByteIdx] & 0x0F);
        }
    }

    export function fximgGetRows(fxpic: Buffer, x: number, dst: Buffer, h?: number) {
        h = h || fximgHeightOf(fxpic);
        const len = Math.min(dst.length, h);
        if (len <= 0 || fximgIsOutOfRange(x, fximgWidthOf(fxpic) * fximgLengthOf(fxpic))) return;

        const start = fximgStartIndex(fxpic);
        const colStartBit = (x * h) & 1;
        let dstIdx = 0;
        let srcByteIdx = start + ((x * h) >>> 1);

        if (colStartBit === 0) {
            // Aligned: byte-wise extract
            while (dstIdx < len - 1) {
                const b = fxpic[srcByteIdx];
                dst[dstIdx] = b >>> 4;
                dst[dstIdx + 1] = b & 0xF;
                dstIdx += 2;
                srcByteIdx++;
            }
            if (dstIdx < len) {
                dst[dstIdx] = fxpic[srcByteIdx] >>> 4;
            }
            return;
        }
        // Misaligned
        if (dstIdx < len) {
            dst[dstIdx] = fxpic[srcByteIdx] & 0xF;
            dstIdx++;
            srcByteIdx++;
        }
        while (dstIdx < len - 1) {
            const b = fxpic[srcByteIdx];
            dst[dstIdx] = b >>> 4;
            dst[dstIdx + 1] = b & 0xF;
            dstIdx += 2;
            srcByteIdx++;
        }
        if (dstIdx < len) {
            dst[dstIdx] = fxpic[srcByteIdx] >>> 4;
        }
    }

    // 4. fill (เติมทั้งภาพ)
    export function fximgFill(fxpic: Buffer, color: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        idx = idx || 0;
        if (idx, fximgLengthOf(fxpic)) return;
        color &= 0xF;
        const h = fximgHeightOf(fxpic);
        const rowBuf = pins.createBuffer(h);
        rowBuf.fill(color);
        const w = fximgWidthOf(fxpic);
        idx *= w;
        for (let x = 0; x < w; x++) fximgSetRows(fxpic, idx + x, rowBuf, h);
    }

    // 5. replace (แทนที่สี)
    export function fximgReplace(fxpic: Buffer, from: number, to: number, idx?: number) {
        if (fximgRoCheck(fxpic)) return;
        from &= 0xF; to &= 0xF;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
        const w = fximgWidthOf(fxpic);
        idx *= w;
        const h = fximgHeightOf(fxpic);
        const rowBuf = pins.createBuffer(h);
        for (let x = 0; x < w; x++) {
            fximgGetRows(fxpic, idx + x, rowBuf, h);
            for (let y = 0; y < h; y++) if (rowBuf[y] === from) rowBuf[y] = to;
            fximgSetRows(fxpic, idx + x, rowBuf, h);
        }
    }

    export function fximgEqualTo(fxpic: Buffer, otherfxpic: Buffer) {
        if (fxpic.length < 1 || otherfxpic.length < 1) return false;
        if (fxpic.length !== otherfxpic.length) return false;
        if (fximgWidthOf(fxpic) !== fximgWidthOf(otherfxpic) ||
            fximgHeightOf(fxpic) !== fximgHeightOf(otherfxpic)) return false
        return fxpic.equals(otherfxpic);
    }

    // 10. copyFrom (copy ทั้ง buffer ถ้าขนาดเท่ากัน)
    export function fximgCopyFrom(fxpic: Buffer, from: Buffer) {
        if (fximgRoCheck(fxpic)) return;
        const w = Math.min(fximgWidthOf(from), fximgWidthOf(fxpic));
        const h = Math.min(fximgHeightOf(from), fximgHeightOf(fxpic))
        if (w < 1 || h < 1) return;
        if (from.length === fxpic.length) {
            fxpic.write(0, from);
            return;
        }
        const buf = pins.createBuffer(h);
        for (let i = 0; i < w; i++) {
            fximgGetRows(from, i, buf, h);
            fximgSetRows(fxpic, i, buf, h);
        }
    }

    // 11. clone
    export function fximgClone(fxpic: Buffer): Buffer {
        return fxpic.slice();
    }
    
}