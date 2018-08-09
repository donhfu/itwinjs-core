/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
*--------------------------------------------------------------------------------------------*/
/** @module PresentationRules */

/**
 * Defines direction of a relationship that should be followed
 */
export const enum RelationshipDirection {
  /** Relationship should be followed in both directions. */
  Both = "Both",
  /** Relationship should be followed only in forward direction. */
  Forward = "Forward",
  /** Relationship should be followed only in backward direction. */
  Backward = "Backward",
}
