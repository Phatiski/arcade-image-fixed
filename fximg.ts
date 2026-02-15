
/**
 * @author Phatiski NaphatManeenil(Phat)
 * fixed image manager
 */
//% block="fixed image" color="#18EC97" icon="\uf03e"
namespace fximges { }

//% blockNamespace="fximges"
namespace fximg {

    //               fximg/fxpic structure as buffer
    //
    //            header metadata layout (bit6 -> bit1)
    //
    //              |header|width  |height |length |
    //              |      |b6 - b5|b4 - b3|b2 - b1|
    //              |------|-------|-------|-------|
    //              |0b00  |Uint8  |Uint8  |Uint8  |
    //              |0b01  |Uint16 |Uint16 |Uint16 |
    //              |0b10  |Uint32 |Uint32 |Uint32 |
    //              |0b11  |Null   |Null   |Null   |
    //
    //                         flag header 
    //               [ bit8 = read-only mode       ]
    //               [ bit7 = metadata-frozen mode ]
    //
    // fximg pixel-data -> 1nibble per 1pixel (1-16 index color)
    // 
    //                       data structure
    // 
    //                 [ byte1     = header     ]
    //                 [ byte1>2>4 = width      ]
    //                 [ byte1>2>4 = height     ]
    //                 [ byte1>2>4 = length     ]
    //                 [ byte1<n   = nibblePixel]

    //% blockId=fximg_size_dimension block="$fxpic $dimension"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    export function dimensionOf(fxpic: Buffer, dimension: image.Dimension): number { return helper.fximgDimensionOf(fxpic, dimension); };

    export function widthOf(fxpic: Buffer): number { return helper.fximgWidthOf(fxpic); };

    export function heightOf(fxpic: Buffer): number { return helper.fximgHeightOf(fxpic); };

    export function startIndex(fxpic: Buffer): number { return helper.fximgStartIndex(fxpic); };

    //% blockId=fximg_size_length block="length of $fxpic"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    export function lengthOf(fxpic: Buffer): number { return helper.fximgLengthOf(fxpic); };

    /** */
    //% blockId=fximg_create_frame block="create image frame| width $width height $height length $length"
    //% blockSetVariable=fxpictures
    //% group="create"
    export function createFrame(width: number, height: number, length: number): Buffer { return helper.fximgCreateFrame(width, height, length); };

    /** */
    //% blockId=fximg_create block="create image| width $width height $height"
    //% blockSetVariable=fxpicture
    //% group="create"
    export function create(width: number, height: number): Buffer { return helper.fximgCreate(width, height); };

    /** */
    //% blockId=fximg_from_image block="$pic=image_picker to fximage"
    //% group="import"
    export function fromImage(pic: Image): Buffer { return helper.fximgFromImage(pic); };

    /** */
    //% blockId=fximg_to_image block="$fxpic to image"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="export"
    export function toImage(fxpic: Buffer): Image { return helper.fximgToImage(fxpic); };

    //% blockId=fximg_from_frame block="$pics=lists_create_with to fxframe"
    //% pics.defl=image_picker
    //% group="import"
    export function fromFrame(pics: Image[]): Buffer { return helper.fximgFromFrame(pics); };

    //% blockId=fximg_to_frame block="$fxpics to frame"
    //% fxpics.shadow=variables_get fxpics.defl=fxpictures
    //% group="export"
    export function toFrame(fxpics: Buffer): Image[] { return helper.fximgToFrame(fxpics); };

    //% blockId=fximg_get_frame block="get $fxpics at $idx"
    //% fxpics.shadow=variables_get fxpics.defl=fxpictures
    export function getFrame(fxpics: Buffer, idx: number): Buffer { return helper.fximgGetFrame(fxpics, idx); };

    //% blockId=fximg_set_frame block="set $fxpics at $idx to $fxpic"
    //% fxpics.shadow=variables_get fxpics.defl=fxpictures
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    export function setFrame(fxpics: Buffer, idx: number, fxpic: Buffer): void { helper.fximgSetFrame(fxpics, idx, fxpic); };

    //% blockId=fximg_set_pixel block="set $fxpic at x $x y $y to $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    export function setPixel(fxpic: Buffer, x: number, y: number, color: number): void { helper.fximgSetPixel(fxpic, x, y, color); };

    //% blockId=fximg_get_pixel block="get $fxpic at x $x y $y"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    export function getPixel(fxpic: Buffer, x: number, y: number): number { return helper.fximgGetPixel(fxpic, x, y); };

    export function setRows(fxpic: Buffer, x: number, buf: Buffer, h?: number): void { helper.fximgSetRows(fxpic, x, buf, h); };

    export function getRows(fxpic: Buffer, x: number, buf: Buffer, h?: number): void { helper.fximgGetRows(fxpic, x, buf, h); };

    export function fill(fxpic: Buffer, color: number) { helper.fximgFill(fxpic, color); };

    export function replace(fxpic: Buffer, fromColor: number, toColor: number) { helper.fximgReplace(fxpic, fromColor, toColor); };

    export function equals(fxpic: Buffer, otherfxpic: Buffer) { return helper.fximgEqualTo(fxpic, otherfxpic); };

    export function drawLine(fxpic: Buffer, x0: number, y0: number, x1: number, y1: number, color: number) { helper.fximgDrawLine(fxpic, x0, y0, x1, y1, color); };

    export function drawRect(fxpic: Buffer, x: number, y: number, width: number, height: number, color: number) { helper.fximgDrawRect(fxpic, x, y, width, height, color); };

    export function fillRect(fxpic: Buffer, x: number, y: number, width: number, heigth: number, color: number) { helper.fximgFillRect(fxpic, x, y, width, heigth, color); };

}

