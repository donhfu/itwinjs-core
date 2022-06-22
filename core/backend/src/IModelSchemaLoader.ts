/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/

import { IModelStatus } from "@itwin/core-bentley";
import { IModelError } from "@itwin/core-common";
import { IModelJsNative } from "@bentley/imodeljs-native";
import { IModelDb } from "./IModelDb";
import type { ISchemaLocater as ISchemaLocaterType, Schema as SchemaType } from "@itwin/ecschema-metadata";

/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-var-requires  */

let Schema: any;
let SchemaContext: any;
let SchemaKey: any;
let SchemaMatchType: any;
let ECVersion: any;

/** The ecschema-metadata package is now an optional dependency. If the package
 * has not been installed, the exception is caught below. All the types will be
 * undefined, and an exception is throw in the IModelSchemaLoader constructor.
 */
function loadMetadata(): boolean {
  try {
    const metadata = require("@itwin/ecschema-metadata");
    Schema = metadata.Schema;
    SchemaContext = metadata.SchemaContext;
    SchemaKey = metadata.SchemaKey;
    SchemaMatchType = metadata.SchemaMatchType;
    ECVersion = metadata.ECVersion;
    return true;
  } catch {
    return false;
  }
}

/**
 * A utility class for retrieving EC Schema objects from an iModel. Loaded schemas are held in memory within
 * a schema context managed by IModelSchemaLoader. The IModelSchemaLoader object should be held in memory if
 * multiple calls to [[getSchema]] or [[tryGetSchema]] is a possibility, thereby avoiding unnecessary schema
 * retrievals from an iModel.
 * @alpha
 */
export class IModelSchemaLoader {
  private _context: typeof SchemaContext;

  /** @internal */
  public constructor(private _iModel: IModelDb) {
    // If the ecschema-metadata package was not installed inform the caller.
    if (!loadMetadata())
      throw new IModelError(IModelStatus.NotFound, "IModelSchemaLoader requires that @bentley/ecschema-metadata be installed.");

    this._context = new SchemaContext();
    const locater = new IModelSchemaLocater(this._iModel);
    this._context.addLocater(locater);
  }

  /** Get a schema by name
   * @param schemaName a string with the name of the schema to load.
   * @throws [IModelError]($common) if the schema is not found or cannot be loaded.
   */
  public getSchema<T extends SchemaType>(schemaName: string): T {
    const schema = this.tryGetSchema(schemaName);
    if (!schema)
      throw new IModelError(IModelStatus.NotFound, `reading schema=${schemaName}`);

    return schema as T;
  }

  /** Attempts to get a schema by name
   * @param schemaName a string with the name of the schema to load.
   * @throws [IModelError]($common) if the schema exists, but cannot be loaded.
   */
  public tryGetSchema<T extends SchemaType>(schemaName: string): T | undefined {
    // SchemaKey version is not used when locating schema in an iModel, so the version is arbitrary.
    const key = new SchemaKey(schemaName, new ECVersion(1, 0, 0));
    const schema = this._context.getSchemaSync(key, SchemaMatchType.Latest);
    return schema as T;
  }
}

/**
 * A private ISchemaLocater implementation for locating and retrieving EC Schema objects from an iModel
 * @alpha
 */
class IModelSchemaLocater implements ISchemaLocaterType {
  /** @internal */
  public constructor(private _iModel: IModelDb) { }

  /** Get a schema by [SchemaKey]
   * @param schemaKey The [SchemaKey] that identifies the schema.
   * @param matchType The [SchemaMatchType] to used for comparing schema versions.
   * @param context The [SchemaContext] used to facilitate schema location.
   * @throws [IModelError]($common) if the schema exists, but cannot be loaded.
   */
  public async getSchema<T extends SchemaType>(schemaKey: typeof SchemaKey, matchType: typeof SchemaMatchType, context?: typeof SchemaContext | undefined): Promise<T | undefined> {
    return await this.getSchemaAsync(schemaKey, matchType, context) as T;
  }

  /** Get a schema by [SchemaKey] synchronously.
   * @param schemaKey The [SchemaKey] that identifies the schema.
   * * @param matchType The [SchemaMatchType] to used for comparing schema versions.
   * @param context The [SchemaContext] used to facilitate schema location.
   * @throws [IModelError]($common) if the schema exists, but cannot be loaded.
   */
  public getSchemaSync<T extends SchemaType>(schemaKey: typeof SchemaKey, _matchType: typeof SchemaMatchType, context?: typeof SchemaContext | undefined): T | undefined {
    const schemaProps = this.getSchemaString(schemaKey.name);
    if (!schemaProps)
      return undefined;

    context = context ? context : new SchemaContext();
    return Schema.fromJsonSync(schemaProps, context) as T;
  }

  /** Get a schema by [SchemaKey] asynchronously.
   * @param schemaKey The [SchemaKey] that identifies the schema.
   * * @param matchType The [SchemaMatchType] to used for comparing schema versions.
   * @param context The [SchemaContext] used to facilitate schema location.
   * @throws [IModelError]($common) if the schema exists, but cannot be loaded.
   */
  public async getSchemaAsync<T extends SchemaType>(schemaKey: typeof SchemaKey, _matchType: typeof SchemaMatchType, context?: typeof SchemaContext | undefined): Promise<T | undefined> {
    const schemaProps = await this.getSchemaStringAsync(schemaKey.name);
    if (!schemaProps)
      return undefined;

    context = context ? context : new SchemaContext();
    return Schema.fromJsonSync(schemaProps, context) as T;
  }

  /** Read schema data from the iModel as JSON string
   * @param schemaName A string with the name of the schema to load.
   * @returns A string with the JSON for the schema or `undefined` if the schema is not found.
   * @throws [IModelError]($common) if the schema exists, but cannot be loaded.
   */
  private getSchemaString(schemaName: string): string | undefined {
    const val: IModelJsNative.ErrorStatusOrResult<any, any> = this._iModel.nativeDb.getSchema(schemaName);
    if (undefined !== val.error) {
      if (IModelStatus.NotFound === val.error.status) {
        return undefined;
      }
      throw new IModelError(val.error.status, `reading schema=${schemaName}`);
    }
    return val.result;
  }

  /** Read schema data from the iModel as JSON string
   * @param schemaName A string with the name of the schema to load.
   * @returns A string with the JSON for the schema or `undefined` if the schema is not found.
   * @throws [IModelError]($common) if the schema exists, but cannot be loaded.
   */
  private async getSchemaStringAsync(schemaName: string): Promise<string | undefined> {
    const val = await new Promise<IModelJsNative.ErrorStatusOrResult<any, string>>((resolve) => {
      this._iModel.nativeDb.getSchemaAsync(schemaName, resolve);
    });

    if (undefined !== val.error) {
      if (IModelStatus.NotFound === val.error.status) {
        return undefined;
      }
      throw new IModelError(val.error.status, `reading schema=${schemaName}`);
    }
    return val.result;
  }
}
