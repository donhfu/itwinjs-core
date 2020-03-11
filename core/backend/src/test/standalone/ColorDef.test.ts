/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { assert } from "chai";
import { ColorDef, ColorByName } from "@bentley/imodeljs-common";

// cspell:ignore cadetblue hsla

describe("ColorDef", () => {
  it("should compare ColorDef RGB values", () => {
    const cadetBlue = new ColorDef(ColorByName.cadetBlue);
    assert.equal(cadetBlue.tbgr, ColorByName.cadetBlue);
    assert.equal(cadetBlue.getRgb(), 0x5f9ea0);
    assert.equal(cadetBlue.toHexString(), "#5f9ea0");
    assert.equal(cadetBlue.getRgb(), ColorDef.from(0x5f, 0x9e, 0xa0).getRgb());
    assert.equal(cadetBlue.getRgb(), ColorDef.from(95, 158, 160).getRgb());
    assert.equal(cadetBlue.toRgbString(), "rgb(95,158,160)");
    assert.equal(cadetBlue.tbgr, new ColorDef("cadetblue").tbgr, "Expect case insensitive compare");
    assert.equal(cadetBlue.getRgb(), new ColorDef("cadetBlue").getRgb());
  });

  it("ColorDef should compare properly", () => {
    const color1 = ColorDef.from(1, 2, 3, 0);
    const color2 = ColorDef.from(1, 2, 3);
    const color3 = ColorDef.from(0xa, 2, 3, 0);
    const blue = ColorDef.blue;

    assert.isTrue(color1.equals(color2), "color1 should equal color2");
    assert.isNotTrue(color1.equals(blue), "color1 should not equal blue");

    assert.equal(blue.tbgr, ColorByName.blue);
    assert.equal(blue.getRgb(), 0xff);
    assert.isTrue(blue.equals(new ColorDef(blue)));

    const colors = color3.colors;
    ColorDef.from(colors.r, colors.g, colors.b, 0x30, color3);
    assert.isTrue(color3.equals(ColorDef.from(0xa, 2, 3, 0x30)));

    // cornflowerBlue: 0xED9564,
    const cfg = new ColorDef(ColorByName.cornflowerBlue);
    assert.isTrue(cfg.equals(ColorDef.from(0x64, 0x95, 0xed)));

    const yellow = new ColorDef("yellow");
    const yellow2 = new ColorDef(ColorByName.yellow);
    assert.isTrue(yellow.equals(yellow2));
    assert.equal(yellow.name, "yellow");
    assert.isUndefined(color1.name, "no color name");

    const yellow3 = new ColorDef("#FFFF00");
    assert.isTrue(yellow.equals(yellow3));
    let yellow4 = new ColorDef("rgbA(255,255,0,100%)");
    assert.isTrue(yellow.equals(yellow4));
    yellow4 = new ColorDef("rgb(255,255,0)");
    assert.isTrue(yellow.equals(yellow4));
    yellow4 = new ColorDef("Yellow"); // wrong case, should still work
    assert.isTrue(yellow.equals(yellow4));
    let yellow5 = new ColorDef("rgba(255,255,0,0.2)");
    assert.equal(yellow5.toRgbaString(), "rgba(255,255,0,0.2)");
    assert.isTrue(yellow.getRgb() === yellow5.getRgb());
    assert.equal(51, yellow5.getAlpha(), "Alpha from rgba");
    assert.equal(204, yellow5.getTransparency(), "transparency from rgba");

    yellow5 = new ColorDef("rgba(100%,100%, 0%, 20%)");
    assert.isTrue(yellow.getRgb() === yellow5.getRgb());
    assert.equal(51, yellow5.getAlpha(), "Alpha from rgba");

    const t1 = new ColorDef("rgba(10% 10% 10% / 90%)").colors;
    assert.equal(25, t1.r);
    assert.equal(25, t1.g);
    assert.equal(25, t1.b);
    assert.equal(25, t1.t);

    const str = yellow.toHexString();
    assert.equal(str, "#ffff00");
    const str2 = yellow.toRgbString();
    assert.equal(str2, "rgb(255,255,0)");
    yellow4 = new ColorDef(str);
    assert.isTrue(yellow.equals(yellow4));
    yellow4 = new ColorDef(str2);
    assert.isTrue(yellow.equals(yellow4));
    const hsl = yellow.toHSL();
    yellow4 = hsl.toColorDef();
    assert.isTrue(yellow.equals(yellow4));

    color1.tbgr = 0x123456; // no transparency
    assert.equal(color1.tbgr, 0x123456);

    color1.tbgr = 0xf0123456; // make sure this works if high-bit is set
    assert.equal(color1.tbgr, 0xf0123456);

    color1.tbgr = 0xff00000000; // try it with a number bigger than 32 bits
    assert.equal(color1.tbgr, 0); // should get truncated

    color1.tbgr = 1.1;
    assert.equal(color1.tbgr, 1); // should get rounded down

    let t2 = new ColorDef("hsla(180, 50%, 50%, .2)").colors;
    assert.equal(64, t2.r);
    assert.equal(191, t2.g);
    assert.equal(191, t2.b);
    assert.equal(204, t2.t);

    t2 = new ColorDef("hsl(180, 50%, 50%)").colors;
    assert.equal(64, t2.r);
    assert.equal(191, t2.g);
    assert.equal(191, t2.b);
    assert.equal(0, t2.t);

    t2 = new ColorDef("hsl(0, 0%, 97%)").colors; // s===0 is a special case
    assert.equal(247, t2.r);
    assert.equal(247, t2.g);
    assert.equal(247, t2.b);
    assert.equal(0, t2.t);
  });
});
