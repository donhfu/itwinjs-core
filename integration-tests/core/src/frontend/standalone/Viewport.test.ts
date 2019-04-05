/*---------------------------------------------------------------------------------------------
* Copyright (c) 2019 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import { assert, expect } from "chai";
import { BeDuration, Id64, Id64String, using } from "@bentley/bentleyjs-core";
import { Point3d, Angle } from "@bentley/geometry-core";
import {
  Cartographic,
  ColorDef,
  FontMap,
  FontType,
  SubCategoryOverride,
  ViewFlags,
} from "@bentley/imodeljs-common";
import * as path from "path";
import {
  ChangeFlag,
  ChangeFlags,
  CompassMode,
  FeatureSymbology,
  IModelApp,
  IModelConnection,
  MockRender,
  PanViewTool,
  ScreenViewport,
  SpatialViewState,
  StandardViewId,
  TwoWayViewportSync,
  Viewport,
} from "@bentley/imodeljs-frontend";
import { RenderPlan } from "@bentley/imodeljs-frontend/lib/rendering";

const iModelDir = path.join(process.env.IMODELJS_CORE_DIRNAME!, "core/backend/lib/test/assets");

describe("Viewport", () => {
  let imodel: IModelConnection;
  let imodel2: IModelConnection;
  let spatialView: SpatialViewState;

  const createViewDiv = () => {
    const div = document.createElement("div") as HTMLDivElement;
    assert(null !== div);
    div!.style.width = div!.style.height = "1000px";
    document.body.appendChild(div!);
    return div;
  };

  const viewDiv = createViewDiv();
  const viewDiv2 = createViewDiv();

  before(async () => {   // Create a ViewState to load into a Viewport
    MockRender.App.startup();
    imodel = await IModelConnection.openSnapshot(path.join(iModelDir, "test.bim"));
    imodel2 = await IModelConnection.openSnapshot(path.join(iModelDir, "test2.bim"));
    spatialView = await imodel.views.load("0x34") as SpatialViewState;
    spatialView.setStandardRotation(StandardViewId.RightIso);
  });

  after(async () => {
    if (imodel) await imodel.closeSnapshot();
    MockRender.App.shutdown();
  });

  it("Viewport", async () => {
    const vpView = spatialView.clone();
    const vp = ScreenViewport.create(viewDiv!, vpView);
    assert.isFalse(vp.isRedoPossible, "no redo");
    assert.isFalse(vp.isUndoPossible, "no undo");
    assert.isFalse(vp.isCameraOn, "camera is off");

    const saveView = vpView.clone();
    assert.notEqual(saveView.modelSelector, vpView.modelSelector, "clone should copy modelSelector");
    assert.notEqual(saveView.categorySelector, vpView.categorySelector, "clone should copy categorySelector");
    assert.notEqual(saveView.displayStyle, vpView.displayStyle, "clone should copy displayStyle");
    const frustSave = vp.getFrustum();

    const vpView2 = spatialView.clone(imodel2);
    vpView2.setStandardRotation(StandardViewId.Top);
    const vp2 = ScreenViewport.create(viewDiv2!, vpView2);
    assert.isFalse(vp2.getFrustum().isSame(vp.getFrustum()), "frustums should start out different");

    // test the two-way connection between 2 viewports
    const vpConnection = new TwoWayViewportSync();
    vpConnection.connect(vp, vp2); // wire them together
    assert.isTrue(vp2.getFrustum().isSame(frustSave), "vp2 frustum should be same as vp1 after connect");
    vp.turnCameraOn();

    vp.synchWithView(true);
    assert.equal(vp.iModel, imodel);
    assert.equal(vp2.iModel, imodel2);

    assert.isTrue(vp.isCameraOn, "camera should be on");
    assert.isTrue(vp2.isCameraOn, "camera should be synched");
    assert.isTrue(vp2.getFrustum().isSame(vp.getFrustum()), "frustum should be synched");

    const frust2 = vp.getFrustum();
    assert.isFalse(frust2.isSame(frustSave), "turning camera on changes frustum");
    assert.isTrue(vp.isUndoPossible, "undo should now be possible");
    vp.doUndo();
    assert.isTrue(vp.getFrustum().isSame(frustSave), "undo should reinstate saved view");
    assert.isTrue(vp.isRedoPossible, "redo is possible");
    assert.isFalse(vp.isUndoPossible, "no undo");
    assert.isTrue(vp2.getFrustum().isSame(vp.getFrustum()), "frustum should be synched");
    vp.doRedo();
    assert.isTrue(vp.getFrustum().isSame(frust2), "redo should reinstate saved view");
    assert.isFalse(vp.isRedoPossible, "after redo, redo is not possible");
    assert.isTrue(vp.isUndoPossible, "after redo, undo is possible");
    assert.isTrue(vp2.getFrustum().isSame(frust2), "frustum should be synched");

    vp2.view.displayStyle.monochromeColor = ColorDef.blue;
    vp2.synchWithView(true);
    assert.equal(vp.view.displayStyle.monochromeColor.getRgb(), ColorDef.blue.getRgb(), "synch from 2->1 should work");

    const pan = IModelApp.tools.create("View.Pan", vp) as PanViewTool;
    assert.instanceOf(pan, PanViewTool);
    assert.equal(pan.viewport, vp);
  });

  it("AccuDraw", () => {
    const vpView = spatialView.clone();
    const viewport = ScreenViewport.create(viewDiv!, vpView);
    const accudraw = IModelApp.accuDraw;
    assert.isTrue(accudraw.isEnabled, "Accudraw should be enabled");
    const pt = new Point3d(1, 1, 1);
    accudraw.adjustPoint(pt, viewport, false);

    accudraw.activate();
    assert.isTrue(accudraw.isActive, "AccuDraw is active");
    accudraw.deactivate();
    assert.isFalse(accudraw.isActive, "not active");
    accudraw.setCompassMode(CompassMode.Polar);
    assert.equal(accudraw.compassMode, CompassMode.Polar, "polar mode");
  });

  it("loadFontMap", async () => {
    const fonts1 = await imodel.loadFontMap();
    assert.equal(fonts1.fonts.size, 4, "font map size should be 4");
    assert.equal(FontType.TrueType, fonts1.getFont(1)!.type, "get font 1 type is TrueType");
    assert.equal("Arial", fonts1.getFont(1)!.name, "get Font 1 name");
    assert.equal(1, fonts1.getFont("Arial")!.id, "get Font 1, by name");
    assert.equal(FontType.Rsc, fonts1.getFont(2)!.type, "get font 2 type is Rsc");
    assert.equal("Font0", fonts1.getFont(2)!.name, "get Font 2 name");
    assert.equal(2, fonts1.getFont("Font0")!.id, "get Font 2, by name");
    assert.equal(FontType.Shx, fonts1.getFont(3)!.type, "get font 1 type is Shx");
    assert.equal("ShxFont0", fonts1.getFont(3)!.name, "get Font 3 name");
    assert.equal(3, fonts1.getFont("ShxFont0")!.id, "get Font 3, by name");
    assert.equal(FontType.TrueType, fonts1.getFont(4)!.type, "get font 4 type is TrueType");
    assert.equal("Calibri", fonts1.getFont(4)!.name, "get Font 4 name");
    assert.equal(4, fonts1.getFont("Calibri")!.id, "get Font 3, by name");
    assert.isUndefined(fonts1.getFont("notfound"), "attempt lookup of a font that should not be found");
    assert.deepEqual(new FontMap(fonts1.toJSON()), fonts1, "toJSON on FontMap");
  });

  it("creates a RenderPlan from a viewport", () => {
    const vpView = spatialView.clone();
    const vp = ScreenViewport.create(viewDiv!, vpView);
    let plan: RenderPlan | undefined;
    try {
      plan = RenderPlan.createFromViewport(vp);
    } catch (e) {
      plan = undefined;
    }

    assert.isDefined(plan);
    if (plan) {
      assert.isTrue(plan.is3d);
      assert.isUndefined(plan.activeVolume);
      assert.isDefined(plan.hline);
      assert.isFalse(plan.hline!.visible.ovrColor);
      assert.equal(plan.hline!.hidden.width, undefined);
      assert.isUndefined(plan.lights);
    }
  });
});

describe("Cartographic tests", () => {
  it("Cartographic should convert properly", () => {
    const exton = Cartographic.fromDegrees(75, 40, 0);
    assert.equal(exton.toString(), "(1.3089969389957472, 0.6981317007977318, 0)", "exton toString");
    assert.isTrue(exton.equals(exton.clone()));

    const ecef1 = exton.toEcef();
    assert.isTrue(ecef1.isAlmostEqual({ x: 1266325.9090166602, y: 4725992.6313910205, z: 4077985.5722003765 }), "toEcef should work");
    const exton2 = Cartographic.fromEcef(ecef1);
    assert.isTrue(exton.equalsEpsilon(exton2!, 0.01));

    const paris = Cartographic.fromAngles(Angle.createDegrees(2.3522), Angle.createDegrees(48.8566), 67);
    const ecefParis = paris.toEcef();
    assert.isTrue(ecefParis.isAlmostEqual({ x: 4200958.840878805, y: 172561.58554401112, z: 4780131.797337915 }), "paris");
    const paris2 = Cartographic.fromEcef(ecefParis);
    assert.isTrue(paris.equalsEpsilon(paris2!, 0.01));

    const newYork = new Cartographic(Angle.degreesToRadians(74.006), Angle.degreesToRadians(49.7128), -100);
    const ecefNY = newYork.toEcef();
    assert.isTrue(ecefNY.isAlmostEqual({ x: 1138577.8226437706, y: 3972262.6507547107, z: 4842118.181650281 }), "new york");
    const ny2 = Cartographic.fromEcef(ecefNY);
    assert.isTrue(newYork.equalsEpsilon(ny2!, 0.01));
  });
});

class ViewportChangedHandler {
  private readonly _vp: Viewport;
  private readonly _removals: Array<() => void> = [];
  // Flags set by individual event callbacks
  private readonly _eventFlags = new ChangeFlags(ChangeFlag.None);
  // Flags received by onViewportChanged callback
  private _changeFlags?: ChangeFlags;
  private _featureOverridesDirty = false;
  private readonly _undoDelay: BeDuration;

  public constructor(vp: Viewport) {
    // NB: Viewport.saveViewUndo() does nothing if called in rapid succession. That can make tests of undo/redo unpredictable.
    // Reset the delay to 0. Will set it back in dispose()
    this._undoDelay = Viewport.undoDelay;
    Viewport.undoDelay = BeDuration.fromSeconds(0);

    this._vp = vp;
    this._removals.push(vp.onViewportChanged.addListener((_: Viewport, cf) => {
      expect(this._changeFlags).to.be.undefined;
      this._changeFlags = cf;
    }));
    this._removals.push(vp.onAlwaysDrawnChanged.addListener(() => {
      expect(this._eventFlags.alwaysDrawn).to.be.false;
      this._eventFlags.setAlwaysDrawn();
    }));
    this._removals.push(vp.onNeverDrawnChanged.addListener(() => {
      expect(this._eventFlags.neverDrawn).to.be.false;
      this._eventFlags.setNeverDrawn();
    }));
    this._removals.push(vp.onDisplayStyleChanged.addListener(() => {
      expect(this._eventFlags.displayStyle).to.be.false;
      this._eventFlags.setDisplayStyle();
    }));
    this._removals.push(vp.onViewedCategoriesChanged.addListener(() => {
      expect(this._eventFlags.viewedCategories).to.be.false;
      this._eventFlags.setViewedCategories();
    }));
    this._removals.push(vp.onViewedModelsChanged.addListener(() => {
      expect(this._eventFlags.viewedModels).to.be.false;
      this._eventFlags.setViewedModels();
    }));
    this._removals.push(vp.onFeatureOverrideProviderChanged.addListener(() => {
      expect(this._eventFlags.featureOverrideProvider).to.be.false;
      this._eventFlags.setFeatureOverrideProvider();
    }));
    this._removals.push(vp.onFeatureOverridesChanged.addListener(() => {
      expect(this._featureOverridesDirty).to.be.false;
      this._featureOverridesDirty = true;
    }));

    // Initial change events are sent the first time the new ViewState is rendered.
    this.expect(ChangeFlag.Initial, () => undefined);
  }

  public dispose() {
    Viewport.undoDelay = this._undoDelay;

    for (const removal of this._removals)
      removal();

    this._removals.length = 0;
  }

  public static test(vp: Viewport, func: (mon: ViewportChangedHandler) => void): void {
    using (new ViewportChangedHandler(vp), (mon) => func(mon));
  }

  public expect(flags: ChangeFlag, func: () => void): void {
    func();
    this._vp.renderFrame();

    // Expect exactly the same ChangeFlags to be received by onViewportChanged handler.
    if (undefined === this._changeFlags)
      expect(flags).to.equal(ChangeFlag.None);
    else
      expect(this._changeFlags.value).to.equal(flags);

    // Confirm onFeatureOverridesChanged invoked or not invoked based on expected flags.
    const expectFeatureOverridesChanged = 0 !== (flags & ChangeFlag.Overrides);
    expect(this._featureOverridesDirty).to.equal(expectFeatureOverridesChanged);
    if (undefined !== this._changeFlags)
      expect(this._changeFlags.areFeatureOverridesDirty).to.equal(expectFeatureOverridesChanged);

    expect(this._eventFlags.value).to.equal(flags);

    // Reset for next frame.
    this._eventFlags.clear();
    this._changeFlags = undefined;
    this._featureOverridesDirty = false;
  }
}

describe("Viewport changed events", async () => {
  // test.bim:
  //  3d views:
  //    view:           34
  //    model selector: 35
  //    models: 1c 1f 22 23 24 (all spatial models in file)
  let testBim: IModelConnection;
  // testImodel.bim: All Ids have briefcase Id=1
  //  2d views:
  //    view:  20 2e 35 3c 43 4a
  //    model: 19 27 30 37 3e 45
  //  3d views:
  //    view:               15 17 13 16 5b    61
  //    model selector:     14
  //    models:             0c 0c 0c 0c NULL  NULL
  //    category selector:  0f 0e 0f 0f 0f    0f
  //    display style:      10 10 10 10 11    12
  //  category selector 0x0e: 07 1a 1c
  //  category selector 0x0f: 01 03 05 07
  let testImodel: IModelConnection;

  const viewDiv = document.createElement("div") as HTMLDivElement;
  viewDiv.style.width = viewDiv.style.height = "1000px";
  document.body.appendChild(viewDiv);

  before(async () => {
    MockRender.App.startup();
    testBim = await IModelConnection.openSnapshot(path.join(iModelDir, "test.bim"));
    testImodel = await IModelConnection.openSnapshot(path.join(iModelDir, "testImodel.bim"));
  });

  after(async () => {
    if (undefined !== testBim)
      await testBim.closeSnapshot();

    if (undefined !== testImodel)
      await testImodel.closeSnapshot();

    MockRender.App.shutdown();
  });

  // Make an Id64 for testImodel which has briefcase Id=1
  function id64(localId: number): Id64String {
    return Id64.fromLocalAndBriefcaseIds(localId, 1);
  }

  it("should be dispatched when always/never-drawn change", async () => {
    const view = await testBim.views.load("0x34") as SpatialViewState;
    view.setStandardRotation(StandardViewId.RightIso);
    const vp = ScreenViewport.create(viewDiv, view);

    // Viewport-changed events are not dispatched immediately - they are accumulated between frames and dispatched from inside Viewport.renderFrame().
    ViewportChangedHandler.test(vp, (mon) => {
      // No event if the set is already empty when we clear it.
      mon.expect(ChangeFlag.None, () => vp.clearNeverDrawn());
      mon.expect(ChangeFlag.None, () => vp.clearAlwaysDrawn());

      // Assigning the set always raises an event.
      const idSet = new Set<string>();
      idSet.add("0x123");
      mon.expect(ChangeFlag.AlwaysDrawn, () => vp.setAlwaysDrawn(idSet, false));
      mon.expect(ChangeFlag.AlwaysDrawn, () => vp.setAlwaysDrawn(idSet, true));
      mon.expect(ChangeFlag.NeverDrawn, () => vp.setNeverDrawn(idSet));

      // Clearing raises event if set was assigned.
      mon.expect(ChangeFlag.NeverDrawn, () => vp.clearNeverDrawn());
      mon.expect(ChangeFlag.AlwaysDrawn, () => vp.clearAlwaysDrawn());

      // Clearing again will not re-raise because already cleared.
      mon.expect(ChangeFlag.None, () => vp.clearNeverDrawn());
      mon.expect(ChangeFlag.None, () => vp.clearAlwaysDrawn());

      // Setting repeatedly to same set raises each time, because we're not going to compare to previous set every time it changes.
      mon.expect(ChangeFlag.AlwaysDrawn, () => vp.setAlwaysDrawn(idSet, true));
      mon.expect(ChangeFlag.AlwaysDrawn, () => vp.setAlwaysDrawn(idSet, true));

      // Setting to an empty set, and also setting the 'exclusive' flags - effectively means no elements should draw.
      idSet.clear();
      mon.expect(ChangeFlag.AlwaysDrawn, () => vp.setAlwaysDrawn(idSet, true));
      // Raises even though set was already empty, because this resets the 'exclusive' flag.
      mon.expect(ChangeFlag.AlwaysDrawn, () => vp.clearAlwaysDrawn());
      // Exclusive flag no longer set and set is empty, so no event.
      mon.expect(ChangeFlag.None, () => vp.clearAlwaysDrawn());

      // Multiple changes in between frames produce a single event.
      idSet.add("0x123");
      mon.expect(ChangeFlag.AlwaysDrawn | ChangeFlag.NeverDrawn, () => {
        for (let i = 0; i < 5; i++) {
          vp.setAlwaysDrawn(idSet);
          vp.clearAlwaysDrawn();
          vp.setNeverDrawn(idSet);
          vp.clearNeverDrawn();
        }
      });

      // Always/never-drawn unaffected by undo/redo
      vp.saveViewUndo();
      vp.doUndo();
      mon.expect(ChangeFlag.None, () => undefined);
      vp.doRedo();
      mon.expect(ChangeFlag.None, () => undefined);
    });
  });

  it("should be dispatched when display style changes", async () => {
    const view = await testBim.views.load("0x34") as SpatialViewState;
    view.setStandardRotation(StandardViewId.RightIso);
    const vp = ScreenViewport.create(viewDiv!, view);

    ViewportChangedHandler.test(vp, (mon) => {
      // No event if equivalent flags
      const newFlags = vp.viewFlags.clone();
      mon.expect(ChangeFlag.None, () => vp.viewFlags = newFlags);

      // ViewFlags which do not affect symbology overrides
      newFlags.solarLight = !newFlags.solarLight;
      mon.expect(ChangeFlag.DisplayStyle, () => vp.viewFlags = newFlags);

      // ViewFlags which affect symbology overrides
      newFlags.constructions = !newFlags.constructions;
      mon.expect(ChangeFlag.DisplayStyle, () => vp.viewFlags = newFlags);

      // Undo changes
      vp.saveViewUndo();
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doUndo());
      expect(vp.viewFlags.constructions).to.equal(!newFlags.constructions);
      expect(vp.viewFlags.solarLight).to.equal(!newFlags.solarLight);

      // Redo changes
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doRedo());
      expect(vp.viewFlags.constructions).to.equal(newFlags.constructions);
      expect(vp.viewFlags.solarLight).to.equal(newFlags.solarLight);

      // No event if modify display style directly.
      mon.expect(ChangeFlag.None, () => {
        vp.displayStyle.backgroundColor = ColorDef.red;
        vp.displayStyle.viewFlags = new ViewFlags();
      });

      // Modify display style through Viewport API.
      vp.saveViewUndo();
      mon.expect(ChangeFlag.DisplayStyle, () => {
        const newStyle = vp.displayStyle.clone();
        newStyle.backgroundColor = ColorDef.red;
        vp.displayStyle = newStyle;
      });

      // Modify view flags through Viewport's displayStyle property.
      vp.saveViewUndo();
      mon.expect(ChangeFlag.DisplayStyle, () => {
        const newStyle = vp.displayStyle.clone();
        newStyle.viewFlags.constructions = !newStyle.viewFlags.constructions;
        vp.displayStyle = newStyle;
      });

      vp.saveViewUndo();
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doUndo());
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doUndo());
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doRedo());
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doRedo());

      // Override subcategories directly on display style => no event
      const ovr = SubCategoryOverride.fromJSON({ color: ColorDef.green });
      mon.expect(ChangeFlag.None, () => vp.displayStyle.overrideSubCategory("0x123", ovr));

      // Override by replacing display style on Viewport
      vp.saveViewUndo();
      mon.expect(ChangeFlag.DisplayStyle, () => {
        const style = vp.displayStyle.clone();
        style.overrideSubCategory("0x123", ovr);
        vp.displayStyle = style;
      });

      // Apply same override via Viewport method. Does not check if override actually differs.
      vp.saveViewUndo();
      mon.expect(ChangeFlag.DisplayStyle | ChangeFlag.ViewedModels, () => {
        // Because this is same override as already set, saveViewUndo will not save in undo buffer unless we make some other actual change to the ViewState
        vp.overrideSubCategory("0x123", ovr);
        vp.changeViewedModels(new Set<string>());
      });

      // Apply different override to same subcategory
      vp.saveViewUndo();
      mon.expect(ChangeFlag.DisplayStyle, () => vp.overrideSubCategory("0x123", SubCategoryOverride.fromJSON({ color: ColorDef.red })));

      // Undo/redo detects net changes to subcategory overrides
      vp.saveViewUndo();
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doUndo()); // red => green
      mon.expect(ChangeFlag.ViewedModels, () => vp.doUndo()); // green => green
      mon.expect(ChangeFlag.ViewedModels, () => vp.doRedo());
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doRedo());
    });
  });

  it("should be dispatched when displayed 2d models change", async () => {
    const vp = ScreenViewport.create(viewDiv, await testImodel.views.load(id64(0x20))); // views model 0x19

    ViewportChangedHandler.test(vp, async (mon) => {
      // changeModelDisplay is no-op for 2d views
      mon.expect(ChangeFlag.None, () => expect(vp.changeModelDisplay(id64(0x19), false)).to.be.false);
      mon.expect(ChangeFlag.None, () => expect(vp.changeModelDisplay(id64(0x27), true)).to.be.false);
      const viewedModels = new Set<string>();
      viewedModels.add(id64(0x27));
      mon.expect(ChangeFlag.None, () => expect(vp.changeViewedModels(viewedModels)).to.be.false);

      // Switching to a different 2d view of the same model should not produce model-changed event
      const view20 = await testImodel.views.load(id64(0x20)); // views model 0x1e
      mon.expect(ChangeFlag.None, () => vp.changeView(view20));

      // Switching to a different 2d view of a different model should produce model-changed event
      // Note: new view also has different categories enabled.
      const view35 = await testImodel.views.load(id64(0x35)); // views model 0x1e
      mon.expect(ChangeFlag.ViewedModels | ChangeFlag.ViewedCategories, () => vp.changeView(view35));

      // Switch back to previous view.
      // Note: changeView() clears undo stack so cannot/needn't test undo/redo here.
      mon.expect(ChangeFlag.ViewedModels | ChangeFlag.ViewedCategories, () => vp.changeView(view20.clone()));
    });
  });

  it("should be dispatched when displayed 3d models change", async () => {
    const vp = ScreenViewport.create(viewDiv, await testBim.views.load("0x34"));

    ViewportChangedHandler.test(vp, async (mon) => {
      // adding a model which is already present produces no event
      mon.expect(ChangeFlag.None, () => vp.changeModelDisplay("0x1c", true));

      // removing a model not present produces no event
      mon.expect(ChangeFlag.None, () => vp.changeModelDisplay("0x9876543", false));

      // setting viewed models directly always produces event - we don't check if contents of set exactly match current set
      let selectedModels = (vp.view as SpatialViewState).modelSelector.models;
      mon.expect(ChangeFlag.ViewedModels, () => vp.changeViewedModels(selectedModels));
      selectedModels = new Set<string>();
      selectedModels.add("0x1c");
      mon.expect(ChangeFlag.ViewedModels, () => vp.changeViewedModels(selectedModels));

      // Save baseline: viewedModels = [ 0x1c ]
      vp.saveViewUndo();
      expect(vp.viewsModel("0x1c")).to.be.true;
      expect(vp.viewsModel("0x1f")).to.be.false;

      // changeModelDisplay has no net effect - but must make some other change for saveViewUndo() to actually save the view state.
      mon.expect(ChangeFlag.DisplayStyle, () => { const vf = vp.viewFlags.clone(); vf.solarLight = !vf.solarLight; vp.viewFlags = vf; });
      mon.expect(ChangeFlag.None, () => vp.changeModelDisplay("0x1c", true));
      vp.saveViewUndo();
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doUndo());
      mon.expect(ChangeFlag.DisplayStyle, () => vp.doRedo());

      mon.expect(ChangeFlag.ViewedModels, () => {
        vp.changeModelDisplay("0x1c", false);
        vp.changeModelDisplay("0x1f", true);
      });
      vp.saveViewUndo();
      mon.expect(ChangeFlag.ViewedModels, () => vp.doUndo());
      mon.expect(ChangeFlag.None, () => vp.doUndo());
      mon.expect(ChangeFlag.None, () => vp.doRedo());
      mon.expect(ChangeFlag.ViewedModels, () => vp.doRedo());

      // Viewport is now viewing model 0x1f.
      // Replacing viewed models with same set [ 0x1f ] produces event
      selectedModels.clear();
      selectedModels.add("0x1f");
      mon.expect(ChangeFlag.ViewedModels, () => vp.changeViewedModels(selectedModels));

      // Undo produces view looking at same set of models => no event
      vp.saveViewUndo();
      mon.expect(ChangeFlag.None, () => vp.doUndo());
      mon.expect(ChangeFlag.None, () => vp.doRedo());
    });
  });

  it("should be dispatched when displayed categories change", async () => {
    const vp = ScreenViewport.create(viewDiv, await testImodel.views.load(id64(0x15))); // view category selector 0x0f

    ViewportChangedHandler.test(vp, async (mon) => {
      // Adding an already-enabled category or removing a disabled one has no effect
      mon.expect(ChangeFlag.None, () => vp.changeCategoryDisplay(id64(0x01), true));
      mon.expect(ChangeFlag.None, () => vp.changeCategoryDisplay(id64(0x1a), false));

      // Two changes which produce no net change still produce event - we do not track net changes
      vp.saveViewUndo();
      mon.expect(ChangeFlag.ViewedCategories, () => {
        vp.changeCategoryDisplay(id64(0x01), false);
        vp.changeCategoryDisplay(id64(0x01), true);
      });

      // Undo/redo with no net change produces no event
      vp.saveViewUndo();
      mon.expect(ChangeFlag.None, () => vp.doUndo());
      mon.expect(ChangeFlag.None, () => vp.doRedo());

      // Switching to a different view with same category selector produces no category-changed event
      const view13 = await testImodel.views.load(id64(0x13));
      mon.expect(ChangeFlag.None, () => vp.changeView(view13));

      // Switching to a different view with different category selector produces event
      const view17 = await testImodel.views.load(id64(0x17));
      mon.expect(ChangeFlag.None, () => vp.changeView(view17));

      // Changing category selector, then switching to a view with same categories enabled produces no event.
      mon.expect(ChangeFlag.ViewedCategories, () => {
        vp.changeCategoryDisplay(vp.view.categorySelector.categories, false);
        vp.changeCategoryDisplay(view13.categorySelector.categories, true);
      });

      mon.expect(ChangeFlag.None, () => vp.changeView(view13));
    });
  });

  it("should be dispatched when feature override provider changes", async () => {
    const vp = ScreenViewport.create(viewDiv, await testBim.views.load("0x34"));
    let overridesAdded = false;
    const provider = {
      addFeatureOverrides: (_overrides: FeatureSymbology.Overrides, _viewport: Viewport): void => {
        expect(overridesAdded).to.be.false;
        overridesAdded = true;
      },
    };

    ViewportChangedHandler.test(vp, (mon) => {
      // Changing the provider => event
      mon.expect(ChangeFlag.FeatureOverrideProvider, () => vp.featureOverrideProvider = provider);
      expect(overridesAdded).to.be.true;
      overridesAdded = false;

      // Explicitly notifying provider's state has changed => event
      mon.expect(ChangeFlag.FeatureOverrideProvider, () => vp.setFeatureOverrideProviderChanged());
      expect(overridesAdded).to.be.true;
      overridesAdded = false;

      // Setting provider to same value => no event
      mon.expect(ChangeFlag.None, () => vp.featureOverrideProvider = provider);
      expect(overridesAdded).to.be.false;

      // Actually changing the provider => event
      mon.expect(ChangeFlag.FeatureOverrideProvider, () => vp.featureOverrideProvider = undefined);
      expect(overridesAdded).to.be.false;
    });
  });

  it("should be dispatched when changing ViewState", async () => {
    const view2d20 = await testImodel.views.load(id64(0x20));
    const view2d2e = await testImodel.views.load(id64(0x2e));
    const view3d15 = await testImodel.views.load(id64(0x15)); // cat sel 0f, mod sel 14
    const view3d17 = await testImodel.views.load(id64(0x17)); // cat sel 0e, mod sel 14

    const vp = ScreenViewport.create(viewDiv, view2d20.clone());
    ViewportChangedHandler.test(vp, (mon) => {
      // No effective change to view
      mon.expect(ChangeFlag.None, () => vp.changeView(view2d20.clone()));

      // 2d => 2d
      mon.expect(ChangeFlag.ViewedCategories | ChangeFlag.ViewedModels | ChangeFlag.DisplayStyle, () => vp.changeView(view2d2e.clone()));

      // 2d => 3d
      mon.expect(ChangeFlag.ViewedCategories | ChangeFlag.ViewedModels | ChangeFlag.DisplayStyle, () => vp.changeView(view3d15.clone()));

      // No effective change
      mon.expect(ChangeFlag.None, () => vp.changeView(view3d15.clone()));

      // 3d => 3d - same model selector, same display style, different category selector
      mon.expect(ChangeFlag.ViewedCategories, () => vp.changeView(view3d17.clone()));

      // 3d => 2d
      mon.expect(ChangeFlag.ViewedCategories | ChangeFlag.ViewedModels | ChangeFlag.DisplayStyle, () => vp.changeView(view2d20.clone()));
    });
  });
});
