/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { app, BrowserWindow, BrowserWindowConstructorOptions, protocol } from "electron";
import * as fs from "fs";
import * as path from "path";
import { BeDuration } from "@bentley/bentleyjs-core";
import { DesktopAuthorizationClientIpc } from "./DesktopAuthorizationClientIpc";

/**
 * A helper class that simplifies the creation of basic single-window desktop applications
 * that follow platform-standard window behavior on all platforms.
 * @beta
 */
export abstract class StandardElectronManager {
  private _mainWindow?: BrowserWindow;
  protected get _defaultWindowOptions(): BrowserWindowConstructorOptions { return {}; }

  private openMainWindow(options: BrowserWindowConstructorOptions = {}) {
    const opts: BrowserWindowConstructorOptions = {
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, "./ElectronPreload.js"),
        nodeIntegration: false,
        experimentalFeatures: false,
        enableRemoteModule: true,
        contextIsolation: true,
        sandbox: true,
      },
      ...this._defaultWindowOptions, // override defaults
      ...options, // overrides everything above
    };

    this._mainWindow = new BrowserWindow(opts);
    this._mainWindow.on("closed", () => this._mainWindow = undefined);
    this._mainWindow.loadURL(this.frontendURL); // eslint-disable-line @typescript-eslint/no-floating-promises
  }

  /** The URL the main BrowserWindow should load on application initialization. */
  public abstract get frontendURL(): string;

  /** The "main" BrowserWindow for this application. */
  public get mainWindow() { return this._mainWindow; }

  /**
   * Once electron is "ready", initializes the application by:
   *   - Creating the main BrowserWindow.
   *   - Opening the frontend in the main BrowserWindow.
   *   - Defining some platform-standard window behavior.
   *      - Basically, closing all windows should quit the application on platforms other that MacOS.
   * @param windowOptions Options for constructing the main BrowserWindow.  See: https://electronjs.org/docs/api/browser-window#new-browserwindowoptions
   */
  public async initialize(windowOptions?: BrowserWindowConstructorOptions): Promise<void> {
    // quit the application when all windows are closed (unless we're running on MacOS)
    app.on("window-all-closed", () => {
      if (process.platform !== "darwin")
        app.quit();
    });

    // re-open the main window if it was closed and the app is re-activated (this is the normal MacOS behavior)
    app.on("activate", () => {
      if (!this._mainWindow)
        this.openMainWindow(windowOptions);
    });

    if (!app.isReady())
      await new Promise((resolve) => app.on("ready", resolve));

    this.openMainWindow(windowOptions);

    // Setup handlers for IPC calls to support Authorization
    DesktopAuthorizationClientIpc.initializeIpc(this.mainWindow!);
  }
}

/**
 * A StandardElectronManager that adds some reasonable defaults for iModel.js applications.
 * @beta
 */
export class IModelJsElectronManager extends StandardElectronManager {
  private readonly _webResourcesPath: string;
  private readonly _electronFrontend = "electron://frontend/";
  public frontendURL: string;
  public appIconPath: string;

  constructor(webResourcesPath: string = `${__dirname}/`) {
    super();
    this._webResourcesPath = webResourcesPath;

    // In production builds, load the built frontend assets directly from the filesystem.
    this.frontendURL = `${this._electronFrontend}index.html`;
    this.appIconPath = this.parseElectronUrl(`${this._electronFrontend}appicon.ico`);
  }

  /**
   * Converts an "electron://frontend/" URL to an absolute file path.
   *
   * We use this protocol in production builds because our frontend must be built with absolute URLs,
   * however, since we're loading everything directly from the install directory, we cannot know the
   * absolute path at build time.
   */
  private parseElectronUrl(requestedUrl: string): string {
    // Note that the "frontend/" path is arbitrary - this is just so we can handle *some* relative URLs...
    let assetPath = requestedUrl.substr(this._electronFrontend.length);
    if (assetPath.length === 0)
      assetPath = "index.html";
    assetPath = assetPath.replace(/(#|\?).*$/, "");

    // NEEDS_WORK: Remove this after migration to DesktopAuthorizationClient
    assetPath = assetPath.replace("signin-callback", "index.html");
    assetPath = path.normalize(`${this._webResourcesPath}/${assetPath}`);

    // File protocols don't follow symlinks, so we need to resolve this to a real path.
    // However, if the file doesn't exist, it's fine to return an invalid path here - the request will just fail with net::ERR_FILE_NOT_FOUND
    try {
      assetPath = fs.realpathSync(assetPath);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn(`WARNING: Frontend requested "${requestedUrl}", but ${assetPath} does not exist`);
    }
    return assetPath;
  }

  protected get _defaultWindowOptions() {
    return {
      icon: this.appIconPath,
    };
  }

  public async initialize(windowOptions?: BrowserWindowConstructorOptions): Promise<void> {
    protocol.registerSchemesAsPrivileged([
      { scheme: "electron", privileges: { standard: true, secure: true } },
    ]);

    await new Promise((resolve) => app.on("ready", resolve));

    // Also handle any "electron://" requests and redirect them to "file://" URLs
    protocol.registerFileProtocol("electron", (request, callback) => callback(this.parseElectronUrl(request.url)));

    await super.initialize(windowOptions);
  }
}

/**
 * A StandardElectronManager that adds some reasonable defaults for applications built with @bentley/react-scripts running in "development" mode.
 * @beta
 */
export class WebpackDevServerElectronManager extends StandardElectronManager {
  public frontendURL: string;
  public appIconPath: string;

  constructor(frontendPort = 3000) {
    super();

    // In development builds, the frontend assets are served by the webpack devserver.
    this.frontendURL = `http://localhost:${frontendPort}`;
    this.appIconPath = `${this.frontendURL}/appicon.ico`;
  }

  protected get _defaultWindowOptions() {
    return {
      icon: this.appIconPath,
    };
  }

  public async initialize(windowOptions?: BrowserWindowConstructorOptions): Promise<void> {
    protocol.registerSchemesAsPrivileged([
      { scheme: "electron", privileges: { standard: true, secure: true } },
    ]);

    // Occasionally, the electron backend may start before the webpack devserver has even started.
    // If this happens, we'll just retry and keep reloading the page.
    app.on("web-contents-created", (_e, webcontents) => {
      webcontents.on("did-fail-load", async (_event, errorCode, _errorDescription, _validatedURL, isMainFrame) => {
        // errorCode -102 is CONNECTION_REFUSED - see https://cs.chromium.org/chromium/src/net/base/net_error_list.h
        if (isMainFrame && errorCode === -102) {
          await BeDuration.wait(100);
          webcontents.reload();
        }
      });
    });

    return super.initialize(windowOptions);
  }
}
