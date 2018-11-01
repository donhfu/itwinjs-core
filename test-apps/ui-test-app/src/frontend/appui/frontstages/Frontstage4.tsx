/*---------------------------------------------------------------------------------------------
* Copyright (c) 2018 Bentley Systems, Incorporated. All rights reserved.
* Licensed under the MIT License. See LICENSE.md in the project root for license terms.
*--------------------------------------------------------------------------------------------*/
import * as React from "react";

import {
  FrontstageProps,
  GroupButton,
  ToolButton,
  ToolWidget,
  ZoneState,
  WidgetState,
  NavigationWidget,
  ContentGroup,
  ModalDialogManager,
  FrontstageProvider,
  Frontstage,
  Zone,
  Widget,
} from "@bentley/ui-framework";

import { AppStatusBarWidgetControl } from "../statusbars/AppStatusBar";
import { NavigationTreeWidgetControl } from "../widgets/NavigationTreeWidget";
import { VerticalPropertyGridWidgetControl, HorizontalPropertyGridWidgetControl } from "../widgets/PropertyGridDemoWidget";
import { BreadcrumbDemoWidgetControl } from "../widgets/BreadcrumbDemoWidget";
import { TableDemoWidgetControl } from "../widgets/TableDemoWidget";
import { TreeDemoWidgetControl } from "../widgets/TreeDemoWidget";

import Toolbar from "@bentley/ui-ninezone/lib/toolbar/Toolbar";
import Direction from "@bentley/ui-ninezone/lib/utilities/Direction";

import { TestModalDialog } from "../dialogs/TestModalDialog";
import { TestRadialMenu } from "../dialogs/TestRadialMenu";
import { AppTools } from "../../tools/ToolSpecifications";

export class Frontstage4 extends FrontstageProvider {

  public get frontstage(): React.ReactElement<FrontstageProps> {
    const myContentGroup: ContentGroup = new ContentGroup(
      {
        contents: [
          {
            classId: "CubeContent",
          },
        ],
      },
    );

    return (
      <Frontstage
        id="Test4"
        defaultToolId="PlaceLine"
        defaultLayout="SingleContent"
        contentGroup={myContentGroup}
        defaultContentId="TestContent1"
        isInFooterMode={true}
        applicationData={{ key: "value" }}
        topLeft={
          <Zone
            widgets={[
              <Widget isFreeform={true} element={this.getToolWidget()} />,
            ]}
          />
        }
        topCenter={
          <Zone
            widgets={[
              <Widget isToolSettings={true} />,
            ]}
          />
        }
        topRight={
          <Zone
            widgets={[
              <Widget isFreeform={true} element={this.getNavigationWidget()} />,
            ]}
          />
        }
        centerRight={
          <Zone allowsMerging={true}
            widgets={[
              <Widget iconClass="icon-placeholder" labelKey="SampleApp:widgets.NavigationTree" control={NavigationTreeWidgetControl} />,
              <Widget iconClass="icon-placeholder" labelKey="SampleApp:widgets.BreadcrumbDemo" control={BreadcrumbDemoWidgetControl} />,
              <Widget iconClass="icon-placeholder" labelKey="SampleApp:widgets.TreeDemo" control={TreeDemoWidgetControl} />,
            ]}
          />
        }
        bottomCenter={
          <Zone defaultState={ZoneState.Open}
            widgets={[
              <Widget isStatusBar={true} iconClass="icon-placeholder" labelKey="SampleApp:widgets.StatusBar" control={AppStatusBarWidgetControl} />,
            ]}
          />
        }
        bottomRight={
          <Zone allowsMerging={true}
            widgets={[
              <Widget id="VerticalPropertyGrid" defaultState={WidgetState.Off} iconClass="icon-placeholder" labelKey="SampleApp:widgets.VerticalPropertyGrid" control={VerticalPropertyGridWidgetControl} />,
              <Widget defaultState={WidgetState.Open} iconClass="icon-placeholder" labelKey="SampleApp:widgets.HorizontalPropertyGrid" control={HorizontalPropertyGridWidgetControl} />,
              <Widget iconClass="icon-placeholder" labelKey="SampleApp:widgets.TableDemo" control={TableDemoWidgetControl} />,
            ]}
          />
        }
      />
    );
  }

  /** Define a ToolWidget with Buttons to display in the TopLeft zone. */
  private getToolWidget(): React.ReactNode {
    const horizontalToolbar =
      <Toolbar
        expandsTo={Direction.Bottom}
        items={
          <>
            <ToolButton toolId={AppTools.tool2.id} iconClass={AppTools.tool2.iconInfo.iconClass!} labelKey={AppTools.tool2.label} execute={AppTools.tool2.execute} />
            <GroupButton
              labelKey="SampleApp:buttons.toolGroup"
              iconClass="icon-placeholder"
              items={[AppTools.tool1, AppTools.tool2, AppTools.infoMessageCommand, AppTools.warningMessageCommand, AppTools.errorMessageCommand,
              AppTools.item6, AppTools.item7, AppTools.item8]}
              direction={Direction.Bottom}
              itemsInColumn={4}
            />
          </>
        }
      />;

    const verticalToolbar =
      <Toolbar
        expandsTo={Direction.Right}
        items={
          <>
            <ToolButton toolId={AppTools.tool1.id} iconClass={AppTools.tool1.iconInfo.iconClass!} labelKey={AppTools.tool1.label} execute={AppTools.tool1.execute} />
            <ToolButton toolId={AppTools.tool2.id} iconClass={AppTools.tool2.iconInfo.iconClass!} labelKey={AppTools.tool2.label} execute={AppTools.tool2.execute} />
            <GroupButton
              labelKey="SampleApp:buttons.anotherGroup"
              iconClass="icon-placeholder"
              items={[AppTools.tool1, AppTools.tool2, AppTools.item3, AppTools.item4, AppTools.item5,
              AppTools.item6, AppTools.item7, AppTools.item8]}
              direction={Direction.Right}
            />
            <ToolButton toolId={AppTools.tool2.id} iconClass={AppTools.tool2.iconInfo.iconClass!} labelKey={AppTools.tool2.label} execute={AppTools.tool2.execute} />
            <ToolButton toolId={AppTools.addMessageCommand.commandId} iconClass={AppTools.addMessageCommand.iconInfo.iconClass!} labelKey={AppTools.addMessageCommand.label} execute={AppTools.addMessageCommand.execute} />
          </>
        }
      />;

    return (
      <ToolWidget
        appButton={AppTools.backstageToggleCommand}
        horizontalToolbar={horizontalToolbar}
        verticalToolbar={verticalToolbar}
      />
    );
  }

  private modalDialog(): React.ReactNode {
    return (
      <TestModalDialog
        opened={true}
      />
    );
  }

  private radialMenu(): React.ReactNode {
    return (
      <TestRadialMenu
        opened={true} />
    );
  }

  /** Define a NavigationWidget with Buttons to display in the TopRight zone.
   */
  private getNavigationWidget(): React.ReactNode {

    const horizontalToolbar =
      <Toolbar
        expandsTo={Direction.Bottom}
        items={
          <>
            <ToolButton toolId={AppTools.item6.id} iconClass={AppTools.item6.iconInfo.iconClass!} labelKey={AppTools.item6.label} />
            <ToolButton toolId={AppTools.item5.id} iconClass={AppTools.item5.iconInfo.iconClass!} labelKey={AppTools.item5.label} />
            <ToolButton toolId="openDialog" iconClass="icon-placeholder" execute={() => ModalDialogManager.openModalDialog(this.modalDialog())} />
            <ToolButton toolId="openRadial" iconClass="icon-placeholder" execute={() => ModalDialogManager.openModalDialog(this.radialMenu())} />
          </>
        }
      />;

    const verticalToolbar =
      <Toolbar
        expandsTo={Direction.Left}
        items={
          <>
            <ToolButton toolId={AppTools.item8.id} iconClass={AppTools.item8.iconInfo.iconClass!} labelKey={AppTools.item8.label} />
            <ToolButton toolId={AppTools.item7.id} iconClass={AppTools.item7.iconInfo.iconClass!} labelKey={AppTools.item7.label} />
            <GroupButton
              labelKey="SampleApp:buttons.toolGroup"
              iconClass="icon-placeholder"
              items={[AppTools.successMessageBoxCommand, AppTools.informationMessageBoxCommand, AppTools.questionMessageBoxCommand,
              AppTools.warningMessageBoxCommand, AppTools.errorMessageBoxCommand, AppTools.openMessageBoxCommand, AppTools.openMessageBoxCommand2]}
              direction={Direction.Left}
              itemsInColumn={7}
            />
          </>
        }
      />;

    return (
      <NavigationWidget
        navigationAidId="CubeNavigationAid"
        horizontalToolbar={horizontalToolbar}
        verticalToolbar={verticalToolbar}
      />
    );
  }
}
