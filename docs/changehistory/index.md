
# 3.3.0 Change Notes

Table of contents:

- [Display system](#display-system)
  - [Dynamic schedule scripts](#dynamic-schedule-scripts)
  - [Hiliting models and subcategories](#hiliting-models-and-subcategories)
  - [Improved appearance overrides for animated views](#improved-appearance-overrides-for-animated-views)
- [AppUi](#appui)
  - [Auto-hiding floating widgets](#auto-hiding-floating-widgets)
  - [Tool Settings title](#tool-settings-title)
- [ElectronApp changes](#electronapp-changes)
- [Frontend category APIs](#frontend-category-apis)
- [IModelHostOptions](#imodelhostoptions)
- [Progress API for downloading changesets](#progress-api-for-downloading-changesets)
- [RPC over IPC](#rpc-over-ipc)
- [Presentation](#presentation)
  - [Relationship properties](#relationship-properties)
- [Webpack 5](#webpack-5)
- [Deprecations](#deprecations)
  - [@itwin/core-bentley](#itwincore-bentley)
  - [@itwin/core-geometry](#itwincore-geometry)
  - [@itwin/core-mobile](#itwincore-mobile)

## Display system

### Dynamic schedule scripts

[Timeline animation](../learning/display/TimelineAnimation.md) enables the visualization of change within an iModel over a period of time. This can be a valuable tool for, among other things, animating the contents of a viewport to show the progress of an asset through the phases of its construction. However, one constraint has always limited the utility of this feature: the instructions for animating the view were required to be stored on a persistent element - either a [DisplayStyle]($backend) or a [RenderTimeline]($backend) - in the [IModel]($common).

That constraint has now been lifted. This makes it possible to create and apply ad-hoc animations entirely on the frontend. For now, support for this capability must be enabled when calling [IModelApp.startup]($frontend) by setting [TileAdmin.Props.enableFrontendScheduleScripts]($frontend) to `true`, as in this example:

```ts
await IModelApp.startup({
  tileAdmin: {
    enableFrontendScheduleScripts: true,
  },
});
```

Then, you can create a new schedule script using [RenderSchedule.ScriptBuilder]($common) or [RenderSchedule.Script.fromJSON]($common) and apply it by assigning to [DisplayStyleState.scheduleScript]($frontend). For example, given a JSON representation of the script:

```ts
function updateScheduleScript(
  viewport: Viewport,
  props: RenderSchedule.ScriptProps
): void {
  viewport.displayStyle.scheduleScript = RenderSchedule.Script.fromJSON(props);
}
```

### Hiliting models and subcategories

Support for hiliting models and subcategories using [HiliteSet]($frontend) has been promoted from `@beta` to `@public`. This allows applications to toggle hiliting of all elements belonging to a set of [Model]($backend)s and/or [SubCategory]($backend)'s. This feature can work in one of two modes, specified by [HiliteSet.modelSubCategoryMode]($frontend):

- Union - an element will be hilited if either its model or its subcategory is hilited; or
- Intersection - an element will be hilited if both its model and its subcategory are hilited.

Applications often work with [Category]($backend)'s instead of subcategories. You can use the new [Categories API](#frontend-category-apis) to obtain the Ids of the subcategories belonging to one or more categories.

### Improved appearance overrides for animated views

The appearances of elements within a view can be [customized](../learning/display/SymbologyOverrides.md) in a variety of ways. Two such sources of customization are a [FeatureOverrideProvider]($frontend) like [EmphasizeElements]($frontend), which can change the color, transparency, and/or emphasis effect applied to any number of elements; and a [RenderSchedule.Script]($common), which can modify the color and transparency of groups of elements over time. Previously, when these two sources of appearance overrides came into conflict, the results were less than ideal:

- If any aspect of the element's appearance was overridden by a [FeatureOverrideProvider]($frontend), then **none** of the schedule script's appearance overrides would be applied to that element.
- If some elements were being emphasized in the view (e.g., via [EmphasizeElements.emphasizeElements]($frontend)), any non-emphasized elements whose appearance was modified by the schedule script would not be drawn using the de-emphasized (typically, light transparent grey) appearance, making it difficult for the emphasized elements to stand out.

Both of these problems are addressed in iTwin.js 3.3.0.

- The schedule script's overrides are now combined with the element's overrides, but at a lower priority such that if a FeatureOverrideProvider changes the color of the element to red, and the script wants to change its color to green and make it semi-transparent, the element will be drawn as semi-transparent red.
- [EmphasizeElements]($frontend) now ignores the schedule script's color and transparency overrides for non-emphasized elements when other elements are being emphasized. Other [FeatureOverrideProvider]($frontend)s can do the same - or otherwise customize to which elements the script's overrides are applied - by supplying a function to do so to [FeatureOverrides.ignoreAnimationOverrides]($common).

## AppUi

### Auto-hiding floating widgets

When a widget is in floating state, it will not automatically hide when the rest of the UI auto-hides. To create a widget that will automatically hide with the in-viewport tool widgets, set the prop [AbstractWidgetProps.hideWithUiWhenFloating]($appui-abstract) to `true` in your UiProvider.

Auto-hide UI feature will ignore dragged floating widgets and keep them visible until drag interaction is complete. Floating widgets are also animated correctly when hiding.

### Tool Settings title

By default, when the Tool Settings widget is floating, the title will read "Tool Settings". To use the name of the active tool as the title instead, you can now use [UiFramework.setUseToolAsToolSettingsLabel]($appui-react) when your app starts.

```ts
UiFramework.setUseToolAsToolSettingsLabel(true);
```

## ElectronApp changes

Reduced API surface of an `ElectronApp` class to only allow white-listed APIs from `electron` modules to be called. `ElectronApp` is updated to reflect the change: `callShell` and `callApp` methods are removed, `callDialog` is updated to only show dialogs and a message box.

## Frontend category APIs

A [Category]($backend) provides a way to organize groups of [GeometricElement]($backend)s. Each category contains at least one [SubCategory]($backend) which defines the appearance of geometry belonging to that subcategory. This information is important for frontend code - for example, the display system needs access to subcategory appearances so that it can draw elements correctly, and applications may want to [hilite subcategories](#hiliting-models-and-subcategories) in a [Viewport]($frontend).

[IModelConnection.categories]($frontend) now provides access to APIs for querying this information. The information is cached upon retrieval so that repeated requests need not query the backend.

- [IModelConnection.Categories.getCategoryInfo]($frontend) provides the Ids and appearance properties of all subcategories belonging to one or more categories.
- [IModelConnection.Categories.getSubCategoryInfo]($frontend) provides the appearance properties of one or more subcategories belonging to a specific category.

## IModelHostOptions

The argument for [IModelHost.startup]($backend) has been changed from [IModelHostConfiguration]($backend) to the [IModelHostOptions]($backend) interface. This matches the approach on the frontend for [IModelApp.startup]($frontend) and makes it easier to supply startup options. `IModelHostConfiguration` implements `IModelHostOptions`, so existing code will continue to work without changes.

## Progress API for downloading changesets

[BackendHubAccess]($core-backend) interface now supports progress reporting and cancellation of changeset(s) download. [BackendHubAccess.downloadChangeset]($core-backend) and [BackendHubAccess.downloadChangesets]($core-backend) take optional argument `progressCallback` of type [ProgressFunction]($core-backend). If function is passed, it is regularly called to report download progress. Changeset(s) download can be cancelled by returning [ProgressStatus.Abort]($core-backend) from said function.

## RPC over IPC

When a web application is using IPC communication between its frontend and backend, the RPC protocols now delegate request and response transportation to the IPC system.
After the initial "handshake" request, there are now no further HTTP requests. All traffic (both IPC and RPC) is sent over the WebSocket.
This change yields security benefits by reducing the surface area of our frontend/backend communication and provides performance consistency for the application.

## Presentation

### Relationship properties

Properties that are defined on [ECRelationshipClass](../bis/ec/ec-relationship-class.md) can now be included in content using newly added [`RelatedPropertiesSpecification.relationshipProperties`](../presentation/content/RelatedPropertiesSpecification.md#attribute-relationshipproperties) attribute.

When relationship properties are shown, or [`RelatedPropertiesSpecification.forceCreateRelationshipProperties`](../presentation/content/RelatedPropertiesSpecification.md#attribute-forcecreaterelationshipcategory) attribute is set to `true`, all information coming from that relationship, including related instance properties, will be organized within a category named after the relationship class.

## Webpack 5

The `@itwin/core-webpack-tools` and `@itwin/backend-webpack-tools` packages have been updated to support [Webpack 5](https://webpack.js.org/) and now require a peer dependency of _webpack@^5_. Please refer to their [changelog](https://github.com/webpack/changelog-v5/blob/master/README.md) and [migration guide](https://github.com/webpack/changelog-v5/blob/master/MIGRATION%20GUIDE.md) as you update.

## Deprecations

### @itwin/core-bentley

The AuthStatus enum has been removed. This enum has fallen out of use since the authorization refactor in 3.0.0, and is no longer a member of [BentleyError]($core-bentley).

The beta functions [Element.collectPredecessorIds]($core-backend) and [Element.getPredecessorIds]($core-backend) have been deprecated and replaced with [Element.collectReferenceIds]($core-backend) and [Element.getReferenceIds]($core-backend), since the term "predecessor" has been inaccurate since 3.2.0, when the transformer became capable of handling cyclic references and not just references to elements that were inserted before itself (predecessors).

### @itwin/core-geometry

Growable array constructors now take an optional growth factor to control additional capacity during memory reallocations (default 1.5). This can make repeated additions to these arrays more efficient. Affected classes are [GrowableBlockedArray]($core-geometry), [GrowableFloat64Array]($core-geometry), [GrowableXYArray]($core-geometry), and [GrowableXYZArray]($core-geometry). In addition, loops in `ensureCapacity`, `pushBlockCopy`, `resize`, `clone`, etc. have been replaced with more efficient calls to typed array `set`, `copyWithin`, `fill`.

The [GrowableXYArray]($core-geometry) method `setXYZAtCheckedPointIndex` is deprecated in favor of the more appropriately named new method `setXYAtCheckedPointIndex`.

### @itwin/core-mobile

IOSApp, IOSAppOpts, and AndroidApp have been removed in favor of [MobileApp]($core-mobile) and [MobileAppOpts]($core-mobile). Developers were previously discouraged from making direct use of [MobileApp]($core-mobile), which was a base class of the two platform specific mobile apps. This distinction has been removed, as the implementation of the two apps was the same. IOSAppOpts, now [MobileAppOpts]($core-mobile), is an extension of [NativeAppOpts]($core-frontend) with the added condition that an [AuthorizationClient]($core-common) is never provided.

IOSHost, IOSHostOpts, AndroidHost, and AndroidHostOpts have been removed in favor of [MobileHost]($core-mobile) for the same reasons described above.
