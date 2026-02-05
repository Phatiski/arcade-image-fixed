/*
class FxImg {

    private _deleted: boolean;
    get deleted() { return this._deleted; }

    protected static readonly sineTable: number[] = [
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

    protected static readonly iSin = (theta: number): number => FxImg.sineTable[theta & 0xFF];

    protected static readonly iCos = (theta: number): number => FxImg.sineTable[(theta + 64) & 0xFF];  // cos = sin + 90° (64 in 256)

    protected static readonly rotatedBounds = (width: number, height: number, theta: number): number[] => {
        let s = Math.abs(FxImg.iSin(theta));   // |sin| * 120
        let c = Math.abs(FxImg.iCos(theta));   // |cos| * 120

        // newW ≈ (|cos| * w + |sin| * h) / 120 + 1 (เผื่อ margin)
        let newW = Math.idiv(c * width + s * height, 120) + 1;
        let newH = Math.idiv(s * width + c * height, 120) + 1;

        // เพิ่ม margin เล็กน้อยเพื่อป้องกัน clipping จาก rounding
        newW += 2;
        newH += 2;

        return [newW, newH];
    }

    protected readonly NIB_MASK0 = 0xf0;
    protected readonly NIB_MASK1 = 0x0f;

    protected static readonly pos2idx = (a: number, ah: number, b: number): number => (a * ah) + b
    protected static readonly isEmptyImage = (img: Image): boolean => img.equals(image.create(img.width, img.height));
    protected static readonly isEmptyFrame = (imgs: Image[]): number => imgs.reduce((cur, img) => cur + (img.equals(image.create(img.width, img.height)) ? 1 : 0), 0);
    protected static readonly clip = (v: number, minv: number, maxv: number): number => v < minv ? minv : (v > maxv ? maxv : v);

    protected static readonly maxImgSizes = (imgs: Image[]) => {
        const cur = { width: imgs[0].width, height: imgs[0].height, area: 0, empty: 0 };
        for (const img of imgs) {
            cur.width = Math.max(cur.width, img.width),
                cur.height = Math.max(cur.height, img.height);
            if (FxImg.isEmptyImage(img)) cur.empty++;
        }
        cur.area = cur.width * cur.height;
        return cur
    }

    protected    data: Buffer;
    protected  _width: uint16;
    protected _height: uint16;
    protected _length: uint32;

    get  width(): uint16 { return this._width;  }
    get height(): uint16 { return this._height; }
    get length(): uint32 { return this._length; }

    protected isOutOfWidth(x: number):  boolean { return (x < 0 || x >= (this.width * this.length)); }
    protected isOutOfHeight(y: number): boolean { return (y < 0 || y >= this.height ); }
    protected isOutOfArea(x: number, y: number): boolean { return (this.isOutOfWidth(x) || this.isOutOfHeight(y)); }

    protected tbuf: Buffer;
    protected ubuf: Buffer;

    protected expandBuffer(len: number) {
        if (!this.tbuf) { this.tbuf = pins.createBuffer(len); return; }
        if (this.tbuf && (this.tbuf.length >= len)) return;
        this.ubuf = pins.createBuffer(len);
        this.ubuf.write(0, this.tbuf);
        this.tbuf = this.ubuf.slice();
        this.ubuf = null;
    }
    protected setW(x: number) { x &= 0xffff,     this._width  = x; }
    protected setH(x: number) { x &= 0xffff,     this._height = x; }
    protected setL(x: number) { x &= 0xffffffff, this._length = x; }

    protected sizeInit(width: number, height: number, length?: number) {
        this.setW(width);
        this.setH(height);
        this.setL(length ? length : 1);
    }

    protected create(width: number, height: number, length?: number) {
        if (!length) length = 1;
        this.data = pins.createBuffer((1 + (width * height * length)) >>> 1);
        this.sizeInit(width, height, length);
        this.expandBuffer(this.height);
    }

    protected _bulitDrawImage(srcFximg: FxImg, dx: number, dy: number, transparent: boolean) {
        const sw = srcFximg.width;
        const sh = srcFximg.height;
        const tw = this.width;
        const th = this.height;
    
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

    set image(img: Image) {
        this.create(img.width, img.height)
        if (FxImg.isEmptyImage(img)) return;
        this.expandBuffer(img.height);
        for (let x = 0; x < img.width; x++) {
            img.getRows(x, this.tbuf);
            this.setRow(x, this.tbuf);
        };
    }

    get image(): Image {
        const img = image.create(this.width, this.height);
        this.expandBuffer(img.height);
        for (let x = 0; x < img.width; x++) {
            this.getRow(x, this.tbuf);
            img.setRows(x, this.tbuf);
        };
        return img.clone();
    }

    set frame(imgs: Image[]) {
        const allSize = FxImg.maxImgSizes(imgs);
        this.create(allSize.width, allSize.height, imgs.length);
        if (allSize.empty >= imgs.length) return;
        this.expandBuffer(allSize.height);
        let nw = 0;
        for (const img of imgs) {
            for (let x = 0; x < img.width; x++) {
                img.getRows(x, this.tbuf);
                this.setRow(nw + x, this.tbuf);
            };
            nw += allSize.width
        };
    }

    get frame(): Image[] {
        const imgs: Image[] = [];
        const img = image.create(this.width, this.height);
        this.expandBuffer(img.height)
        for (let nw = 0; ((1 + (nw * img.height)) >> 1) < this.data.length; nw += img.width) {
            for (let x = 0; x < img.width; x++) {
                this.getRow(nw + x, this.tbuf);
                img.setRows(x, this.tbuf);
            };
            imgs.push(img.clone())
        };
        return imgs.slice();
    }

    init(v: { width: number, height: number, length?: number }, imgs?: Image[], listed?: boolean) {
        this._deleted = false;
        if (imgs && imgs.length > 0) v.length = imgs.length;
        else if (!v.length) v.length = 1;
        if (!imgs) {
            this.create(v.width, v.height, v.length);
            return;
        }
        if (imgs) {
            if (listed || imgs.length > 1) this.frame = imgs;
            else this.image = imgs[0];
            return;
        } this.create(v.width, v.height, v.length);
    }

    constructor(v: { width: number, height: number, length?: number }, imgs?: Image[], listed?: boolean) {
        this.init(v, imgs, listed );
    }

    delete() {
        if (this.deleted) return;
        this._deleted = true;
        this._width = null, this._height = null, this._length = null;
        this.tbuf = null, this.ubuf = null, this.data = null;
    }

    setPixel(x: number, y: number, color: number) {
        if (this.deleted) return;
        if (this.isOutOfArea(x, y)) return;
        color &= 0xf;
        const i = FxImg.pos2idx(x, this.height, y);
        const ih4 = (i >>> 1);
        const curv = this.data[ih4];
        let nib0 = curv & 0xf,
            nib1 = curv >>> 4;
        if (i & 1 ? nib0 === color : nib1 === color) return;
        if (i & 1) nib0 = color;
        else nib1 = color;
        this.data[ih4] = (nib1 << 4) + nib0;
    }

    getPixel(x: number, y: number): uint8 {
        if (this.deleted) return 0x0;
        if (this.isOutOfArea(x, y)) return 0x0;
        const i = FxImg.pos2idx(x, this.height, y);
        const ih = i >>> 1;
        const ih4 = ih;
        const curv = this.data[ih4];
        return (i & 1 ? curv & 0xf : curv >>> 4)
    }

    setRow(x: number, src: Buffer) {
        if (this.deleted) return;
        if (this.isOutOfWidth(x)) return;
        const len = Math.min(src.length, this.height);
        if (len < 1) return;
        let i = x * this.height,
            y = 0;
        if (i & 1) {
            src[y] &= 0xf;
            const ih4 = (i >>> 1);
            this.data[ih4] = (this.data[ih4] & this.NIB_MASK0) | (src[y] & this.NIB_MASK1);
            i++, y++;
        }
        for (; y < len - 1; y += 2) {
            src[y] &= 0xf, src[y + 1] &= 0xf;
            const ih4 = (i >>> 1);
            this.data[ih4] = (src[y] << 4) | (src[y + 1] & this.NIB_MASK1);
            i += 2;
        }
        if (y < len) {
            src[y] &= 0xf;
            const ih4 = (i >>> 1);
            this.data[ih4] = (i & 1) ? (src[y] << 4) | (this.data[ih4] & this.NIB_MASK1) : (this.data[ih4] & this.NIB_MASK0) | (src[y] & this.NIB_MASK1);
        }
    }

    getRow(x: number, dst: Buffer): void {
        if (this.deleted) return;
        if (this.isOutOfWidth(x)) return;
        const len = Math.min(dst.length, this.height);
        if (len < 1) return;
        let i = x * this.height,
            y = 0;
        if (i & 1) {
            const ih4 = (i >>> 1);
            dst[y] = this.data[ih4] & this.NIB_MASK1;
            i++, y++;
        }
        for (; y < len - 1; y += 2) {
            const ih4 = (i >>> 1);
            const val = this.data[ih4];
            dst[y + 1] = val & this.NIB_MASK1;
            dst[y] = val >>> 4;
            i += 2;
        }
        if (y < len) {
            const ih4 = (i >>> 1);
            dst[y] = (i & 1) ? (this.data[ih4] & this.NIB_MASK1) : (this.data[ih4] >>> 4);
        }
    }

    equal(otherFximg: FxImg) {
        if (this.deleted) return false;
        if (this.data.length < 1 || otherFximg.data.length < 1) return false;
        if (this.data.length !== otherFximg.data.length) return false;
        let count = this.data.length;
        for (let n = this.data.length; n >= 0; n--) if (this.data[n] === otherFximg.data[n]) count = n;
        if (count > 0) return false;
        return true;
    }

    copyFrom(srcFximg: FxImg) {
        if (this.deleted) return;
        this.sizeInit(srcFximg.width, srcFximg.height, srcFximg.length);
        this.data = srcFximg.data.slice();
    }

    clone(): FxImg {
        if (this.deleted) return null;
        const dstFximg = new FxImg({ width: this.width, height: this.height, length: this.length });
        dstFximg.data = this.data.slice();
        return dstFximg;
    }

    fill(color: number) {
        if (this.deleted) return;
        color &= 0xF;
        const h = this.height;
        this.expandBuffer(h);
        this.tbuf.fill(color, 0, h);
        const w = this.width;
        for (let x = 0; x < w; x++) this.setRow(x, this.tbuf);
    }

    replace(fromColor: number, toColor: number) {
        if (this.deleted) return;
        fromColor &= 0xF; toColor &= 0xF;
        const w = this.width;
        const h = this.height;
        this.expandBuffer(h)
        for (let x = 0; x < w; x++) {
            this.getRow(x, this.tbuf);
            for (let y = 0; y < h; y++) {
                if (this.tbuf[y] === fromColor) this.tbuf[y] = toColor;
            }
            this.setRow(x, this.tbuf);
        }
    }

    drawLine(x0: number, y0: number, x1: number, y1: number, color: number) {
        if (this.deleted) return;
        if (x0 === x1 && y0 === y1) { this.setPixel(x0, y0, color); return; }
        const w = this.width;
        const h = this.height;
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

    drawRect(x: number, y: number, width: number, height: number, color: number) {
        if (this.deleted) return;
        if (width < 1 || height < 1) return;
        this.drawLine(x, y, x + width - 1, y, color);
        this.drawLine(x + width - 1, y, x + width - 1, y + height - 1, color);
        this.drawLine(x + width - 1, y + height - 1, x, y + height - 1, color);
        this.drawLine(x, y + height - 1, x, y, color);
    }

    fillRect(x: number, y: number, width: number, height: number, color: number) {
        if (this.deleted) return;
        const w = this.width;
        const h = this.height;
        if (width < 1 || height < 1) return;
        color &= 0xF;

        const sx = Math.clamp(0, w - 1, x);
        const ex = Math.clamp(0, w - 1, x + width - 1);
        const sy = Math.clamp(0, h - 1, y);
        const ey = Math.clamp(0, h - 1, y + height - 1);
        if (sx > ex || sy > ey) return;

        const rowBuf = pins.createBuffer(h);
        for (let cx = sx; cx <= ex; cx++) {
            this.getRow(cx, rowBuf);
            for (let cy = sy; cy <= ey; cy++) {
                rowBuf[cy] = color;
            }
            this.setRow(cx, rowBuf);
        }
    }

    drawCircle(cx: number, cy: number, r: number, color: number) {
        if (this.deleted) return;
        r = Math.abs(r);
        if (r === 0) return;
        color &= 0xF;
        let x = r;
        let y = 0;
        let err = 1 - (r << 1);

        while (x >= y) {
            this.setPixel(cx + x, cy + y, color);
            this.setPixel(cx - x, cy + y, color);
            this.setPixel(cx + x, cy - y, color);
            this.setPixel(cx - x, cy - y, color);
            this.setPixel(cx + y, cy + x, color);
            this.setPixel(cx - y, cy + x, color);
            this.setPixel(cx + y, cy - x, color);
            this.setPixel(cx - y, cy - x, color);

            y++;
            if (err <= 0) {
                err += (y + 1) << 1;
            } else {
                x--;
                err += ((y - x) + 1) << 1;
            }
        }
    }

    fillCircle(cx: number, cy: number, r: number, color: number) {
        if (this.deleted) return;
        r = Math.abs(r);
        if (r === 0) return;
        color &= 0xF;
        const h = this.height;
        for (let dy = -r; dy <= r; dy++) {
            let y = cy + dy;
            if (y < 0) continue;
            if (y >= h) break;
            let dx = Math.sqrt(r * r - dy * dy) | 0;
            this.drawLine(cx - dx, y, cx + dx, y, color);
        }
    }

    drawOval(cx: number, cy: number, rx: number, ry: number, color: number) {
        if (this.deleted) return;
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

    fillOval(cx: number, cy: number, rx: number, ry: number, color: number) {
        if (this.deleted) return;
        rx = Math.abs(rx); ry = Math.abs(ry);
        if (rx === 0 || ry === 0) return;
        if (rx === ry) { this.fillCircle(cx, cy, rx, color); return; }
        color &= 0xF;
        const h = this.height;
        const ry2 = ry * ry;
        for (let dy = -ry; dy <= ry; dy++) {
            let y = cy + dy;
            if (y < 0) continue;
            if (y >= h) break;
            let dx = Math.sqrt(rx * rx * (1 - (dy * dy / ry2))) | 0;
            this.drawLine(cx - dx, y, cx + dx, y, color);
        }
    }

    drawImage(srcFximg: FxImg, dx: number, dy: number) {
        if (this.deleted) return;
        this._bulitDrawImage(srcFximg, dx, dy, false);
    }

    drawTransparentImage(srcFximg: FxImg, dx: number, dy: number) {
        if (this.deleted) return;
        this._bulitDrawImage(srcFximg, dx, dy, true);
    }

    trim(): FxImg {
        if (this.deleted) return null;
        const w = this.width;
        const h = this.height;

        let minX = w, maxX = -1;
        let minY = h, maxY = -1;

        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                if (this.getPixel(x, y) !== 0) {
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, y);
                    maxY = Math.max(maxY, y);
                }
            }
        }

        if (maxX < minX) return new FxImg({ width: 1, height: 1 });  // ว่าง

        const newW = maxX - minX + 1;
        const newH = maxY - minY + 1;
        const trimmed = new FxImg({ width: newW, height: newH });

        trimmed.drawTransparentImage(this, -minX, -minY);

        return trimmed;
    }

    scale(width: number, height: number): FxImg {
        if (this.deleted) return null;
        const ow = this.width;
        const oh = this.height;
        const dst = new FxImg({width, height});
        const dstRowBuf = pins.createBuffer(height);
        const fximgRowBuf = pins.createBuffer(oh);

        for (let x = 0; x < width; x++) {
            let sx = Math.idiv(x * ow, width);
            this.getRow(sx, fximgRowBuf);
            for (let y = 0; y < height; y++) {
                let sy = Math.idiv(y * oh, height);
                dstRowBuf[y] = fximgRowBuf[sy]
            }
            dst.setRow(x, dstRowBuf);
        }
        return dst;
    }

    rotate90(n90: number): FxImg {
        if (this.deleted) return null;
        n90 = n90 & 0x3;
        if (n90 === 0) return this.clone();

        const w = this.width;
        const h = this.height;
        const nw = (n90 & 1) ? h : w;
        const nh = (n90 & 1) ? w : h;
        const dst = new FxImg({ width: nw, height: nh });

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let c = this.getPixel(x, y);
                let nx: number, ny: number;
                if (n90 === 1) { nx = y; ny = w - 1 - x; }
                else if (n90 === 2) { nx = w - 1 - x; ny = h - 1 - y; }
                else { nx = h - 1 - y; ny = x; }
                dst.setPixel(nx, ny, c);
            }
        }
        return dst;
    }

    rotate(theta: number): FxImg {
        if (this.deleted) return null;
        const ow = this.width;
        const oh = this.height;

        // หาขนาด bounding box ใหม่
        const [nw, nh] = FxImg.rotatedBounds(ow, oh, theta);

        // สร้าง Buffer ใหม่ขนาดใหญ่ขึ้น
        const dst = new FxImg({ width: nw, height: nh });
        //fill(dst, 0);  // พื้นหลังโปร่งใส (สี 0)

        // จุดกึ่งกลางใหม่ (สำหรับวางภาพเก่าตรงกลาง)
        const dstCx = nw >> 1;
        const dstCy = nh >> 1;
        const srcCx = ow >> 1;
        const srcCy = oh >> 1;

        const s = FxImg.iSin(theta);
        const c = FxImg.iCos(theta);

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
                let col = this.getPixel(sx, sy);
                if (col < 1) continue;  // skip transparent
                let tx = dx + dstCx;
                let ty = dy + dstCy;
                dst.setPixel(tx, ty, col);
            }
        }
        return dst;
    }

    rotationFrame(count: number): FxImg {
        if (this.deleted) return null;
        if (count < 1) count = 1;
        const step = Math.idiv(256, count);
        let w = this.width;
        let h = this.height;
        const [bw, bh] = FxImg.rotatedBounds(w, h, 32);
        const [bw2, bh2] = [bw << 1, bh << 1]
        const bigBuf = new FxImg({ width: w + bw2, height: h + bh2, length: count });

        let offset = 0;
        for (let i = 0; i < count; i++) {
            const [nw, nh] = FxImg.rotatedBounds(w, h, i * step);
            let frame = this.rotate(i * step);
            bigBuf.drawTransparentImage(frame, offset + Math.abs(bw - nw), Math.abs(bh - nh));
            offset += w + bw2;
        }
        return bigBuf;
    }
}
*/
