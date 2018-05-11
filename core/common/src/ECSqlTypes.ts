/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
/** @module ECSQL */

import { Id64Props, BentleyStatus } from "@bentley/bentleyjs-core";
import { IModelError } from "./IModelError";

/** Describes the different data types an ECSQL value can be of.
 *
 * See also [ECSQL]($docs/learning/ECSQL).
 */
export enum ECSqlValueType {
  // do not change the values of the enum as it must match its counterpart in the addon
  Blob = 1,
  Boolean = 2,
  DateTime = 3,
  Double = 4,
  Geometry = 5,
  Id = 6,
  Int = 7,
  Int64 = 8,
  Point2d = 9,
  Point3d = 10,
  String = 11,
  Navigation = 12,
  Struct = 13,
  PrimitiveArray = 14,
  StructArray = 15,
  Guid = 16,
}

/** An ECSQL Navigation value.
 *
 * It is returned from ECSQL SELECT statements for navigation properties.
 *
 * See also [ECSQL]($docs/learning/ECSQL).
 */
export interface NavigationValue {
  /** ECInstanceId of the related instance */
  id: Id64Props;
  /** Fully qualified class name of the relationship backing the Navigation property */
  relClassName?: string;
}

/** An ECSqlTypedString is used to decorate a string value with type information.
 *  This is necessary, when binding parameters to an ECSQL statement so that
 *  iModelJs can figure out the right EC type from the string value.
 *
 *  See also [iModelJs Types used in ECSQL Parameter Bindings]($docs/learning/ECSQLParameterTypes).
 */
export interface ECSqlTypedString {
  type: ECSqlStringType;
  value: string;
}

/** Type of an [ECSqlTypedString]($common) */
export enum ECSqlStringType {
  /** The string represents a BLOB value, formatted as Base64 string. */
  Blob,
  /** The string represents a DateTime value, formatted as ISO8601 string. */
  DateTime,
  /** The string represents a GUID value, formatted as GUID string (see [Guid]($bentleyjs-core)). */
  Guid,
  /** The string represents an Id value, formatted as hexadecimal string (see [Id64]($bentleyjs-core)). */
  Id,
  /** The string is not specifically typed. */
  String,
}

/** An ECSQL Navigation value which can be bound to a navigation property ECSQL parameter
 *
 * See also [ECSQL]($docs/learning/ECSQL).
 */
export interface NavigationBindingValue {
  /** ECInstanceId of the related instance */
  id: ECSqlTypedString | Id64Props;
  /** Fully qualified class name of the relationship backing the Navigation property */
  relClassName?: string;
  /** Table space where the relationship's schema is persisted. This is only required
   * if other ECDb files are attached to the primary one. In case a schema exists in more than one of the files,
   * pass the table space to disambiguate.
   */
  relClassTableSpace?: string;
}

/** Equivalent of the ECEnumeration OpCode in the **ECDbChange** ECSchema.
 *
 * The enum can be used when programmatically binding values to the InstanceChange.OpCode property of
 * the ECDbChange ECSchema.
 *
 *  See also
 *  - [ChangeSummary Overview]($docs/learning/ChangeSummaries)
 */
export enum ChangeOpCode {
  Insert = 1,
  Update = 2,
  Delete = 4,
}

/** The enum represents the values for the ChangedValueState argument of the ECSQL function
 *  **Changes**.
 *
 * The enum can be used when programmatically binding values to the ChangedValueState argument
 * in an ECSQL using the **Changes** ECSQL function.
 *
 *  See also
 *  - [ChangeSummary Overview]($docs/learning/ChangeSummaries)
 */
export enum ChangedValueState {
  AfterInsert = 1,
  BeforeUpdate = 2,
  AfterUpdate = 3,
  BeforeDelete = 4,
}

/** Defines the ECSQL system properties.
 *
 * See also [ECSQL]($docs/learning/ECSQL).
 */
export enum ECSqlSystemProperty {
  ECInstanceId,
  ECClassId,
  SourceECInstanceId,
  SourceECClassId,
  TargetECInstanceId,
  TargetECClassId,
  NavigationId,
  NavigationRelClassId,
  PointX,
  PointY,
  PointZ,
}

/** Utility to format ECProperty names according to the iModelJs formatting rules. */
export class ECJsNames {
  /** Formats the specified ECProperty name according to the iModelJs formatting rules.
   *
   * #### Rules
   *
   * - System properties:
   *    - [ECSqlSystemProperty.ECInstanceId]($common): id
   *    - [ECSqlSystemProperty.ECClassId]($common): className
   *    - [ECSqlSystemProperty.SourceECInstanceId]($common): sourceId
   *    - [ECSqlSystemProperty.SourceECClassId]($common): sourceClassName
   *    - [ECSqlSystemProperty.TargetECInstanceId]($common): targetId
   *    - [ECSqlSystemProperty.TargetECClassId]($common): targetClassName
   *    - [ECSqlSystemProperty.NavigationId]($common): id
   *    - [ECSqlSystemProperty.NavigationRelClassId]($common): relClassName
   *    - [ECSqlSystemProperty.PointX]($common): x
   *    - [ECSqlSystemProperty.PointY]($common): y
   *    - [ECSqlSystemProperty.PointZ]($common): z
   *  - Ordinary properties: first character is lowered.
   *
   * @param ecProperty Either the property name as defined in the ECSchema for regular ECProperties.
   *         Or an [ECSqlSystemProperty]($common) value for ECSQL system properties
   */
  public static toJsName(ecProperty: ECSqlSystemProperty | string): string {
    if (typeof (ecProperty) === "string")
      return ECJsNames.lowerFirstChar(ecProperty);

    switch (ecProperty) {
      case ECSqlSystemProperty.ECInstanceId:
      case ECSqlSystemProperty.NavigationId:
        return "id";
      case ECSqlSystemProperty.ECClassId:
        return "className";
      case ECSqlSystemProperty.SourceECInstanceId:
        return "sourceId";
      case ECSqlSystemProperty.SourceECClassId:
        return "sourceClassName";
      case ECSqlSystemProperty.TargetECInstanceId:
        return "targetId";
      case ECSqlSystemProperty.TargetECClassId:
        return "targetClassName";
      case ECSqlSystemProperty.NavigationRelClassId:
        return "relClassName";
      case ECSqlSystemProperty.PointX:
        return "x";
      case ECSqlSystemProperty.PointY:
        return "y";
      case ECSqlSystemProperty.PointZ:
        return "z";
      default:
        throw new IModelError(BentleyStatus.ERROR, `Unknown ECSqlSystemProperty enum value ${ecProperty}.`);
    }
  }

  private static lowerFirstChar(name: string): string { return name[0].toLowerCase() + name.substring(1); }
}
