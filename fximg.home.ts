
namespace fximg {

    export function create(width: number, height: number, length?: number): FxImg {
        if (!length) length = 1;
        return new FxImg({width, height, length})
    }
}