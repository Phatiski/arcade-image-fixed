class FxImg {
    readonly NIB_MASK0 = 0xf0;
    readonly NIB_MASK1 = 0x0f;

    static pos2idx = (a: number, ah: number, b: number) => (a * ah) + b
    static isEmptyImage = (img: Image) => img.equals(image.create(img.width, img.height));
    static isEmptyFrame = (imgs: Image[]) => imgs.reduce((cur, img) => cur + (img.equals(image.create(img.width, img.height)) ? 1 : 0), 0)

    static maxImgSizes = (imgs: Image[]) => {
        const cur = { width: imgs[0].width, height: imgs[0].height, area: 0, empty: 0 };
        for (const img of imgs) {
            cur.width = Math.max(cur.width, img.width),
                cur.height = Math.max(cur.height, img.height);
            if (FxImg.isEmptyImage(img)) cur.empty++;
        }
        cur.area = cur.width * cur.height;
        return cur
    }

    protected data: Buffer;
    protected _width: uint16;
    protected _height: uint16;
    protected _length: uint16;

    get width() { return this._width }
    get height() { return this._height }
    get length() { return this._length }

    protected sizeInit(width: number, height: number, length?: number) {
        this._width = width;
        this._height = height;
        this._length = length ? length : 1;
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

    get frame() {
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
        else if (v.length) v.length = 1;
        if (imgs) {
            if (listed || imgs.length > 1) this.frame = imgs;
            else this.image = imgs[0];
            return;
        } this.create(v.width, v.height, v.length);
    }

    setPixel(x: number, y: number, c: number) {
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

    getPixel(x: number, y: number) {
        const i = FxImg.pos2idx(x, this.height, y);
        const ih = i >>> 1;
        const ih4 = ih;
        const curv = this.data[ih4];
        return (i & 1 ? curv & 0xf : curv >>> 4)
    }

    setRow(x: number, src: Buffer) {
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

    getRow(x: number, dst: Buffer) {
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
}