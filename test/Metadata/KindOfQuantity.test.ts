/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/

import { assert, expect } from "chai";
import Schema from "../../source/Metadata/Schema";
import { ECObjectsError } from "../../source/Exception";
import KindOfQuantity from "../../source/Metadata/KindOfQuantity";

describe("KindOfQuantity", () => {
  describe("deserialization", () => {
    it("fully defined", async () => {
      const testSchema = {
        $schema: "https://dev.bentley.com/json_schemas/ec/31/draft-01/ecschema",
        name: "TestSchema",
        version: "1.2.3",
        children: {
          testKoQ: {
            schemaChildType: "KindOfQuantity",
            precision: 5,
            persistenceUnit: {
              format: "DefaultReal",
              unit: "MM",
            },
            presentationUnits: [
              {
                format: "DefaultReal",
                unit: "CM",
              },
              {
                format: "DefaultReal",
                unit: "IN",
              },
            ],
          },
        },
      };

      const ecSchema = await Schema.fromJson(testSchema);
      assert.isDefined(ecSchema);

      const testChild = await ecSchema.getChild("testKoQ");
      assert.isDefined(testChild);
      assert.isTrue(testChild instanceof KindOfQuantity);

      const testKoQ: KindOfQuantity = testChild as KindOfQuantity;
      assert.isDefined(testKoQ);

      expect(testKoQ.precision).equal(5);
      assert.isDefined(testKoQ.persistenceUnit);

      const persistenceUnit = testKoQ.persistenceUnit;
      expect(persistenceUnit.format).equal("DefaultReal");

      expect(testKoQ.presentationUnits.length).equal(2);

      assert.isTrue(testKoQ.presentationUnits[0] === testKoQ.defaultPresentationUnit);
    });
  });

  describe("fromJson", () => {
    let testKoQ: KindOfQuantity;

    beforeEach(() => {
      const schema = new Schema("TestSchema", 1, 0, 0);
      testKoQ = new KindOfQuantity(schema, "TestKindOfQuantity");
    });

    async function testInvalidAttribute(attributeName: string, expectedType: string, value: any) {
      expect(testKoQ).to.exist;
      const json: any = { [attributeName]: value };
      await expect(testKoQ.fromJson(json)).to.be.rejectedWith(ECObjectsError, `The KindOfQuantity TestKindOfQuantity has an invalid '${attributeName}' attribute. It should be of type '${expectedType}'.`);
    }

    it("should throw for invalid precision", async () => testInvalidAttribute("precision", "number", false));
    it("should throw for presentationUnits not an array", async () => testInvalidAttribute("presentationUnits", "object[]", 0));
    it("should throw for presentationUnits not an array of objects", async () => testInvalidAttribute("presentationUnits", "object[]", [0]));

    it("should throw for presentationUnit with missing unit", async () => {
      expect(testKoQ).to.exist;
      const json: any = {
        presentationUnits: [{ format: "valid" }],
      };
      await expect(testKoQ.fromJson(json)).to.be.rejectedWith(ECObjectsError, `The KindOfQuantity TestKindOfQuantity has a presentationUnit that is missing the required attribute 'unit'.`);
    });

    it("should throw for presentationUnit with invalid unit", async () => {
      expect(testKoQ).to.exist;
      const json: any = {
        presentationUnits: [{ unit: 0, format: "valid" }],
      };
      await expect(testKoQ.fromJson(json)).to.be.rejectedWith(ECObjectsError, `The KindOfQuantity TestKindOfQuantity has a presentationUnit with an invalid 'unit' attribute. It should be of type 'string'.`);
    });

    it("should throw for presentationUnit with missing format", async () => {
      expect(testKoQ).to.exist;
      const json: any = {
        presentationUnits: [{ unit: "valid" }],
      };
      await expect(testKoQ.fromJson(json)).to.be.rejectedWith(ECObjectsError, `The KindOfQuantity TestKindOfQuantity has a presentationUnit that is missing the required attribute 'format'.`);
    });

    it("should throw for presentationUnit with invalid format", async () => {
      expect(testKoQ).to.exist;
      const json: any = {
        presentationUnits: [{ unit: "valid", format: false }],
      };
      await expect(testKoQ.fromJson(json)).to.be.rejectedWith(ECObjectsError, `The KindOfQuantity TestKindOfQuantity has a presentationUnit with an invalid 'format' attribute. It should be of type 'string'.`);
    });

    it("should throw for persistenceUnit not an object", async () => testInvalidAttribute("persistenceUnit", "object", 0));

    it("should throw for persistenceUnit with missing unit", async () => {
      expect(testKoQ).to.exist;
      const json: any = {
        persistenceUnit: { format: "valid" },
      };
      await expect(testKoQ.fromJson(json)).to.be.rejectedWith(ECObjectsError, `The KindOfQuantity TestKindOfQuantity has a persistenceUnit that is missing the required attribute 'unit'.`);
    });

    it("should throw for persistenceUnit with invalid unit", async () => {
      expect(testKoQ).to.exist;
      const json: any = {
        persistenceUnit: { unit: 0, format: "valid" },
      };
      await expect(testKoQ.fromJson(json)).to.be.rejectedWith(ECObjectsError, `The KindOfQuantity TestKindOfQuantity has a persistenceUnit with an invalid 'unit' attribute. It should be of type 'string'.`);
    });

    it("should throw for persistenceUnit with missing format", async () => {
      expect(testKoQ).to.exist;
      const json: any = {
        persistenceUnit: { unit: "valid" },
      };
      await expect(testKoQ.fromJson(json)).to.be.rejectedWith(ECObjectsError, `The KindOfQuantity TestKindOfQuantity has a persistenceUnit that is missing the required attribute 'format'.`);
    });

    it("should throw for persistenceUnit with invalid format", async () => {
      expect(testKoQ).to.exist;
      const json: any = {
        persistenceUnit: { unit: "valid", format: false },
      };
      await expect(testKoQ.fromJson(json)).to.be.rejectedWith(ECObjectsError, `The KindOfQuantity TestKindOfQuantity has a persistenceUnit with an invalid 'format' attribute. It should be of type 'string'.`);
    });
  });
});
