/*---------------------------------------------------------------------------------------------
* Copyright (c) 2018 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module IModelHost */

import { BeEvent } from "@bentley/bentleyjs-core";
import { IModelClient, Config, UrlDiscoveryClient } from "@bentley/imodeljs-clients";
import { BentleyStatus, IModelError, FeatureGates } from "@bentley/imodeljs-common";
import * as path from "path";
import { IModelReadRpcImpl } from "./rpc-impl/IModelReadRpcImpl";
import { IModelTileRpcImpl } from "./rpc-impl/IModelTileRpcImpl";
import { IModelWriteRpcImpl } from "./rpc-impl/IModelWriteRpcImpl";
import { StandaloneIModelRpcImpl } from "./rpc-impl/StandaloneIModelRpcImpl";
import { IModelUnitTestRpcImpl } from "./rpc-impl/IModelUnitTestRpcImpl";
import { WipRpcImpl } from "./rpc-impl/WipRpcImpl";
import { KnownLocations } from "./Platform";
import { BisCore } from "./BisCore";
import { NativePlatformRegistry } from "./NativePlatformRegistry";
import { BriefcaseManager } from "./BriefcaseManager";
import { initializeRpcBackend } from "./RpcBackend";
import { Generic } from "./domains/Generic";
import { Functional } from "./domains/Functional";

/**
 * Configuration of imodeljs-backend.
 */
export class IModelHostConfiguration {
  /** The native platform to use -- normally, the app should leave this undefined. [[IModelHost.startup]] will set it to the appropriate nativePlatform automatically. */
  public nativePlatform?: any;

  private _briefcaseCacheDir: string = path.normalize(path.join(KnownLocations.tmpdir, "Bentley/IModelJs/cache/"));

  /** The path where the cache of briefcases are stored. Defaults to `path.join(KnownLocations.tmpdir, "Bentley/IModelJs/cache/iModels/")` */
  public get briefcaseCacheDir(): string {
    return this._briefcaseCacheDir;
  }
  public set briefcaseCacheDir(cacheDir: string) {
    this._briefcaseCacheDir = path.normalize(cacheDir.replace(/\/?$/, path.sep));
  }

  /** The directory where the app's assets are found */
  public appAssetsDir?: string;

  /** The kind of iModel server to use. Defaults to iModelHubClient */
  public imodelClient?: IModelClient;
}

/**
 * IModelHost initializes ($backend) and captures its configuration. A backend must call [[IModelHost.startup]] before using any backend classes.
 * See [the learning article]($docs/learning/backend/IModelHost.md)
 */
export class IModelHost {
  public static configuration?: IModelHostConfiguration;
  /** Event raised just after the backend IModelHost was started up */
  public static readonly onAfterStartup = new BeEvent<() => void>();

  /** Event raised just before the backend IModelHost is to be shut down */
  public static readonly onBeforeShutdown = new BeEvent<() => void>();

  /** @hidden */
  public static readonly features = new FeatureGates();

  private static _backendVersion?: string;

  /** This method must be called before any iModel.js services are used.
   * @param configuration Host configuration data.
   * Raises [[onAfterStartup]].
   * @see [[shutdown]].
   */
  public static startup(configuration: IModelHostConfiguration = new IModelHostConfiguration()) {
    if (IModelHost.configuration)
      throw new IModelError(BentleyStatus.ERROR, "startup may only be called once");

    initializeRpcBackend();

    const region: number = Config.App.getNumber(UrlDiscoveryClient.configResolveUrlUsingRegion, 0);
    if (!NativePlatformRegistry.isNativePlatformLoaded) {
      if (configuration.nativePlatform !== undefined)
        NativePlatformRegistry.register(configuration.nativePlatform, region);
      else
        NativePlatformRegistry.loadAndRegisterStandardNativePlatform(region);
    }

    if (configuration.imodelClient)
      BriefcaseManager.imodelClient = configuration.imodelClient;

    IModelReadRpcImpl.register();
    IModelTileRpcImpl.register();
    IModelWriteRpcImpl.register();
    StandaloneIModelRpcImpl.register();
    IModelUnitTestRpcImpl.register();
    WipRpcImpl.register();

    BisCore.registerSchema();
    Generic.registerSchema();
    Functional.registerSchema();

    IModelHost.configuration = configuration;
    IModelHost.onAfterStartup.raiseEvent();
  }

  /** This method must be called when an iModel.js services is shut down. Raises [[onBeforeShutdown]] */
  public static shutdown() {
    if (!IModelHost.configuration)
      return;
    IModelHost.onBeforeShutdown.raiseEvent();
    IModelHost.configuration = undefined;
  }

  /** The directory where the app's assets may be found */
  public static get appAssetsDir(): string | undefined {
    return (IModelHost.configuration === undefined) ? undefined : IModelHost.configuration.appAssetsDir;
  }

  public static get backendVersion(): string {
    if (IModelHost._backendVersion === undefined) {
      // tslint:disable-next-line:no-var-requires
      const backendVersion: any = require("../package.json").version;
      if (!backendVersion || typeof (backendVersion) !== "string")
        throw new Error("Could not read version of imodeljs-backend from package.json.");

      IModelHost._backendVersion = backendVersion;
    }

    return IModelHost._backendVersion;
  }
}
