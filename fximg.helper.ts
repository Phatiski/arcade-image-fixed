
enum FximgDataIdx {
    width = 0x0,
    height = 0x1,
    length = 0x2,
    start = 0x3,
};

namespace helper {

    // ค่า sin(theta * 2π / 256) * 127 (ประมาณ ±127) เพื่อให้เป็น int8-friendly
    // แต่เก็บเป็น number (int16) เพื่อความแม่นยำในการคำนวณ
    const sineTable: number[] = [
        0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42, 45,
        48, 51, 54, 57, 59, 62, 65, 67, 70, 72, 75, 77, 80, 82, 84, 86,
        88, 90, 92, 94, 96, 98, 99, 101, 102, 104, 105, 106, 108, 109, 110, 111,
        112, 113, 114, 115, 115, 116, 117, 117, 118, 118, 119, 119, 119, 120, 120, 120,
        120, 120, 120, 120, 119, 119, 119, 118, 118, 117, 117, 116, 115, 115, 114, 113,
        112, 111, 110, 109, 108, 106, 105, 104, 102, 101, 99, 98, 96, 94, 92, 90,
        88, 86, 84, 82, 80, 77, 75, 72, 70, 67, 65, 62, 59, 57, 54, 51,
        48, 45, 42, 39, 36, 33, 30, 27, 24, 21, 18, 15, 12, 9, 6, 3,
        0, -3, -6, -9, -12, -15, -18, -21, -24, -27, -30, -33, -36, -39, -42, -45,
        -48, -51, -54, -57, -59, -62, -65, -67, -70, -72, -75, -77, -80, -82, -84, -86,
        -88, -90, -92, -94, -96, -98, -99, -101, -102, -104, -105, -106, -108, -109, -110, -111,
        -112, -113, -114, -115, -115, -116, -117, -117, -118, -118, -119, -119, -119, -120, -120, -120,
        -120, -120, -120, -120, -119, -119, -119, -118, -118, -117, -117, -116, -115, -115, -114, -113,
        -112, -111, -110, -109, -108, -106, -105, -104, -102, -101, -99, -98, -96, -94, -92, -90,
        -88, -86, -84, -82, -80, -77, -75, -72, -70, -67, -65, -62, -59, -57, -54, -51,
        -48, -45, -42, -39, -36, -33, -30, -27, -24, -21, -18, -15, -12, -9, -6, -3
    ];

    export function fximgIsin(theta: number): number {
        return sineTable[theta & 0xFF];
    }

    export function fximgIcos(theta: number): number {
        return sineTable[(theta + 64) & 0xFF];  // cos = sin + 90° (64 ใน 256)
    }

    const fximgDataStr = {
        0x0: `width`,
        0x1: `height`,
        0x2: `length`,
        0x3: `start`,
    };

    export const fximgPos2idx = (a: number, amax: number, b: number) => (a * amax) + b;
    export const fximgIsOutOfRange = (n: number, r: number) => (n < 0 || n >= r);
    export const fximgIsOutOfArea = (x: number, y: number, w: number, h: number) => (fximgIsOutOfRange(x, w) || fximgIsOutOfRange(y, h));
    export const fximgIsOutOfAreas = (pos: { x: number, y: number }[], w: number, h: number) => pos.every(v => (fximgIsOutOfArea(v.x, v.y, w, h)));
    export const fximgIsEmptyImage = (img: Image) => img.equals(image.create(img.width, img.height));

    const fximgHextxt = '0123456789ABCDEF'

    const fximgNumToHex = (n: number) => {
        if (!n) return "0";
        let txt = ""
        while (n)
            txt += fximgHextxt[n & 0xf],
            n >>>= 4;
        return txt;
    }

    const fximgNumLeftZeroPad = (n: number, r: number) => {
        let txt = fximgNumToHex(n);
        if (txt.length < r) while (txt.length < r) txt = "0" + txt;
        return txt;
    }

    const fximgHashAlert = (stored: number, computed: number) => {
        throw `signture mismatch stored: ${"0x" + fximgNumLeftZeroPad(stored & 0xff, 2)}, computed ${"0x" + fximgNumLeftZeroPad(computed, 2)}`
    }

    function fximgIsValidHeader(fximg: Buffer): boolean {
        const buf = pins.createBuffer(1);
        buf[0] = fximg[1];
        return (buf.hash(8) & 0xff) === fximg[0];
    }

    function fximgHeaderCheck(fximg: Buffer) {
        if (fximgIsValidHeader(fximg)) return;
        const buf = pins.createBuffer(1);
        buf[0] = fximg[1]
        fximgHashAlert(fximg[0], buf.hash(8) & 0xff)
    }

    function fximgMakeMetadataHash(fximg: Buffer) {
        return fximg.slice(3, fximgStartIndex(fximg) - 3).hash(8) & 0xff;
    }

    function fximgIsValidMetadata(fximg: Buffer) {
        return fximg[2] === fximgMakeMetadataHash(fximg);
    }

    function fximgValidation(fximg: Buffer) {
        fximgHeaderCheck(fximg);
        if (fximgIsValidMetadata(fximg)) return;
        const hash = fximgMakeMetadataHash(fximg);
        fximgHashAlert(fximg[2], hash);
    }

    // อ่าน flag
    export function fximgIsReadonly(fximg: Buffer): boolean {
        if (fximg.length < 1) return false;
        return (fximg[1] & 0b10000000) !== 0;  // bit7
    }

    export function fximgIsMetadataFrozen(fximg: Buffer): boolean {
        if (fximg.length < 1) return false;
        return (fximg[1] & 0b01000000) !== 0;  // bit6
    }

    // ตั้ง flag (แต่ต้องเช็คก่อนว่าอนุญาตไหม)
    export function fximgSetReadonly(fximg: Buffer, value: boolean) {
        fximgHeaderCheck(fximg);
        //if (fximgIsMetadataFrozen(fximg)) return; // ห้ามแก้ถ้า freeze
        const changed = fximgIsReadonly(fximg) !== value;
        if (value) fximg[1] |= 0b10000000;
        else fximg[1] &= ~0b10000000;
        if (!changed) return;
        const buf = pins.createBuffer(1);
        buf[0] = fximg[1];
        fximg[0] = buf.hash(8) & 0xff;
    }

    function fximgSetMetadataFrozen(fximg: Buffer, value: boolean) {
        fximgHeaderCheck(fximg);
        if (fximgIsReadonly(fximg)) return; // ถ้า readonly แล้ว ห้าม set flag อื่น
        const changed = fximgIsMetadataFrozen(fximg) !== value;
        if (value) fximg[1] |= 0b01000000;
        else fximg[1] &= ~0b01000000;
        if (!changed) return;
        const buf = pins.createBuffer(1);
        buf[0] = fximg[1];
        fximg[0] = buf.hash(8) & 0xff;
    }

    export function fximgInit(width: number, height: number, length: number, ro?: boolean) {
        const md = fximgInitMD(width, height, length);
        const fxpic = pins.createBuffer(md.start + ((1 + (width * height * length)) >>> 1));
        fxpic[0] = md.hash;
        fxpic[1] = md.header;
        fximgSetData(fxpic, 0x0, width);
        fximgSetData(fxpic, 0x1, height);
        fximgSetData(fxpic, 0x2, length);
        fximgSetMetadataFrozen(fxpic, true);
        if (ro) fximgSetReadonly(fxpic, true);
        return fxpic
    }

    export function fximgGetOffset(header: number, hash: number, idxType: FximgDataIdx) {
        fximgHeaderCheck(pins.createBufferFromArray([hash, header]));
        if (idxType < 0x0 || idxType > 0x3) return { idx: -1, b2: -1 }
        header &= 0xff;
        let idx = 3, b2 = 0;
        if (idxType >= 0x0) {
            b2 = (header >> 4);
            b2 &= 0x3;
            if (idxType > 0x0) idx += (1 << b2);
        }
        if (idxType >= 0x1) {
            b2 = (header >> 2);
            b2 &= 0x3;
            if (idxType > 0x1) idx += (1 << b2);
        }
        if (idxType >= 0x2) {
            b2 = (header);
            b2 &= 0x3;
            if (idxType > 0x2) idx += (1 << b2);
        }
        return { idx: idx, b2: b2 }
    }
    export function fximgStartIndex(fximg: Buffer) {
        return fximgGetOffset(fximg[1], fximg[0], 0x3).idx;
    }
    export function fximgSetData(fximg: Buffer, dataType: FximgDataIdx, v: number) {
        if (fximgIsMetadataFrozen(fximg)) {
            throw `this ${fximgDataStr[dataType]} is immutable`
            return;
        }
        if (dataType >= 0x3) return;
        const { idx, b2 } = fximgGetOffset(fximg[1], fximg[0], dataType);
        if (idx < 0 || b2 < 0) return;
        if (b2 === 0x2) {
            if (v > 0xffffffff) v = 0xffffffff;
            fximg.setNumber(NumberFormat.UInt32LE, idx, v);
        } else if (b2 === 0x1) {
            if (v > 0xffff) v = 0xffff;
            fximg.setNumber(NumberFormat.UInt16LE, idx, v);
        } else if (b2 === 0x0) {
            if (v > 0xff) v = 0xff;
            fximg.setNumber(NumberFormat.UInt8LE, idx, v);
        }
        fximg[2] = fximgMakeMetadataHash(fximg);
    }
    export function fximgGetData(fximg: Buffer, dataType: FximgDataIdx) {
        fximgValidation(fximg);
        const { idx, b2 } = fximgGetOffset(fximg[1], fximg[0], dataType);
        if (idx < 0 || b2 < 0) return -1;
        if (dataType >= 0x3) return idx;
        if (b2 >= 0x3) return -1;
        if (b2 >= 0x2) return fximg.getNumber(NumberFormat.UInt32LE, idx);
        if (b2 >= 0x1) return fximg.getNumber(NumberFormat.UInt16LE, idx);
        return fximg.getNumber(NumberFormat.UInt8LE, idx);
    }

    export function fximgWidthOf(fximg: Buffer) {
        if (fximg.length < 1) return 0;
        return fximgGetData(fximg, 0x0);
    }
    export function fximgHeightOf(fximg: Buffer) {
        if (fximg.length < 1) return 0;
        return fximgGetData(fximg, 0x1);
    }
    export function fximgLengthOf(fximg: Buffer) {
        if (fximg.length < 5) return 0;
        return fximgGetData(fximg, 0x2);
    }
    export function fximgDimensionOf(fximg: Buffer, d: image.Dimension) {
        switch (d) {
            case image.Dimension.Width: return fximgWidthOf(fximg);
            case image.Dimension.Height: return fximgHeightOf(fximg);
        } return 0;
    }

    export function fximgInitMD(width: number, height: number, length: number) {
        if (width > 0xffffffff) width = 0xffffffff; if (height > 0xffffffff) height = 0xffffffff; if (length > 0xffffffff) length = 0xffffffff;
        let header = 0b00000000, ws = 0, hs = 0, ls = 0;
        if (width > 0xff) ws++;
        if (width > 0xffff) ws++;
        //if (ws < 0x0 || ws > 0x3) ws &= 0x3;
        if (ws > 0x0) header += (ws << 4);
        if (height > 0xff) hs++;
        if (height > 0xffff) hs++;
        //if (hs < 0x0 || hs > 0x3) hs &= 0x3;
        if (hs > 0x0) header += (hs << 2);
        if (length > 0xff) ls++;
        if (length > 0xffff) ls++;
        //if (ls < 0x0 || ls > 0x3) ls &= 0x3;
        if (ls > 0x0) header += (ls);
        const buf = pins.createBuffer(1);
        buf[0] = header & 0xff;
        const md = { header: header, ws, hs, ls, start: 3, hash: buf.hash(8) & 0xff };
        md.start += (1 << ws);
        md.start += (1 << hs);
        md.start += (1 << ls);
        return md;
    }

}
