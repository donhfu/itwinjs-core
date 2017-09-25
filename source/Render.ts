/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2017 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/

import { JsonUtils } from "@bentley/bentleyjs-core/lib/JsonUtils";

export const enum RenderMode {
  Wireframe = 0,
  HiddenLine = 3,
  SolidFill = 4,
  SmoothShade = 6,
}

/** Flags for view display style */
export class ViewFlags {
  public renderMode: RenderMode = RenderMode.Wireframe;
  public dimensions: boolean = true;            // Shows or hides dimensions.
  public patterns: boolean = true;              // Shows or hides pattern geometry.
  public weights: boolean = true;               // Controls whether non-zero line weights are used or display using weight 0.
  public styles: boolean = true;                // Controls whether custom line styles are used (e.g. control whether elements with custom line styles draw normally, or as solid lines).
  public transparency: boolean = true;          // Controls whether element transparency is used (e.g. control whether elements with transparency draw normally, or as opaque).
  public fill: boolean = true;                  // Controls whether the fills on filled elements are displayed.
  public textures: boolean = true;              // Controls whether to display texture maps for material assignments. When off only material color is used for display.
  public materials: boolean = true;             // Controls whether materials are used (e.g. control whether geometry with materials draw normally, or as if it has no material).
  public acsTriad: boolean = false;             // Shows or hides the ACS triad.
  public grid: boolean = false;                 // Shows or hides the grid. The grid settings are a design file setting.
  public visibleEdges: boolean = false;         // Shows or hides visible edges in the shaded render mode.
  public hiddenEdges: boolean = false;          // Shows or hides hidden edges in the shaded render mode.
  public sourceLights: boolean = false;         // Controls whether the source lights in spatial models are used
  public cameraLights: boolean = false;         // Controls whether camera (ambient, portrait, flashbulb) lights are used.
  public solarLight: boolean = false;           // Controls whether sunlight used
  public shadows: boolean = false;              // Shows or hides shadows.
  public noClipVolume: boolean = false;         // Controls whether the clip volume is applied.
  public constructions: boolean = false;        // Shows or hides construction class geometry.
  public monochrome: boolean = false;           // draw all graphics in a single color
  public noGeometryMap: boolean = false;        // ignore geometry maps
  public hLineMaterialColors: boolean = false;  // use material colors for hidden lines
  public edgeMask: number = 0;                  // 0=none, 1=generate mask, 2=use mask

  public toJSON(): object {
    const out: any = {};

    if (!this.constructions) out.noConstruct = true;
    if (!this.dimensions) out.noDim = true;
    if (!this.patterns) out.noPattern = true;
    if (!this.weights) out.noWeight = true;
    if (!this.styles) out.noStyle = true;
    if (!this.transparency) out.noTransp = true;
    if (!this.fill) out.noFill = true;
    if (this.grid) out.grid = true;
    if (this.acsTriad) out.acs = true;
    if (!this.textures) out.noTexture = true;
    if (!this.materials) out.noMaterial = true;
    if (!this.cameraLights) out.noCameraLights = true;
    if (!this.sourceLights) out.noSourceLights = true;
    if (!this.solarLight) out.noSolarLight = true;
    if (this.visibleEdges) out.visEdges = true;
    if (this.hiddenEdges) out.hidEdges = true;
    if (this.shadows) out.shadows = true;
    if (!this.noClipVolume) out.clipVol = true;
    if (this.hLineMaterialColors) out.hlMatColors = true;
    if (this.monochrome) out.monochrome = true;
    if (this.edgeMask !== 0) out.edgeMask = this.edgeMask;

    out.renderMode = this.renderMode;
    return out;
  }

  public static fromJSON(json: any): ViewFlags {
    const val = new ViewFlags();
    if (!json)
      return val;
    val.constructions = !JsonUtils.asBool(json.noConstruct);
    val.dimensions = !JsonUtils.asBool(json.noDim);
    val.patterns = !JsonUtils.asBool(json.noPattern);
    val.weights = !JsonUtils.asBool(json.noWeight);
    val.styles = !JsonUtils.asBool(json.noStyle);
    val.transparency = !JsonUtils.asBool(json.noTransp);
    val.fill = !JsonUtils.asBool(json.noFill);
    val.grid = JsonUtils.asBool(json.grid);
    val.acsTriad = JsonUtils.asBool(json.acs);
    val.textures = !JsonUtils.asBool(json.noTexture);
    val.materials = !JsonUtils.asBool(json.noMaterial);
    val.cameraLights = !JsonUtils.asBool(json.noCameraLights);
    val.sourceLights = !JsonUtils.asBool(json.noSourceLights);
    val.solarLight = !JsonUtils.asBool(json.noSolarLight);
    val.visibleEdges = JsonUtils.asBool(json.visEdges);
    val.hiddenEdges = JsonUtils.asBool(json.hidEdges);
    val.shadows = JsonUtils.asBool(json.shadows);
    val.noClipVolume = !JsonUtils.asBool(json.clipVol);
    val.monochrome = JsonUtils.asBool(json.monochrome);
    val.edgeMask = JsonUtils.asInt(json.edgeMask);
    val.hLineMaterialColors = JsonUtils.asBool(json.hlMatColors);

    const renderModeValue = JsonUtils.asInt(json.renderMode);
    if (renderModeValue < RenderMode.HiddenLine)
      val.renderMode = RenderMode.Wireframe;
    else if (renderModeValue > RenderMode.SolidFill)
      val.renderMode = RenderMode.SmoothShade;
    else
      val.renderMode = renderModeValue;

    return val;
  }
}

const scratchBytes: Uint8Array = new Uint8Array(4);
const scratchUInt32: Uint32Array = new Uint32Array(scratchBytes.buffer);

// tslint:disable-next-line:variable-name
export const ColorRgb: any = {
  aliceblue: 0xF0F8FF,
  antiquewhite: 0xFAEBD7,
  aqua: 0x00FFFF,
  aquamarine: 0x7FFFD4,
  azure: 0xF0FFFF,
  beige: 0xF5F5DC,
  bisque: 0xFFE4C4,
  black: 0x000000,
  blanchedalmond: 0xFFEBCD,
  blue: 0x0000FF,
  blueviolet: 0x8A2BE2,
  brown: 0xA52A2A,
  burlywood: 0xDEB887,
  cadetblue: 0x5F9EA0,
  chartreuse: 0x7FFF00,
  chocolate: 0xD2691E,
  coral: 0xFF7F50,
  cornflowerblue: 0x6495ED,
  cornsilk: 0xFFF8DC,
  crimson: 0xDC143C,
  cyan: 0x00FFFF,
  darkblue: 0x00008B,
  darkcyan: 0x008B8B,
  darkgoldenrod: 0xB8860B,
  darkgray: 0xA9A9A9,
  darkgreen: 0x006400,
  darkgrey: 0xA9A9A9,
  darkkhaki: 0xBDB76B,
  darkmagenta: 0x8B008B,
  darkolivegreen: 0x556B2F,
  darkorange: 0xFF8C00,
  darkorchid: 0x9932CC,
  darkred: 0x8B0000,
  darksalmon: 0xE9967A,
  darkseagreen: 0x8FBC8F,
  darkslateblue: 0x483D8B,
  darkslategray: 0x2F4F4F,
  darkslategrey: 0x2F4F4F,
  darkturquoise: 0x00CED1,
  darkviolet: 0x9400D3,
  deeppink: 0xFF1493,
  deepskyblue: 0x00BFFF,
  dimgray: 0x696969,
  dimgrey: 0x696969,
  dodgerblue: 0x1E90FF,
  firebrick: 0xB22222,
  floralwhite: 0xFFFAF0,
  forestgreen: 0x228B22,
  fuchsia: 0xFF00FF,
  gainsboro: 0xDCDCDC,
  ghostwhite: 0xF8F8FF,
  gold: 0xFFD700,
  goldenrod: 0xDAA520,
  gray: 0x808080,
  green: 0x008000,
  greenyellow: 0xADFF2F,
  grey: 0x808080,
  honeydew: 0xF0FFF0,
  hotpink: 0xFF69B4,
  indianred: 0xCD5C5C,
  indigo: 0x4B0082,
  ivory: 0xFFFFF0,
  khaki: 0xF0E68C,
  lavender: 0xE6E6FA,
  lavenderblush: 0xFFF0F5,
  lawngreen: 0x7CFC00,
  lemonchiffon: 0xFFFACD,
  lightblue: 0xADD8E6,
  lightcoral: 0xF08080,
  lightcyan: 0xE0FFFF,
  lightgoldenrodyellow: 0xFAFAD2,
  lightgray: 0xD3D3D3,
  lightgreen: 0x90EE90,
  lightgrey: 0xD3D3D3,
  lightpink: 0xFFB6C1,
  lightsalmon: 0xFFA07A,
  lightseagreen: 0x20B2AA,
  lightskyblue: 0x87CEFA,
  lightslategray: 0x778899,
  lightslategrey: 0x778899,
  lightsteelblue: 0xB0C4DE,
  lightyellow: 0xFFFFE0,
  lime: 0x00FF00,
  limegreen: 0x32CD32,
  linen: 0xFAF0E6,
  magenta: 0xFF00FF,
  maroon: 0x800000,
  mediumaquamarine: 0x66CDAA,
  mediumblue: 0x0000CD,
  mediumorchid: 0xBA55D3,
  mediumpurple: 0x9370DB,
  mediumseagreen: 0x3CB371,
  mediumslateblue: 0x7B68EE,
  mediumspringgreen: 0x00FA9A,
  mediumturquoise: 0x48D1CC,
  mediumvioletred: 0xC71585,
  midnightblue: 0x191970,
  mintcream: 0xF5FFFA,
  mistyrose: 0xFFE4E1,
  moccasin: 0xFFE4B5,
  navajowhite: 0xFFDEAD,
  navy: 0x000080,
  oldlace: 0xFDF5E6,
  olive: 0x808000,
  olivedrab: 0x6B8E23,
  orange: 0xFFA500,
  orangered: 0xFF4500,
  orchid: 0xDA70D6,
  palegoldenrod: 0xEEE8AA,
  palegreen: 0x98FB98,
  paleturquoise: 0xAFEEEE,
  palevioletred: 0xDB7093,
  papayawhip: 0xFFEFD5,
  peachpuff: 0xFFDAB9,
  peru: 0xCD853F,
  pink: 0xFFC0CB,
  plum: 0xDDA0DD,
  powderblue: 0xB0E0E6,
  purple: 0x800080,
  rebeccapurple: 0x663399,
  red: 0xFF0000,
  rosybrown: 0xBC8F8F,
  royalblue: 0x4169E1,
  saddlebrown: 0x8B4513,
  salmon: 0xFA8072,
  sandybrown: 0xF4A460,
  seagreen: 0x2E8B57,
  seashell: 0xFFF5EE,
  sienna: 0xA0522D,
  silver: 0xC0C0C0,
  skyblue: 0x87CEEB,
  slateblue: 0x6A5ACD,
  slategray: 0x708090,
  slategrey: 0x708090,
  snow: 0xFFFAFA,
  springgreen: 0x00FF7F,
  steelblue: 0x4682B4,
  tan: 0xD2B48C,
  teal: 0x008080,
  thistle: 0xD8BFD8,
  tomato: 0xFF6347,
  turquoise: 0x40E0D0,
  violet: 0xEE82EE,
  wheat: 0xF5DEB3,
  white: 0xFFFFFF,
  whitesmoke: 0xF5F5F5,
  yellow: 0xFFFF00,
  yellowgreen: 0x9ACD32,
};

/** a TBGR value for a color */
export class ColorDef {
  private _tbgr: number;

  public constructor(val?: number | ColorDef | string) {
    this._tbgr = 0;
    if (!val)
      return;

    if (val instanceof ColorDef) {
      this._tbgr = val._tbgr;
      return;
    }

    if (typeof val === "number") { // when constructing from number, use RGB
      this.fromRgb(val);
      return;
    }
    this.fromString(val);
  }

  /** convert this ColorDef to a 32 bit number representing the tbgr value */
  public toJSON(): any { return this._tbgr; }

  /** set the value of this ColorDef from a 24 bit RGB value. */
  public fromRgb(rgb: number) {
    rgb = Math.floor(rgb);
    return ColorDef.from((rgb >> 16 & 255), (rgb >> 8 & 255), (rgb & 255), 0, this);
  }
  /** create a new ColorDef from a json object. If the json object is a number, it is assumed to be a TBGR value. */
  public static fromJSON(json?: any): ColorDef {
    const out = new ColorDef();
    if (typeof json === "number") { // when we save to json, we store tgbr values as numbers
      out.tbgr = json;
      return out;
    }
    if (json instanceof ColorDef) {
      out.tbgr = json.tbgr;
      return out;
    }
    out.fromString(json);
    return out;
  }
  /** initialize or create a ColorDef fromn R,G,B,T values. All values should be between 0-255 */
  public static from(red: number, green: number, blue: number, transparency?: number, result?: ColorDef) {
    result = result ? result : new ColorDef();
    scratchBytes[0] = red;
    scratchBytes[1] = green;
    scratchBytes[2] = blue;
    scratchBytes[3] = transparency ? transparency : 0;
    result._tbgr = scratchUInt32[0];
    return result;
  }
  /** get the r,g,b,t values from this ColorDef. Returned as an object with {r, g, b, t} members. Values will be integers between 0-255. */
  public getColors() { scratchUInt32[0] = this._tbgr; return { r: scratchBytes[0], g: scratchBytes[1], b: scratchBytes[2], t: scratchBytes[3] }; }
  public get tbgr(): number { return this._tbgr; }
  public set tbgr(tbgr: number) { this._tbgr = tbgr | 0; }
  /** get the RGB value of this ColorDef. Transparency is ignored. Value will be from 0 to 2^24 */
  public getRgb() { scratchUInt32[0] = this._tbgr; return (scratchBytes[0] << 16) + (scratchBytes[1] << 8) + scratchBytes[2]; }
  /** change the alpha value for this ColorDef.
   * @param alpha the new alpha value. Should be between 0-255.
   */
  public setAlpha(alpha: number) { scratchUInt32[0] = this._tbgr; scratchBytes[3] = 255 - (alpha | 0); this._tbgr = scratchUInt32[0]; }
  /** get the alpha value for this ColorDef. Will be between 0-255 */
  public getAlpha() { scratchUInt32[0] = this._tbgr; return 255 - scratchBytes[3]; }
  /** convert this ColorDef to a string in the form "#rrggbb" where values are hex digits of the respective colors */
  public toHexString() { return "#" + ("000000" + this.getRgb().toString(16)).slice(-6); }
  /** convert this ColorDef to a string in the form "rgb(r,g,b)" where values are decimal digits of the respective colors */
  public toRgbString() { const c = this.getColors(); return "rgb(" + (c.r | 0) + "," + (c.g | 0) + "," + (c.b | 0) + ")"; }

  /** initialize this ColorDef from a string in one of the following forms:
   * "rgb(255,0,0)"
   * "rgba(255,0,0,255)"
   * "rgb(100%,0%,0%)"
   * "hsl(120,50%,50%)"
   * "#ff0000"
   * "red" (see values from ColorRgb)
   * @return this
   */
  public fromString(val: string): ColorDef {
    if (typeof val !== "string")
      return this;

    val = val.toLowerCase();
    let m = /^((?:rgb|hsl)a?)\(\s*([^\)]*)\)/.exec(val);
    if (m) { // rgb / hsl

      let color;
      const name = m[1];
      const components = m[2];

      switch (name) {
        case "rgb":
        case "rgba":
          color = /^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(components);
          if (color) { // rgb(255,0,0) rgba(255,0,0,0.5)
            return ColorDef.from(
              Math.min(255, parseInt(color[1], 10)),
              Math.min(255, parseInt(color[2], 10)),
              Math.min(255, parseInt(color[3], 10)),
              color[5] != null ? 255 - Math.min(255, parseInt(color[5], 10)) : 0, this);
          }

          color = /^(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(components);
          if (color) { // rgb(100%,0%,0%) rgba(100%,0%,0%,0.5)
            return ColorDef.from(
              (Math.min(100, parseInt(color[1], 10)) / 100) * 255,
              (Math.min(100, parseInt(color[2], 10)) / 100) * 255,
              (Math.min(100, parseInt(color[3], 10)) / 100) * 255,
              color[5] != null ? 255 - ((Math.min(100, parseInt(color[5], 10)) / 100) * 255) : 0, this);
          }

          break;

        case "hsl":
        case "hsla":
          color = /^([0-9]*\.?[0-9]+)\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(,\s*([0-9]*\.?[0-9]+)\s*)?$/.exec(components);
          if (color) {        // hsl(120,50%,50%) hsla(120,50%,50%,0.5)
            const h = parseFloat(color[1]) / 360;
            const s = parseInt(color[2], 10) / 100;
            const l = parseInt(color[3], 10) / 100;
            return ColorDef.fromHSL(h, s, l, this);
          }
          break;
      }

      // tslint:disable-next-line:no-conditional-assignment
    } else if (m = /^\#([a-f0-9]+)$/.exec(val)) {  // hex color
      const hex = m[1];
      const size = hex.length;

      if (size === 3) { // #ff0
        return ColorDef.from(
          parseInt(hex.charAt(0) + hex.charAt(0), 16),
          parseInt(hex.charAt(1) + hex.charAt(1), 16),
          parseInt(hex.charAt(2) + hex.charAt(2), 16), 0, this);
      }
      if (size === 6) {  // #ff0000
        return ColorDef.from(
          parseInt(hex.charAt(0) + hex.charAt(1), 16),
          parseInt(hex.charAt(2) + hex.charAt(3), 16),
          parseInt(hex.charAt(4) + hex.charAt(5), 16), 0, this);
      }
    }

    if (val && val.length > 0) {   // ColorRgb value
      const hex = ColorRgb[val];
      if (hex !== undefined)
        this.fromRgb(hex);
    }
    return this;
  }

  public lerp(inCol: ColorDef, alpha: number) {
    const color = inCol.getColors();
    const c = this.getColors();
    c.r += (color.r - c.r) * alpha;
    c.g += (color.g - c.g) * alpha;
    c.b += (color.b - c.b) * alpha;
    return ColorDef.from(c.r, c.g, c.b, c.t, this);
  }

  /** set this ColorDef from hue, saturation, lightness values */
  public static fromHSL(h: number, s: number, l: number, out?: ColorDef) {
    const torgb = (p1: number, q1: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p1 + (q1 - p1) * 6 * t;
      if (t < 1 / 2) return q1;
      if (t < 2 / 3) return p1 + (q1 - p1) * 6 * (2 / 3 - t);
      return p1;
    };
    const hue2rgb = (p1: number, q1: number, t: number) => Math.round(torgb(p1, q1, t) * 255);
    const modulo = (n: number, m: number) => ((n % m) + m) % m;
    const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

    // h,s,l ranges are in 0.0 - 1.0
    h = modulo(h, 1);
    s = clamp(s, 0, 1);
    l = clamp(l, 0, 1);

    if (s === 0)
      return ColorDef.from(l, l, l, 0, out);

    const p = l <= 0.5 ? l * (1 + s) : l + s - (l * s);
    const q = (2 * l) - p;
    return ColorDef.from(
      hue2rgb(q, p, h + 1 / 3),
      hue2rgb(q, p, h),
      hue2rgb(q, p, h - 1 / 3), 0, out);
  }

  public getHSL(opt?: any) {
    // h,s,l ranges are in 0.0 - 1.0
    const hsl = opt || { h: 0, s: 0, l: 0 };
    const col = this.getColors();
    col.r /= 255;
    col.g /= 255;
    col.b /= 255;
    const max = Math.max(col.r, col.g, col.b);
    const min = Math.min(col.r, col.g, col.b);

    let hue = 0;
    let saturation;
    const lightness = (min + max) / 2.0;

    if (min === max) {
      saturation = 0;
    } else {
      const delta = max - min;
      saturation = lightness <= 0.5 ? delta / (max + min) : delta / (2 - max - min);
      switch (max) {
        case col.r: hue = (col.g - col.b) / delta + (col.g < col.b ? 6 : 0); break;
        case col.g: hue = (col.b - col.r) / delta + 2; break;
        case col.b: hue = (col.r - col.g) / delta + 4; break;
      }
      hue /= 6;
    }

    hsl.h = hue;
    hsl.s = saturation;
    hsl.l = lightness;
    return hsl;
  }

  public equals(other: ColorDef): boolean { return this._tbgr === other._tbgr; }
  public static readonly black = new ColorDef(ColorRgb.black);
  public static readonly white = new ColorDef(ColorRgb.white);
  public static readonly red = new ColorDef(ColorRgb.red);
  public static readonly green = new ColorDef(ColorRgb.green);
  public static readonly blue = new ColorDef(ColorRgb.blue);
}

export const enum LinePixels {
  Solid = 0,
  Code0 = Solid,            // 0
  Code1 = 0x80808080,       // 1
  Code2 = 0xf8f8f8f8,       // 2
  Code3 = 0xffe0ffe0,       // 3
  Code4 = 0xfe10fe10,       // 4
  Code5 = 0xe0e0e0e0,       // 5
  Code6 = 0xf888f888,       // 6
  Code7 = 0xff18ff18,       // 7
  HiddenLine = 0xcccccccc,  // hidden lines
  Invisible = 0x00000001,   // nearly invisible
  Invalid = 0xffffffff,
}

/** parameters for displaying hidden lines */
export namespace HiddenLine {

  export class Style {
    constructor(public ovrColor: boolean, public color: ColorDef, public pattern: LinePixels, public width: number) { }
    public equals(rhs: Style): boolean {
      return this.ovrColor === rhs.ovrColor && this.color === rhs.color && this.pattern === rhs.pattern && this.width === rhs.width;
    }
  }

  export class Params {
    public visible: Style = new Style(false, new ColorDef(), LinePixels.Solid, 1);
    public hidden: Style = new Style(false, new ColorDef(), LinePixels.HiddenLine, 1);
    public transparencyThreshold: number = 1.0;
    public equals(rhs: Params): boolean { return this.visible === rhs.visible && this.hidden === rhs.hidden && this.transparencyThreshold === rhs.transparencyThreshold; }
  }
}
