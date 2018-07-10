/*---------------------------------------------------------------------------------------------
|  $Copyright: (c) 2018 Bentley Systems, Incorporated. All rights reserved. $
 *--------------------------------------------------------------------------------------------*/
/** @module Rendering */

import { ImageSource, ImageSourceFormat } from "@bentley/imodeljs-common";
import { Point2d } from "@bentley/geometry-core";

/** Utilities for handling image data. */
export namespace ImageUtil {
  /** Get a string describing the mime type associated with an ImageSource format. */
  export function getImageSourceMimeType(format: ImageSourceFormat): string {
    return ImageSourceFormat.Jpeg === format ? "image/jpeg" : "image/png";
  }

  /**
   * Extract an html Image element from a binary jpeg or png.
   * @param source The ImageSource containing the binary jpeg or png data.
   * @returns a Promise which resolves to an HTMLImageElement containing the uncompressed bitmap image in RGBA format.
   */
  export async function extractImage(source: ImageSource): Promise<HTMLImageElement> {
    return new Promise((resolve: (image: HTMLImageElement) => void, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;

      const blob = new Blob([source.data], { type: getImageSourceMimeType(source.format) });
      const url = URL.createObjectURL(blob);
      image.src = url;
    });
  }

  /**
   * Extract the dimensions of the jpeg or png data encoded in an ImageSource.
   * @param source The ImageSource containing the binary jpeg or png data.
   * @returns a Promise resolving to a Point2d of which x corresponds to the integer width of the uncompressed bitmap and y to the height.
   */
  export async function extractImageDimensions(source: ImageSource): Promise<Point2d> {
    return extractImage(source).then((image) => new Point2d(image.naturalWidth, image.naturalHeight));
  }
}
