/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/

import ECClass from "./Class";
import Mixin from "./Mixin";
import RelationshipClass from "./RelationshipClass";
import { LazyLoadedMixin } from "../Interfaces";
import { ECClassModifier, RelatedInstanceDirection, SchemaChildType, parseStrengthDirection } from "../ECObjects";
import { ECObjectsError, ECObjectsStatus } from "../Exception";
import { NavigationProperty, AnyProperty } from "./Property";
import { DelayedPromiseWithProps } from "../DelayedPromise";
import Schema from "./Schema";

/**
 * A Typescript class representation of an ECEntityClass.
 */
export default class EntityClass extends ECClass {
  public readonly type: SchemaChildType.EntityClass;
  protected _mixins?: LazyLoadedMixin[];

  constructor(schema: Schema, name: string, modifier?: ECClassModifier) {
    super(schema, name, SchemaChildType.EntityClass, modifier);
  }

  get mixins(): LazyLoadedMixin[] {
    if (!this._mixins)
      return [];
    return this._mixins;
  }

  /**
   *
   * @param mixin
   */
  protected addMixin(mixin: Mixin) {
    if (!this._mixins)
      this._mixins = [];

    this._mixins.push(new DelayedPromiseWithProps(mixin.key, async () => mixin));
    return;
  }

  /**
   * Searches the base class, if one exists, first then any mixins that exist for the property with the name provided.
   * @param name The name of the property to find.
   */
  public async getInheritedProperty(name: string): Promise<AnyProperty | undefined> {
    let inheritedProperty = await super.getInheritedProperty(name);

    if (!inheritedProperty && this._mixins) {
      const mixinProps = await Promise.all(this._mixins.map(async (mixin) => (await mixin).getProperty(name)));
      mixinProps.some((prop) => {
        inheritedProperty = prop as AnyProperty;
        return inheritedProperty !== undefined;
      });
    }

    return inheritedProperty as AnyProperty | undefined;
  }

  /**
   *
   * @param name
   * @param relationship
   * @param direction
   */
  protected async createNavigationProperty(name: string, relationship: string | RelationshipClass, direction?: string | RelatedInstanceDirection): Promise<NavigationProperty> {
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
    return this.addProperty(new NavigationProperty(this, name, lazyRelationship, direction));
  }

  /**
   *
   * @param jsonObj
   */
  public async fromJson(jsonObj: any): Promise<void> {
    await super.fromJson(jsonObj);

    if (undefined !== jsonObj.mixins) {
      if (!Array.isArray(jsonObj.mixins))
        throw new ECObjectsError(ECObjectsStatus.InvalidECJson, `The ECEntityClass ${this.name} has an invalid 'mixins' attribute. It should be of type 'string[]'.`);

      for (const name of jsonObj.mixins) {
        if (typeof(name) !== "string")
          throw new ECObjectsError(ECObjectsStatus.InvalidECJson, `The ECEntityClass ${this.name} has an invalid 'mixins' attribute. It should be of type 'string[]'.`);

        const tempMixin = await this.schema.getChild<Mixin>(name, false);
        if (!tempMixin)
          throw new ECObjectsError(ECObjectsStatus.InvalidECJson, `The ECEntityClass ${this.name} has a mixin ("${name}") that cannot be found.`);

        this.addMixin(tempMixin);
      }
    }
  }
}

/** @internal
 * Hackish approach that works like a "friend class" so we can access protected members without making them public.
 */
export abstract class MutableEntityClass extends EntityClass {
  public abstract addMixin(mixin: Mixin): any;
  public abstract async createNavigationProperty(name: string, relationship: string | RelationshipClass, direction?: string | RelatedInstanceDirection): Promise<NavigationProperty>;
}
