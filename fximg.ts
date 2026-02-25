
/**
 * @author Phatiski NaphatManeenil(Phat)
 * fixed image manager
 */
//% block="fixed image" color="#18EC97" icon="\uf03e"
namespace fximges {

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
    //               [ byte1     = header'sHashDB  ]
    //               [ byte1     = header          ]
    //               [ byte1     = metadata'sHashDB]
    //               [ byte1>2>4 = width           ]
    //               [ byte1>2>4 = height          ]
    //               [ byte1>2>4 = length          ]
    //               [ byte1<n   = nibblePixelData ]

}

//% blockNamespace="fximges"
namespace fximg {

    /** */
    //% blockId=fximg_size_dimension block="$fxpic $dimension"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="create"
    export function dimensionOf(fxpic: Buffer, dimension: image.Dimension): number { return helper.fximgDimensionOf(fxpic, dimension); };

    export function widthOf(fxpic: Buffer): number { return helper.fximgWidthOf(fxpic); };

    export function heightOf(fxpic: Buffer): number { return helper.fximgHeightOf(fxpic); };

    export function startIndex(fxpic: Buffer): number { return helper.fximgStartIndex(fxpic); };

    /** */
    //% blockId=fximg_size_length block="length of $fxpic"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="create"
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

    /** */
    //% blockId=fximg_from_frame block="$pics=lists_create_with to fxframe"
    //% pics.defl=image_picker
    //% group="import"
    export function fromFrame(pics: Image[]): Buffer { return helper.fximgFromFrame(pics); };

    /** */
    //% blockId=fximg_to_frame block="$fxpics to frame"
    //% fxpics.shadow=variables_get fxpics.defl=fxpictures
    //% group="export"
    export function toFrame(fxpics: Buffer): Image[] { return helper.fximgToFrame(fxpics); };

    /** */
    //% blockId=fximg_get_frame block="get $fxpics at $idx"
    //% fxpics.shadow=variables_get fxpics.defl=fxpictures
    //% group="drawing"
    export function getFrame(fxpics: Buffer, idx: number): Buffer { return helper.fximgGetFrame(fxpics, idx); };

    /** */
    //% blockId=fximg_set_frame block="set $fxpics at $idx to $fxpic"
    //% fxpics.shadow=variables_get fxpics.defl=fxpictures
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function setFrame(fxpics: Buffer, idx: number, fxpic: Buffer): void { helper.fximgSetFrame(fxpics, idx, fxpic); };

    /** */
    //% blockId=fximg_set_pixel block="set $fxpic at x $x y $y to $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function setPixel(fxpic: Buffer, x: number, y: number, color: number): void { helper.fximgSetPixel(fxpic, x, y, color); };

    /** */
    //% blockId=fximg_get_pixel block="get $fxpic at x $x y $y"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function getPixel(fxpic: Buffer, x: number, y: number): number { return helper.fximgGetPixel(fxpic, x, y); };

    export function setRows(fxpic: Buffer, x: number, buf: Buffer, h?: number): void { helper.fximgSetRows(fxpic, x, buf, h); };

    export function getRows(fxpic: Buffer, x: number, buf: Buffer, h?: number): void { helper.fximgGetRows(fxpic, x, buf, h); };

    /** */
    //% blockId=fximg_color_fill block=" $fxpic fill $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function fill(fxpic: Buffer, color: number) { helper.fximgFill(fxpic, color); };

    /** */
    //% blockId=fximg_trans_replace block=" replace color $fxpic from $fromColor=colorindexpicker to $toColor=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="transformation"
    export function replace(fxpic: Buffer, fromColor: number, toColor: number) { helper.fximgReplace(fxpic, fromColor, toColor); };

    //% blockId=fximg_trans_trim block=" trimming $fxpic|| in $trimMode mode"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="transformation"
    export function trim(fxpic: Buffer, trimMode?: FximgTrimType) { return helper.fximgTrim(fxpic, trimMode); };

    /** */
    //% blockId=fximg_cond_equals block=" $fxpic is equal $otherfxpic"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% otherfxpic.shadow=variables_get otherfxpic.defl=otherfxpicture
    //% group="compare"
    export function equals(fxpic: Buffer, otherfxpic: Buffer) { return helper.fximgEqualTo(fxpic, otherfxpic); };

    /** */
    //% blockId=fximg_get_clone block="clone $fxpic"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="create"
    export function clone(fxpic: Buffer) { return helper.fximgClone(fxpic); };

    /** */
    //% blockId=fximg_set_clone block=" copy $fxpic from $otherfxpic"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% otherfxpic.shadow=variables_get otherfxpic.defl=otherfxpicture
    //% group="drawing"
    export function copyFrom(fxpic: Buffer, otherfxpic: Buffer) { return helper.fximgCopyFrom(fxpic, otherfxpic); };

    export function blitRow(dst: Buffer, xDst: number, yDst: number, wDst: number, hDst: number, src: Buffer, xSrc: number, hSrc: number) { helper.fximgBlitRow(dst, xDst, yDst, wDst, hDst, src, xSrc, hSrc); }

    export function blit(dst: Buffer, xDst: number, yDst: number, wDst: number, hDst: number, src: Buffer, xSrc: number, ySrc: number, wSrc: number, hSrc: number, transparent?: boolean, check?: boolean) { return helper.fximgBlit(dst, xDst, yDst, wDst, hDst, src, xSrc, ySrc, wSrc, hSrc, transparent, check); };

    /** */
    //% blockId=fximg_draw_line block=" $fxpic draw line from x $x0 y $y0 to x $x1 y $y1 color $toColor=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawLine(fxpic: Buffer, x0: number, y0: number, x1: number, y1: number, color: number) { helper.fximgDrawLine(fxpic, x0, y0, x1, y1, color); };

    /** */
    //% blockId=fximg_draw_rect block=" $fxpic draw rectangle at x $x y $y width $width height $height color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawRect(fxpic: Buffer, x: number, y: number, width: number, height: number, color: number) { helper.fximgDrawRect(fxpic, x, y, width, height, color); };

    /** */
    //% blockId=fximg_fill_rect block=" $fxpic fill rectangle at x $x y $y width $width height $height color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function fillRect(fxpic: Buffer, x: number, y: number, width: number, heigth: number, color: number) { helper.fximgFillRect(fxpic, x, y, width, heigth, color); };

    /** */
    //% blockId=fximg_draw_circle block=" $fxpic draw circle at x $x y $y radius $r color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawCircle(fxpic: Buffer, x: number, y: number, r: number, color: number) { helper.fximgDrawCircle(fxpic, x, y, r, color); };

    /** */
    //% blockId=fximg_fill_circle block=" $fxpic fill circle at x $x y $y radius $r color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function fillCircle(fxpic: Buffer, x: number, y: number, r: number, color: number) { helper.fximgFillCircle(fxpic, x, y, r, color); };

    /** */
    //% blockId=fximg_draw_oval block=" $fxpic draw oval at x $x y $y radius x $rx y $ry color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawOval(fxpic: Buffer, x: number, y: number, rx: number, ry: number, color: number) { helper.fximgDrawOval(fxpic, x, y, rx, ry, color); };

    /** */
    //% blockId=fximg_fill_oval block=" $fxpic fill oval at x $x y $y radius x $rx y $ry color $color=colorindexpicker"
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function fillOval(fxpic: Buffer, x: number, y: number, rx: number, ry: number, color: number) { helper.fximgFillOval(fxpic, x, y, rx, ry, color); };

    export function drawTriangle(fxpic: Buffer, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number) { helper.fximgDrawTriangle(fxpic, x0, y0, x1, y1, x2, y2, color); };

    export function fillTriangle(fxpic: Buffer, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, color: number) { helper.fximgFillTriangle(fxpic, x0, y0, x1, y1, x2, y2, color); };

    export function drawPolygon4(fxpic: Buffer, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: number) { helper.fximgDrawPolygon4(fxpic, x0, y0, x1, y1, x2, y2, x3, y3, color); };

    export function fillPolygon4(fxpic: Buffer, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: number) { helper.fximgFillPolygon4(fxpic, x0, y0, x1, y1, x2, y2, x3, y3, color); };

    export function drawImage(from: Buffer, fxpic: Buffer, x: number, y: number) { helper.fximgDrawImage(from, fxpic, x, y); };

    //% blockId=fximg_stamp_transparent block="stamp $from to $fxpic at x $x y $y"
    //% from.shadow=fximg_from_image
    //% fxpic.shadow=variables_get fxpic.defl=fxpicture
    //% group="drawing"
    export function drawTransparentImage(from: Buffer, fxpic: Buffer, x: number, y: number) { helper.fximgDrawTransparentImage(from, fxpic, x, y); };

}

