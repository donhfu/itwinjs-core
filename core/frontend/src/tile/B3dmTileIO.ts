/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
/** @module Tile */
import { TileIO } from "./TileIO";
import { GltfTileIO } from "./GltfTileIO";
import { DisplayParams } from "../render/primitives/DisplayParams";
import { ElementAlignedBox3d, ColorDef, LinePixels, FillFlags, FeatureTable, Feature } from "@bentley/imodeljs-common";
import { RenderSystem } from "../render/System";
import { GeometricModelState } from "../ModelState";
import { ColorMap } from "../render/primitives/ColorMap";
import { Mesh } from "../render/primitives/mesh/MeshPrimitives";

/** Provides facilities for deserializing Batched 3D Model (B3dm) tiles.  */
export namespace B3dmTileIO {
  export class Header extends TileIO.Header {
    public readonly length: number;
    public readonly featureTableJsonLength: number;
    public readonly featureTableBinaryLength: number;
    public readonly batchTableJsonLength: number;
    public readonly batchTableBinaryLength: number;
    public get isValid(): boolean { return TileIO.Format.B3dm === this.format; }

    public constructor(stream: TileIO.StreamBuffer) {
      super(stream);
      this.length = stream.nextUint32;
      this.featureTableJsonLength = stream.nextUint32;
      this.featureTableBinaryLength = stream.nextUint32;
      this.batchTableJsonLength = stream.nextUint32;
      this.batchTableBinaryLength = stream.nextUint32;
      stream.advance(this.featureTableJsonLength);
      stream.advance(this.featureTableBinaryLength);
      stream.advance(this.batchTableJsonLength);
      stream.advance(this.batchTableBinaryLength);

      if (stream.isPastTheEnd)
        this.invalidate();
    }
  }

  /** Deserializes an B3DM tile. */
  export class Reader extends GltfTileIO.Reader {
    public static create(stream: TileIO.StreamBuffer, model: GeometricModelState, range: ElementAlignedBox3d, system: RenderSystem): Reader | undefined {
      const header = new Header(stream);
      if (!header.isValid)
        return undefined;

      const props = GltfTileIO.ReaderProps.create(stream);
      return undefined !== props ? new Reader(props, model, system, range) : undefined;
    }
    private constructor(props: GltfTileIO.ReaderProps, model: GeometricModelState, system: RenderSystem, private range: ElementAlignedBox3d) {
      super(props, model, system);
    }
    public read(): GltfTileIO.ReaderResult {
      const isLeaf = true;    // TBD...

      const featureTable: FeatureTable = new FeatureTable(1);
      const feature = new Feature();
      featureTable.insert(feature);

      return this.readGltfAndCreateGraphics(isLeaf, false, true, featureTable, this.range);
    }
    protected readFeatures(features: Mesh.Features, _json: any): boolean {
      const feature = new Feature();

      features.add(feature, 1);
      return true;
    }
    protected readColorTable(colorTable: ColorMap, _json: any): boolean | undefined {
      colorTable.insert(0x777777);
      return true;
    }
    protected createDisplayParams(json: any): DisplayParams | undefined {
      // Wip.
      if (json === undefined) { }
      const grey: ColorDef = new ColorDef(0x77777777);
      return new DisplayParams(DisplayParams.Type.Mesh, grey, grey, 1, LinePixels.Solid, FillFlags.Always, undefined, undefined, true);
    }
  }
}
