/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
import { expect } from "chai";
import { IModelConnection, SnapshotConnection } from "@itwin/core-frontend";
import { ContentSpecificationTypes, KeySet, Ruleset, RuleTypes } from "@itwin/presentation-common";
import { Presentation } from "@itwin/presentation-frontend";
import { initialize, terminate } from "../../../IntegrationTests";
import { printRuleset } from "../../Utils";

describe("Learning Snippets", () => {

  let imodel: IModelConnection;

  beforeEach(async () => {
    await initialize();
    imodel = await SnapshotConnection.openFile("assets/datasets/Properties_60InstancesWithUrl2.ibim");
  });

  afterEach(async () => {
    await imodel.close();
    await terminate();
  });

  describe("Content Specifications", () => {

    describe("SelectedNodeInstances", () => {

      it("uses `acceptableSchemaName` attribute", async () => {
        // __PUBLISH_EXTRACT_START__ Presentation.SelectedNodeInstances.AcceptableSchemaName.Ruleset
        // The ruleset has a specification that only returns content for input class instances which
        // are under `BisCore` schema.
        const ruleset: Ruleset = {
          id: "example",
          rules: [{
            ruleType: RuleTypes.Content,
            specifications: [{
              specType: ContentSpecificationTypes.SelectedNodeInstances,
              acceptableSchemaName: "BisCore",
            }],
          }],
        };
        // __PUBLISH_EXTRACT_END__
        printRuleset(ruleset);

        // Ensure that only `BisCore` content instances are returned.
        const content = await Presentation.presentation.getContent({
          imodel,
          rulesetOrId: ruleset,
          keys: new KeySet([{ className: "BisCore:SpatialViewDefinition", id: "0x25" }, { className: "Generic:GroupModel", id: "0x13" }]),
          descriptor: {},
        });

        expect(content!.contentSet).to.have.lengthOf(1).and.to.containSubset([{
          classInfo: { label: "Spatial View Definition" },
        }]);
      });

      it("uses `acceptableClassNames` attribute", async () => {
        // __PUBLISH_EXTRACT_START__ Presentation.SelectedNodeInstances.AcceptableClassNames.Ruleset
        // The ruleset has a specification that only returns content for input class instances which
        // are of class `bis.SpatialViewDefinition`.
        const ruleset: Ruleset = {
          id: "example",
          rules: [{
            ruleType: RuleTypes.Content,
            specifications: [{
              specType: ContentSpecificationTypes.SelectedNodeInstances,
              acceptableClassNames: ["SpatialViewDefinition"],
            }],
          }],
        };
        // __PUBLISH_EXTRACT_END__
        printRuleset(ruleset);

        // Ensure that only `bis.SpatialViewDefinition` content instances are returned.
        const content = await Presentation.presentation.getContent({
          imodel,
          rulesetOrId: ruleset,
          keys: new KeySet([{ className: "BisCore:SpatialViewDefinition", id: "0x25" }, { className: "BisCore:DictionaryModel", id: "0x10" }]),
          descriptor: {},
        });

        expect(content!.contentSet).to.have.lengthOf(1).and.to.containSubset([{
          classInfo: { label: "Spatial View Definition" },
        }]);
      });

      it("uses `acceptablePolymorphically` attribute", async () => {
        // __PUBLISH_EXTRACT_START__ Presentation.SelectedNodeInstances.AcceptablePolymorphically.Ruleset
        // The ruleset has a specification that returns content for `bis.ViewDefinition` input class instances
        // and all deriving classes.
        const ruleset: Ruleset = {
          id: "example",
          rules: [{
            ruleType: RuleTypes.Content,
            specifications: [{
              specType: ContentSpecificationTypes.SelectedNodeInstances,
              acceptableClassNames: ["ViewDefinition"],
              acceptablePolymorphically: true,
            }],
          }],
        };
        // __PUBLISH_EXTRACT_END__
        printRuleset(ruleset);

        // Ensure that only content instances of `bis.ViewDefinition` and derived classes are returned.
        const content = await Presentation.presentation.getContent({
          imodel,
          rulesetOrId: ruleset,
          keys: new KeySet([{ className: "BisCore:DictionaryModel", id: "0x10" }, { className: "BisCore:SpatialViewDefinition", id: "0x25" }]),
          descriptor: {},
        });

        expect(content!.contentSet).to.have.lengthOf(1);
        expect(content!.contentSet[0].primaryKeys[0].className).to.equal("BisCore:SpatialViewDefinition");
      });

    });

  });

});
