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
export class SkeletonState {
  /**
   * Represents the state of a skeleton.
   */
  constructor () {
    /**
     * The unique identifier of the skeleton.
     * @type {number|null}
     */
    this.id = null;

    /**
     * The name of the skeleton.
     * @type {string}
     */
    this.name = '';

    /**
     * Determines if the skeleton is editable.
     * @type {boolean}
     */
    this.editable = false;

    /**
     * Determines whether to show the lines of the skeleton.
     * @type {boolean}
     */
    this.showLines = true;

    /**
     * Determines whether to show the keypoints of the skeleton.
     * @type {boolean}
     */
    this.showKeypoints = true;

    /**
     * The color of the lines of the skeleton.
     * @type {string|null}
     */
    this.lineColor = null;

    /**
     * The rig associated with the skeleton.
     * @type {any[]}
     */
    this.rig = [];

    /**
     * The keypoints of the skeleton.
     * @type {KeypointState[]}
     */
    this.keypoints = [];

    this.id = Math.floor(Math.random() * 9999999) + 1;
  }
}
