/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/

import { TileIO } from "./TileIO";
import { DisplayParams } from "../render/primitives/DisplayParams";
import { Triangle } from "../render/primitives/primitives";
import { Mesh } from "../render/primitives/mesh/MeshPrimitives";
import { ColorMap } from "../render/primitives/ColorMap";
import { FeatureTable, QPoint3d, QPoint3dList, QParams3d, OctEncodedNormal, MeshPolylineList, MeshPolyline } from "@bentley/imodeljs-common";
import { Id64, assert, JsonUtils, StringUtils } from "@bentley/bentleyjs-core";
import { Range3d, Point2d, Point3d } from "@bentley/geometry-core";
import { RenderSystem } from "../render/System";
import { GeometricModelState } from "../ModelState";

/** Provides facilities for deserializing glTF tile data. */
export namespace GltfTileIO {
  /** Known version of the glTF format. */
  export const enum Versions {
    Version1 = 1,
    Version2 = 2,
    CurrentVersion = Version1,
    SceneFormat = 0,
  }

  /** Header preceding glTF tile data. */
  export class Header extends TileIO.Header {
    public readonly gltfLength: number;
    public readonly sceneStrLength: number;
    public readonly gltfSceneFormat: number;

    public constructor(stream: TileIO.StreamBuffer) {
      super(stream);
      this.gltfLength = stream.nextUint32;
      this.sceneStrLength = stream.nextUint32;
      this.gltfSceneFormat = stream.nextUint32;

      if ((Versions.Version1 !== this.version && Versions.Version2 !== this.version) || Versions.SceneFormat !== this.gltfSceneFormat)
        this.invalidate();
    }
  }

  export const enum PrimitiveType {
    Lines = 1,
    LineStrip = 3,
    Triangles = 4,
  }

  export const enum DataType {
    // SignedByte = 0x1400,
    UnsignedByte = 0x1401,
    // SignedShort = 5122,
    UnsignedShort = 5123,
    UInt32 = 5125,
    Float = 5126,
    // Rgb = 6407,
    // Rgba = 6408,
    // IntVec2 = 0x8b53,
    // IntVec3 = 0x8b54,
    // FloatVec2 = 35664,
    // FloatVec3 = 35665,
    // FloatVec4 = 35666,
    // FloatMat3 = 35675,
    // FloatMat4 = 35676,
    // Sampler2d = 35678,
  }

  export const enum Constants {
    CullFace = 2884,
    DepthTest = 2929,
    Nearest = 0x2600,
    Linear = 9729,
    LinearMipmapLinear = 9987,
    ClampToEdge = 33071,
    ArrayBuffer = 34962,
    ElementArrayBuffer = 34963,
    FragmentShader = 35632,
    VertexShader = 35633,
  }

  export type DataBuffer = Uint8Array | Uint16Array | Uint32Array | Float32Array;

  /**
   * A chunk of binary data exposed as a typed array.
   * The count member indicates how many elements exist. This may be less than this.buffer.length due to padding added to the
   * binary stream to ensure correct alignment.
   */
  export class BufferData {
    public readonly buffer: DataBuffer;
    public readonly count: number;

    public constructor(buffer: DataBuffer, count: number) {
      this.buffer = buffer;
      this.count = count;
    }

    /**
     * Create a BufferData of the desired type. The actual type may differ from the desired type - for example, small 32-bit integers
     * may be represented as 8-bit or 16-bit integers instead.
     * If the actual data type is not convertible to the desired type, this function returns undefined.
     */
    public static create(bytes: Uint8Array, actualType: DataType, expectedType: DataType, count: number): BufferData | undefined {
      if (expectedType !== actualType) {
        // Some data is stored in smaller data types to save space if no values exceed the maximum of the smaller type.
        switch (expectedType) {
          case DataType.Float:
          case DataType.UnsignedByte:
            return undefined;
          case DataType.UnsignedShort:
            if (DataType.UnsignedByte !== actualType)
              return undefined;
            break;
          case DataType.UInt32:
            if (DataType.UnsignedByte !== actualType && DataType.UnsignedShort !== actualType)
              return undefined;
            break;
        }
      }

      const data = this.createDataBuffer(bytes, actualType);
      return undefined !== data ? new BufferData(data, count) : undefined;
    }

    private static createDataBuffer(bytes: Uint8Array, actualType: DataType): DataBuffer | undefined {
      // NB: Endianness of typed array data is determined by the 'platform byte order'. Actual data is always little-endian.
      // We are assuming little-endian platform. If we find a big-endian platform, we'll need to use a DataView instead.
      switch (actualType) {
        case DataType.UnsignedByte:
          return bytes;
        case DataType.UnsignedShort:
          return new Uint16Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 2);
        case DataType.UInt32:
          return new Uint32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
        case DataType.Float:
          return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
        default:
          return undefined;
      }
    }
  }

  /**
   * A view of a chunk of a tile's binary data containing an array of elements of a specific data type.
   * The count member indicates how many elements exist; this may be smaller than this.data.length.
   * The count member may also indicate the number of elements of a type containing more than one value of the
   * underlying type. For example, a buffer of 4 32-bit floating point 'vec2' elements will have a count of 4,
   * but its data member will contain 8 32-bit floating point values (2 per vec2).
   * The accessor member may contain additional JSON data specific to a particular buffer.
   */
  export class BufferView {
    public readonly data: Uint8Array;
    public readonly count: number;
    public readonly type: DataType;
    public readonly accessor: any;

    public get byteLength(): number { return this.data.length; }

    public constructor(data: Uint8Array, count: number, type: DataType, accessor: any) {
      this.data = data;
      this.count = count;
      this.type = type;
      this.accessor = accessor;
    }

    public toBufferData(desiredType: DataType): BufferData | undefined {
      return BufferData.create(this.data, this.type, desiredType, this.count);
    }
  }

  /** Data required for creating a Reader capable of deserializing glTF tile data. */
  export class ReaderProps {
    private constructor(public readonly buffer: TileIO.StreamBuffer,
      public readonly binaryData: Uint8Array,
      public readonly accessors: any,
      public readonly bufferViews: any,
      public readonly scene: any,
      public readonly meshes: any,
      public readonly materials: any) { }

    public static create(buffer: TileIO.StreamBuffer): ReaderProps | undefined {
      const header = new Header(buffer);
      if (!header.isValid)
        return undefined;

      const binaryData = new Uint8Array(buffer.arrayBuffer, buffer.curPos + header.sceneStrLength);

      const sceneStrData = buffer.nextBytes(header.sceneStrLength);
      const sceneStr = StringUtils.utf8ToString(sceneStrData);
      if (undefined === sceneStr)
        return undefined;

      try {
        const sceneValue = JSON.parse(sceneStr);
        const meshes = JsonUtils.asObject(sceneValue.meshes);
        const materialValues = JsonUtils.asObject(sceneValue.materials);
        const accessors = JsonUtils.asObject(sceneValue.accessors);
        const bufferViews = JsonUtils.asObject(sceneValue.bufferViews);

        if (undefined === materialValues || undefined === meshes || undefined === accessors || undefined === bufferViews)
          return undefined;

        return new ReaderProps(buffer, binaryData, accessors, bufferViews, sceneValue, meshes, materialValues);
      } catch (e) {
        return undefined;
      }
    }
  }

  /** Deserializes glTF tile data. */
  export class Reader {
    protected readonly buffer: TileIO.StreamBuffer;
    protected readonly accessors: any;
    protected readonly bufferViews: any;
    protected readonly meshes: any;
    protected readonly batchData: any;
    protected readonly materialValues: any;
    protected readonly textures: any;
    protected readonly namedTextures: any;
    protected readonly images: any;
    protected readonly binaryData: Uint8Array;
    protected readonly model: GeometricModelState;
    protected readonly system: RenderSystem;

    public get modelId(): Id64 { return this.model.id; }

    public static createGltfReader(buffer: TileIO.StreamBuffer, model: GeometricModelState, system: RenderSystem): Reader | undefined {
      const props = ReaderProps.create(buffer);
      return undefined !== props ? new Reader(props, model, system) : undefined;
    }

    public getBufferView(json: any, accessorName: string): BufferView | undefined {
      try {
        const accessorValue = JsonUtils.asString(json[accessorName]);
        const accessor = 0 < accessorValue.length ? JsonUtils.asObject(this.accessors[accessorValue]) : undefined;
        const bufferViewAccessorValue = undefined !== accessor ? JsonUtils.asString(accessor.bufferView) : "";
        const bufferView = 0 < bufferViewAccessorValue.length ? JsonUtils.asObject(this.bufferViews[bufferViewAccessorValue]) : undefined;

        if (undefined === bufferView || undefined === accessor)
          return undefined;

        const type = accessor.componentType as DataType;
        switch (type) {
          case DataType.UnsignedByte:
          case DataType.UnsignedShort:
          case DataType.UInt32:
          case DataType.Float:
            break;
          default:
            return undefined;
        }

        const offset = bufferView.byteOffset + accessor.byteOffset;
        const bytes = this.binaryData.subarray(offset, offset + bufferView.byteLength);
        return new BufferView(bytes, accessor.count as number, type, accessor);
      } catch (e) {
        return undefined;
      }
    }

    public readBufferData32(json: any, accessorName: string): BufferData | undefined { return this.readBufferData(json, accessorName, DataType.UInt32); }
    public readBufferData16(json: any, accessorName: string): BufferData | undefined { return this.readBufferData(json, accessorName, DataType.UnsignedShort); }
    public readBufferData8(json: any, accessorName: string): BufferData | undefined { return this.readBufferData(json, accessorName, DataType.UnsignedByte); }
    public readBufferDataFloat(json: any, accessorName: string): BufferData | undefined { return this.readBufferData(json, accessorName, DataType.Float); }

    protected constructor(props: ReaderProps, model: GeometricModelState, system: RenderSystem) {
      this.buffer = props.buffer;
      this.binaryData = props.binaryData;
      this.accessors = props.accessors;
      this.bufferViews = props.bufferViews;
      this.meshes = props.meshes;
      this.materialValues = props.materials;

      this.textures = props.scene.textures;
      this.images = props.scene.images;
      this.namedTextures = props.scene.namedTextures;

      this.model = model;
      this.system = system;
    }

    protected readBufferData(json: any, accessorName: string, type: DataType): BufferData | undefined {
      const view = this.getBufferView(json, accessorName);
      return undefined !== view ? view.toBufferData(type) : undefined;
    }

    protected readFeatureIndices(_json: any): number[] | undefined { return undefined; }
    protected readColorTable(_colorTable: ColorMap, _json: any): boolean | undefined { return false; }
    protected createDisplayParams(_json: any): DisplayParams | undefined { return undefined; }

    protected readGltf(geometry: TileIO.GeometryCollection): TileIO.ReadStatus {
      for (const meshKey of Object.keys(this.meshes)) {
        const meshValue = this.meshes[meshKey];
        const primitives = JsonUtils.asArray(meshValue.primitives);
        if (undefined === primitives)
          continue;

        for (const primitive of primitives) {
          const mesh = this.readMeshPrimitive(primitive, geometry.meshes.features);
          assert(undefined !== mesh);
          if (undefined !== mesh)
            geometry.meshes.push(mesh);
        }
      }

      return TileIO.ReadStatus.Success;
    }

    protected readMeshPrimitive(primitive: any, featureTable?: FeatureTable): Mesh | undefined {
      const materialName = JsonUtils.asString(primitive.material);
      const materialValue = 0 < materialName.length ? JsonUtils.asObject(this.materialValues[materialName]) : undefined;
      const displayParams = undefined !== materialValue ? this.createDisplayParams(materialValue) : undefined;
      if (undefined === displayParams)
        return undefined;

      const primitiveType = JsonUtils.asInt(primitive.type, Mesh.PrimitiveType.Mesh);
      const isPlanar = JsonUtils.asBool(primitive.isPlanar);
      const mesh = Mesh.create({
        displayParams,
        features: undefined !== featureTable ? new Mesh.Features(featureTable) : undefined,
        type: primitiveType,
        range: Range3d.createNull(),
        is2d: this.model.is2d,
        isPlanar,
      });

      if (!this.readVertices(mesh.points, primitive))
        return undefined;

      if (!this.readColorTable(mesh.colorMap, primitive))
        return undefined;

      const colorIndices = this.readColorIndices(primitive);
      if (undefined !== colorIndices)
        mesh.colors = colorIndices;
      else if (mesh.colorMap.length !== 1)
        return undefined;

      if (undefined !== mesh.features && !this.readFeatures(mesh.features, primitive))
        return undefined;

      switch (primitiveType) {
        case Mesh.PrimitiveType.Mesh: {
          if (!this.readMeshIndices(mesh, primitive))
            return undefined;

          if (!displayParams.ignoreLighting && !this.readNormals(mesh.normals, primitive.attributes, "NORMAL"))
            return undefined;

          this.readUVParams(mesh.uvParams, primitive.attributes, "TEXCOORD_0");
          // ###TODO: read mesh edges...
          break;
        }
        case Mesh.PrimitiveType.Polyline:
        case Mesh.PrimitiveType.Point: {
          if (undefined !== mesh.polylines)
            return undefined;
          if (!this.readPolylines(mesh.polylines!, primitive, "indices", Mesh.PrimitiveType.Point === primitiveType))
            return undefined;
        }
        default: {
          assert(false, "unhandled primitive type"); // ###TODO: points and polylines...
          return undefined;
        }
      }

      return mesh;
    }

    protected readVertices(positions: QPoint3dList, primitive: any): boolean {
      const view = this.getBufferView(primitive.attributes, "POSITION");
      if (undefined === view || DataType.UnsignedShort !== view.type)
        return false;

      const extensions = JsonUtils.asObject(view.accessor.extensions);
      const quantized = undefined !== extensions ? JsonUtils.asObject(extensions.WEB3D_quantized_attributes) : undefined;
      if (undefined === quantized)
        return false;

      const rangeMin = JsonUtils.asArray(quantized.decodedMin);
      const rangeMax = JsonUtils.asArray(quantized.decodedMax);
      if (undefined === rangeMin || undefined === rangeMax)
        return false;

      const buffer = view.toBufferData(DataType.UnsignedShort);
      if (undefined === buffer)
        return false;

      const qpt = QPoint3d.fromScalars(0, 0, 0);
      positions.reset(QParams3d.fromRange(Range3d.create(Point3d.create(rangeMin[0], rangeMin[1], rangeMin[2]), Point3d.create(rangeMax[0], rangeMax[1], rangeMax[2]))));
      for (let i = 0; i < view.count; i++) {
        const index = i * 3; // 3 uint16 per QPoint3d...
        qpt.setFromScalars(buffer.buffer[index], buffer.buffer[index + 1], buffer.buffer[index + 2]);
        positions.push(qpt);
      }

      return true;
    }

    protected readIndices(json: any, accessorName: string): number[] | undefined {
      const data = this.readBufferData32(json, accessorName);
      if (undefined === data)
        return undefined;

      const indices = [];
      for (let i = 0; i < data.count; i++)
        indices.push(data.buffer[i]);

      return indices;
    }

    protected readFeatures(features: Mesh.Features, json: any): boolean {
      const indices = this.readFeatureIndices(json);
      if (undefined === indices)
        return false;

      features.setIndices(indices);
      return true;
    }

    protected readColorIndices(json: any): Uint16Array | undefined {
      const data = this.readBufferData16(json.attributes, "_COLORINDEX");
      if (undefined === data)
        return undefined;

      const colors = new Uint16Array(data.count);
      for (let i = 0; i < data.count; i++)
        colors[i] = data.buffer[i];

      return colors;
    }

    protected readMeshIndices(mesh: Mesh, json: any): boolean {
      const data = this.readBufferData32(json, "indices");
      if (undefined === data)
        return false;

      assert(0 === data.count % 3);

      const triangle = new Triangle(false);

      for (let i = 0; i < data.count; i += 3) {
        triangle.setIndices(data.buffer[i], data.buffer[i + 1], data.buffer[i + 2]);
        mesh.addTriangle(triangle);
      }

      return true;
    }

    protected readNormals(normals: OctEncodedNormal[], json: any, accessorName: string): boolean {
      const data = this.readBufferData8(json, accessorName);
      if (undefined === data)
        return false;

      // ###TODO: we shouldn't have to allocate OctEncodedNormal objects...just use uint16s / numbers...
      for (let i = 0; i < data.count; i++) {
        // ###TODO? not clear why ray writes these as pairs of uint8...
        const index = i * 2;
        const normal = data.buffer[index] | (data.buffer[index + 1] << 8);
        normals.push(new OctEncodedNormal(normal));
      }

      return true;
    }

    protected readUVParams(params: Point2d[], json: any, accessorName: string): boolean {
      const data = this.readBufferDataFloat(json, accessorName);
      if (undefined === data)
        return false;

      for (let i = 0; i < data.count; i++) {
        const index = 2 * i; // 2 float per param...
        params.push(new Point2d(data.buffer[index], data.buffer[index + 1]));
      }

      return true;
    }

    protected readPolylines(polylines: MeshPolylineList, json: any, accessorName: string, disjoint: boolean): boolean {
      const view = this.getBufferView(json, accessorName);
      if (undefined === view)
        return false;

      const startDistance = new Float32Array(1);
      const sdBytes = new Uint8Array(startDistance);
      const numIndices = new Uint32Array(1);
      const niBytes = new Uint8Array(numIndices);
      const index16 = new Uint16Array(1);
      const i16Bytes = new Uint8Array(index16);
      const index32 = new Uint32Array(1);
      const i32Bytes = new Uint8Array(index32);

      let ndx = 0;
      for (let p = 0; p < view.count; ++p) {
        for (let b = 0; b < 4; ++b)
          sdBytes[b] = view.data[ndx++];
        for (let b = 0; b < 4; ++b)
          niBytes[b] = view.data[ndx++];

        if (!disjoint && numIndices[0] < 2)
          continue;

        const indices: number[] = new Array(numIndices[0]);

        if (DataType.UnsignedShort === view.type) {
          for (let i = 0; i < numIndices[0]; ++i) {
            for (let b = 0; b < 4; ++b)
              i16Bytes[b] = view.data[ndx++];
            indices[i] = index16[0];
          }
        } else if (DataType.UInt32 === view.type) {
          for (let i = 0; i < numIndices[0]; ++i) {
            for (let b = 0; b < 8; ++b)
              i32Bytes[b] = view.data[ndx++];
            indices[i] = index32[0];
          }
        }

        polylines.push(new MeshPolyline(startDistance[0], indices));
      }

      return true;
    }
  }
}
