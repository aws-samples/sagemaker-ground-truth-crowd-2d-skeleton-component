/**
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import { isNull } from 'lodash';

export class KeypointState {
  /**
   * Represents the state of a keypoint.
   */
  constructor () {
    /**
     * The color of the keypoint.
     * @type {string|null}
     */
    this.color = null;

    /**
     * The draw style of the keypoint.
     * @type {string|null}
     */
    this.drawStyle = null;

    /**
     * The hotkey associated with the keypoint.
     * @type {string|null}
     */
    this.hotkey = null;

    /**
     * The label of the keypoint (aka the keypoint class name).
     * @type {string|null}
     */
    this.label = null;

    /**
     * Determines whether to show the line associated with the keypoint.
     * @type {boolean}
     */
    this.showLine = true;

    /**
     * Determines whether to show the keypoint.
     * @type {boolean}
     */
    this.showKeypoint = true;

    /**
     * The x-coordinate of the keypoint.
     * @type {number|null}
     */
    this.x = null;

    /**
     * The y-coordinate of the keypoint.
     * @type {number|null}
     */
    this.y = null;
  }

  /**
   * Checks if both the x and y coordinates are not null.
   * @returns {boolean} Returns true if both x and y coordinates are not null, false otherwise.
   */
  get hasXY () {
    return !isNull(this.x) && !isNull(this.y);
  }
}
