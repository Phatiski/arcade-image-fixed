
namespace helper {

    /* // Helper: clip ค่าให้อยู่ในช่วง
    function clip(v: number, minv: number, maxv: number): number {
        return v < minv ? minv : (v > maxv ? maxv : v);
    } */

    // 1. drawLine (Bresenham ปรับปรุงตามที่ภัทรแนะนำ - ใช้ sx/sy ตรวจทิศทาง ไม่เช็คจุดเริ่ม=จุดจบ)
    export function fximgDrawLine(fxpic: Buffer, x0: number, y0: number, x1: number, y1: number, color: number, idx?: number) {
        color &= 0xF;
        if (x0 === x1 && y0 === y1) { fximgSetPixel(fxpic, x0, y0, color, idx); return; }
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic,))) return;
        const w = fximgWidthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        const iw = idx * w;
        if ((x0 < 0 && x1 < 0) || (x0 >= w && x1 >= w) ||
            (y0 < 0 && y1 < 0) || (y0 >= h && y1 >= h)) return;

        let dx = Math.abs(x1 - x0);
        let dy = Math.abs(y1 - y0);
        let sx = Math.clamp(-1, 1, x1 - x0);
        let sy = Math.clamp(-1, 1, y1 - y0);
        let err = dx - dy;

        while (1) {
            if (((sx < 0 && x0 < 0) || (sx > 0 && x0 >= w) && sx !== 0) ||
                ((sy < 0 && y0 < 0) || (sy > 0 && y0 >= h) && sy !== 0)) break;
            fximgSetPixel(fxpic, x0 + iw, y0, color);

            // ตรวจทิศทาง + เกินจุดหมายหรือยัง (ป้องกัน overflow)
            if (((sx > 0 && x0 >= x1) || (sx < 0 && x0 <= x1) && sx !== 0) ||
                ((sy > 0 && y0 >= y1) || (sy < 0 && y0 <= y1) && sy !== 0)) break;

            let e2 = err << 1;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    // 2. drawRect (ขอบ)
    export function fximgDrawRect(fxpic: Buffer, x: number, y: number, width: number, height: number, color: number, idx?: number) {
        if (width < 1 || height < 1) return;
        fximgDrawLine(fxpic, x, y, x + width - 1, y, color, idx);
        fximgDrawLine(fxpic, x + width - 1, y, x + width - 1, y + height - 1, color, idx);
        fximgDrawLine(fxpic, x + width - 1, y + height - 1, x, y + height - 1, color, idx);
        fximgDrawLine(fxpic, x, y + height - 1, x, y, color, idx);
    }

    // 3. fillRect (เติมเต็ม)
    export function fximgFillRect(fxpic: Buffer, x: number, y: number, width: number, height: number, color: number, idx?: number) {
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
        const w = fximgWidthOf(fxpic) * fximgLengthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        if (width < 1 || height < 1) return;
        color &= 0xF;
        idx *= w;

        const sx = Math.clamp(0, w - 1, x);
        const ex = Math.clamp(0, w - 1, x + width - 1);
        const sy = Math.clamp(0, h - 1, y);
        const ey = Math.clamp(0, h - 1, y + height - 1);
        if (sx > ex || sy > ey) return;

        const rowBuf = pins.createBuffer(h);
        for (let cx = sx; cx <= ex; cx++) {
            fximgGetRows(fxpic, cx + idx, rowBuf, h);
            for (let cy = sy; cy <= ey; cy++) rowBuf[cy] = color;
            fximgSetRows(fxpic, cx + idx, rowBuf, h);
        }
    }

    // 6. drawCircle (midpoint circle - integer)
    export function fximgDrawCircle(fxpic: Buffer, cx: number, cy: number, r: number, color: number, idx?: number) {
        if (r < 1) return;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
        color &= 0xF;
        let x = r;
        let y = 0;
        let err = 1 - 2 * r;

        while (x >= y) {
            fximgSetPixel(fxpic, cx + x, cy + y, color, idx);
            fximgSetPixel(fxpic, cx - x, cy + y, color, idx);
            fximgSetPixel(fxpic, cx + x, cy - y, color, idx);
            fximgSetPixel(fxpic, cx - x, cy - y, color, idx);
            fximgSetPixel(fxpic, cx + y, cy + x, color, idx);
            fximgSetPixel(fxpic, cx - y, cy + x, color, idx);
            fximgSetPixel(fxpic, cx + y, cy - x, color, idx);
            fximgSetPixel(fxpic, cx - y, cy - x, color, idx);

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
    export function fximgFillCircle(fxpic: Buffer, cx: number, cy: number, r: number, color: number, idx?: number) {
        if (r < 1) return;
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;
        color &= 0xF;
        const h = fximgHeightOf(fxpic);
        for (let dy = -r; dy <= r; dy++) {
            let y = cy + dy;
            if (y < 0 || y >= h) continue;
            let dx = Math.sqrt(r * r - dy * dy) | 0;
            fximgDrawLine(fxpic, cx - dx, y, cx + dx, y, color, idx);
        }
    }

    // 8. drawOval (midpoint oval - integer)
    export function fximgDrawOval(fxpic: Buffer, cx: number, cy: number, rx: number, ry: number, color: number, idx?: number) {
        rx = Math.abs(rx); ry = Math.abs(ry);
        if (rx === 0 || ry === 0) return;
        if (rx === ry) { fximgDrawCircle(fxpic, cx, cy, rx, color, idx); return; }
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;

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
        b1 = (b * b) << 2; // b1 = 4b²

        do {
            fximgSetPixel(fxpic, x1, y0, color, idx);
            fximgSetPixel(fxpic, x0, y0, color, idx);
            fximgSetPixel(fxpic, x0, y1, color, idx);
            fximgSetPixel(fxpic, x1, y1, color, idx);

            let e2 = err << 1;

            if (e2 <= dy) { y0++; y1--; err += dy += a; }     // y step
            if (e2 >= dx || (err << 1) > dy) { x0++; x1--; err += dx += b1; } // x step

        } while (x0 <= x1);

        // Draw tips for very flat ellipses
        while (y0 - y1 < b) {
            fximgSetPixel(fxpic, x0 - 1, y0, color, idx);
            fximgSetPixel(fxpic, x1 + 1, y0++, color, idx);
            fximgSetPixel(fxpic, x0 - 1, y1, color, idx);
            fximgSetPixel(fxpic, x1 + 1, y1--, color, idx);
        }
    }

    // 9. fillOval
    export function fximgFillOval(fxpic: Buffer, cx: number, cy: number, rx: number, ry: number, color: number, idx?: number) {
        if (rx < 1 || ry < 1) return;
        if (rx === ry) { fximgDrawCircle(fxpic, cx, cy, rx, color, idx); return; }
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;

        color &= 0xF;
        const h = fximgHeightOf(fxpic);
        const ry2 = ry * ry;
        for (let dy = -ry; dy <= ry; dy++) {
            let y = cy + dy;
            if (y < 0 || y >= h) continue;
            let dx = Math.sqrt(rx * rx * (1 - (dy * dy / ry2))) | 0;
            fximgDrawLine(fxpic, cx - dx, y, cx + dx, y, color, idx);
        }
    }

    // 12. drawImage (ไม่ transparent)
    export function fximgDrawImage(fxpic: Buffer, to: Buffer, dx: number, dy: number) {
        fximgBulitDrawImage(fxpic, to, dx, dy, false);
    }

    // 13. drawTransparentImage (skip สี 0)
    export function fximgDrawTransparentImage(fxpic: Buffer, to: Buffer, dx: number, dy: number) {
        fximgBulitDrawImage(fxpic, to, dx, dy, true);
    }

    function fximgBulitDrawImage(from: Buffer, to: Buffer, dx: number, dy: number, transparent: boolean) {
        const sw = fximgWidthOf(from)
        const sh = fximgHeightOf(from);
        const tw = fximgWidthOf(to)
        const th = fximgHeightOf(to);

        const rowFrom = pins.createBuffer(sh);
        const rowTo = pins.createBuffer(th);
        for (let sx = 0; sx < sw; sx++) {
            let tx = dx + sx;
            if (tx < 0) continue;
            if (tx >= tw) break;

            fximgGetRows(from, sx, rowFrom);
            fximgGetRows(to, tx, rowTo);

            for (let sy = 0; sy < sh; sy++) {
                let ty = dy + sy;
                if (ty < 0) continue;
                if (ty >= th) break;
                if (transparent && rowFrom[sy] < 1) continue;
                if (rowTo[ty] === rowFrom[sy]) continue;
                rowTo[ty] = rowFrom[sy];
            }
            fximgSetRows(to, tx, rowTo);
        }
    }

    // 14. scale (nearest neighbor)
    export function fximgScale(fxpic: Buffer, width: number, height: number): Buffer {
        const ow = fximgWidthOf(fxpic);
        const oh = fximgHeightOf(fxpic);
        if (ow === width && oh === height) return fximgClone(fxpic);
        const to = fximgCreate(width, height);
        const toRowBuf = pins.createBuffer(height);
        const fromRowBuf = pins.createBuffer(oh);

        for (let x = 0; x < width; x++) {
            let sx = Math.idiv(x * ow, width);
            fximgGetRows(fxpic, sx, fromRowBuf, oh);
            for (let y = 0; y < height; y++) {
                let sy = Math.idiv(y * oh, height);
                toRowBuf[y] = fromRowBuf[sy]
            }
            fximgSetRows(to, x, toRowBuf, height);
        }
        return to;
    }

    // 15. rotate90 (n90 = 1,2,3 → 90°,180°,270°)
    export function fximgRotate90(fxpic: Buffer, n90: number): Buffer {
        n90 = n90 & 0x3;
        if (n90 === 0) return fximgClone(fxpic);

        const w = fximgWidthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        const nw = (n90 & 1) ? h : w;
        const nh = (n90 & 1) ? w : h;
        const dst = fximgCreate(nw, nh);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let c = fximgGetPixel(fxpic, x, y);
                let nx: number, ny: number;
                if (n90 === 1) { nx = y; ny = w - 1 - x; }
                else if (n90 === 2) { nx = w - 1 - x; ny = h - 1 - y; }
                else { nx = h - 1 - y; ny = x; }
                fximgSetPixel(dst, nx, ny, c);
            }
        }
        return dst;
    }

    function fximgRotatedBounds(width: number, height: number, theta: number): number[] {
        let s = Math.abs(fximgIsin(theta));   // |sin| * 120
        let c = Math.abs(fximgIcos(theta));   // |cos| * 120

        // newW ≈ (|cos| * w + |sin| * h) / 120 + 1 (เผื่อ margin)
        let newW = Math.idiv(c * width + s * height, 120) + 1;
        let newH = Math.idiv(s * width + c * height, 120) + 1;

        // เพิ่ม margin เล็กน้อยเพื่อป้องกัน clipping จาก rounding
        newW += 2;
        newH += 2;

        return [newW, newH];
    }

    // 16. rotate (theta 0-255 ด้วย sin/cos table)
    export function fximgRotate(fxpic: Buffer, theta: number): Buffer {
        const ow = fximgWidthOf(fxpic)
        const oh = fximgHeightOf(fxpic);

        // หาขนาด bounding box ใหม่
        const [nw, nh] = fximgRotatedBounds(ow, oh, theta);

        // สร้าง Buffer ใหม่ขนาดใหญ่ขึ้น
        const dst = fximgCreate(nw, nh);
        //fill(dst, 0);  // พื้นหลังโปร่งใส (สี 0)

        // จุดกึ่งกลางใหม่ (สำหรับวางภาพเก่าตรงกลาง)
        const dstCx = nw >> 1;
        const dstCy = nh >> 1;
        const srcCx = ow >> 1;
        const srcCy = oh >> 1;

        const s = fximgIsin(theta);
        const c = fximgIcos(theta);

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
                let col = fximgGetPixel(fxpic, sx, sy);
                if (col < 1) continue;  // skip transparent
                let tx = dx + dstCx;
                let ty = dy + dstCy;
                fximgSetPixel(dst, tx, ty, col);
            }
        }
        return dst;
    }

    // 17. rotationFrame (สร้างหลายเฟรมหมุนเท่า ๆ กัน)
    export function fximgRotationFrame(fxpic: Buffer, count: number): Buffer {
        if (count < 1) count = 1;
        const step = Math.idiv(256, count);
        let w = fximgWidthOf(fxpic)
        let h = fximgHeightOf(fxpic);
        const [bw, bh] = fximgRotatedBounds(w, h, 32);
        const [bw2, bh2] = [bw << 1, bh << 1]
        const bigBuf = fximgCreateFrame(w + bw2, h + bh2, count);

        let offset = 0;
        for (let i = 0; i < count; i++) {
            const [nw, nh] = fximgRotatedBounds(w, h, i * step);
            let frame = fximgRotate(fxpic, i * step);
            fximgDrawTransparentImage(bigBuf, frame, offset + Math.abs(bw - nw), Math.abs(bh - nh));
            offset += w + bw2;
        }
        return bigBuf;
    }

    // Optional: trim ขอบโปร่งใส (สี 0) ออกให้เหลือเฉพาะส่วนที่มีเนื้อหา
    export function fximgTrim(fxpic: Buffer): Buffer {
        const w = fximgWidthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        if (w <= 0 || h <= 0) return fximgCreate(1, 1);

        const rowBuf = pins.createBuffer(h);

        // หา leftmost column ที่มี non-zero
        let minX = w;
        for (let x = 0; x < w; x++) {
            fximgGetRows(fxpic, x, rowBuf, h);
            for (let y = 0; y < h; y++) {
                if (rowBuf[y] !== 0) {
                    minX = x;
                    break;
                }
            }
            if (minX < w) break;  // พบแล้ว หยุด scan ต่อ
        }

        // หา rightmost column
        let maxX = -1;
        for (let x = w - 1; x >= minX; x--) {
            fximgGetRows(fxpic, x, rowBuf, h);
            for (let y = 0; y < h; y++) {
                if (rowBuf[y] !== 0) {
                    maxX = x;
                    break;
                }
            }
            if (maxX >= 0) break;
        }

        if (maxX < minX) return fximgCreate(1, 1); // ว่างทั้งหมด

        // หา topmost row (scan เฉพาะช่วง minX..maxX)
        let minY = h;
        const colBuf = pins.createBuffer(maxX - minX + 1);
        for (let y = 0; y < h; y++) {
            // อ่านเฉพาะช่วง x ที่มีเนื้อหา
            for (let x = minX; x <= maxX; x++) colBuf[x - minX] = fximgGetPixel(fxpic, x, y);  // หรือ optimize ด้วย getRows แล้ว slice
            for (let i = 0; i < colBuf.length; i++) {
                if (colBuf[i] !== 0) {
                    minY = y;
                    break;
                }
            }
            if (minY < h) break;
        }

        // หา bottommost row
        let maxY = -1;
        for (let y = h - 1; y >= minY; y--) {
            for (let x = minX; x <= maxX; x++) colBuf[x - minX] = fximgGetPixel(fxpic, x, y);
            for (let i = 0; i < colBuf.length; i++) {
                if (colBuf[i] !== 0) {
                    maxY = y;
                    break;
                }
            }
            if (maxY >= 0) break;
        }

        const newW = maxX - minX + 1;
        const newH = maxY - minY + 1;
        const trimmed = fximgCreate(newW, newH);

        // copy เฉพาะส่วนที่เหลือ
        for (let x = minX; x <= maxX; x++) {
            fximgGetRows(fxpic, x, rowBuf, h);
            fximgSetRows(trimmed, x - minX, rowBuf, newH);  // ตัดส่วนบนล่างอัตโนมัติเพราะ setRows ใช้ len = newH
        }

        return trimmed;
    }

    // คืน bounding box ที่ clip กับภาพแล้ว [minX, maxX, minY, maxY]
    function fximgGetClippedBounds(
        fxpic: Buffer,
        xCoords: number[],  // x ของจุดต่าง ๆ
        yCoords: number[]   // y ของจุดต่าง ๆ
    ): number[] {
        const totalW = fximgWidthOf(fxpic) * fximgLengthOf(fxpic);
        const h = fximgHeightOf(fxpic);

        let minX = totalW;
        let maxX = -1;
        let minY = h;
        let maxY = -1;

        for (let i = 0; i < xCoords.length; i++) {
            const x = Math.clamp(0, totalW - 1, xCoords[i]);
            const y = Math.clamp(0, h - 1, yCoords[i]);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
            minY = Math.min(minY, y);
            maxY = Math.max(maxY, y);
        }

        if (minX > maxX || minY > maxY) return [0, -1, 0, -1]; // ว่าง
        return [minX, maxX, minY, maxY];
    }

    // manual sort 3 จุดตาม x (คืน index เรียงจาก x น้อย → มาก)
    function fximgSortTrianglePointsByX(
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number
    ): number[] {  // คืน [idxA, idxB, idxC] โดย xA <= xB <= xC
        if (x0 <= x1 && x0 <= x2) {
            if (x1 <= x2) return [0, 1, 2];
            return [0, 2, 1];
        }
        if (x1 <= x0 && x1 <= x2) {
            if (x0 <= x2) return [1, 0, 2];
            return [1, 2, 0];
        }
        // x2 เป็น min
        if (x0 <= x1) return [2, 0, 1];
        return [2, 1, 0];
    }

    export function fximgDrawTriangle(
        fxpic: Buffer,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        color: number, idx?: number
    ) {
        fximgDrawLine(fxpic, x1, y1, x0, y0, color, idx);
        fximgDrawLine(fxpic, x2, y2, x1, y1, color, idx);
        fximgDrawLine(fxpic, x0, y0, x2, y2, color, idx);
    }

    export function fximgFillTriangle(
        fxpic: Buffer,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        color: number, idx?: number
    ) {
        idx = idx || 0;
        if (fximgIsOutOfRange(idx, fximgLengthOf(fxpic))) return;

        color &= 0xF;
        const w = fximgWidthOf(fxpic);
        const h = fximgHeightOf(fxpic);
        if (fximgIsOutOfAreas([{ x: x0, y: y0 }, { x: x1, y: y1 }, { x: x2, y: y2 }], w, h)) return;
        idx *= w;

        // bounding box clip
        const [minX, maxX, minY, maxY] = fximgGetClippedBounds(fxpic, [x0, x1, x2], [y0, y1, y2]);
        if (minX > maxX) return;

        // manual sort จุดตาม x
        const order = fximgSortTrianglePointsByX(x0, y0, x1, y1, x2, y2);
        const xs = [x0, x1, x2];
        const ys = [y0, y1, y2];
        const xa = xs[order[0]], ya = ys[order[0]];
        const xb = xs[order[1]], yb = ys[order[1]];
        const xc = xs[order[2]], yc = ys[order[2]];

        const rowBuf = pins.createBuffer(h);

        for (let x = Math.max(0, minX | 0); x <= Math.min(w - 1, maxX | 0); x++) {
            fximgGetRows(fxpic, idx + x, rowBuf, h);

            // หา y range สำหรับ x นี้ (intersect กับ 3 ขอบ)
            let yStart = h;
            let yEnd = -1;

            // ขอบ AB
            if (xa !== xb) {
                const t = (x - xa) / (xb - xa);
                if (t >= 0 && t <= 1) {
                    const yab = ya + t * (yb - ya);
                    yStart = Math.min(yStart, yab);
                    yEnd = Math.max(yEnd, yab);
                }
            }

            // ขอบ AC
            if (xa !== xc) {
                const t = (x - xa) / (xc - xa);
                if (t >= 0 && t <= 1) {
                    const yac = ya + t * (yc - ya);
                    yStart = Math.min(yStart, yac);
                    yEnd = Math.max(yEnd, yac);
                }
            }

            // ขอบ BC (เฉพาะเมื่อ x อยู่ระหว่าง xb กับ xc)
            if (xb !== xc && x >= Math.min(xb, xc) && x <= Math.max(xb, xc)) {
                const t = (x - xb) / (xc - xb);
                const ybc = yb + t * (yc - yb);
                yStart = Math.min(yStart, ybc);
                yEnd = Math.max(yEnd, ybc);
            }

            if (yStart <= yEnd) {
                const clipYStart = Math.max(minY, Math.ceil(yStart));
                const clipYEnd = Math.min(maxY, Math.floor(yEnd));
                for (let y = clipYStart; y <= clipYEnd; y++) if (rowBuf[y] !== color) rowBuf[y] = color;
                fximgSetRows(fxpic, idx + x, rowBuf, h);
            }
        }
    }

    export function fximgDrawPolygon4(
        fxpic: Buffer,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        color: number, idx?: number
    ) {
        fximgDrawLine(fxpic, x1, y1, x0, y0, color, idx);
        fximgDrawLine(fxpic, x2, y2, x1, y1, color, idx);
        fximgDrawLine(fxpic, x3, y3, x2, y2, color, idx);
        fximgDrawLine(fxpic, x3, y3, x0, y0, color, idx);
    }

    export function fximgFillPolygon4(
        fxpic: Buffer,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
        color: number, idx?: number
    ) {
        fximgFillTriangle(fxpic, x0, y0, x1, y1, x2, y2, color, idx);
        fximgFillTriangle(fxpic, x3, y3, x1, x1, y2, y2, color, idx);
    }

    export function fximgDrawDistortedImage(
        fxpic: Buffer, to: Buffer,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
    ) {
        fximgBuiltDrawDistortedImage(
            fxpic, to,
            x0, y0, x1, y1,
            x2, y2, x3, y3,
            false
        )
    }

    export function fximgDrawTransDistortedImage(
        fxpic: Buffer, to: Buffer,
        x0: number, y0: number,
        x1: number, y1: number,
        x2: number, y2: number,
        x3: number, y3: number,
    ) {
        fximgBuiltDrawDistortedImage(
            fxpic, to,
            x0, y0, x1, y1,
            x2, y2, x3, y3,
            true
        )
    }

    const fximgZigzet = (l: number, r: number, n: number, c?: boolean) => {
        if (l + n > r) return NaN;
        const size = (r - l);
        const n2 = n >>> 1;
        const half = (c ? 0.5 : 0)
        if (n % 2 > 0) return l + (n2 + half);
        return l + (size - n2 - half);
    }

    function fximgBuiltDrawDistortedImage(
        src: Buffer, dst: Buffer,
        x0: number, y0: number,  // top-left
        x1: number, y1: number,  // top-right
        x2: number, y2: number,  // bottom-right
        x3: number, y3: number,  // bottom-left
        transparent: boolean,
    ) {
        const srcW = fximgWidthOf(src);
        const srcH = fximgHeightOf(src);
        const dstTotalW = fximgWidthOf(dst) * fximgLengthOf(dst);
        const dstH = fximgHeightOf(dst);

        const srcRow = pins.createBuffer(srcH);

        // Precompute inverse เพื่อความเร็ว
        const srcInvW = 1 / srcW;
        const srcInvH = 1 / srcH;

        for (let ix = srcW - 1; ix > -1; ix--) {
            const sx = fximgZigzet(0, srcW - 1, ix);
            fximgGetRows(src, sx, srcRow, srcH);

            // u สำหรับ column นี้ (left edge) และ column ถัดไป (right edge)
            const u0 = sx * srcInvW, u1 = (sx + 1) * srcInvW;

            // คำนวณตำแหน่ง 4 มุมของ quad เล็ก ๆ ใน dst สำหรับ texel นี้
            const qu0 = { x: x0 + (x1 - x0) * u0, y: y0 + (y1 - y0) * u0 };
            const qu2 = { x: x0 + (x1 - x0) * u1, y: y0 + (y1 - y0) * u1 };
            const qu1 = { x: x3 + (x2 - x3) * u0, y: y3 + (y2 - y3) * u0 };
            const qu3 = { x: x3 + (x2 - x3) * u1, y: y3 + (y2 - y3) * u1 };

            for (let iy = srcH - 1; iy > -1; iy--) {
                const sy = fximgZigzet(0, srcH - 1, iy)
                const color = srcRow[sy];
                if (transparent && color < 1) continue;

                // v สำหรับ row นี้ และ row ถัดไป
                const v0 = sy * srcInvH, v1 = (sy + 1) * srcInvH;

                // คำนวณ 4 จุดสุดท้ายของ quad ใน dst
                const q0 = {  // top-left
                    x: Math.round(qu0.x + (qu1.x - qu0.x) * v0),
                    y: Math.round(qu0.y + (qu1.y - qu0.y) * v0)
                };
                const q1 = {  // top-right
                    x: Math.round(qu2.x + (qu3.x - qu2.x) * v0),
                    y: Math.round(qu2.y + (qu3.y - qu2.y) * v0)
                };
                const q2 = {  // bottom-right
                    x: Math.round(qu0.x + (qu1.x - qu0.x) * v1),
                    y: Math.round(qu0.y + (qu1.y - qu0.y) * v1)
                };
                const q3 = {  // bottom-left
                    x: Math.round(qu2.x + (qu3.x - qu2.x) * v1),
                    y: Math.round(qu2.y + (qu3.y - qu2.y) * v1)
                };

                const quad = [q0, q1, q2, q3];

                // ถ้าทั้ง 4 จุดอยู่นอก → ข้าม
                if (fximgIsOutOfAreas(quad, dstTotalW, dstH)) continue;

                // วาด quad เล็ก ๆ ด้วย 2 triangle (หรือใช้ fillQuad ถ้ามี)
                fximgFillTriangle(dst, q1.x, q1.y, q0.x, q0.y, q3.x, q3.y, color);
                fximgFillTriangle(dst, q2.x, q2.y, q0.x, q0.y, q3.x, q3.y, color);
            }
        }
    }

}
