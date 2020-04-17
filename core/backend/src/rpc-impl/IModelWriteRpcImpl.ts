/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module RpcInterface
 */
import { Id64, ClientRequestContext, Id64String, DbOpcode, assert, Id64Array, GuidString } from "@bentley/bentleyjs-core";
import { AuthorizedClientRequestContext } from "@bentley/itwin-client";
import { RpcInterface, RpcManager, IModelConnectionProps, IModelRpcProps, IModelWriteRpcInterface, ThumbnailProps, ImageSourceFormat, AxisAlignedBox3dProps, CodeProps, ElementProps, IModel, RelatedElement, SubCategoryAppearance, Code } from "@bentley/imodeljs-common";
import { BriefcaseDb, IModelDb, OpenParams } from "../IModelDb";
import { Range3d } from "@bentley/geometry-core";
import { ConcurrencyControl, AuthorizedBackendRequestContext, PhysicalPartition, SubjectOwnsPartitionElements, PhysicalModel, SpatialCategory, Element } from "../imodeljs-backend";
import { LockLevel, LockType } from "@bentley/imodelhub-client";

class EditingFunctions {
  public static async createAndInsertPartition(rqctx: AuthorizedBackendRequestContext, iModelDb: IModelDb, newModelCode: CodeProps): Promise<Id64String> {
    assert(Code.isValid(newModelCode));
    const modeledElementProps: ElementProps = {
      classFullName: PhysicalPartition.classFullName,
      parent: new SubjectOwnsPartitionElements(IModel.rootSubjectId),
      model: IModel.repositoryModelId,
      code: newModelCode,
    };
    const modeledElement: Element = iModelDb.elements.createElement(modeledElementProps);
    if (iModelDb.isBriefcaseDb()) {
      await iModelDb.concurrencyControl.requestResources(rqctx, [{ element: modeledElement, opcode: DbOpcode.Insert }]);
      rqctx.enter();
    }
    return iModelDb.elements.insertElement(modeledElement);
  }

  public static async createAndInsertPhysicalModel(rqctx: AuthorizedBackendRequestContext, iModelDb: IModelDb, modeledElementRef: RelatedElement, privateModel: boolean = false): Promise<Id64String> {
    const newModel = iModelDb.models.createModel({ modeledElement: modeledElementRef, classFullName: PhysicalModel.classFullName, isPrivate: privateModel });
    if (iModelDb.isBriefcaseDb()) {
      await iModelDb.concurrencyControl.requestResources(rqctx, [], [{ model: newModel, opcode: DbOpcode.Insert }]);
      rqctx.enter();
    }
    return iModelDb.models.insertModel(newModel);
  }

  public static async createAndInsertPhysicalPartitionAndModel(rqctx: AuthorizedBackendRequestContext, iModelDb: IModelDb, newModelCode: CodeProps, privateModel: boolean = false): Promise<Id64String> {
    const eid = await this.createAndInsertPartition(rqctx, iModelDb, newModelCode);
    rqctx.enter();
    const modeledElementRef = new RelatedElement({ id: eid });
    const mid = await this.createAndInsertPhysicalModel(rqctx, iModelDb, modeledElementRef, privateModel);
    rqctx.enter();
    assert(mid === eid);
    return eid;
  }

  public static async createAndInsertSpatialCategory(rqctx: AuthorizedBackendRequestContext, iModelDb: IModelDb, scopeModelId: Id64String, categoryName: string, appearance: SubCategoryAppearance.Props): Promise<Id64String> {
    const category = SpatialCategory.create(iModelDb, scopeModelId, categoryName);
    if (iModelDb.isBriefcaseDb()) {
      await iModelDb.concurrencyControl.requestResources(rqctx, [{ element: category, opcode: DbOpcode.Insert }]);
      rqctx.enter();
    }
    const categoryId = iModelDb.elements.insertElement(category);
    category.setDefaultAppearance(appearance);
    return categoryId;
  }
}

/**
 * The backend implementation of IModelWriteRpcInterface.
 * @internal
 */
export class IModelWriteRpcImpl extends RpcInterface implements IModelWriteRpcInterface {
  public static register() { RpcManager.registerImpl(IModelWriteRpcInterface, IModelWriteRpcImpl); }

  public async openForWrite(tokenProps: IModelRpcProps): Promise<IModelConnectionProps> {
    const requestContext = ClientRequestContext.current as AuthorizedClientRequestContext;
    const openParams: OpenParams = OpenParams.pullAndPush();
    openParams.timeout = 1000;
    const db = await BriefcaseDb.open(requestContext, tokenProps.contextId!, tokenProps.iModelId!, openParams);
    return db.getConnectionProps();
  }

  public async saveChanges(tokenProps: IModelRpcProps, description?: string): Promise<void> {
    IModelDb.findByKey(tokenProps.key).saveChanges(description);
  }

  public async hasUnsavedChanges(tokenProps: IModelRpcProps): Promise<boolean> {
    return IModelDb.findByKey(tokenProps.key).txns.hasUnsavedChanges;
  }

  public async hasPendingTxns(tokenProps: IModelRpcProps): Promise<boolean> {
    return IModelDb.findByKey(tokenProps.key).txns.hasPendingTxns;
  }

  public async getParentChangeset(tokenProps: IModelRpcProps): Promise<string> {
    return BriefcaseDb.findByKey(tokenProps.key).briefcase.parentChangeSetId;
  }

  public async updateProjectExtents(tokenProps: IModelRpcProps, newExtents: AxisAlignedBox3dProps): Promise<void> {
    IModelDb.findByKey(tokenProps.key).updateProjectExtents(Range3d.fromJSON(newExtents));
  }

  public async saveThumbnail(tokenProps: IModelRpcProps, val: Uint8Array): Promise<void> {
    const int32Val = new Uint32Array(val.buffer, 0, 6);
    const props: ThumbnailProps = { format: int32Val[1] === ImageSourceFormat.Jpeg ? "jpeg" : "png", width: int32Val[2], height: int32Val[3], image: new Uint8Array(val.buffer, 24, int32Val[0]) };
    const id = Id64.fromLocalAndBriefcaseIds(int32Val[4], int32Val[5]);
    if (!Id64.isValid(id) || props.width === undefined || props.height === undefined || props.image.length <= 0)
      return Promise.reject(new Error("bad args"));

    if (0 !== IModelDb.findByKey(tokenProps.key).views.saveThumbnail(id, props))
      return Promise.reject(new Error("failed to save thumbnail"));

    return Promise.resolve();
  }

  public async lockModel(tokenProps: IModelRpcProps, modelId: Id64String, level: LockLevel): Promise<void> {
    const iModelDb = BriefcaseDb.findByKey(tokenProps.key);
    const requestContext = ClientRequestContext.current as AuthorizedClientRequestContext;
    const request = new ConcurrencyControl.Request();
    request.addLocks([{ type: LockType.Model, objectId: modelId, level }]);
    return iModelDb.concurrencyControl.request(requestContext, request);
  }

  public async synchConcurrencyControlResourcesCache(tokenProps: IModelRpcProps): Promise<void> {
    const iModelDb = BriefcaseDb.findByKey(tokenProps.key);
    const requestContext = ClientRequestContext.current as AuthorizedClientRequestContext;
    return iModelDb.concurrencyControl.syncCache(requestContext);
  }

  public async pullMergePush(tokenProps: IModelRpcProps, comment: string, doPush: boolean): Promise<GuidString> {
    const iModelDb = BriefcaseDb.findByKey(tokenProps.key);
    const requestContext = ClientRequestContext.current as AuthorizedClientRequestContext;
    await iModelDb.pullAndMergeChanges(requestContext);
    requestContext.enter();
    const parentChangeSetId = iModelDb.briefcase.parentChangeSetId;
    if (doPush)
      await iModelDb.pushChanges(requestContext, comment);
    return parentChangeSetId;
  }

  public async doConcurrencyControlRequest(tokenProps: IModelRpcProps): Promise<void> {
    const requestContext = ClientRequestContext.current as AuthorizedClientRequestContext;
    const iModelDb = BriefcaseDb.findByKey(tokenProps.key);
    const rqctx = new AuthorizedBackendRequestContext(requestContext.accessToken);
    return iModelDb.concurrencyControl.request(rqctx);
  }

  public async getModelsAffectedByWrites(tokenProps: IModelRpcProps): Promise<Id64String[]> {
    const iModelDb = BriefcaseDb.findByKey(tokenProps.key);
    return iModelDb.concurrencyControl.modelsAffectedByWrites;
  }

  public async deleteElements(tokenProps: IModelRpcProps, ids: Id64Array) {
    const iModelDb = IModelDb.findByKey(tokenProps.key);
    ids.forEach((id) => iModelDb.elements.deleteElement(id));
  }

  public async requestResources(tokenProps: IModelRpcProps, elementIds: Id64Array, modelIds: Id64Array, opcode: DbOpcode): Promise<void> {
    const requestContext = ClientRequestContext.current as AuthorizedClientRequestContext;
    const iModelDb = BriefcaseDb.findByKey(tokenProps.key);
    const elements = elementIds.map((id: string) => ({ element: iModelDb.elements.getElement(id), opcode }));
    const models = modelIds.map((id: string) => ({ model: iModelDb.models.getModel(id), opcode }));
    return iModelDb.concurrencyControl.requestResources(requestContext, elements, models);
  }

  public async createAndInsertPhysicalModel(tokenProps: IModelRpcProps, newModelCode: CodeProps, privateModel: boolean): Promise<Id64String> {
    const iModelDb = IModelDb.findByKey(tokenProps.key);
    return EditingFunctions.createAndInsertPhysicalPartitionAndModel(ClientRequestContext.current as AuthorizedClientRequestContext, iModelDb, newModelCode, privateModel);
  }

  public async createAndInsertSpatialCategory(tokenProps: IModelRpcProps, scopeModelId: Id64String, categoryName: string, appearance: SubCategoryAppearance.Props): Promise<Id64String> {
    const iModelDb = IModelDb.findByKey(tokenProps.key);
    return EditingFunctions.createAndInsertSpatialCategory(ClientRequestContext.current as AuthorizedClientRequestContext, iModelDb, scopeModelId, categoryName, appearance);
  }
}
