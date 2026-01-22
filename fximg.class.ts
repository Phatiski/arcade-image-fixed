
class FxImg {

    private arred: boolean;

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
    protected _length: uint16;
    protected   _area: uint32;

    get  width(): uint16 { return this._width;  }
    get height(): uint16 { return this._height; }
    get length(): uint16 { return this._length; }
    get   area(): uint32 { return this._area;   }

    protected isOutOfWidth(x: number):  boolean { return (x < 0 || x >= (this.width * this.length)); }
    protected isOutOfHeight(y: number): boolean { return (y < 0 || y >= this.height ); }
    protected isOutOfArea(x: number, y: number): boolean { return (this.isOutOfWidth(x) || this.isOutOfHeight(y)); }

    protected tbuf: Buffer;
    protected ubuf: Buffer;

    protected expandBuffer(len: number) {
        if (!this.tbuf) {
            this.tbuf = pins.createBuffer(len);
            return;
        }
        if (this.tbuf && (this.tbuf.length < len)) {
            this.ubuf = pins.createBuffer(len)
            this.ubuf.write(0, this.tbuf);
            this.tbuf = this.ubuf.slice();
            this.ubuf = null;
        }
    }
    protected setW(x: number) { x &= 0xffff, this._width  = x; }
    protected setH(x: number) { x &= 0xffff, this._height = x; }
    protected setL(x: number) { x &= 0xffff, this._length = x; }
    protected setA() { this._area = (this._width * this._height) & 0xffffffff; }

    protected sizeInit(width: number, height: number, length?: number) {
        this.setW(width);
        this.setH(height);
        this.setL(length ? length : 1);
        this.setA();
    }

    protected create(width: number, height: number, length?: number) {
        if (!length) length = 1;
        this.data = pins.createBuffer((1 + (width * height * length)) >>> 1);
        this.sizeInit(width, height, length)
    }

    set image(img: Image) {
        this.create(img.width, img.height)
        if (fximage.isEmptyImage(img)) return;
        const tbuf = pins.createBuffer(img.height);
        for (let x = 0; x < img.width; x++) {
            img.getRows(x, tbuf);
            this.setRow(x, tbuf);
        };
    }

    get image(): Image {
        const img = image.create(this.width, this.height);
        const tbuf = pins.createBuffer(img.height);
        for (let x = 0; x < img.width; x++) {
            this.getRow(x, tbuf);
            img.setRows(x, tbuf);
        };
        return img.clone();
    }

    set frame(imgs: Image[]) {
        const allSize = FxImg.maxImgSizes(imgs);
        this.create(allSize.width, allSize.height, imgs.length);
        if (allSize.empty >= imgs.length) return;
        const tbuf = pins.createBuffer(allSize.height);
        let nw = 0;
        for (const img of imgs) {
            for (let x = 0; x < img.width; x++) {
                img.getRows(x, tbuf);
                this.setRow(nw + x, tbuf);
            };
            nw += allSize.width
        };
    }

    get frame(): Image[] {
        const imgs: Image[] = [];
        const img = image.create(this.width, this.height);
        const tbuf = pins.createBuffer(img.height);
        for (let nw = 0; ((1 + (nw * img.height)) >> 1) < this.data.length; nw += img.width) {
            for (let x = 0; x < img.width; x++) {
                this.getRow(nw + x, tbuf);
                img.setRows(x, tbuf);
            };
            imgs.push(img.clone())
        };
        return imgs.slice();
    }

    constructor(v: { width: number, height: number, length?: number }, imgs?: Image[], listed?: boolean) {
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

    setPixel(x: number, y: number, c: number) {
        if (this.isOutOfArea(x, y)) return;
        c &= 0xf;
        const i = this.height;
        const ih4 = (i >>> 1);
        const curv = this.data[ih4];
        let nib0 = curv & 0xf,
            nib1 = curv >>> 4;
        if (i & 1 ? nib0 === c : nib1 === c) return;
        if (i & 1) nib0 = c;
        else nib1 = c;
        this.data[ih4] = (nib1 << 4) + nib0;
    }

    getPixel(x: number, y: number): uint8 {
        if (this.isOutOfArea(x, y)) return 0x0;
        const i = FxImg.pos2idx(x, this.height, y);
        const ih = i >>> 1;
        const ih4 = ih;
        const curv = this.data[ih4];
        return (i & 1 ? curv & 0xf : curv >>> 4)
    }

    setRow(x: number, src: Buffer) {
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

    copyFrom(dstFximg: FxImg) {
        dstFximg.sizeInit(this.width, this.height, this.length);
        dstFximg.data = this.data.slice();
    }

    clone(): FxImg {
        const dstFximg = new FxImg({ width: this.width, height: this.height, length: this.length });
        this.data.write(0, dstFximg.data);
        return dstFximg;
    }
}