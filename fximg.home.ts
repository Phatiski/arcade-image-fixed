
namespace fximg {

    export function create(width: number, height: number, length?: number): FxImg {
        if (!length) length = 1;
        return new FxImg({width, height, length})
    }

    export function fromImage(img: Image): FxImg {
        return new FxImg({ width: null, height: null }, [img], false);
    }

    export function fromFrame(imgs: Image[]): FxImg {
        return new FxImg({ width: null, height: null }, imgs, true);
    }
}