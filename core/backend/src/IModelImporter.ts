/*---------------------------------------------------------------------------------------------
* Copyright (c) 2018 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import { Id64String, Id64 } from "@bentley/bentleyjs-core";
import { CreateIModelProps, SpatialViewDefinitionProps } from "@bentley/imodeljs-common";
import { IModelDb } from "./IModelDb";
import { ViewDefinition, OrthographicViewDefinition } from "./ViewDefinition";
import { Range3d, StandardViewIndex, Matrix3d, YawPitchRollAngles, Transform } from "@bentley/geometry-core";

/**
 * DEPRECATED - methods have been or will be distributed as static insert methods on the relevant classes.
 * @private
 */
export abstract class IModelImporter {
  /** The iModel created by this importer. */
  public iModelDb: IModelDb;
  /**
   * Construct a new IModelImporter
   * @param iModelFileName the output iModel file name
   * @param iModelProps props to use when creating the iModel
   */
  protected constructor(iModelFileName: string, iModelProps: CreateIModelProps) {
    this.iModelDb = IModelDb.createStandalone(iModelFileName, iModelProps);
  }
  /** Subclass of Importer should implement this method to perform the actual import. */
  public abstract import(): void;
  /** */
  public insertOrthographicView(viewName: string, definitionModelId: Id64String, modelSelectorId: Id64String, categorySelectorId: Id64String, displayStyleId: Id64String, range: Range3d, standardView = StandardViewIndex.Iso): Id64String {
    const rotation = Matrix3d.createStandardWorldToView(standardView);
    const angles = YawPitchRollAngles.createFromMatrix3d(rotation);
    const rotationTransform = Transform.createOriginAndMatrix(undefined, rotation);
    const rotatedRange = rotationTransform.multiplyRange(range);
    const viewOrigin = rotation.multiplyTransposeXYZ(rotatedRange.low.x, rotatedRange.low.y, rotatedRange.low.z);
    const viewExtents = rotatedRange.diagonal();

    const viewDefinitionProps: SpatialViewDefinitionProps = {
      classFullName: OrthographicViewDefinition.classFullName,
      model: IModelDb.dictionaryId,
      code: ViewDefinition.createCode(this.iModelDb, definitionModelId, viewName),
      modelSelectorId,
      categorySelectorId,
      displayStyleId,
      origin: viewOrigin,
      extents: viewExtents,
      angles,
      cameraOn: false,
      camera: { eye: [0, 0, 0], lens: 0, focusDist: 0 }, // not used when cameraOn === false
    };
    return this.iModelDb.elements.insertElement(viewDefinitionProps);
  }
  public setDefaultViewId(viewId: Id64String) {
    const spec = { namespace: "dgn_View", name: "DefaultView" };
    const blob32 = new Uint32Array(2);

    blob32[0] = Id64.getLowerUint32(viewId);
    blob32[1] = Id64.getUpperUint32(viewId);
    const blob8 = new Uint8Array(blob32.buffer);
    this.iModelDb.saveFileProperty(spec, undefined, blob8);
  }
}
