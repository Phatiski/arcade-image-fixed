interface FxImg {
    _data: Buffer
}

namespace FxImg {

    export const _pos2idx = (a: number, amax: number, b: number) => (a * amax) + b;   
    const newOBJ = (data: Buffer): FxImg => (
        {
            _data: data,
        }
    )

    export function create(width: number, height: number): FxImg {
        const mybuf = pins.createBuffer(4 + (width * height))
        mybuf.setNumber(NumberFormat.UInt16LE, 0, height);
        mybuf.setNumber(NumberFormat.UInt16LE, 2, width)
        return newOBJ(mybuf);
    }

    export function fromImage(img: Image) {
        const mybuf = pins.createBuffer(4 + (img.width * img.height));
        mybuf.setNumber(NumberFormat.UInt16LE, 0, img.height);
        mybuf.setNumber(NumberFormat.UInt16LE, 2, img.width);
        const tbuf = pins.createBuffer(img.height);
        for (let x = 0; x < img.width; x++) {
            img.getRows(x, tbuf);
            const i0 = x * tbuf.length
            for (let y = 0; y < tbuf.length; y++) {
                const i1 = i0 + y;
                mybuf[i1 + 4] = tbuf[i1];
            }
        }
        return newOBJ(mybuf);
    }

    export function toImage(buf: Buffer): Image {
        const myimg = image.create(buf.getNumber(NumberFormat.UInt16LE, 2), buf.getNumber(NumberFormat.UInt16LE, 0));
        const tbuf = pins.createBuffer(myimg.height);
        for (let x = 0; x < myimg.width; x++) {
            const i0 = x * tbuf.length;
            for (let y = 0; y < tbuf.length; y++) {
                const i1 = i0 + y;
                tbuf[y] = buf[i1 + 4];
            }
            myimg.setRows(x, tbuf);
        }
        return myimg.clone();
    }
}
