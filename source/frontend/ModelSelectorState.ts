/*---------------------------------------------------------------------------------------------
| $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
import { Id64, Id64Arg } from "@bentley/bentleyjs-core/lib/Id";
import { ElementState } from "./EntityState";
import { IModelConnection } from "./IModelConnection";
import { ModelSelectorProps } from "@bentley/imodeljs-common/lib/ViewProps";

/** A set of ids of GeometricModels for a SpatialViewDefinition. */
export class ModelSelectorState extends ElementState {
  /** the set of ModelIds of this ModelSelectorState */
  public readonly models = new Set<string>();
  constructor(props: ModelSelectorProps, iModel: IModelConnection) {
    super(props, iModel);
    if (props.models)
      props.models.forEach((model) => this.models.add(model));
  }

  /** Get the name of this ModelSelector */
  public get name(): string { return this.code.getValue(); }

  public toJSON(): ModelSelectorProps {
    const val: any = super.toJSON();
    val.models = [];
    this.models.forEach((model) => val.models.push(model));
    return val;
  }

  /** Add one or more models to this ModelSelectorState */
  public addModels(arg: Id64Arg): void { Id64.toIdSet(arg).forEach((id) => this.models.add(id)); }

  /** Drop one or more models from this ModelSelectorState */
  public dropModels(arg: Id64Arg): void { Id64.toIdSet(arg).forEach((id) => this.models.delete(id)); }

  /** Determine whether this ModelSelectorState includes the specified modelId value */
  public has(id: string): boolean { return this.models.has(id); }

  /** Determine whether this ModelSelectorState includes the specified modelId */
  public containsModel(modelId: Id64): boolean { return this.has(modelId.value); }

  /** Make sure all models referenced by this ModelSelectorState are loaded. */
  public load(): Promise<void> { return this.iModel.models.load(this.models); }
}
