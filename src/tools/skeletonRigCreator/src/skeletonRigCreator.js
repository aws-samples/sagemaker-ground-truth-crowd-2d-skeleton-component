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
import { fabric } from 'fabric';
import './iconButton';
import { doesSetExist, getBoundingBox } from './utilities';
import { COLORS } from '../../../constants';
import { _ } from 'lodash';
import { ICONOIR_CSS } from '../../../iconoir';

function generateUUID () {
  let d = new Date().getTime();
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    d += performance.now();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (d + Math.random() * 16) % 16 | 0;
    d = Math.floor(d / 16);
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

fabric.Object.prototype.toObject = (function (toObject) {
  return function (properties) {
    return fabric.util.object.extend(toObject.call(this, properties), {
      objectId: this.objectId,
      keypoints: this.keypoints
    });
  };
})(fabric.Object.prototype.toObject);

const template = document.createElement('template');
template.innerHTML = `
<style>
    *{
        box-sizing: border-box;
    }
    :host {
      max-width: 100vw;
      overflow: auto;
    }
    .side-panel{
        width: 400px;
    }
    .flex-row{
        display: flex;
        flex-direction: row;
    }
    .button-bar{
        justify-content: center;
        align-items: center;
    }
    .button-bar *{
        margin: 10px 5px;
    }
    .side-panel{
        /*background: purple;*/
        border: 1px solid black;
        width: 300px;
        margin-right: 10px;
    }
    .main-canvas-container{
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: calc( 100vh - 52px - 77px - 100px);
    }
    .center{
        text-align: center;
    }
    .class-list-item{
        display: flex;
        justify-self: center;
        align-items: center;
        padding: 5px;
        margin-right:20px;
    }
    .class-list-item span {
        margin-left: 5px;;
        width: 100%;
    }
    ${ICONOIR_CSS}
</style>
<div class="center">
<h1>Skeleton Rig Creator</h1>
<p>Draw keypoints using the <i class="iconoir-3d-select-point"></i> button. You can connection keypoints using the line tool <i class="iconoir-linear"></i>. Once completed click the <i class="iconoir-save-floppy-disk"></i> button to export</p>
</div>
<div class="flex-row">
    <div class="main-canvas-container">
        <canvas id="canvas"></canvas>
        <div class="flex-row button-bar">
    <icon-button id="draw-keypoint" icon="iconoir-3d-select-point" tooltip="Draw Keypoint"></icon-button>
    <icon-button id="draw-connection" icon="iconoir-linear" tooltip="Connect Keypoints"></icon-button>
    <icon-button id="delete" icon="iconoir-trash" tooltip="Delete Keypoints"></icon-button>
    <icon-button id="save" icon="iconoir-save-floppy-disk" tooltip="Save"></icon-button>
</div>
    </div>
    <div class="side-panel">
        <h2 class="center">Keypoint Classes</h2>
        <p class="center">Click on the keypoint name to change it.</p>
        <div id="keypoint-class-list"></div>
    </div>
</div>
`;

export class Keypoint {
  id = null;
  color = null;
  label = null;
  x = null;
  y = null;

  constructor (id = null, color = null, label = null, x = null, y = null) {
    this.id = id;
    this.color = color;
    this.label = label;
    this.x = x;
    this.y = y;
  }
}

class CrowdPose extends HTMLElement {
  keypoints = [];
  keypointConnections = [];
  mode = 'drawKeypoint';

  constructor () {
    super();
    const shadowRoot = this.attachShadow({ mode: 'open' });
    const clone = template.content.cloneNode(true);
    shadowRoot.append(clone);

    this.imgSrc = this.getAttribute('referenceImg');

    this.canvas = new fabric.Canvas(this.shadowRoot.getElementById('canvas'), {
      hoverCursor: 'default',
      moveCursor: 'grabbing'
    });
    this.canvas.selection = false;

    fabric.Image.fromURL(this.imgSrc, (img) => {
      this.canvas.setHeight(img.height);
      this.canvas.setWidth(img.width);
      this.canvas.setDimensions({
        width: img.width,
        height: img.height
      });

      img.hoverCursor = 'default';

      // Event listener for mouse enter the image
      img.on('mouseenter', (event) => {
        this.canvas.defaultCursor = 'default';
        this.canvas.renderAll();
      });

      // Event listener for mouse leaving the image
      img.on('mouseleave', (event) => {
        this.canvas.defaultCursor = 'default';
        this.canvas.renderAll();
      });

      img.set({
        selectable: false
      });
      this.img = img;

      this.canvas.add(img);

      // Set initial zoom level and zoom sensitivity
      this.zoomLevel = this.zoomLevel || 1;
      this.originalZoomLevel = this.zoomLevel;
      this.zoomSensitivity = 0.3;
      this.keypointCount = 0;

      // Track panning variables
      this.mouseDown = false;
      this.isPanning = false;
      this.keypointSelected = false;
      this.lastPosX = 0;
      this.lastPosY = 0;
      this.mouseDownTime = 0;
      this.panDetectionMousePressDuration = 200;
      this.keypointSize = 5;
      this.lineSize = 2;

      this.setupButtonActions();
      this.setupCanvasEvents();
    });
  }

  addKeypoint (event) {
    const canvas = this.canvas;
    const pointer = canvas.getPointer(event);
    // Position relative to image
    const posX = Math.max(Math.min(Math.floor((pointer.x - this.img.left) / this.img.scaleX), this.img.width), 0);
    const posY = Math.max(Math.min(Math.floor((pointer.y - this.img.top) / this.img.scaleY), this.img.height), 0);
    this.keypointCount++;
    const keypoint = new Keypoint(
      generateUUID(),
      COLORS[this.keypointCount % COLORS.length],
            `keypoint ${this.keypointCount}`,
            posX,
            posY
    );
    this.keypoints.push(keypoint);
    this.addKeypointUiMarker(keypoint);
    this.drawKeypoint(keypoint);
  }

  addKeypointUiMarker (keypoint) {
    const item = document.createElement('div');
    item.classList.add('class-list-item');
    item.id = `${keypoint.id}-label`;

    const color = keypoint.color || 'red';
    item.innerHTML = `
            <svg style="width: 16px; height: 16px;">
                <rect x="0" y="0" width="16" height="16" stroke="grey" fill="${color}"></rect>
            </svg>
            <span contenteditable="true">${keypoint.label}</span>
        `;

    const keypointClassList = this.shadowRoot.getElementById('keypoint-class-list');
    keypointClassList.appendChild(item);
  }

  drawLine (keypoint1, keypoint2) {
    const keypoints = this.canvas.getObjects().filter(object => object instanceof fabric.Circle);
    const pointa = keypoints.find(obj => {
      return obj.objectId === keypoint1.id;
    });
    const pointb = keypoints.find(obj => {
      return obj.objectId === keypoint2.id;
    });

    const center1 = pointa.getCenterPoint();
    const center2 = pointb.getCenterPoint();

    const line = new fabric.Line([
      center1.x - this.lineSize / 2,
      center1.y - this.lineSize / 2,
      center2.x - this.lineSize / 2,
      center2.y - this.lineSize / 2

    ], {
      stroke: 'red',
      strokeWidth: this.lineSize,
      selectable: this.mode === 'delete',
      hoverCursor: this.mode === 'delete' ? 'pointer' : this.canvas.defaultCursor,
      scalable: false,
      hasControls: false
    });

    line.keypoints = [keypoint1, keypoint2];

    // Add the line to the canvas
    this.canvas.add(line);
    this.canvas.bringToFront(line);

    // Ensure line is behind the circles
    this.canvas.bringToFront(pointa);
    this.canvas.bringToFront(pointb);
  }

  drawRigLines (forceRender = true) {
    const lines = this.canvas.getObjects().filter(object => object instanceof fabric.Line);
    lines.forEach((object) => {
      this.canvas.remove(object);
    });
    for (const connection of this.keypointConnections) {
      const connectionArray = Array.from(connection);
      this.drawLine(connectionArray[0], connectionArray[1]);
    }
    this.canvas.forEachObject((object) => {
      if (object instanceof fabric.Circle) {
        this.canvas.bringToFront(object);
      }
    });
    if (forceRender) {
      this.canvas.renderAll();
    }
  }

  drawKeypoint (keypoint, forceRender = true) {
    if (!this.img) return;

    const radius = this.keypointSize;
    const canvas = this.canvas;

    const imageWidth = this.img.width * this.img.scaleX;
    const imageHeight = this.img.height * this.img.scaleY;

    // Calculate the center position of the canvas
    const canvasCenterX = canvas.getWidth() / 2;
    const canvasCenterY = canvas.getHeight() / 2;

    // Calculate the actual position of the image based on the center position and scaling
    const imageActualX = canvasCenterX - imageWidth / 2;
    const imageActualY = canvasCenterY - imageHeight / 2;

    // Calculate the actual position of the circle accounting for zoom, image scaling, and centered image
    const actualX = imageActualX + keypoint.x * this.img.scaleX;
    const actualY = imageActualY + keypoint.y * this.img.scaleY;

    const posX = actualX - (radius * this.img.scaleX) / 2;
    const posY = actualY - (radius * this.img.scaleY) / 2;

    const circle = new fabric.Circle({
      radius,
      fill: keypoint.color,
      left: posX,
      top: posY,
      selectable: true,
      hoverCursor: this.mode === 'delete' ? 'pointer' : 'move',
      scalable: false,
      hasControls: false,
      borderColor: 'red'
    });

    circle.objectId = keypoint.id;

    canvas.add(circle);
    this.canvas.bringToFront(circle);

    if (forceRender) {
      this.drawRigLines();
      this.canvas.renderAll();
    }
  }

  redrawAll () {
    this.canvas.forEachObject((object) => {
      if (object instanceof fabric.Circle) {
        this.canvas.remove(object);
      }
    });
    for (const keypoint of this.keypoints) {
      this.drawKeypoint(keypoint, false);
    }
    this.drawRigLines();
    this.canvas.renderAll();
  }

  modeReset () {
    this.canvas.getObjects().filter(
      object => object instanceof fabric.Line
    ).forEach((object) => {
      object.selectable = false;
    });
  }

  setupButtonActions () {
    const buttonActionMap = {
      'draw-keypoint': () => {
        this.mode = 'drawKeypoint';
        this.modeReset();
      },
      'draw-connection': () => {
        this.mode = 'drawLine';
        this.modeReset();
      },
      delete: () => {
        this.mode = 'delete';
        this.canvas.getObjects().filter(
          object => object instanceof fabric.Line || object instanceof fabric.Circle
        ).forEach((object) => {
          object.selectable = true;
          object.hoverCursor = 'pointer';
        });
      },
      save: () => {
        this.modeReset();
        const skeleton = this.getSkeletonExport();

        const a = document.createElement('a');
        const text = `
// Example component initialization
<crowd-2d-skeleton
  imgSrc="{{ task.input.image_s3_uri | grant_read_access }}"
  keypointClasses='${JSON.stringify(skeleton.keypointClasses)}'
  skeletonRig='${JSON.stringify(skeleton.skeletonRig)}'
  skeletonBoundingBox='${JSON.stringify(skeleton.skeletonBoundingBox)}'
  initialValues="{{ task.input.initial_values }}"
></crowd-2d-skeleton>

// --------------------------------------------------------------------
// Values expanded
${JSON.stringify(skeleton, null, 2)}
        `;
        a.href = URL.createObjectURL(new Blob([text], {
          type: 'plain/text'
        }));
        a.setAttribute('download', 'skeleton_rig.txt');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    };

    for (const id in buttonActionMap) {
      const element = this.shadowRoot.getElementById(id);
      element.onclick = buttonActionMap[id].bind(this);
    }
  }

  getKeypointByObjectId (objectId) {
    return this.keypoints.find(obj => {
      return obj.id === objectId;
    });
  }

  connectKeypoints (keypoint1, keypoint2) {
    const connection = new Set();
    connection.add(keypoint1);
    connection.add(keypoint2);
    const exists = doesSetExist(this.keypointConnections, connection);
    if (!exists) {
      this.keypointConnections.push(connection);
      this.drawRigLines();
    }
  }

  deleteKeypoint (keypoint) {
    // remove any connections that use this keypoint
    this.keypointConnections = this.keypointConnections.filter(set => {
      const keypoints = [...set];

      return !(keypoints[0].id === keypoint.id || keypoints[1].id === keypoint.id);
    });

    // Delete the keypoint from the keypoints
    this.keypoints = this.keypoints.filter(item => item.id !== keypoint.id);

    this.shadowRoot.getElementById(`${keypoint.id}-label`).remove();
    this.redrawAll();
  }

  deleteLine (line) {
    this.keypointConnections = this.keypointConnections.filter(set => {
      const keypoints = [...set];
      return !(keypoints[0].id === line.keypoints[0].id && keypoints[1].id === line.keypoints[1].id);
    });
    this.redrawAll();
  }

  canvasObjectSelection (options) {
    if (this.mode === 'drawLine' && this.keypointSelected) {
      const previous = this.keypointSelected;
      const current = options.selected[0];

      this.connectKeypoints(
        this.getKeypointByObjectId(previous.objectId),
        this.getKeypointByObjectId(current.objectId)
      );
    } else if (this.mode === 'delete') {
      if (options.selected[0] instanceof fabric.Circle) {
        const keypoint = this.getKeypointByObjectId(options.selected[0].objectId);
        this.deleteKeypoint(keypoint);
      } else if (options.selected[0] instanceof fabric.Line) {
        this.deleteLine(options.selected[0]);
      }

      return;
    }
    this.keypointSelected = options.selected[0];
  }

  setupCanvasEvents () {
    const canvasActionsMap = {
      'mouse:down': (options) => {
        this.mouseDown = true;
        this.mouseDownTime = Date.now();
        const event = options.e;
        this.lastPosX = event.clientX;
        this.lastPosY = event.clientY;
      },
      'mouse:up': (options) => {
        if (!this.keypointSelected && !this.isPanning && this.mode === 'drawKeypoint') {
          this.addKeypoint(options.e);
        }

        this.isPanning = false;
        this.mouseDown = false;
        this.mouseDownTime = null;
      },

      'mouse:out': (options) => {
        this.isPanning = false;
      },

      'object:moving': (options) => {
        const target = options.target;

        // Check if the moving object is a circle
        if (target instanceof fabric.Circle) {
          this.updateKeypointPositionState();
          this.drawRigLines();
        }
      },
      'object:scaling': (options) => {
        const target = options.target;

        const objects = target.getObjects();

        for (let i = 0; i < objects.length; i++) {
          const object = objects[i];
          if (object.type !== 'group') {
            object.radius = this.keypointSize;
          }
        }

        this.canvas.requestRenderAll();
      },
      'selection:updated': this.canvasObjectSelection.bind(this),
      'selection:created': this.canvasObjectSelection.bind(this),
      'selection:cleared': (options) => {
        this.keypointSelected = false;
      }
    };

    for (const eventName in canvasActionsMap) {
      this.canvas.on(eventName, canvasActionsMap[eventName]);
    }
  }

  updateKeypointPositionState () {
    if (!this.img) return;
    // update the location state for all keypoints.
    for (const canvasKeypoint of this.canvas.getObjects().filter(object => object instanceof fabric.Circle)) {
      // lookup keypoint
      const keypoint = this.getKeypointByObjectId(canvasKeypoint.objectId);

      // Calculate the scaled center coordinates of the circle
      const scaledCenterX = (canvasKeypoint.left - this.canvas.width / 2) + this.canvas.width / 2;
      const scaledCenterY = (canvasKeypoint.top - this.canvas.height / 2) + this.canvas.height / 2;

      // Calculate the relative center coordinates within the image
      const relativeCenterX = (scaledCenterX - this.img.left) / this.img.scaleX;
      const relativeCenterY = (scaledCenterY - this.img.top) / this.img.scaleY;

      const adjustedCenterX = relativeCenterX + this.keypointSize / 2;
      const adjustedCenterY = relativeCenterY + this.keypointSize / 2;

      keypoint.x = Math.round(adjustedCenterX); // update relative state
      keypoint.y = Math.round(adjustedCenterY); // update relative state
    }
  }

  getSkeletonExport () {
    this.keypoints.forEach((keypoint) => {
      keypoint.label = this.shadowRoot.getElementById(`${keypoint.id}-label`).innerText;
    });

    const boundingBox = getBoundingBox(this.keypoints);

    function adjustPoints (points, boundingBox, desiredPosition) {
      const offsetX = desiredPosition.x - boundingBox.left;
      const offsetY = desiredPosition.y - boundingBox.top;

      return points.map(point => {
        point.x = point.x + offsetX;
        point.y = point.y + offsetY;
        return point;
      });
    }

    const desiredPosition = { x: 0, y: 0 };

    const adjustedPoints = adjustPoints(_.cloneDeep(this.keypoints), boundingBox, desiredPosition);
    boundingBox.right = boundingBox.right - boundingBox.left;
    boundingBox.bottom = boundingBox.bottom - boundingBox.top;
    boundingBox.left = 0;
    boundingBox.top = 0;
    return {
      skeletonBoundingBox: boundingBox,
      keypointClasses: adjustedPoints,
      skeletonRig: this.keypointConnections.map(set => {
        const keypoints = [...set];
        return [keypoints[0].label, keypoints[1].label, null];
      })
    };
  }
}

customElements.define('skeleton-rig-creator', CrowdPose);
