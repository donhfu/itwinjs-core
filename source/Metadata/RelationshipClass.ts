/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/

import ECClass from "./Class";
import { ECClassModifier, RelatedInstanceDirection, RelationshipEnd, RelationshipMultiplicity, SchemaChildType, StrengthType,
        parseStrength, parseStrengthDirection } from "../ECObjects";
import { LazyLoadedRelationshipConstraintClass } from "../Interfaces";
import { ECObjectsError, ECObjectsStatus } from "../Exception";
import { NavigationProperty } from "./Property";
import { DelayedPromiseWithProps } from "../DelayedPromise";
import EntityClass from "./EntityClass";
import MixinClass from "./MixinClass";
import ECSchema from "./Schema";

type AnyConstraintClass = EntityClass | MixinClass | RelationshipClass;

/**
 * A Typescript class representation of a ECRelationshipClass.
 */
export default class RelationshipClass extends ECClass {
  public schema: ECSchema;
  public readonly type: SchemaChildType.RelationshipClass;
  public strength: StrengthType;
  public strengthDirection: RelatedInstanceDirection;
  public readonly source: RelationshipConstraint;
  public readonly target: RelationshipConstraint;

  constructor(schema: ECSchema, name: string, strength?: StrengthType, strengthDirection?: RelatedInstanceDirection, modifier?: ECClassModifier) {
    super(schema, name, modifier);

    this.key.type = SchemaChildType.RelationshipClass;

    if (strength) this.strength = strength; else this.strength = StrengthType.Referencing;
    if (strengthDirection) this.strengthDirection = strengthDirection; else this.strengthDirection = RelatedInstanceDirection.Forward;

    this.source = new RelationshipConstraint(this, RelationshipEnd.Source);
    this.target = new RelationshipConstraint(this, RelationshipEnd.Target);
  }

  /**
   *
   * @param name
   * @param relationship
   * @param direction
   */
  public async createNavigationProperty(name: string, relationship: string | RelationshipClass, direction?: string | RelatedInstanceDirection): Promise<NavigationProperty> {
    if (await this.getProperty(name))
      throw new ECObjectsError(ECObjectsStatus.DuplicateProperty, `An ECProperty with the name ${name} already exists in the class ${this.name}.`);

    let resolvedRelationship: RelationshipClass | undefined;
    if (typeof(relationship) === "string")
      resolvedRelationship = await this.schema.getChild<RelationshipClass>(relationship, false);
    else
      resolvedRelationship = relationship;

    if (!resolvedRelationship)
      throw new ECObjectsError(ECObjectsStatus.InvalidType, `The provided RelationshipClass, ${relationship}, is not a valid RelationshipClassInterface.`);

    if (!direction)
      direction = RelatedInstanceDirection.Forward;
    else if (typeof(direction) === "string")
      direction = parseStrengthDirection(direction);

    const lazyRelationship = new DelayedPromiseWithProps(resolvedRelationship.key, async () => resolvedRelationship!);
    return this.addProperty(new NavigationProperty(name, lazyRelationship, direction));
  }

  /**
   *
   * @param jsonObj
   */
  public async fromJson(jsonObj: any): Promise<void> {
    await super.fromJson(jsonObj);

    if (jsonObj.strength) this.strength = parseStrength(jsonObj.strength);
    if (jsonObj.strengthDirection) this.strengthDirection = parseStrengthDirection(jsonObj.strengthDirection);
  }
}

/**
 * A Typescript class representation of a ECRelationshipConstraint.
 */
export class RelationshipConstraint implements RelationshipConstraint {
  private _abstractConstraint?: LazyLoadedRelationshipConstraintClass;
  public relationshipClass: RelationshipClass;
  public relationshipEnd: RelationshipEnd;
  public multiplicity?: RelationshipMultiplicity;
  public polymorphic?: boolean;
  public roleLabel?: string;
  public constraintClasses?: LazyLoadedRelationshipConstraintClass[];

  constructor(relClass: RelationshipClass, relEnd: RelationshipEnd) {
    this.relationshipEnd = relEnd;
    this.polymorphic = false;
    this.multiplicity = RelationshipMultiplicity.zeroOne;
    this.relationshipClass = relClass;
  }

  get abstractConstraint(): LazyLoadedRelationshipConstraintClass | undefined {
    if (this._abstractConstraint)
      return this._abstractConstraint;

    if (this.constraintClasses && this.constraintClasses.length === 1)
      return this.constraintClasses[0];

    return this._abstractConstraint;
  }

  set abstractConstraint(abstractConstraint: LazyLoadedRelationshipConstraintClass | undefined) {
    this._abstractConstraint = abstractConstraint;
  }

  /**
   * Returns true if this RelationshipConstraint is the Source relationship end.
   */
  get isSource(): boolean { return this.relationshipEnd === RelationshipEnd.Source; }

  /**
   * Adds the provided class as a constraint class to this constraint.
   * @param constraint The class to add as a constraint class.
   */
  public addClass(constraint: EntityClass | MixinClass | RelationshipClass): void {
    // Ensure we don't start mixing constraint class types
    if (this.constraintClasses && this.constraintClasses.length > 0 && this.constraintClasses[0].type !== constraint.key.type)
      throw new ECObjectsError(ECObjectsStatus.InvalidECJson, ``);

    if (!this.constraintClasses)
      this.constraintClasses = [];

    // TODO: Handle relationship constraints
    this.constraintClasses.push(new DelayedPromiseWithProps(constraint.key, async () => constraint));
  }

  /**
   * Populates this object with the provided json object.
   * @param jsonObj The json representation of an ECRelationshipConstraint using the ECSchemaJson format.
   */
  public async fromJson(jsonObj: any): Promise<void> {
    if (jsonObj.roleLabel) this.roleLabel = jsonObj.roleLabel;
    if (jsonObj.polymorphic) this.polymorphic = jsonObj.polymorphic;

    if (jsonObj.multiplicity) {
      const multTmp = RelationshipMultiplicity.fromString(jsonObj.multiplicity);
      if (!multTmp)
        throw new ECObjectsError(ECObjectsStatus.InvalidMultiplicity, ``);
      this.multiplicity = multTmp;
    }

    const relClassSchema = this.relationshipClass.schema;

    if (jsonObj.abstractConstraint) {
      if (typeof(jsonObj.abstractConstraint) !== "string")
        throw new ECObjectsError(ECObjectsStatus.InvalidECJson, ``);

      const tempAbstractConstraint = await relClassSchema.getChild<AnyConstraintClass>(jsonObj.abstractConstraint, false);
      if (!tempAbstractConstraint)
          throw new ECObjectsError(ECObjectsStatus.InvalidECJson, ``);

      this.abstractConstraint = new DelayedPromiseWithProps(tempAbstractConstraint.key, async () => tempAbstractConstraint);
    }

    if (jsonObj.constraintClasses) {
      if (!Array.isArray(jsonObj.constraintClasses))
        throw new ECObjectsError(ECObjectsStatus.InvalidECJson, ``);

      const loadEachConstraint = async (constraintClassName: string) => {
          const tempConstraintClass = await relClassSchema.getChild<AnyConstraintClass>(constraintClassName, false);
          if (!tempConstraintClass)
            throw new ECObjectsError(ECObjectsStatus.InvalidECJson, ``);

          return tempConstraintClass;
      };
      const constraintClasses = await Promise.all<AnyConstraintClass>(jsonObj.constraintClasses.map(loadEachConstraint));
      constraintClasses.forEach((constraintClass: AnyConstraintClass) => this.addClass(constraintClass));
    }
  }
}
