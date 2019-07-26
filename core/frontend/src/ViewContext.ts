/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
/** @module Rendering */

import { Id64String } from "@bentley/bentleyjs-core";
import { ConvexClipPlaneSet, Geometry, Matrix3d, Point2d, Point3d, Transform, Vector2d, Vector3d, XAndY, Plane3dByOriginAndUnitNormal, ClipUtilities, ClipPlane, Loop, LineString3d, Range3d, GrowableXYZArray, Ray3d } from "@bentley/geometry-core";
import { ColorDef, Frustum, FrustumPlanes, LinePixels, ViewFlags } from "@bentley/imodeljs-common";
import { GraphicBuilder, GraphicType } from "./render/GraphicBuilder";
import {
  CanvasDecoration,
  Decorations,
  GraphicBranch,
  GraphicBranchOptions,
  GraphicList,
  RenderGraphic,
  RenderTarget,
  RenderPlanarClassifier,
  RenderSolarShadowMap,
  RenderTextureDrape,
} from "./render/System";
import { ScreenViewport, Viewport, ViewFrustum } from "./Viewport";
import { Tile } from "./tile/Tile";
import { TileTree } from "./tile/TileTree";
import { IModelApp } from "./IModelApp";

const gridConstants = { minSeparation: 20, maxRefLines: 80, gridTransparency: 220, refTransparency: 150, planeTransparency: 225 };

/** Provides context for producing [[RenderGraphic]]s for drawing within a [[Viewport]].
 * @public
 */
export class RenderContext {
  /** ViewFlags extracted from the context's [[Viewport]]. */
  public readonly viewFlags: ViewFlags;
  /** The [[Viewport]] associated with this context. */
  public readonly viewport: Viewport;
  /** Frustum extracted from the context's [[Viewport]]. */
  public readonly frustum: Frustum;
  /** Frustum planes extracted from the context's [[Viewport]]. */
  public readonly frustumPlanes: FrustumPlanes;

  constructor(vp: Viewport, frustum?: Frustum) {
    this.viewport = vp;
    this.viewFlags = vp.viewFlags.clone(); // viewFlags can diverge from viewport after attachment
    this.frustum = frustum ? frustum : vp.getFrustum();
    this.frustumPlanes = new FrustumPlanes(this.frustum);
  }

  /** Given a point in world coordinates, determine approximately how many pixels it occupies on screen based on this context's frustum. */
  public getPixelSizeAtPoint(inPoint?: Point3d): number { return this.viewport.viewFrustum.getPixelSizeAtPoint(inPoint); }

  /** @internal */
  public get target(): RenderTarget { return this.viewport.target; }

  /** @internal */
  protected _createGraphicBuilder(type: GraphicType, transform?: Transform, id?: Id64String): GraphicBuilder { return this.target.createGraphicBuilder(type, this.viewport, transform, id); }

  /** Create a builder for creating a [[GraphicType.Scene]] [[RenderGraphic]] for rendering within this context's [[Viewport]].
   * @param transform the local-to-world transform in which the builder's geometry is to be defined.
   * @returns A builder for creating a [[GraphicType.Scene]] [[RenderGraphic]] for rendering within this context's [[Viewport]].
   */
  public createSceneGraphicBuilder(transform?: Transform): GraphicBuilder { return this._createGraphicBuilder(GraphicType.Scene, transform); }

  /** @internal */
  public createGraphicBranch(branch: GraphicBranch, location: Transform, opts?: GraphicBranchOptions): RenderGraphic { return this.target.renderSystem.createGraphicBranch(branch, location, opts); }

  /** Create a [[RenderGraphic]] which groups a set of graphics into a node in a scene graph, applying to each a transform and optional clip volume and symbology overrides.
   * @param branch Contains the group of graphics and the symbology overrides.
   * @param location the local-to-world transform applied to the grouped graphics.
   * @returns A RenderGraphic suitable for drawing the scene graph node within this context's [[Viewport]].
   * @see [[RenderSystem.createBranch]]
   */
  public createBranch(branch: GraphicBranch, location: Transform): RenderGraphic { return this.createGraphicBranch(branch, location); }
}

/** Provides context for an [[InteractiveTool]] to display decorations representing its current state.
 * @see [[InteractiveTool.onDynamicFrame]]
 * @public
 */
export class DynamicsContext extends RenderContext {
  private _dynamics?: GraphicList;

  /** Add a graphic to the list of dynamic graphics to be drawn in this context's [[Viewport]]. */
  public addGraphic(graphic: RenderGraphic) {
    if (undefined === this._dynamics)
      this._dynamics = [];
    this._dynamics.push(graphic);
  }

  /** @internal */
  public changeDynamics(): void { this.viewport!.changeDynamics(this._dynamics); }
}

/** Provides context for a [[Decorator]] to add [[Decorations]] to be rendered within a [[Viewport]].
 * @public
 */
export class DecorateContext extends RenderContext {
  /** The HTMLDivElement which overlays the [[Viewport]]'s HTMLCanvasElement, to which HTML decorations are added. */
  public decorationDiv: HTMLDivElement;
  /** The [[ScreenViewport]] in which this context's [[Decorations]] will be drawn. */
  public get screenViewport(): ScreenViewport { return this.viewport as ScreenViewport; }
  /** @internal */
  constructor(vp: ScreenViewport, private readonly _decorations: Decorations) {
    super(vp);
    this.decorationDiv = vp.decorationDiv;
  }

  /** Create a builder for creating a [[RenderGraphic]] of the specified type appropriate for rendering within this context's [[Viewport]].
   * @param type The type of builder to create.
   * @param transform the local-to-world transform in which the builder's geometry is to be defined.
   * @param id If the decoration is to be pickable, a unique identifier to associate with the resultant [[RenderGraphic]].
   * @returns A builder for creating a [[RenderGraphic]] of the specified type appropriate for rendering within this context's [[Viewport]].
   * @see [[IModelConnection.transientIds]] for obtaining an ID for a pickable decoration.
   */
  public createGraphicBuilder(type: GraphicType, transform?: Transform, id?: Id64String): GraphicBuilder { return this._createGraphicBuilder(type, transform, id); }

  /** Calls [[GraphicBuilder.finish]] on the supplied builder to obtain a [[RenderGraphic]], then adds the graphic to the appropriate list of
   * [[Decorations]].
   * @param builder The builder from which to extract the graphic.
   * @note The builder should not be used after calling this method.
   */
  public addDecorationFromBuilder(builder: GraphicBuilder) { this.addDecoration(builder.type, builder.finish()); }

  /** Adds a graphic to the set of [[Decorations]] to be drawn in this context's [[Viewport]].
   * @param The type of the graphic, which determines to which list of decorations it is added.
   * @param decoration The decoration graphic to add.
   * @note The type must match the type with which the [[RenderGraphic]]'s [[GraphicBuilder]] was constructed.
   * @see [[DecorateContext.addDecorationFromBuilder]] for a more convenient API.
   */
  public addDecoration(type: GraphicType, decoration: RenderGraphic) {
    switch (type) {
      case GraphicType.Scene:
        if (undefined === this._decorations.normal)
          this._decorations.normal = [];
        this._decorations.normal.push(decoration);
        break;

      case GraphicType.WorldDecoration:
        if (!this._decorations.world)
          this._decorations.world = [];
        this._decorations.world.push(decoration);
        break;

      case GraphicType.WorldOverlay:
        if (!this._decorations.worldOverlay)
          this._decorations.worldOverlay = [];
        this._decorations.worldOverlay.push(decoration);
        break;

      case GraphicType.ViewOverlay:
        if (!this._decorations.viewOverlay)
          this._decorations.viewOverlay = [];
        this._decorations.viewOverlay.push(decoration);
        break;
    }
  }

  /** Add a [[CanvasDecoration]] to be drawn in this context's [[Viewport]]. */
  public addCanvasDecoration(decoration: CanvasDecoration, atFront = false) {
    if (undefined === this._decorations.canvasDecorations)
      this._decorations.canvasDecorations = [];

    const list = this._decorations.canvasDecorations;
    if (0 === list.length || true === atFront)
      list.push(decoration);
    else
      list.unshift(decoration);
  }

  /** Add an HTMLElement to be drawn as a decoration in this context's [[Viewport]]. */
  public addHtmlDecoration(decoration: HTMLElement) { this.decorationDiv.appendChild(decoration); }

  private getClippedGridPlanePoints(vp: Viewport, plane: Plane3dByOriginAndUnitNormal, loopPt: Point3d): Point3d[] | undefined {
    const frus = vp.getFrustum();
    const geom = ClipUtilities.loopsOfConvexClipPlaneIntersectionWithRange(ConvexClipPlaneSet.createPlanes([ClipPlane.createPlane(plane)]), frus.toRange(), true, false, true);
    if (undefined === geom || 1 !== geom.length)
      return undefined;
    const loop = geom[0];
    if (!(loop instanceof Loop) || 1 !== loop.children.length)
      return undefined;
    const child = loop.getChild(0);
    if (!(child instanceof LineString3d))
      return undefined;

    const work = new GrowableXYZArray();
    const finalPoints = new GrowableXYZArray();
    const convexSet = frus.getRangePlanes(false, false, 0);
    convexSet.polygonClip(child.points, finalPoints, work);
    if (finalPoints.length < 4)
      return undefined;

    const shapePoints = finalPoints.getPoint3dArray();
    loopPt.setFrom(shapePoints[0]);

    if (!vp.isCameraOn)
      return shapePoints;

    let lastZ = 0.0;
    for (let i = 0; i < shapePoints.length - 1; ++i) {
      const midPt = shapePoints[i].interpolate(0.5, shapePoints[i + 1]);
      const viewPt = vp.worldToView(midPt);
      if (i === 0 || viewPt.z > lastZ) {
        loopPt.setFrom(midPt);
        lastZ = viewPt.z;
      }
    }
    return shapePoints;
  }

  private getCurrentGridRefSeparation(lastPt: Point3d, thisPt0: Point3d, thisPt1: Point3d, thisPt: Point3d, thisRay: Ray3d, planeX: Plane3dByOriginAndUnitNormal, planeY: Plane3dByOriginAndUnitNormal) {
    thisRay.getOriginRef().setFrom(thisPt0);
    thisRay.getDirectionRef().setStartEnd(thisPt0, thisPt1); thisRay.getDirectionRef().normalizeInPlace();
    planeX.getOriginRef().setFrom(lastPt);
    planeY.getOriginRef().setFrom(lastPt);
    const dotX = Math.abs(planeX.getNormalRef().dotProduct(thisRay.getDirectionRef()));
    const dotY = Math.abs(planeY.getNormalRef().dotProduct(thisRay.getDirectionRef()));
    return (undefined !== thisRay.intersectionWithPlane(dotX > dotY ? planeX : planeY, thisPt)) ? lastPt.distance(thisPt) : 0.0;
  }

  /** @internal */
  public drawStandardGrid(gridOrigin: Point3d, rMatrix: Matrix3d, spacing: XAndY, gridsPerRef: number, _isoGrid: boolean = false, _fixedRepetitions?: Point2d): void {
    const vp = this.viewport;
    const eyePoint = vp.worldToViewMap.transform1.columnZ();
    const eyeDir = Vector3d.createFrom(eyePoint);
    const aa = Geometry.conditionalDivideFraction(1, eyePoint.w);
    if (aa !== undefined) {
      const xyzEye = eyeDir.scale(aa);
      eyeDir.setFrom(gridOrigin.vectorTo(xyzEye));
    }
    const normResult = eyeDir.normalize(eyeDir);
    if (!normResult)
      return;
    const zVec = rMatrix.rowZ();
    const eyeDot = eyeDir.dotProduct(zVec);
    if (!vp.isCameraOn && Math.abs(eyeDot) < 0.005)
      return;

    const plane = Plane3dByOriginAndUnitNormal.create(gridOrigin, zVec);
    if (undefined === plane)
      return;

    const loopPt = Point3d.createZero();
    const shapePoints = this.getClippedGridPlanePoints(vp, plane, loopPt);
    if (undefined === shapePoints)
      return;

    const meterPerPixel = vp.getPixelSizeAtPoint(loopPt);
    const refScale = (0 === gridsPerRef) ? 1.0 : gridsPerRef;
    const refSpacing = Vector2d.create(spacing.x, spacing.y).scale(refScale);
    const drawRefLines = !((refSpacing.x / meterPerPixel) < gridConstants.minSeparation || (refSpacing.y / meterPerPixel) < gridConstants.minSeparation);

    const viewZ = vp.rotation.getRow(2);
    const gridOffset = Point3d.create(viewZ.x * meterPerPixel, viewZ.y * meterPerPixel, viewZ.z * meterPerPixel); // Avoid z fighting with coincident geometry
    const builder = this.createGraphicBuilder(GraphicType.WorldDecoration, Transform.createTranslation(gridOffset));
    const color = vp.getContrastToBackgroundColor();
    const planeColor = eyeDot < 0.0 ? ColorDef.red.clone() : color.clone(); planeColor.setTransparency(gridConstants.planeTransparency);

    builder.setBlankingFill(planeColor);
    builder.addShape(shapePoints);

    if (drawRefLines) {
      const invMatrix = rMatrix.inverse();
      const transform = Transform.createRefs(gridOrigin, invMatrix!);
      const localRange = Range3d.createInverseTransformedArray(transform, shapePoints);

      let minX = Math.floor(localRange.low.x / refSpacing.x);
      let maxX = Math.ceil(localRange.high.x / refSpacing.x);
      let minY = Math.floor(localRange.low.y / refSpacing.y);
      let maxY = Math.ceil(localRange.high.y / refSpacing.y);

      const nRefRepetitionsX = (maxY - minY);
      const nRefRepetitionsY = (maxX - minX);

      minX *= refSpacing.x; maxX *= refSpacing.x;
      minY *= refSpacing.y; maxY *= refSpacing.y;

      let nGridRepetitionsX = nRefRepetitionsX;
      let nGridRepetitionsY = nRefRepetitionsY;
      const drawGridLines = (gridsPerRef > 1 && !((spacing.x / meterPerPixel) < gridConstants.minSeparation || (spacing.y / meterPerPixel) < gridConstants.minSeparation));
      const dirPoints: Point3d[] = [Point3d.create(minX, minY), Point3d.create(minX, minY + refSpacing.y), Point3d.create(minX + refSpacing.x, minY)];
      transform.multiplyPoint3dArrayInPlace(dirPoints);

      const xDir = Vector3d.createStartEnd(dirPoints[0], dirPoints[1]); xDir.normalizeInPlace();
      const yDir = Vector3d.createStartEnd(dirPoints[0], dirPoints[2]); yDir.normalizeInPlace();
      const dotX = xDir.dotProduct(viewZ);
      const dotY = yDir.dotProduct(viewZ);
      const unambiguousX = Math.abs(dotX) > 0.25;
      const unambiguousY = Math.abs(dotY) > 0.25;
      const reverseX = dotX > 0.0;
      const reverseY = dotY > 0.0;
      const refStepX = reverseY ? -refSpacing.x : refSpacing.x;
      const refStepY = reverseX ? -refSpacing.y : refSpacing.y;
      const fadeRefSteps = 8;
      const fadeRefTransparencyStep = (255 - gridConstants.refTransparency) / (fadeRefSteps + 2);

      const lastPt = Point3d.createZero();
      const planeX = Plane3dByOriginAndUnitNormal.create(lastPt, Vector3d.unitX())!;
      const planeY = Plane3dByOriginAndUnitNormal.create(lastPt, Vector3d.unitY())!;
      const thisPt = Point3d.create();
      const thisPt0 = Point3d.create();
      const thisPt1 = Point3d.create();
      const thisRay = Ray3d.createZero();

      const refColor = color.clone(); refColor.setTransparency(gridConstants.refTransparency);
      const linePat = eyeDot < 0.0 ? LinePixels.Code2 : LinePixels.Solid;
      builder.setSymbology(refColor, planeColor, 1, linePat);

      for (let xRef = 0, refY = reverseX ? maxY : minY, doFadeX = false, xFade = 0; xRef <= nRefRepetitionsX && xFade < fadeRefSteps; ++xRef, refY += refStepY) {
        const linePoints: Point3d[] = [Point3d.create(minX, refY), Point3d.create(maxX, refY)];
        transform.multiplyPoint3dArrayInPlace(linePoints);

        vp.worldToView(linePoints[0], thisPt0); thisPt0.z = 0.0;
        vp.worldToView(linePoints[1], thisPt1); thisPt1.z = 0.0;

        if (doFadeX) {
          refColor.setTransparency(gridConstants.refTransparency + (fadeRefTransparencyStep * ++xFade));
          builder.setSymbology(refColor, planeColor, 1, linePat);
        } else if (nRefRepetitionsX > 10) {
          if (doFadeX = (xRef > gridConstants.maxRefLines || (unambiguousX && 0 !== xRef && this.getCurrentGridRefSeparation(lastPt, thisPt0, thisPt1, thisPt, thisRay, planeX, planeY) < gridConstants.minSeparation)))
            nGridRepetitionsX = xRef;
        }

        thisPt0.interpolate(0.5, thisPt1, lastPt);
        builder.addLineString(linePoints);
      }

      refColor.setTransparency(gridConstants.refTransparency);
      builder.setSymbology(refColor, planeColor, 1, linePat);

      for (let yRef = 0, refX = reverseY ? maxX : minX, doFadeY = false, yFade = 0; yRef <= nRefRepetitionsY && yFade < fadeRefSteps; ++yRef, refX += refStepX) {
        const linePoints: Point3d[] = [Point3d.create(refX, minY), Point3d.create(refX, maxY)];
        transform.multiplyPoint3dArrayInPlace(linePoints);

        vp.worldToView(linePoints[0], thisPt0); thisPt0.z = 0.0;
        vp.worldToView(linePoints[1], thisPt1); thisPt1.z = 0.0;

        if (doFadeY) {
          refColor.setTransparency(gridConstants.refTransparency + (fadeRefTransparencyStep * ++yFade));
          builder.setSymbology(refColor, planeColor, 1, linePat);
        } else if (nRefRepetitionsY > 10) {
          if (doFadeY = (yRef > gridConstants.maxRefLines || (unambiguousY && 0 !== yRef && this.getCurrentGridRefSeparation(lastPt, thisPt0, thisPt1, thisPt, thisRay, planeX, planeY) < gridConstants.minSeparation)))
            nGridRepetitionsY = yRef;
        }

        thisPt0.interpolate(0.5, thisPt1, lastPt);
        builder.addLineString(linePoints);
      }

      if (drawGridLines) {
        const gridStepX = refStepX / gridsPerRef;
        const gridStepY = refStepY / gridsPerRef;
        const gridColor = color.clone();
        const fadeGridTransparencyStep = (255 - gridConstants.gridTransparency) / (gridsPerRef + 2);

        if (nGridRepetitionsX > 1) {
          gridColor.setTransparency(gridConstants.gridTransparency);
          builder.setSymbology(gridColor, planeColor, 1);

          for (let xRef = 0, refY = reverseX ? maxY : minY; xRef < nGridRepetitionsX; ++xRef, refY += refStepY) {
            const doFadeX = (nGridRepetitionsX < nRefRepetitionsX && (xRef === nGridRepetitionsX - 1));
            for (let yGrid = 1, gridY = refY + gridStepY; yGrid < gridsPerRef; ++yGrid, gridY += gridStepY) {
              const gridPoints: Point3d[] = [Point3d.create(minX, gridY), Point3d.create(maxX, gridY)];
              transform.multiplyPoint3dArrayInPlace(gridPoints);
              if (doFadeX) {
                gridColor.setTransparency(gridConstants.gridTransparency + (fadeGridTransparencyStep * yGrid));
                builder.setSymbology(gridColor, planeColor, 1);
              }
              builder.addLineString(gridPoints);
            }
          }
        }

        if (nGridRepetitionsY > 1) {
          gridColor.setTransparency(gridConstants.gridTransparency);
          builder.setSymbology(gridColor, planeColor, 1);

          for (let yRef = 0, refX = reverseY ? maxX : minX; yRef < nGridRepetitionsY; ++yRef, refX += refStepX) {
            const doFadeY = (nGridRepetitionsY < nRefRepetitionsY && (yRef === nGridRepetitionsY - 1));
            for (let xGrid = 1, gridX = refX + gridStepX; xGrid < gridsPerRef; ++xGrid, gridX += gridStepX) {
              const gridPoints: Point3d[] = [Point3d.create(gridX, minY), Point3d.create(gridX, maxY)];
              transform.multiplyPoint3dArrayInPlace(gridPoints);
              if (doFadeY) {
                gridColor.setTransparency(gridConstants.gridTransparency + (fadeGridTransparencyStep * xGrid));
                builder.setSymbology(gridColor, planeColor, 1);
              }
              builder.addLineString(gridPoints);
            }
          }
        }
      }
    }

    this.addDecorationFromBuilder(builder);
  }

  /** Display skyBox graphic that encompasses entire scene and rotates with camera.
   * @see [[RenderSystem.createSkyBox]].
   */
  public setSkyBox(graphic: RenderGraphic) { this._decorations.skyBox = graphic; }

  /** Set the graphic to be displayed behind all other geometry as the background of this context's [[Viewport]]. */
  public setViewBackground(graphic: RenderGraphic) { this._decorations.viewBackground = graphic; }
}

/** Context used to create the scene for a [[Viewport]]. The scene consists of a set of [[RenderGraphic]]s produced by the
 * [[TileTree]]s visible within the viewport. Creating the scene may result in the enqueueing of [[TileRequest]]s for [[Tile]]s which
 * should be displayed in the viewport but are not yet loaded.
 * @internal
 */
export class SceneContext extends RenderContext {
  public readonly graphics: RenderGraphic[] = [];
  public readonly backgroundGraphics: RenderGraphic[] = [];
  public readonly missingTiles = new Set<Tile>();
  public hasMissingTiles = false; // ###TODO for asynchronous loading of child nodes...turn those into requests too.
  public readonly modelClassifiers = new Map<Id64String, Id64String>();    // Model id to classifier model Id.
  public readonly planarClassifiers = new Map<Id64String, RenderPlanarClassifier>(); // Classifier model id to planar classifier.
  public readonly textureDrapes = new Map<Id64String, RenderTextureDrape>();
  public solarShadowMap?: RenderSolarShadowMap;
  private _viewFrustum?: ViewFrustum;
  private _graphicType: TileTree.GraphicType = TileTree.GraphicType.Scene;

  public constructor(vp: Viewport, frustum?: Frustum) {
    super(vp, frustum);
  }

  public get viewFrustum(): ViewFrustum | undefined {
    return undefined !== this._viewFrustum ? this._viewFrustum : this.viewport.viewFrustum;
  }

  public outputGraphic(graphic: RenderGraphic): void {
    switch (this._graphicType) {
      case TileTree.GraphicType.BackgroundMap:
        this.backgroundGraphics.push(graphic);
        break;
      case TileTree.GraphicType.Overlay:
      // ###TODO handle differently
      default:
        this.graphics.push(graphic);
        break;
    }
  }

  public insertMissingTile(tile: Tile): void {
    switch (tile.loadStatus) {
      case Tile.LoadStatus.NotLoaded:
      case Tile.LoadStatus.Queued:
      case Tile.LoadStatus.Loading:
        this.missingTiles.add(tile);
        break;
    }
  }

  public requestMissingTiles(): void {
    IModelApp.tileAdmin.requestTiles(this.viewport, this.missingTiles);
  }

  public getPlanarClassifier(id: Id64String): RenderPlanarClassifier | undefined { return this.planarClassifiers.get(id); }
  public setPlanarClassifier(id: Id64String, planarClassifier: RenderPlanarClassifier) { this.planarClassifiers.set(id, planarClassifier); }
  public getPlanarClassifierForModel(modelId: Id64String) {
    const classifierId = this.modelClassifiers.get(modelId);
    return undefined === classifierId ? undefined : this.getPlanarClassifier(classifierId);
  }

  public getTextureDrape(modelId: Id64String) { return this.textureDrapes.get(modelId); }
  public setTextureDrape(modelId: Id64String, textureDrape: RenderTextureDrape) { this.textureDrapes.set(modelId, textureDrape); }
  public addBackgroundDrapedModel(drapedTree: TileTree): RenderTextureDrape | undefined {
    const drape = this.target.renderSystem.createBackgroundMapDrape(drapedTree, this.viewport.displayStyle.backgroundDrapeMap);
    if (undefined !== drape)
      this.setTextureDrape(drapedTree.modelId, drape);

    return drape;
  }

  public withGraphicTypeAndPlane(type: TileTree.GraphicType, plane: Plane3dByOriginAndUnitNormal | undefined, func: () => void): void {
    const frust = undefined !== plane ? ViewFrustum.createFromViewportAndPlane(this.viewport, plane) : undefined;
    this.withGraphicTypeAndFrustum(type, frust, func);
  }

  public withGraphicTypeAndFrustum(type: TileTree.GraphicType, frustum: ViewFrustum | undefined, func: () => void): void {
    const prevType = this._graphicType;
    const prevFrust = this._viewFrustum;

    this._graphicType = type;
    this._viewFrustum = frustum;

    func();

    this._graphicType = prevType;
    this._viewFrustum = prevFrust;
  }
}
