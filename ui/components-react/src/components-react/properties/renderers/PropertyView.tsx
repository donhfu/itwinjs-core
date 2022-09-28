/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
/** @packageDocumentation
 * @module Properties
 */

import "./PropertyView.scss";
import * as React from "react";
import { PropertyValueFormat } from "@itwin/appui-abstract";
import { ElementSeparator, Orientation } from "@itwin/core-react";
import { ActionButtonList } from "./ActionButtonList";
import { PropertyGridColumnStyleProvider } from "./PropertyGridColumns";
import { SharedRendererProps } from "./PropertyRenderer";

/** Properties of [[PropertyView]] React component
 * @public
 */
export interface PropertyViewProps extends SharedRendererProps {
  /** Property label as a React element */
  labelElement: React.ReactNode;
  /** Property value as a React element */
  valueElement?: React.ReactNode;
  /** Render callback for property value. If specified, `valueElement` is ignored. */
  valueElementRenderer?: () => React.ReactNode;
}

/** @internal */
interface PropertyViewState {
  isHovered: boolean;
}

/**
 * A React component that renders property as label/value pair
 * @public
 */
export class PropertyView extends React.Component<PropertyViewProps, PropertyViewState> {
  constructor(props: PropertyViewProps) {
    super(props);
    this.state = {
      isHovered: false,
    };
  }

  private _onClick = () => {
    if (this.props.onClick)
      this.props.onClick(this.props.propertyRecord, this.props.uniqueKey);
  };

  private _onMouseEnter = () => {
    if (this.props.isHoverable)
      this.setState({ isHovered: true });
  };

  private _onMouseLeave = () => {
    if (this.props.isHoverable)
      this.setState({ isHovered: false });
  };

  private _onContextMenu = (e: React.MouseEvent) => {
    if (this.props.onContextMenu)
      this.props.onContextMenu(this.props.propertyRecord, e);
    if (this.props.onRightClick)
      this.props.onRightClick(this.props.propertyRecord, this.props.uniqueKey);
    e.preventDefault();
    return false;
  };

  private getClassName(props: PropertyViewProps) {
    let propertyRecordClassName = props.orientation === Orientation.Horizontal
      ? "components-property-record--horizontal"
      : "components-property-record--vertical";
    if (props.isSelected)
      propertyRecordClassName += " components--selected";
    if (props.onClick)
      propertyRecordClassName += " components--clickable";
    if (props.isHoverable)
      propertyRecordClassName += " components--hoverable";
    return propertyRecordClassName;
  }

  /** @internal */
  public override render() {
    const ratio = this.props.columnRatio ? this.props.columnRatio : 0.25;
    const needElementSeparator = this.props.orientation === Orientation.Horizontal && !!this.props.onColumnRatioChanged;
    const needActionButtons = !!this.props.actionButtonRenderers;
    const columnsStyleProvider = new PropertyGridColumnStyleProvider(this.props.columnInfo);

    return (
      <div
        style={columnsStyleProvider.getStyle(this.props.orientation, needActionButtons, ratio, needElementSeparator)}
        className={this.getClassName(this.props)}
        onClick={this._onClick}
        onContextMenu={this._onContextMenu}
        onMouseEnter={this._onMouseEnter}
        onMouseLeave={this._onMouseLeave}
        role="presentation"
      >
        <div className="components-property-record-label">{this.props.labelElement}</div>
        {needElementSeparator
          ? <ElementSeparator
            movableArea={this.props.width}
            onRatioChanged={this.props.onColumnRatioChanged}
            ratio={ratio}
            orientation={this.props.orientation}
            isResizeHandleHovered={this.props.isResizeHandleHovered}
            onResizeHandleHoverChanged={this.props.onResizeHandleHoverChanged}
            isResizeHandleBeingDragged={this.props.isResizeHandleBeingDragged}
            onResizeHandleDragChanged={this.props.onResizeHandleDragChanged}
          />
          : undefined}
        {this.props.propertyRecord.value.valueFormat === PropertyValueFormat.Primitive
          ? <div className="components-property-record-value">
            {this.props.valueElementRenderer ? this.props.valueElementRenderer() : this.props.valueElement}
          </div>
          : undefined
        }
        {this.props.actionButtonRenderers
          ?
          <ActionButtonList
            orientation={this.props.orientation}
            property={this.props.propertyRecord}
            isPropertyHovered={this.state.isHovered}
            actionButtonRenderers={this.props.actionButtonRenderers}
          />
          :
          undefined
        }
      </div>
    );
  }
}
