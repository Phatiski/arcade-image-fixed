
namespace fximage {

    const NIB_MASK0 = 0xf0;
    const NIB_MASK1 = 0x0f;

    export const _pos2idx = (a: number, amax: number, b: number) => (a * amax) + b;
    export const isEmptyImage = (img: Image) => img.equals(image.create(img.width, img.height));

    export function widthOf(fximg: Buffer) {
        if (fximg.length < 5) return 0;
        return fximg.getNumber(NumberFormat.UInt8LE, 2);
    }
    export function heightOf(fximg: Buffer) {
        if (fximg.length < 5) return 0;
        return fximg.getNumber(NumberFormat.UInt8LE, 0);
    }
    export function dimensionOf(fximg: Buffer, d: image.Dimension) {
        switch (d) {
            case image.Dimension.Width: return widthOf(fximg);
            case image.Dimension.Height: return heightOf(fximg);
        } return 0;
    }

    export function create(width: number, height: number): Buffer {
        const fximg = pins.createBuffer(4 + ((1 + (width * height)) >>> 1))
        fximg.setNumber(NumberFormat.UInt16LE, 0, height);
        fximg.setNumber(NumberFormat.UInt16LE, 2, width)
        return fximg;
    }

    export function createFrame(width: number, height: number, length: number): Buffer {
        const fximg = pins.createBuffer(4 + ((1 + (width * height * length)) >> 1));
        fximg.setNumber(NumberFormat.UInt16LE, 0, height);
        fximg.setNumber(NumberFormat.UInt16LE, 2, width);
        return fximg;
    }

    export function frameCount(fximgs: Buffer): number {
        if (fximgs.length < 5) return 0;
        const area = ((1 + (fximgs.getNumber(NumberFormat.UInt16LE, 2) * fximgs.getNumber(NumberFormat.UInt16LE, 0))) >> 1);
        return Math.idiv(fximgs.length - 4, area);
    }

    export function fromImage(img: Image): Buffer {
        if (isEmptyImage(img)) return create(img.width, img.height);
        const fximg = pins.createBuffer(4 + ((1 + (img.width * img.height)) >>> 1));
        fximg.setNumber(NumberFormat.UInt16LE, 0, img.height);
        fximg.setNumber(NumberFormat.UInt16LE, 2, img.width);
        const tmpn = img.height
        const tbuf = pins.createBuffer(tmpn);
        for (let x = 0; x < img.width; x++) {
            img.getRows(x, tbuf);
            setRow(fximg, x, tbuf, tmpn);
        }
        return fximg;
    }

    export function toImage(fximg: Buffer): Image {
        const img = image.create(fximg.getNumber(NumberFormat.UInt16LE, 2), fximg.getNumber(NumberFormat.UInt16LE, 0));
        const tmpn = img.height;
        const tbuf = pins.createBuffer(tmpn);
        for (let x = 0; x < img.width; x++) {
            getRow(fximg, x, tbuf, tmpn);
            img.setRows(x, tbuf);
        }
        return img.clone();
    }

    const maxImgSizes = (imgs: Image[]) => {
        const cur = { width: imgs[0].width, height: imgs[0].height, area: 0, empty: 0 };
        for (const img of imgs) {
            cur.width = Math.max(cur.width, img.width),
            cur.height = Math.max(cur.height, img.height);
            if (isEmptyImage(img)) cur.empty++;
        }
        cur.area = cur.width * cur.height;
        return cur
    }

    export function fromFrame(imgs: Image[]) {
        const allSize = maxImgSizes(imgs);
        if (allSize.empty >= imgs.length) return createFrame(allSize.width, allSize.height, imgs.length);
        const fximgs = pins.createBuffer(4 + ((1 + (allSize.area * imgs.length)) >> 1));
        fximgs.setNumber(NumberFormat.UInt16LE, 0, allSize.height);
        fximgs.setNumber(NumberFormat.UInt16LE, 2, allSize.width);
        const tmpn = allSize.height;
        const tbuf = pins.createBuffer(tmpn);
        let nw = 0;
        for (const img of imgs) {
            for (let x = 0; x < img.width; x++) {
                img.getRows(x, tbuf);
                setRow(fximgs, nw + x, tbuf, tmpn)
            }
            nw += allSize.width
        }
        return fximgs;
    }

    export function toFrame(fximgs: Buffer) {
        const imgs: Image[] = []
        const img = image.create(fximgs.getNumber(NumberFormat.UInt16LE, 2), fximgs.getNumber(NumberFormat.UInt16LE, 0));
        const tmpn = img.height;
        const tbuf = pins.createBuffer(tmpn);
        for (let nw = 0; (((1 + (nw * img.height)) >> 1) + 4) < fximgs.length; nw += img.width) {
            for (let x = 0; x < img.width; x++) {
                getRow(fximgs, nw + x, tbuf, tmpn);
                img.setRows(x, tbuf);
            }
            imgs.push(img.clone())
        }
        return imgs.slice();
    }

    export function setPixel(fximg: Buffer, x: number, y: number, c: number) {
        c &= 0xf;
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

    export function setRow(fximg: Buffer, x: number, src: Buffer, tmpn?: number) {
        const h0 = tmpn ? tmpn : fximg.getNumber(NumberFormat.UInt16LE, 0)
        const len = Math.min(src.length, h0);
        if (len < 1) return;
        let i = x * h0,
            y = 0;
        if (i & 1) {
            src[y] &= 0xf;
            const ih4 = (i >>> 1) + 4;
            fximg[ih4] = (fximg[ih4] & NIB_MASK0) | (src[y] & NIB_MASK1);
            i++, y++;
        }
        for (; y < len - 1; y += 2) {
            src[y] &= 0xf, src[y + 1] &= 0xf;
            const ih4 = (i >>> 1) + 4;
            fximg[ih4] = (src[y] << 4) | (src[y + 1] & NIB_MASK1);
            i += 2;
        }
        if (y < len) {
            src[y] &= 0xf;
            const ih4 = (i >>> 1) + 4;
            fximg[ih4] = (i & 1) ? (src[y] << 4) | (fximg[ih4] & NIB_MASK1) : (fximg[ih4] & NIB_MASK0) | (src[y] & NIB_MASK1);
        }
    }

    export function getRow(fximg: Buffer, x: number, dst: Buffer, tmpn?: number) {
        const h0 = tmpn ? tmpn : fximg.getNumber(NumberFormat.UInt16LE, 0);
        const len = Math.min(dst.length, h0);
        if (len < 1) return;
        let i = x * h0,
            y = 0;
        if (i & 1) {
            const ih4 = (i >>> 1) + 4;
            dst[y] = fximg[ih4] & NIB_MASK1;
            i++, y++;
        }
        for (; y < len - 1; y += 2) {
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

    // Helper: clip ค่าให้อยู่ในช่วง
    function clip(v: number, minv: number, maxv: number): number {
        return v < minv ? minv : (v > maxv ? maxv : v);
    }

    // 1. drawLine (Bresenham ปรับปรุงตามที่ภัทรแนะนำ - ใช้ sx/sy ตรวจทิศทาง ไม่เช็คจุดเริ่ม=จุดจบ)
    export function drawLine(fximg: Buffer, x0: number, y0: number, x1: number, y1: number, color: number) {
        if (x0 === x1 && y0 === y1) { this.setPixel(x0, y0, color); return; }
        const w = fximg.getNumber(NumberFormat.UInt16LE, 2);
        const h = fximg.getNumber(NumberFormat.UInt16LE, 0);
        color &= 0xF;

        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = Math.clamp(-1, 1, x1 - x0);
        let sy = Math.clamp(-1, 1, y1 - y0);
        let err = dx - dy;

        while (1) {
            if (((sx < 0 && x0 < 0) || (sx > 0 && x0 >= w) && sx !== 0) || 
                ((sy < 0 && y0 < 0) || (sy > 0 && y0 >= h) && sy !== 0)) break;
            this.setPixel(x0, y0, color);

            // ตรวจทิศทาง + เกินจุดหมายหรือยัง (ป้องกัน overflow)
            if (((sx > 0 && x0 >= x1) || (sx < 0 && x0 <= x1) && sx !== 0) ||
                ((sy > 0 && y0 >= y1) || (sy < 0 && y0 <= y1) && sy !== 0)) break;

            let e2 = err << 1;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    // 2. drawRect (ขอบ)
    export function drawRect(fximg: Buffer, x: number, y: number, width: number, height: number, color: number) {
        if (width < 1 || height < 1) return;
        drawLine(fximg, x, y, x + width - 1, y, color);
        drawLine(fximg, x + width - 1, y, x + width - 1, y + height - 1, color);
        drawLine(fximg, x + width - 1, y + height - 1, x, y + height - 1, color);
        drawLine(fximg, x, y + height - 1, x, y, color);
    }

    // 3. fillRect (เติมเต็ม)
    export function fillRect(fximg: Buffer, x: number, y: number, width: number, height: number, color: number) {
        const w = fximg.getNumber(NumberFormat.UInt16LE, 2);
        const h = fximg.getNumber(NumberFormat.UInt16LE, 0);
        if (width < 1 || height < 1) return;
        color &= 0xF;

        const sx = clip(x, 0, w - 1);
        const ex = clip(x + width - 1, 0, w - 1);
        const sy = clip(y, 0, h - 1);
        const ey = clip(y + height - 1, 0, h - 1);
        if (sx > ex || sy > ey) return;

        const rowBuf = pins.createBuffer(h);
        for (let cx = sx; cx <= ex; cx++) {
            getRow(fximg, cx, rowBuf, h);
            for (let cy = sy; cy <= ey; cy++) {
                rowBuf[cy] = color;
            }
            setRow(fximg, cx, rowBuf, h);
        }
    }

    // 4. fill (เติมทั้งภาพ)
    export function fill(fximg: Buffer, color: number) {
        color &= 0xF;
        const h = fximg.getNumber(NumberFormat.UInt16LE, 0);
        const rowBuf = pins.createBuffer(h);
        rowBuf.fill(color);
        const w = fximg.getNumber(NumberFormat.UInt16LE, 2);
        for (let x = 0; x < w; x++) {
            setRow(fximg, x, rowBuf, h);
        }
    }

    // 5. replace (แทนที่สี)
    export function replace(fximg: Buffer, fromColor: number, toColor: number) {
        fromColor &= 0xF; toColor &= 0xF;
        const w = fximg.getNumber(NumberFormat.UInt16LE, 2);
        const h = fximg.getNumber(NumberFormat.UInt16LE, 0);
        const rowBuf = pins.createBuffer(h);
        for (let x = 0; x < w; x++) {
            getRow(fximg, x, rowBuf, h);
            for (let y = 0; y < h; y++) {
                if (rowBuf[y] === fromColor) rowBuf[y] = toColor;
            }
            setRow(fximg, x, rowBuf, h);
        }
    }

    // 6. drawCircle (midpoint circle - integer)
    export function drawCircle(fximg: Buffer, cx: number, cy: number, r: number, color: number) {
        if (r < 1) return;
        color &= 0xF;
        let x = r;
        let y = 0;
        let err = 1 - 2 * r;

        while (x >= y) {
            setPixel(fximg, cx + x, cy + y, color);
            setPixel(fximg, cx - x, cy + y, color);
            setPixel(fximg, cx + x, cy - y, color);
            setPixel(fximg, cx - x, cy - y, color);
            setPixel(fximg, cx + y, cy + x, color);
            setPixel(fximg, cx - y, cy + x, color);
            setPixel(fximg, cx + y, cy - x, color);
            setPixel(fximg, cx - y, cy - x, color);

            y++;
            if (err <= 0) {
                err += 2 * y + 1;
            } else {
                x--;
                err += 2 * (y - x) + 1;
            }
        }
    }

    // 7. fillCircle (ใช้ drawLine แนวนอน)
    export function fillCircle(fximg: Buffer, cx: number, cy: number, r: number, color: number) {
        if (r < 1) return;
        color &= 0xF;
        const h = fximg.getNumber(NumberFormat.UInt16LE, 0);
        for (let dy = -r; dy <= r; dy++) {
            let y = cy + dy;
            if (y < 0 || y >= h) continue;
            let dx = Math.sqrt(r * r - dy * dy) | 0;
            drawLine(fximg, cx - dx, y, cx + dx, y, color);
        }
    }

    // 8. drawOval (midpoint oval - integer)
    export function drawOval(fximg: Buffer, cx: number, cy: number, rx: number, ry: number, color: number) {
        rx = Math.abs(rx); ry = Math.abs(ry);
        if (rx === 0 || ry === 0) return;
        if (rx === ry) { this.drawCircle(cx, cy, rx, color); return; }
        cy -= (ry >>> 1);
        color &= 0xF;

        let a = rx, b = ry;
        let b1 = b & 1;             // odd radius correction
    
        let dx = ((1 - a) << 2) * (b * b);
        let dy = ((b1 + 1) << 2) * (a * a);
        let err = dx + dy + b1 * a * a;
    
        let x0 = cx - a, x1 = cx + a;
        let y0 = cy + ((b + 1) >> 1);
        let y1 = y0 - b1;

        // Adjust left/right if rx odd
        if (x0 > x1) { let t = x0; x0 = x1; x1 = t + a; }

        a *= (a << 2);     // a = 4a²
        b1 =  (b * b) << 2; // b1 = 4b²

        do {
            this.setPixel(x1, y0, color);
            this.setPixel(x0, y0, color);
            this.setPixel(x0, y1, color);
            this.setPixel(x1, y1, color);

            let e2 = err << 1;

            if (e2 <= dy) { y0++; y1--; err += dy += a; }     // y step
            if (e2 >= dx || (err << 1) > dy) 
                { x0++; x1--; err += dx += b1; } // x step

        } while (x0 <= x1);

        // Draw tips for very flat ellipses
        while (y0 - y1 < b) {
            this.setPixel(x0 - 1, y0, color);
            this.setPixel(x1 + 1, y0++, color);
            this.setPixel(x0 - 1, y1, color);
            this.setPixel(x1 + 1, y1--, color);
        }
    }

    // 9. fillOval
    export function fillOval(fximg: Buffer, cx: number, cy: number, rx: number, ry: number, color: number) {
        if (rx < 1 || ry < 1) return;
        color &= 0xF;
        const h = fximg.getNumber(NumberFormat.UInt16LE, 0);
        const ry2 = ry * ry;
        for (let dy = -ry; dy <= ry; dy++) {
            let y = cy + dy;
            if (y < 0 || y >= h) continue;
            let dx = Math.sqrt(rx * rx * (1 - (dy * dy / ry2))) | 0;
            drawLine(fximg, cx - dx, y, cx + dx, y, color);
        }
    }

    export function equalTo(fromFximg: Buffer, toFximg: Buffer) {
        if (fromFximg.length < 5 || toFximg.length < 5) return false;
        if (fromFximg.length !== toFximg.length) return false;
        let count = toFximg.length - 4;
        for (let n = 4; n < toFximg.length; n++) if (fromFximg[n] === toFximg[n]) count--;
        if (count > 0) return false;
        return true;
    }

    // 10. copyFrom (copy ทั้ง buffer ถ้าขนาดเท่ากัน)
    export function copyFrom(fromFximg: Buffer, toFximg: Buffer) {
        const w = Math.min(widthOf(fromFximg), widthOf(toFximg));
        const h = Math.min(heightOf(fromFximg), heightOf(toFximg))
        if (w < 1 || h < 1) return;
        const buf = pins.createBuffer(h);
        for (let i = 0; i < w; i++) {
            getRow(fromFximg, i, buf, h);
            setRow(toFximg, i, buf, h)
        }
    }

    // 11. clone
    export function clone(fximg: Buffer): Buffer {
        return fximg.slice();
    }

    // 12. drawImage (ไม่ transparent)
    export function drawImage(fromFximg: Buffer, toFximg: Buffer, dx: number, dy: number) {
        _bulitDrawImage(fromFximg, toFximg, dx, dy, false);
    }

    // 13. drawTransparentImage (skip สี 0)
    export function drawTransparentImage(fromFximg: Buffer, toFximg: Buffer, dx: number, dy: number) {
        _bulitDrawImage(fromFximg, toFximg, dx, dy, true);
    }

    function _bulitDrawImage(fromFximg: Buffer, toFximg: Buffer, dx: number, dy: number, transparent: boolean) {
        const sw = fromFximg.getNumber(NumberFormat.UInt16LE, 2);
        const sh = fromFximg.getNumber(NumberFormat.UInt16LE, 0);
        const tw = toFximg.getNumber(NumberFormat.UInt16LE, 2);
        const th = toFximg.getNumber(NumberFormat.UInt16LE, 0);
    
        const rowSrc = pins.createBuffer(sh);
        const rowDst = pins.createBuffer(th);
        for (let sx = 0; sx < sw; sx++) {
            let tx = dx + sx;
            if (tx < 0) continue;
            if (tx >= tw) break;
    
            srcFximg.getRow(sx, rowSrc);
            this.getRow(tx, rowDst);
    
            for (let sy = 0; sy < sh; sy++) {
                let ty = dy + sy;
                if (ty < 0) continue;
                if (ty >= th) break;
                if (transparent && rowSrc[sy] < 1) continue;
                rowDst[ty] = rowSrc[sy];
            }
            this.setRow(tx, rowDst);
        }
    }

    // 14. scale (nearest neighbor)
    export function scale(fximg: Buffer, newWidth: number, newHeight: number): Buffer {
        const ow = fximg.getNumber(NumberFormat.UInt16LE, 2);
        const oh = fximg.getNumber(NumberFormat.UInt16LE, 0);
        const dst = create(newWidth, newHeight);
        const dstRowBuf = pins.createBuffer(newHeight);
        const fximgRowBuf = pins.createBuffer(oh);

        for (let x = 0; x < newWidth; x++) {
            let sx = Math.idiv(x * ow, newWidth);
            getRow(fximg, sx, fximgRowBuf, oh);
            for (let y = 0; y < newHeight; y++) {
                let sy = Math.idiv(y * oh, newHeight);
                dstRowBuf[y] = fximgRowBuf[sy]
            }
            setRow(dst, x, dstRowBuf, newHeight);
        }
        return dst;
    }

    // 15. rotate90 (n90 = 1,2,3 → 90°,180°,270°)
    export function rotate90(fximg: Buffer, n90: number): Buffer {
        n90 = n90 & 0x3;
        if (n90 === 0) return clone(fximg);

        const w = fximg.getNumber(NumberFormat.UInt16LE, 2);
        const h = fximg.getNumber(NumberFormat.UInt16LE, 0);
        const nw = (n90 & 1) ? h : w;
        const nh = (n90 & 1) ? w : h;
        const dst = create(nw, nh);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let c = getPixel(fximg, x, y);
                let nx: number, ny: number;
                if (n90 === 1) { nx = y; ny = w - 1 - x; }
                else if (n90 === 2) { nx = w - 1 - x; ny = h - 1 - y; }
                else { nx = h - 1 - y; ny = x; }
                setPixel(dst, nx, ny, c);
            }
        }
        return dst;
    }

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

    function iSin(theta: number): number {
        return sineTable[theta & 0xFF];
    }

    function iCos(theta: number): number {
        return sineTable[(theta + 64) & 0xFF];  // cos = sin + 90° (64 ใน 256)
    }

    function rotatedBounds(width: number, height: number, theta: number): number[] {
        let s = Math.abs(iSin(theta));   // |sin| * 120
        let c = Math.abs(iCos(theta));   // |cos| * 120

        // newW ≈ (|cos| * w + |sin| * h) / 120 + 1 (เผื่อ margin)
        let newW = Math.idiv(c * width + s * height, 120) + 1;
        let newH = Math.idiv(s * width + c * height, 120) + 1;

        // เพิ่ม margin เล็กน้อยเพื่อป้องกัน clipping จาก rounding
        newW += 2;
        newH += 2;

        return [newW, newH];
    }

    // 16. rotate (theta 0-255 ด้วย sin/cos table)
    export function rotate(fximg: Buffer, theta: number): Buffer {
        const ow = fximg.getNumber(NumberFormat.UInt16LE, 2);
        const oh = fximg.getNumber(NumberFormat.UInt16LE, 0);

        // หาขนาด bounding box ใหม่
        const [nw, nh] = rotatedBounds(ow, oh, theta);

        // สร้าง Buffer ใหม่ขนาดใหญ่ขึ้น
        const dst = create(nw, nh);
        //fill(dst, 0);  // พื้นหลังโปร่งใส (สี 0)

        // จุดกึ่งกลางใหม่ (สำหรับวางภาพเก่าตรงกลาง)
        const dstCx = nw >> 1;
        const dstCy = nh >> 1;
        const srcCx = ow >> 1;
        const srcCy = oh >> 1;

        const s = iSin(theta);
        const c = iCos(theta);

        // วาดทุกพิกเซลจาก dst → map กลับไป src (reverse rotation เพื่อ fill hole)
        // หรือ forward จาก src → dst (แบบเดิม แต่ shift offset)
        for (let dy = -dstCy; dy < nh - dstCy; dy++) {
            for (let dx = -dstCx; dx < nw - dstCx; dx++) {
                // dx, dy คือ offset จาก center ใหม่
                let ox = Math.idiv(dx * c - dy * s, 120);
                let oy = Math.idiv(dx * s + dy * c, 120);

                let sx = ox + srcCx;
                let sy = oy + srcCy;

                if (sx < 0 || sx >= ow || sy < 0 || sy >= oh) continue;
                let col = getPixel(fximg, sx, sy);
                if (col < 1) continue;  // skip transparent
                let tx = dx + dstCx;
                let ty = dy + dstCy;
                setPixel(dst, tx, ty, col);
            }
        }
        return dst;
    }

    // 17. rotationFrame (สร้างหลายเฟรมหมุนเท่า ๆ กัน)
    export function rotationFrame(fximg: Buffer, count: number): Buffer {
        if (count < 1) count = 1;
        const step = Math.idiv(256, count);
        let w = fximg.getNumber(NumberFormat.UInt16LE, 2);
        let h = fximg.getNumber(NumberFormat.UInt16LE, 0);
        const [bw, bh] = rotatedBounds(w, h, 32);
        const [bw2, bh2] = [bw << 1, bh << 1]
        const bigBuf = createFrame(w + bw2, h + bh2, count);

        let offset = 0;
        for (let i = 0; i < count; i++) {
            const [nw, nh] = rotatedBounds(w, h, i * step);
            let frame = rotate(fximg, i * step);
            drawTransparentImage(bigBuf, frame, offset + Math.abs(bw - nw), Math.abs(bh - nh));
            offset += w + bw2;
        }
        return bigBuf;
    }

    // Optional: trim ขอบโปร่งใส (สี 0) ออกให้เหลือเฉพาะส่วนที่มีเนื้อหา
    export function trim(fximg: Buffer): Buffer {
        const w = fximg.getNumber(NumberFormat.UInt16LE, 2);
        const h = fximg.getNumber(NumberFormat.UInt16LE, 0);

        let minX = w, maxX = -1;
        let minY = h, maxY = -1;

        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                if (getPixel(fximg, x, y) !== 0) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (maxX < minX) return create(1, 1);  // ว่าง

        const newW = maxX - minX + 1;
        const newH = maxY - minY + 1;
        const trimmed = create(newW, newH);

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                setPixel(trimmed, x - minX, y - minY, getPixel(fximg, x, y));
            }
        }
        return trimmed;
    }
}
