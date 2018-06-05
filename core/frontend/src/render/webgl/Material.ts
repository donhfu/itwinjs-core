/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
/** @module WebGL */

import { ColorDef, RenderMaterial } from "@bentley/imodeljs-common";

export class Material extends RenderMaterial {
  public static readonly material: Material = new Material(RenderMaterial.Params.defaults);

  public readonly color?: ColorDef;
  public readonly specularColor?: ColorDef;
  public readonly reflectColor?: ColorDef;
  public readonly alpha?: number;
  public readonly specularExponent: number;
  public readonly textureWeight?: number;
  public readonly weights: Float32Array;  // [diffuse weight, specular weight, reflect]

  public constructor(materialParams: RenderMaterial.Params) {
    super(materialParams);
    if (materialParams.diffuseColor) {
      this.color = ColorDef.from(materialParams.diffuseColor.colors.r / 255, materialParams.diffuseColor.colors.g / 255, materialParams.diffuseColor.colors.b / 255);
    }
    if (materialParams.specularColor) {
      this.specularColor = ColorDef.from(materialParams.specularColor.colors.r / 255, materialParams.specularColor.colors.g / 255, materialParams.specularColor.colors.b / 255);
    }
    if (materialParams.reflectColor) {
      this.specularColor = ColorDef.from(materialParams.reflectColor.colors.r / 255, materialParams.reflectColor.colors.g / 255, materialParams.reflectColor.colors.b / 255);
    }
    if (materialParams.textureMapping) {
      this.textureWeight = materialParams.textureMapping.params.weight;
    }
    this.weights = new Float32Array([materialParams.diffuse, materialParams.specular, materialParams.reflect]);
    this.specularExponent = materialParams.specularExponent;
    if (materialParams.transparency > 0) {
      this.alpha = 1 - materialParams.transparency;
    }
  }
}

Object.freeze(Material.material);
