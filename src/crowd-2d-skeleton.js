/**
 * @license
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
import './components/collapsableElement';
import './components/toggleIconButton';
import './components/toolbarButton.js';
import './components/toolbarToggleButton.js';
import Ajv from 'ajv';

import { keypointClassesSchema } from './validationSchemas/keypointClassesSchema';
import { skeletonRigSchema } from './validationSchemas/skeletonRigSchema';
import { initialValuesSchema } from './validationSchemas/initialValuesSchema';
import {
  annotationIssuesSchema
} from './validationSchemas/annotationIssuesSchema';
import {
  uniqueSkeletonColorsSchema
} from './validationSchemas/uniqueSkeletonColorsSchema';
import { KeypointState } from './keypointState';
import { SkeletonState } from './skeletonState';
import { isNil, isEmpty, isNull, isEqual, get, last, isArray } from 'lodash';
import { COLORS, KEYPOINT_HOTKEYS, KEYPOINT_DRAW_STYLES } from './constants';

fabric.Object.prototype.toObject = (function (toObject) {
  return function (properties) {
    return fabric.util.object.extend(toObject.call(this, properties), {
      keypointClassName: this.keypointClassName,
      skeletonId: this.skeletonId,
      keypointClassNames: this.keypointClassNames
    });
  };
})(fabric.Object.prototype.toObject);

fabric.Object.prototype.cornerColor = 'red'; // Resize border color
fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.borderColor = 'red';

const panelWidth = 400;
const classSelectionPanelWidth = 350;
const bottomBarHeight = 80;
const topBarHeight = 47;
const defaultKeypointSize = localStorage && localStorage.getItem('keypointSize') ? Number(localStorage.getItem('keypointSize')) : 5;
const defaultLineSize = localStorage && localStorage.getItem('lineSize') ? Number(localStorage.getItem('lineSize')) : 3;
const defaultLineColor = localStorage && localStorage.getItem('lineColor') ? localStorage.getItem('lineColor') : '#0000ff';
const defaultForceUseOfDefaultLineColor = localStorage && localStorage.getItem('forceUseOfDefaultLineColor') ? localStorage.getItem('forceUseOfDefaultLineColor') === 'true' : false;
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
     .canvas-wrapper, canvas, .canvas-container{
        border: none !important;
        padding: 0;
        margin: auto;
        display: block;
        
    }
    canvas{
        image-rendering: pixelated;
        
    }
   
    #canvas-container{
        background: lightgrey;
        position: relative;
        overflow: hidden;
        max-width: 100vw;
        width: 100%;
        height: calc(100vh - ${bottomBarHeight}px - ${topBarHeight}px);
    }
    #canvas-overlay {
     position: absolute;
     
      top: 20px;
      left: 50%;

      transform: translate(-50%, -50%);
      font-family: Arial, sans-serif;
      font-size: 14px;
      background-color: rgba(255, 255, 255, 0.7);
      padding: 5px 2px;
      z-index: 10;
      color: black;
      width: 100%;
      max-width: 450px;
    }
    
    #instructions-panel, #annotation-insights-panel, #shortcuts-panel{
        min-width: ${panelWidth}px;
        width: ${panelWidth}px;
        max-height: calc(100vh - ${bottomBarHeight}px - ${topBarHeight}px);

        border-right: solid rgba(85,79,79,0.3) 1px;
        padding: 15px;
        overflow: auto;
        
    }
    #right-panel, #right-panel-settings, .right-panel{
        min-width: ${classSelectionPanelWidth}px;
        width: ${classSelectionPanelWidth}px;
        max-height: calc(100vh - ${bottomBarHeight}px - ${topBarHeight}px);

        
        border-left: solid rgba(85,79,79,0.3) 1px;
        padding: 15px;
        overflow: auto;
    }
    
    .right-panel h2 {
        padding-right: 15px;
        margin-bottom: 5px;
       
    }
    
     .right-panel .class-list .class-list-item{
        display: flex;
        justify-self: center;
        align-items: center;
        padding: 5px;
        margin-right:20px;
    }
    
    .right-panel .class-list .class-list-item span{
        margin-left: 5px;
        flex:1;
    }
    
    .right-panel .class-list .class-list-item:hover{
        border: solid rgba(85,79,79,0.3) 1px;
        cursor: pointer;
    }
    
    .right-panel  .class-list .active {
        border: solid rgba(85,79,79,0.3) 1px;
        background: rgba(85,79,79,0.1);
    }
    .flex-1{
        flex: 1;
    }
    .flex-row{
        display: flex;
        flex-direction: row;
    }
    .button-bar{
        max-width: 100%;
        background: #fff;
        padding: 5px;
        display: flex;
        justify-content: flex-end;
        border-bottom: solid rgba(85,79,79,0.3) 1px;
        box-sizing: border-box;
        position: relative;
    }
    .button-bar > crowd-button{
        margin-right: 5px;
        margin-left: 5px;
    }
    .flex-1{
        flex: 1;
    }
    
    .hidden{
        display: none !important;
    }
    .collapsed{
        
    }
    .center{
        text-align: center;
    }
    .bottom-bar{
        height: ${bottomBarHeight}px;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        border-top: solid rgba(85,79,79,0.3) 1px;
        background: #fff;
        
    }

    .canvas-controls{
       flex:1;
       display: flex;
       justify-content: center;
       padding-left: -35px;
    }
    .right{
        margin-right: 20px;
        position: absolute;
        right: 0;
    }
    #shortcuts-panel div {
        margin-bottom: 20px;
    }
    #shortcuts-panel div .label-hotkey {
        padding: 3px;
         font-size: 16px;
        line-height: 16px;
    }
    .label-hotkey {
        min-width: 12px;
        text-align: center;
        border-radius: 2px;
        border: 1px solid #d5dbdb;
        font-size: 12px;
        line-height: 13px;
        color: #879596;
    }
    .check-mark{
        margin-right: 3px;
    }
    .list-item-icon{
        margin-right: 5px;;
    }
    .flex{ 
        display: flex;
        flex-direction: column;
    }
    .flex-center{
        display: flex;
        justify-content: center;
        align-items: center;
    }
    .flex-center * {
        margin: 5px;
    }
    .active-skeleton-header{
        text-decoration: underline;
        scroll-margin-top: 15px;
    }
    .vertical-line{
        border-left: 2px dashed lightgrey;
        height: 28px; 
        margin: 0 5px;
    }
    .active-toolbar-button{
        --icon-border-style: solid !important;
        --icon-background: #d3d3d342;
    }
    toolbar-button{
        --icon-border-style: dashed;
    }
    .margin-top-5{
        margin-top: 5px;
    }
    #forceLineColorCheckBox{
      margin-top: 10px;
      -moz-transform: scale(1.5); /* FF */
      -webkit-transform: scale(1.5); /* Safari and Chrome */
      -o-transform: scale(1.5); /* Opera */
      transform: scale(1.5);
      padding: 10px;
   }
</style>

<div id="errorBox"></div>

<div class="flex-row button-bar">
<div id="canvas-overlay" class="center">Canvas Coordinates :(0, 0) Image Coordinates :(0, 0)</div>
    
    <div class="flex-1">
        <crowd-button id="instructions-panel-toggle">Instructions</crowd-button>
        <crowd-button id="annotation-insights-panel-toggle">Annotation Insights</crowd-button>
        <crowd-button id="shortcuts-panel-toggle">Shortcuts</crowd-button>
    </div>
    
   
    <crowd-button id="right-panel-toggle" icon="menu" variant="icon">Annotation Options</crowd-button>
    <crowd-button id="right-panel-settings-toggle" variant="icon" icon="settings"><iron-icon icon="settings"/></crowd-button>
</div>
<div class="flex-row">

    <div id="instructions-panel" class="hidden">
        <h2 class="center">Instructions</h2>
        <slot name="instructions"></slot>
    </div>
    <div id="annotation-insights-panel" class="hidden">
         <h2 class="center">Annotation Insights</h2>
         <slot name="annotation-insights"></slot>
    </div>
    <div id="shortcuts-panel" class="hidden">
        <h2 class="center">Shortcuts</h2>
        <div><span class="label-hotkey">q</span> - Add or edit keypoint locations</div>
        <div><span class="label-hotkey">Delete</span> - Deletes a selected keypoint</div>
        <div><span class="label-hotkey">Backspace</span> - Deletes a selected keypoint</div>
        <div><span class="label-hotkey">n</span> - Adjust skeleton positions</div>
        <div><span class="label-hotkey">Mouse Wheel</span> - Zooms in/out at mouse location</div>
        <div><span class="label-hotkey">c</span> - Zooms in</div>
        <div><span class="label-hotkey">x</span> - Zooms out</div>
        <div><span class="label-hotkey">z</span> - Reset zoom & center image</div>
        <div><span class="label-hotkey">v</span> - Draw skeleton. Only supported if skeletonBoundingBox, skeletonRig and keypointClasses are set</div>
        <div><span class="label-hotkey">b</span> - Add new skeleton</div>
        <h3 class="center">Keypoint Shortcuts</h3>
        <div><span class="label-hotkey">,</span> - Undo Keypoint Change</div>
        <div><span class="label-hotkey">.</span> - Redo Keypoint Change</div>
        <div><span class="label-hotkey">w</span> - Previous Keypoint</div>
        <div><span class="label-hotkey">s</span> - Next Keypoint</div>
        <div><span class="label-hotkey">a</span> - Previous Unmarked Keypoint</div>
        <div><span class="label-hotkey">d</span> - Next Unmarked Keypoint</div>
        <div><span class="label-hotkey">Up Arrow</span> - Previous Keypoint</div>
        <div><span class="label-hotkey">Down Arrow</span> - Next Keypoint</div>
        <div><span class="label-hotkey">Left Arrow</span> - Previous Unmarked Keypoint</div>
        <div><span class="label-hotkey">Right Arrow</span> - Next Unmarked Keypoint</div>
        
        
    </div>
    <div id="canvas-container">
        <canvas id="canvas" width="300" height="300"></canvas>
    </div>
    <div id="right-panel" class="right-panel">   
        <div id="skeletons"></div>
        <div class="center">
            <toggle-icon-button id="addSkeletonButton" 
                        icon-on="iconoir-add-hexagon" 
                        icon-off="iconoir-add-hexagon" 
                        icon-on-tooltip="Add Skeleton"
                        icon-off-tooltip="Add Skeleton"
                        size="32px" class="center"></toggle-icon-button>
        </div>
        
    </div>
    <div id="right-panel-settings" class="right-panel hidden">
        <h2>Settings</h2>
        <div>
           <p>Keypoint Size</p>
          <crowd-slider id="keypoint-size" name="keypoint size" min="1" max="20" step="1" pin="true" value="${defaultKeypointSize}"></crowd-slider>
        </div>
        <div>
           <p>Line Size</p>
          <crowd-slider id="line-size" name="line size" min="1" max="20" step="1" pin="true" value="${defaultLineSize}"></crowd-slider>
        </div>
        
        <div class="margin-top-5">
            <label for="lineColor">Default Line Color: </label>
            <input type="color" id="line-color" name="lineColor" value="${defaultLineColor}" />
           
        </div>
        <div>
            <label for="forceLineColorCheckBox">Force use of default line color: </label>
            <input type="checkbox" name="forceLineColor" id="forceLineColorCheckBox" ${defaultForceUseOfDefaultLineColor ? 'checked' : ''}>
        </div>
    </div>
</div>

<div class="bottom-bar">
    <div class="canvas-controls center">
        
        <toolbar-button id="drawKeypoint" icon="iconoir-add-circle" hotkey="q" tooltip="Add/Move Keypoints" class="active-toolbar-button"></toolbar-button>
        <toolbar-button id="delete" icon="iconoir-delete-circle" hotkey="Delete" width="28px" tooltip="Delete keypoint"></toolbar-button>
        <toolbar-button id="adjustSkeletons" icon="iconoir-frame-select" hotkey="n" width="28px" tooltip="Adjust Skeletons"></toolbar-button>
        <span class="vertical-line"></span>
        <toolbar-button id="undo" icon="iconoir-undo" hotkey="," width="28px" tooltip="Undo" class="active-toolbar-button"></toolbar-button>
        <toolbar-button id="redo" icon="iconoir-redo" hotkey="." tooltip="Redo" class="active-toolbar-button"></toolbar-button>
        
        <span class="vertical-line"></span>
        <toolbar-button id="resetZoomButton" icon="iconoir-center-align" hotkey="z" tooltip="Reset Zoom" class="active-toolbar-button"></toolbar-button>
        <toolbar-button id="zoomOut" icon="iconoir-zoom-out" hotkey="x" tooltip="Zoom Out" class="active-toolbar-button"></toolbar-button>
        <toolbar-button id="zoomIn" icon="iconoir-zoom-in" hotkey="c" tooltip="Zoom In" class="active-toolbar-button"></toolbar-button>
        
        <span class="vertical-line"></span>
        <toolbar-button id="drawNewSkeleton" icon="iconoir-add-frame" hotkey="v" width="28px" tooltip="Draw Skeleton" class="active-toolbar-button"></toolbar-button>
        <toolbar-button id="addSkeleton" icon="iconoir-add-hexagon" hotkey="b" tooltip="Add Skeleton" class="active-toolbar-button"></toolbar-button>
        <toolbar-toggle-button id="toggleSkeletonsVisibilityButton" 
                          icon-on="iconoir-eye-empty" 
                          icon-off="iconoir-eye-off" 
                          icon-on-tooltip="Hide Active Skeletons"
                          icon-off-tooltip="Show Active Skeletons"
                          class="active-toolbar-button"
                          hotkey="m"></toolbar-toggle-button>
        
        
    </div>
    <div class="right">
        <crowd-checkbox id="no-changes-needed">No Changes Needed</crowd-checkbox>
        <crowd-button form-action="submit" id="submit-button" variant="primary">Submit</crowd-button>
    </div>
    
</div>
`;

const ACTION_MODES = {
  DRAW_KEYPOINTS: 'Draw keypoints',
  DELETE_KEYPOINTS: 'Delete keypoints',
  DRAW_SKELETON: 'Draw skeleton',
  ADJUST_SKELETONS: 'Adjust Skeleton'
};

class Crowd2dSkeleton extends HTMLElement {
  keypointClasses = null;
  skeletonRig = [];
  skeletonBoundingBox = null;
  uniqueSkeletonColors = null;
  initialValues = [];
  annotationIssues = [];
  skeletons = [];
  skeletonIndex = 0;
  skeletonCreationCount = 0;
  actionMode = ACTION_MODES.DRAW_KEYPOINTS;

  recenterImage () {
    if (!this.img) return;
    const skeletonsAreGrouped = this.skeletonsAreGrouped;
    this.ungroupSkeletonGroupsInCanvas();
    this.updateKeypointPositionState();

    const canvasCenter = {
      x: this.canvas.getWidth() / 2,
      y: this.canvas.getHeight() / 2
    };

    const imageCenter = this.img.getCenterPoint();

    const delta = {
      x: canvasCenter.x - imageCenter.x,
      y: canvasCenter.y - imageCenter.y
    };

    this.img.left += delta.x;
    this.img.top += delta.y;

    this.clearDrawnSkeletons();
    this.drawAllSkeletons();

    this.canvas.requestRenderAll();
    if (skeletonsAreGrouped) {
      this.createSkeletonGroupsInCanvas();
    }
  }

  getCanvasContainerWidth () {
    let totalPanelWidth = 0;

    if (this.showInstructions || this.showAnnotationInsights || this.showShortcuts) {
      totalPanelWidth += panelWidth;
    }
    if (this.showRightPanel || this.showRightPanelSettings) {
      totalPanelWidth += classSelectionPanelWidth + 2;
    }
    return window.innerWidth - totalPanelWidth;
  }

  getCanvasContainerHeight () {
    return window.innerHeight - bottomBarHeight - topBarHeight - 20 - 10;
  }

  fitCanvasToWindow () {
    const skeletonsAreGrouped = this.skeletonsAreGrouped;
    this.ungroupSkeletonGroupsInCanvas();
    this.updateKeypointPositionState();

    const canvasEl = this.shadowRoot.getElementById('canvas-container');
    canvasEl.width = this.getCanvasContainerWidth();
    canvasEl.height = this.getCanvasContainerHeight();
    if (skeletonsAreGrouped) {
      this.createSkeletonGroupsInCanvas();
    }
  }

  setupLeftPanelActions () {
    const panels = ['instructions-panel', 'annotation-insights-panel', 'shortcuts-panel'];
    for (const panel of panels) {
      const element = this.shadowRoot.getElementById(panel);
      const button = this.shadowRoot.getElementById(`${panel}-toggle`);
      button.onclick = () => {
        if (!element.classList.contains('hidden')) {
          // hide all panels
          panels.forEach((p) => {
            const el = this.shadowRoot.getElementById(p);
            el.classList.add('hidden');
          });

          // Update state variables based on the panel
          this.showInstructions = false;
          this.showAnnotationInsights = false;
          this.showShortcuts = false;
        } else {
          // Hide all panels
          panels.forEach((p) => {
            const el = this.shadowRoot.getElementById(p);
            el.classList.add('hidden');
          });

          // Show the clicked panel
          element.classList.remove('hidden');

          this.showInstructions = panel === 'instructions-panel' && !this.showInstructions;
          this.showAnnotationInsights = panel === 'annotation-insights-panel' && !this.showAnnotationInsights;
          this.showShortcuts = panel === 'shortcuts-panel' && !this.showShortcuts;
        }
        this.fitCanvasToWindow();
      };
    }

    const element = this.shadowRoot.getElementById('shortcuts-panel');
    for (let i = 0; i < this.keypointClasses.length; i++) {
      const keypointClass = this.keypointClasses[i].label;
      element.innerHTML += `<div><span class="label-hotkey">${KEYPOINT_HOTKEYS[i % KEYPOINT_HOTKEYS.length]}</span> - Selects the ${keypointClass} for labeling</div>`;
    }

    // Hide the buttons if there is no slot information
    const slots = ['instructions', 'annotation-insights'];
    for (const slot of slots) {
      const slotElement = this.querySelector(`*[slot="${slot}"]`);
      let hasSlotContent = false;
      if (slotElement) {
        hasSlotContent = slotElement.innerText.trim().length > 0;
      }
      if (!hasSlotContent) {
        this.shadowRoot.getElementById(`${slot}-panel-toggle`).classList.add('hidden');
      }
    }
  }

  updateSkeletonNamesInSkeletonPanel () {
    this.skeletonCreationCount = this.skeletons.length;
    for (let i = 0; i < this.skeletons.length; i++) {
      const skeleton = this.skeletons[i];
      const labelText = skeleton.name ? `Skeleton ${i + 1}: ${skeleton.name}` : `Skeleton ${i + 1}`;
      this.shadowRoot.getElementById(`skeleton-${skeleton.id}-header`).innerText = labelText;
    }
  }

  updateAllSkeletonsInSkeletonPannel () {

  }

  /**
     *
     * @param {SkeletonState} skeleton
     * @param expanded
     */
  addSkeleton (skeleton, expanded = false, setAsActiveSkeleton = false) {
    expanded = expanded ? 'expanded' : 'false';
    this.skeletons.push(skeleton);
    this.skeletonCreationCount++;
    if (this.uniqueSkeletonColors) {
      let skeletonColor = COLORS[(this.skeletonCreationCount - 1) % COLORS.length];
      if (isArray(this.uniqueSkeletonColors)) {
        skeletonColor = this.uniqueSkeletonColors[(this.skeletonCreationCount - 1) % this.uniqueSkeletonColors.length];
      }
      skeleton.lineColor = skeletonColor;
      skeleton.keypoints.forEach(keypoint => {
        keypoint.color = skeletonColor;
      });
    }

    const classList = [];

    for (const keypoint of skeleton.keypoints) {
      const item = document.createElement('div');
      item.classList.add('class-list-item');

      item.id = `${keypoint.label}-${skeleton.id}`;
      item.innerHTML = `
                <svg style="width: 16px; height: 16px;">
                    <rect x="0" y="0" width="16" height="16" stroke="grey" fill="${keypoint.color}"></rect>
                </svg>
                <span>${keypoint.label}</span>
                <svg id="${keypoint.label}-check-mark-${skeleton.id}" class="check-mark hidden" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="green" stroke-width="1">
                  <path d="M10 2L4 10 2 7"/>
                </svg>
                 <toggle-icon-button id="${keypoint.label}-visibility-${skeleton.id}" 
                        icon-on="iconoir-eye-empty" 
                        icon-off="iconoir-eye-off" 
                        icon-on-tooltip="hide Keypoint"
                        icon-off-tooltip="Show Keypoint"
                        size="20px" class="list-item-icon"></toggle-icon-button>
                <div class="label-hotkey">${keypoint.hotkey}</div>
            `;
      item.onclick = () => {
        this.setActivateSkeleton(this.skeletons.indexOf(skeleton));
        this.setActiveKeypointClass(keypoint.label);
        this.setActiveActionMode(ACTION_MODES.DRAW_KEYPOINTS);
      };
      classList.push(item);
    }
    const labelText = skeleton.name ? `Skeleton ${this.skeletonCreationCount}: ${skeleton.name}` : `Skeleton ${this.skeletonCreationCount}`;
    const template = `
          <collapsible-element initial-state="${expanded}" id="skeleton-${skeleton.id}">
            <div slot="header" id="skeleton-${skeleton.id}-header">${labelText}</div>
            <div slot="content">
               
              <h2 class="center">Keypoint Classes</h2>
               <div class="center flex-center">
                 <toggle-icon-button id="visibility-all-${skeleton.id}" 
                        icon-on="iconoir-eye-empty" 
                        icon-off="iconoir-eye-off" 
                        icon-on-tooltip="Hide Keypoints"
                        icon-off-tooltip="Show Keypoints"
                        size="24px" class="list-item-icon" state="${skeleton.showKeypoints}"></toggle-icon-button>
                 <toggle-icon-button id="delete-keypoints-${skeleton.id}" 
                        icon-on="iconoir-delete-circle" 
                        icon-off="iconoir-delete-circle"
                        icon-on-tooltip="Delete Keypoints"
                        icon-off-tooltip="Delete Keypoints"
                        size="20px" class="list-item-icon"></toggle-icon-button>
                 <toggle-icon-button id="delete-skeleton-${skeleton.id}" 
                        icon-on="iconoir-trash" 
                        icon-off="iconoir-trash" 
                        icon-on-tooltip="Delete Skeleton"
                        icon-off-tooltip="Delete Skeleton"
                        size="20px" class="list-item-icon"></toggle-icon-button>
                </div>
                <div id="class-list-${skeleton.id}" class="class-list"></div>  
            </div>
          </collapsible-element>
        `;

    const skeletonsContainer = this.shadowRoot.getElementById('skeletons');
    const skeletonElement = document.createElement('div');
    skeletonElement.id = `skeleton-${skeleton.id}`;
    skeletonElement.innerHTML = template;
    skeletonsContainer.appendChild(skeletonElement);

    skeletonElement.onclick = () => {
      const skeletonIndex = this.skeletons.map(sk => sk.id).indexOf(skeleton.id);
      if (this.skeletonIndex !== skeletonIndex) {
        this.setActivateSkeleton(skeletonIndex);
      }
    };

    const skeletonsClassListContainer = this.shadowRoot.getElementById(`class-list-${skeleton.id}`);
    for (const item of classList) {
      skeletonsClassListContainer.appendChild(item);
    }

    const deleteKeypointsButton = this.shadowRoot.getElementById(`delete-keypoints-${skeleton.id}`);
    deleteKeypointsButton.onclick = () => this.deleteAllKeypoints(skeleton.id);

    const deleteSkeletonButton = this.shadowRoot.getElementById(`delete-skeleton-${skeleton.id}`);
    deleteSkeletonButton.onclick = () => this.deleteSkeleton(skeleton.id);

    for (const keypoint of skeleton.keypoints) {
      const visibilityButton = this.shadowRoot.getElementById(`${keypoint.label}-visibility-${skeleton.id}`);
      visibilityButton.onclick = () => {
        keypoint.showKeypoint = !keypoint.showKeypoint;
        const canvasKeypoint = this.getCanvasKeypointForKeypoint(keypoint, skeleton.id);

        if (canvasKeypoint) this.canvas.remove(canvasKeypoint);

        this.drawKeypoint(keypoint, skeleton);

        this.drawRigLinesForSkeletonAndKeypointClassName(skeleton.id, keypoint.label);
      };
    }

    const visibilityButton = this.shadowRoot.getElementById(`visibility-all-${skeleton.id}`);
    visibilityButton.onclick = () => {
      skeleton.showKeypoints = visibilityButton.getAttribute('state') === 'true';
      this.redrawAllItemsForSkeleton(skeleton.id);
    };

    if (setAsActiveSkeleton) {
      this.setActivateSkeleton(this.skeletons.map(sk => sk.id).indexOf(skeleton.id));
      this.setActiveKeypointClass(this.keypointClasses[0].label);
    }
  }

  getCanvasKeypoints () {
    return this.canvas.getObjects().filter(object => object instanceof fabric.Circle || object.type === 'circle');
  }

  getSkeletonVisibilityUIState (skeletonId) {
    try {
      const visibilityButton = this.shadowRoot.getElementById(`visibility-all-${skeletonId}`);
      return visibilityButton.getAttribute('state') === 'true';
    } catch {
      return false;
    }
  }

  getCanvasKeypointForKeypoint (keypoint, skeletonId) {
    const matches = this.getCanvasKeypoints().filter(canvasKeypointObject => {
      return skeletonId === canvasKeypointObject.skeletonId && keypoint.label === canvasKeypointObject.keypointClassName;
    });
    if (matches.length) {
      return matches[0];
    }
    return null;
  }

  getKeypointStateObjectForCanvasKeypointObject (canvasKeypointObject) {
    const matchingSkeleton = this.skeletons.filter(sk => sk.id === canvasKeypointObject.skeletonId)[0];
    if (matchingSkeleton) {
      return matchingSkeleton.keypoints.filter(kp => kp.label === canvasKeypointObject.keypointClassName)[0];
    }
    // This can occur when a Skeleton was deleted.
    return null;
  }

  getSkeletonForCanvasKeypointObject (canvasKeypointObject) {
    return this.skeletons.filter(sk => sk.id === canvasKeypointObject.skeletonId)[0];
  }

  /**
     * Converts a keypoint position that is based on the image coordinates into
     *  the x,y coordinates relative to the canvas.
     * @param x
     * @param y
     */
  convertKeypointPositionRelativeToImageToCanvasPosition (x, y, usePreviousKeypointSize = false) {
    const radius = usePreviousKeypointSize ? this.drawObjectWidthPrevious : this.drawObjectWidth;
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
    const actualX = imageActualX + x * this.img.scaleX;
    const actualY = imageActualY + y * this.img.scaleY;

    // 550, 156
    const posX = actualX - (radius * this.img.scaleX) / 2;
    const posY = actualY - (radius * this.img.scaleY) / 2;
    return { x: posX, y: posY };
  }

  /**
     * Converts a keypoint position that is based on the canvas coordinates into
     *  the x,y coordinates relative to the image.
     * @param x
     * @param y
     * @param usePreviousKeypointSize - Keypoints should be centered at there x,y
     *  coordinates. This is used to control which keypoint size should be used
     *  to calculate the radius offset. This is normally set to true when the
     *  keypoint size changed.
     * @returns {{x: number, y: number}}
     */
  convertKeypointPositionRelativeCanvasToImagePosition (x, y, usePreviousKeypointSize = false) {
    const radius = usePreviousKeypointSize ? this.drawObjectWidthPrevious : this.drawObjectWidth;
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
    const actualX = (x - imageActualX) / this.img.scaleX;
    const actualY = (y - imageActualY) / this.img.scaleY;

    const keypointXSizeFactor = (radius / 2);
    const keypointYSizeFactor = (radius / 2);

    const posX = actualX + keypointXSizeFactor;
    const posY = actualY + keypointYSizeFactor;
    return { x: posX, y: posY };
  }

  /**
     * This method updates the keypoint position state from the canvas keypoint
     * position. Note in most cases the caller should call
     * this.ungroupSkeletonGroupsInCanvas() before calling this method.
     */
  updateKeypointPositionState () {
    if (!this.img || !this.skeletons.length) return;

    // update the location state for all keypoints.
    for (const canvasKeypoint of this.getCanvasKeypoints()) {
      const keypoint = this.getKeypointStateObjectForCanvasKeypointObject(canvasKeypoint);

      // Check if there is a matching keypoint. If there isn't we want to skip.
      if (isNil(keypoint)) continue;

      const keypointPositionRelativeToImage =
                this.convertKeypointPositionRelativeCanvasToImagePosition(
                  canvasKeypoint.left, canvasKeypoint.top, this.drawObjectWidthIsDirty);

      keypoint.x = Math.round(keypointPositionRelativeToImage.x);
      keypoint.y = Math.round(keypointPositionRelativeToImage.y);
    }
  }

  clearDrawnSkeleton (skeletonId) {
    for (const keypointClass of this.keypointClasses) {
      const element = this.shadowRoot.getElementById(`${keypointClass.label}-check-mark-${skeletonId}`);
      if (element) element.classList.add('hidden');
    }
    this.firstUnmarkedKeypoint();

    this.canvas.forEachObject((object) => {
      if (object.skeletonId === skeletonId) {
        this.canvas.remove(object);
      }
    });

    this.drawRigLinesForSkeleton(skeletonId);
  }

  clearDrawnSkeletons () {
    for (let i = 0; i < this.skeletons.length; i++) {
      for (const keypointClass of this.keypointClasses) {
        const skeletonId = this.skeletons[i].id;
        const element = this.shadowRoot.getElementById(`${keypointClass.label}-check-mark-${skeletonId}`);
        element.classList.add('hidden');
      }
      this.firstUnmarkedKeypoint();
    }

    this.canvas.forEachObject((object) => {
      if (object instanceof fabric.Circle) {
        this.canvas.remove(object);
      }
    });

    this.clearDrawnRigLines();
  }

  redrawAllItemsForSkeleton (skeletonId, hideSkeletons = false) {
    if (this.delayRendering) return;
    const skeletonsAreGrouped = this.skeletonsAreGrouped;
    this.ungroupSkeletonGroupsInCanvas();
    this.updateKeypointPositionState();
    this.clearDrawnSkeleton(skeletonId);
    this.drawSkeleton(skeletonId, hideSkeletons);
    if (skeletonsAreGrouped) {
      this.createSkeletonGroupsInCanvas();
    }
  }

  redrawAllItems () {
    if (this.delayRendering) return;

    const skeletonsAreGrouped = this.skeletonsAreGrouped;
    this.ungroupSkeletonGroupsInCanvas();
    this.updateKeypointPositionState();
    this.clearDrawnSkeletons();
    this.drawAllSkeletons();
    if (skeletonsAreGrouped) {
      this.createSkeletonGroupsInCanvas();
    }
  }

  updateForceLineColorSetting (event) {
    this.forceUseOfDefaultLineColor = event.target.checked;
    this.saveUserSettings();
    this.redrawAllItems();
  }

  updateLineColorDefault (event) {
    if (this.lineColor === event.target.value) return;
    this.lineColor = event.target.value;
    this.saveUserSettings();
    this.redrawAllItems();
  }

  updateKeypointAndLineSize () {
    const lineSizeSlider = this.shadowRoot.getElementById('line-size');
    const keypointSizeSlider = this.shadowRoot.getElementById('keypoint-size');

    // has one of the values changed?
    if (this.lineWidth === lineSizeSlider.value && this.drawObjectWidth === keypointSizeSlider.value) return;

    this.drawObjectWidthIsDirty = true;
    this.drawObjectWidthPrevious = this.drawObjectWidth;

    this.drawObjectWidth = keypointSizeSlider.value;
    this.lineWidth = lineSizeSlider.value;

    this.redrawAllItems();
    this.canvas.requestRenderAll();
    this.drawObjectWidthIsDirty = false;
    this.saveUserSettings();
  }

  setupRightPanelActions (skeletons) {
    for (const skeleton of skeletons) {
      this.addSkeleton(skeleton, true);
    }
    this.setActivateSkeleton(0);

    const panels = ['right-panel', 'right-panel-settings'];
    for (const panel of panels) {
      const element = this.shadowRoot.getElementById(panel);
      const button = this.shadowRoot.getElementById(`${panel}-toggle`);
      button.onclick = () => {
        const initialState = this.showRightPanel || this.showRightPanelSettings;
        if (!element.classList.contains('hidden')) {
          // hide all panels
          panels.forEach((p) => {
            const el = this.shadowRoot.getElementById(p);
            el.classList.add('hidden');
          });

          // Update state variables based on the panel
          this.showRightPanel = false;
          this.showRightPanelSettings = false;
        } else {
          // Hide all panels
          panels.forEach((p) => {
            const el = this.shadowRoot.getElementById(p);
            el.classList.add('hidden');
          });

          // Show the clicked panel
          element.classList.remove('hidden');

          this.showRightPanel = panel === 'right-panel' && !this.showRightPanel;
          this.showRightPanelSettings = panel === 'right-panel-settings' && !this.showRightPanelSettings;
        }
        if (initialState !== (this.showRightPanel || this.showRightPanelSettings)) {
          this.fitCanvasToWindow();
        }
      };
    }

    // Hookup keypoint size slider observer
    const keypointSizeSlider = this.shadowRoot.getElementById('keypoint-size');
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          this.updateKeypointAndLineSize();
        }
      }
    });
    observer.observe(keypointSizeSlider, { attributes: true });

    // Hookup line size slider observer
    const lineSizeSlider = this.shadowRoot.getElementById('line-size');
    const lineSizeSliderObserver = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
          this.updateKeypointAndLineSize();
        }
      }
    });
    lineSizeSliderObserver.observe(lineSizeSlider, { attributes: true });

    // Hookup line color observer
    const lineColorPicker = this.shadowRoot.getElementById('line-color');
    lineColorPicker.addEventListener('change', this.updateLineColorDefault.bind(this), false);

    const forceLineColorCheckBox = this.shadowRoot.getElementById('forceLineColorCheckBox');
    forceLineColorCheckBox.addEventListener('change', this.updateForceLineColorSetting.bind(this), false);
  }

  setupHotkeys () {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        this.setActiveActionMode(ACTION_MODES.DELETE_KEYPOINTS);
        this.deleteSelectedKeypoint();
      } else if (KEYPOINT_HOTKEYS.includes(event.key)) {
        const index = KEYPOINT_HOTKEYS.indexOf(event.key);
        if (index < this.keypointClasses.length) {
          this.setActiveKeypointClass(this.keypointClasses[index].label);
        }
      } else if (event.key === 'ArrowRight' || event.key === 'd') {
        this.nextUnmarkedKeypoint();
        event.preventDefault();
      } else if (event.key === 'ArrowLeft' || event.key === 'a') {
        this.previousUnmarkedKeypoint();
        event.preventDefault();
      } else if (event.key === 'ArrowDown' || event.key === 's') {
        this.nextKeypoint();
        event.preventDefault();
      } else if (event.key === 'ArrowUp' || event.key === 'w') {
        this.previousKeypoint();
        event.preventDefault();
      } else if (event.key === 'z') {
        this.zoomReset();
      } else if (event.key === 'c') {
        this.zoomIn();
      } else if (event.key === 'x') {
        this.zoomOut();
      } else if (event.key === 'v') {
        this.setActiveActionMode(ACTION_MODES.DRAW_SKELETON);
      } else if (event.key === 'b') {
        this.addNewSkeleton();
      } else if (event.key === 'q') {
        this.setActiveActionMode(ACTION_MODES.DRAW_KEYPOINTS);
      } else if (event.key === 'n') {
        this.setActiveActionMode(ACTION_MODES.ADJUST_SKELETONS);
      } else if (event.key === ',') {
        this.undo();
      } else if (event.key === '.') {
        this.redo();
      } else if (event.key === 'm') {
        // This is needed to change the button icon state.
        const skeletonVisibilityButton = this.shadowRoot.getElementById('toggleSkeletonsVisibilityButton');
        skeletonVisibilityButton.setAttribute('state', !this.showSkeletons);
        this.toggleSkeletonsVisibilityButton();
      }
    });
  }

  setupButtonActions () {
    const buttonActionMap = {
      zoomIn: this.zoomIn,
      zoomOut: this.zoomOut,
      resetZoomButton: this.zoomReset,
      'submit-button': () => {
        const form = document.getElementById('crowd-form');
        form.submit();
        console.log(this.getFormDataForAnnotations());
      },
      delete: () => {
        this.deleteSelectedKeypoint();
      },
      drawNewSkeleton: () => {
        this.setActiveActionMode(ACTION_MODES.DRAW_SKELETON);
      },
      drawKeypoint: () => {
        this.setActiveActionMode(ACTION_MODES.DRAW_KEYPOINTS);
      },
      adjustSkeletons: () => {
        this.setActiveActionMode(ACTION_MODES.ADJUST_SKELETONS);
      },
      addSkeleton: this.addNewSkeleton,
      addSkeletonButton: this.addNewSkeleton,
      redo: this.redo,
      undo: this.undo,
      toggleSkeletonsVisibilityButton: this.toggleSkeletonsVisibilityButton

    };

    for (const id in buttonActionMap) {
      const element = this.shadowRoot.getElementById(id);
      element.onclick = buttonActionMap[id].bind(this);
    }
  }

  toggleSkeletonsVisibilityButton () {
    this.showSkeletons = !this.showSkeletons;
    this.skeletons.forEach((skeleton) => {
      const skeletonVisibilityButton = this.shadowRoot.getElementById(`visibility-all-${skeleton.id}`);
      if (this.showSkeletons) {
        skeletonVisibilityButton.setAttribute('state', skeleton.showKeypoints);
        this.redrawAllItemsForSkeleton(skeleton.id, false);
      } else {
        skeletonVisibilityButton.setAttribute('state', false);
        this.redrawAllItemsForSkeleton(skeleton.id, true);
      }
    });
  }

  addNewSkeleton () {
    const skeleton = this.getNewEmptySkeleton();
    this.addSkeleton(skeleton, true, true);
    this.setActiveActionMode(ACTION_MODES.DRAW_KEYPOINTS);
  }

  setupObservers () {
    // Setup Checkbox state observer. Update noChangesNeeded state automatically
    const checkbox = this.shadowRoot.getElementById('no-changes-needed');
    const observer = new MutationObserver(mutationsList => {
      for (const mutation of mutationsList) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'checked') {
          this.noChangesNeeded = checkbox.checked === 'true';
        }
      }
    });
    observer.observe(checkbox, { attributes: true });
  }

  setupOnSubmitHandler () {
    document.getElementById('crowd-form').addEventListener('submit', (event) => {
      const submitTime = new Date();
      const totalTimeInSeconds = Math.round((submitTime - this.startTime) / 1000);

      // Create a hidden input elements for each value we want to send
      const valuesMap = {
        updated_annotations: this.getFormDataForAnnotations(),
        original_annotations: this.getAttribute('initialValues'),
        image_s3_uri: this.getAttribute('imgSrc'),
        image_name: last(this.getAttribute('imgSrc').split('/')),
        no_changes_needed: this.noChangesNeeded,
        total_time_in_seconds: totalTimeInSeconds
      };
      console.log(valuesMap);
      for (const key in valuesMap) {
        const hiddenInput = document.createElement('input');
        hiddenInput.setAttribute('type', 'hidden');
        hiddenInput.setAttribute('name', key);
        hiddenInput.setAttribute('value', valuesMap[key]);

        // Append the hidden input element to the form
        document.getElementById('crowd-form').appendChild(hiddenInput);
      }

      // Reset the form after processing the data
      document.getElementById('crowd-form').reset();
    });
  }

  setupCanvasEvents () {
    const canvasActionsMap = {
      'mouse:down': (options) => {
        this.mouseDown = true;
        this.mouseDownTime = Date.now();
        const event = options.e;
        this.lastPosX = event.clientX;
        this.lastPosY = event.clientY;

        if (this.actionMode === ACTION_MODES.DRAW_KEYPOINTS) {
          if (!this.panningTimer) {
            this.panningTimer = setInterval(() => {
              const currentTime = Date.now();
              const pressDuration = currentTime - this.mouseDownTime;

              if (pressDuration >= this.panDetectionMousePressDuration && this.mouseDown && !this.keypointSelected && this.actionMode !== ACTION_MODES.DRAW_SKELETON) {
                this.isPanning = true;
                this.canvas.setCursor('grabbing');
              } else {
                this.isPanning = false;
              }
            }, this.panDetectionMousePressDuration);
          }
        } else if (this.actionMode === ACTION_MODES.DRAW_SKELETON) {
          const skeleton = this.getNewEmptySkeleton();
          this.addSkeleton(skeleton, true, true);

          const pointer = this.canvas.getPointer(event.e);
          this.startPosition = { x: pointer.x, y: pointer.y };

          const keypoints = [];
          for (let i = 0; i < this.keypointClasses.length; i++) {
            const kp = this.keypointClasses[i];
            const skeletonKeypoint = skeleton.keypoints[i];
            const circle = new fabric.Circle({
              radius: this.drawObjectWidth,
              fill: skeletonKeypoint.color,
              left: kp.x,
              top: kp.y,
              selectable: true,
              hoverCursor: this.mode === 'delete' ? 'pointer' : 'move',
              scalable: false,
              hasControls: false,
              borderColor: 'red'
            });
            circle.keypointClassName = kp.label;
            circle.skeletonId = skeleton.id;
            keypoints.push(circle);
          }

          const lines = [];
          this.skeletonRig.forEach(rigPair => {
            const points = keypoints.filter(obj => {
              return obj.keypointClassName === rigPair[0] || obj.keypointClassName === rigPair[1];
            });

            const center1 = points[0].getCenterPoint();
            const center2 = points[1].getCenterPoint();
            let lineColor = this.lineColor;

            if (this.forceUseOfDefaultLineColor) {
              lineColor = this.lineColor;
            } else if (rigPair.length === 3 && rigPair[2] !== null) {
              lineColor = rigPair[2];
            }

            const line = new fabric.Line([
              center1.x - this.lineWidth / 2,
              center1.y - this.lineWidth / 2,
              center2.x - this.lineWidth / 2,
              center2.y - this.lineWidth / 2

            ], {
              stroke: lineColor,
              strokeWidth: this.lineWidth,
              selectable: false,
              scalable: false,
              hasControls: false
            });
            line.skeletonId = skeleton.id;

            lines.push(line);
          });

          this.group = new fabric.Group([...lines, ...keypoints], {
            left: pointer.x,
            top: pointer.y,
            selectable: true,
            hasControls: true
          });
          this.group.skeletonId = skeleton.id;

          this.group.set({ scaleX: 0, scaleY: 0 });
          this.canvas.add(this.group);
          this.canvas.requestRenderAll();

          skeleton.keypoints.forEach(keypoint => {
            keypoint.x = 0;
            keypoint.y = 0;
            this._updateKeypointExistsUiState(keypoint, skeleton);
          });
        }
      },
      'mouse:up': (options) => {
        clearInterval(this.panningTimer);
        this.panningTimer = null;

        if (!this.keypointSelected && !this.isPanning && this.actionMode === ACTION_MODES.DRAW_KEYPOINTS) {
          this.addKeypointFromMouseEvent(options.e);
        }
        if (this.isKeypointBeingMoved && this.actionMode === ACTION_MODES.DRAW_KEYPOINTS) {
          this.nextUnmarkedKeypoint();
          this.isKeypointBeingMoved = false;
        }

        if (!this.isPanning && this.actionMode === ACTION_MODES.DRAW_SKELETON) {
          this.setActiveActionMode(ACTION_MODES.ADJUST_SKELETONS);
        }

        this.isPanning = false;
        this.mouseDown = false;
      },
      'mouse:move': (options) => {
        const event = options.e;

        if (this.mouseDown && !this.keypointSelected && this.actionMode === ACTION_MODES.DRAW_SKELETON) {
          const pointer = this.canvas.getPointer(event.e);
          const width = pointer.x - this.startPosition.x;
          const height = pointer.y - this.startPosition.y;

          const skeletonWidth = this.skeletonBoundingBox?.right + (this.drawObjectWidth * 2) + 1;
          const skeletonHeight = this.skeletonBoundingBox?.bottom + (this.drawObjectWidth * 2) + 1;

          this.group.set({
            scaleX: width / skeletonWidth,
            scaleY: height / skeletonHeight
          });
          this.canvas.requestRenderAll();
        }

        // Pan the canvas if panning is enabled
        if (this.isPanning) {
          this.canvas.setCursor('grabbing');

          const deltaX = event.clientX - this.lastPosX;
          const deltaY = event.clientY - this.lastPosY;

          // Adjust canvas position based on the panning distance
          this.canvas.relativePan({ x: deltaX, y: deltaY });

          // Update last mouse position
          this.lastPosX = event.clientX;
          this.lastPosY = event.clientY;

          // Render the canvas
          this.canvas.requestRenderAll();
        }

        this.updateCoordinates(event);
      },
      'mouse:out': (options) => {
        this.isPanning = false;
      },
      'mouse:wheel': (options) => {
        const event = options.e;
        const delta = event.deltaY;

        // Get the mouse position relative to the canvas
        const pointer = this.canvas.getPointer(event, true);
        const zoomPoint = new fabric.Point(pointer.x, pointer.y);

        // Adjust zoom level based on mousewheel delta
        let zoomNeedsAdjusted = false;
        if (delta > 0) {
          const zoom = this.canvas.getZoom() / 1.1;
          if (zoom >= this.maxZoomOut || isNull(this.maxZoomOut)) {
            this.zoomLevel = this.canvas.getZoom() / 1.1;
            zoomNeedsAdjusted = true;
          }
        } else {
          const zoom = this.zoomLevel = this.canvas.getZoom() * 1.1;
          if (zoom <= this.maxZoomIn || isNull(this.maxZoomIn)) {
            this.zoomLevel = this.canvas.getZoom() * 1.1;
            zoomNeedsAdjusted = true;
          }
        }

        // Apply zoom to the canvas
        if (zoomNeedsAdjusted) {
          this.canvas.zoomToPoint(zoomPoint, this.zoomLevel);
          this.canvas.requestRenderAll();
        }

        event.preventDefault();
        event.stopPropagation();
      },
      'object:modified': (options) => {
        const target = options.target;

        if (target instanceof fabric.Circle) {
          if (target.skeletonId && target.keypointClassName) {
            this.isKeypointBeingMoved = true;
            const keypoint = this.getKeypointStateObjectForCanvasKeypointObject(target);
            const skeleton = this.skeletons[this.getSkeletonIndexForSkeletonId(target.skeletonId)];

            const keypointPositionRelativeToImage =
                this.convertKeypointPositionRelativeCanvasToImagePosition(
                  target.left, target.top, this.drawObjectWidthIsDirty);

            this.trackChange('object:modified', {
              keypointReference: keypoint,
              skeleton,
              beforeX: keypoint.x,
              beforeY: keypoint.y,
              afterX: Math.round(keypointPositionRelativeToImage.x),
              afterY: Math.round(keypointPositionRelativeToImage.y)
            });
          }
        }
      },

      'object:moving': (options) => {
        const target = options.target;

        if (target instanceof fabric.Circle) {
          if (target.skeletonId && target.keypointClassName) {
            this.clearDrawnRigLinesForSkeletonAndKeypointClassName(
              target.skeletonId,
              target.keypointClassName
            );
            this.drawRigLinesForSkeletonAndKeypointClassName(
              target.skeletonId,
              target.keypointClassName
            );
          }
        }
      },
      'selection:created': (options) => {
        this.keypointSelected = options.selected[0];

        if (this.keypointSelected.skeletonId) {
          this.setActivateSkeleton(
            this.getSkeletonIndexForSkeletonId(this.keypointSelected.skeletonId),
            this.getKeypointStateObjectForCanvasKeypointObject(this.keypointSelected)?.label,
            this.actionMode !== ACTION_MODES.ADJUST_SKELETONS
          );
        }

        if (this.actionMode === ACTION_MODES.DELETE_KEYPOINTS) {
          this.deleteSelectedKeypoint();
        }
      },
      'selection:cleared': (options) => {
        this.keypointSelected = false;
      },
      'selection:updated': (options) => {
        this.keypointSelected = options.selected[0];

        if (this.keypointSelected.skeletonId) {
          this.setActivateSkeleton(
            this.getSkeletonIndexForSkeletonId(this.keypointSelected.skeletonId),
            this.getKeypointStateObjectForCanvasKeypointObject(this.keypointSelected)?.label,
            this.actionMode !== ACTION_MODES.ADJUST_SKELETONS
          );
        }

        if (this.actionMode === ACTION_MODES.DELETE_KEYPOINTS) {
          this.deleteSelectedKeypoint();
        }
      }
    };

    for (const eventName in canvasActionsMap) {
      this.canvas.on(eventName, canvasActionsMap[eventName]);
    }
  }

  getSkeletonIndexForSkeletonId (skeletonId) {
    return this.skeletons.findIndex(sk => sk.id === skeletonId);
  }

  setActiveActionMode (mode) {
    if (this.actionMode === mode) return;

    if (mode === ACTION_MODES.DRAW_SKELETON && isNil(this.skeletonBoundingBox)) {
      this.notifyUserOfError('A skeletonBoundingBox is required to drawn a skeleton rig.' +
                ' Please add the skeletonBoundingBox attribute to the component.');
    }

    this.actionMode = mode;

    let element = null;
    for (const elementId of ['drawKeypoint', 'delete', 'adjustSkeletons']) {
      element = this.shadowRoot.getElementById(elementId);
      element.classList.remove('active-toolbar-button');
    }

    switch (mode) {
      case ACTION_MODES.DELETE_KEYPOINTS:
        this.canvas.selection = false;
        element = this.shadowRoot.getElementById('delete');
        element.classList.add('active-toolbar-button');
        this.ungroupSkeletonGroupsInCanvas();
        break;
      case ACTION_MODES.DRAW_KEYPOINTS:
        this.canvas.selection = false;
        element = this.shadowRoot.getElementById('drawKeypoint');
        element.classList.add('active-toolbar-button');
        this.ungroupSkeletonGroupsInCanvas();
        break;
      case ACTION_MODES.DRAW_SKELETON:
        this.canvas.selection = true;
        this.canvas.discardActiveObject();
        break;
      case ACTION_MODES.ADJUST_SKELETONS:
        this.canvas.selection = true;
        element = this.shadowRoot.getElementById('adjustSkeletons');
        element.classList.add('active-toolbar-button');
        this.ungroupSkeletonGroupsInCanvas();
        this.createSkeletonGroupsInCanvas();
        break;
    }
  }

  clearKeypointActiveState () {
    const activeSkeleton = this.getActiveSkeleton();
    if (isNil(activeSkeleton)) return;

    const skeletonId = activeSkeleton.id;
    // Remove active state on all other keypoints
    for (const _keypointClass of this.keypointClasses) {
      const element = this.shadowRoot.getElementById(`${_keypointClass.label}-${skeletonId}`);
      element.classList.remove('active');
    }
  }

  createSkeletonGroupsInCanvas () {
    this.skeletonsAreGrouped = true;
    if (!this.skeletons.length) return;

    // If a keypoint is selected before this is called, this can lead to problems
    // moving the skeleton since the keypoint will be moved. So we will remove
    // all canvas selections before selecting it.
    this.canvas.discardActiveObject();

    const groups = [];

    Array.from(this.skeletons).reverse().forEach(skeleton => {
      const objectsForSkeleton = this.canvas.getObjects().filter(obj => {
        return obj.skeletonId === skeleton.id;
      });
      if (objectsForSkeleton.length) {
        const group = new fabric.Group(objectsForSkeleton, { selectable: true });
        group.skeletonId = skeleton.id;
        this.canvas.add(group);
        group.addWithUpdate();
        group.setCoords();
        groups.push(group);
      }
    });
    this.groups = groups;
    this.canvas.requestRenderAll();
  }

  ungroupSkeletonGroupsInCanvas () {
    this.skeletonsAreGrouped = false;
    if (isNil(this.group) && (isEmpty(this.groups) || isNil(this.groups))) return;

    this.canvas.discardActiveObject().requestRenderAll();

    if (this.group) {
      this.group.getObjects().forEach(obj => {
        if (obj instanceof fabric.Line) {
          this.group.remove(obj);
          this.canvas.remove(obj);
        } else if (obj instanceof fabric.Circle) {
          const keypointCopy = new fabric.Circle(fabric.util.object.clone(obj));

          const matrix = obj.calcTransformMatrix();
          const point = { x: -obj.width / 2, y: -obj.height / 2 };
          const pointOnCanvas = fabric.util.transformPoint(point, matrix);

          keypointCopy.set({
            left: pointOnCanvas.x,
            top: pointOnCanvas.y
          });
          this.canvas.add(keypointCopy);
        }
      });
      this.group.addWithUpdate();
      this.group.setCoords();

      if (isEmpty(this.groups) || isNull(this.groups)) {
        this.groups = [this.group];
      } else if (this.group) {
        this.groups.push(this.group);
      }
      this.drawRigLinesForSkeleton(this.group.skeletonId);
    }

    this.group = null;

    this.groups.forEach(group => {
      const objects = group.getObjects();
      group._restoreObjectsState();
      fabric.util.resetObjectTransform(group);

      objects.forEach(obj => {
        if (obj instanceof fabric.Circle) {
          const skeleton = this.getSkeletonForCanvasKeypointObject(obj);
          if (skeleton) obj.selectable = skeleton.editable;
        }
        group.remove(obj);
      });

      this.canvas.remove(group);
    });

    this.groups = [];

    this.canvas.requestRenderAll();
    this.updateKeypointPositionState();
  }

  moveKeypoint (keypointStateObject, skeleton, x, y) {
    this.deleteKeypoint(keypointStateObject, skeleton.id, false);
    keypointStateObject.x = x;
    keypointStateObject.y = y;
    this.drawKeypoint(keypointStateObject, skeleton);
  }

  undo () {
    if (this.trackedChangesIndex >= 0) {
      const lastChange = this.trackedChanges[this.trackedChangesIndex];

      if (lastChange.nameOfChangeFunction === 'addKeypoint') {
        const keypointStateObject = lastChange.relatedState.keypointReference;
        const skeletonId = lastChange.relatedState.skeleton.id;
        this.deleteKeypoint(keypointStateObject, skeletonId, false);
        this.trackedChangesIndex--;
      } else if (lastChange.nameOfChangeFunction === 'deleteKeypoint') {
        const keypointStateObject = lastChange.relatedState.keypointReference;
        keypointStateObject.x = lastChange.relatedState.x;
        keypointStateObject.y = lastChange.relatedState.y;

        const skeleton = lastChange.relatedState.skeleton;
        this.addKeypoint(keypointStateObject, skeleton, false);
        this.trackedChangesIndex--;
      } else if (lastChange.nameOfChangeFunction === 'object:modified') {
        const keypointStateObject = lastChange.relatedState.keypointReference;
        const skeleton = lastChange.relatedState.skeleton;
        const newX = lastChange.relatedState.beforeX;
        const newY = lastChange.relatedState.beforeY;
        this.moveKeypoint(keypointStateObject, skeleton, newX, newY);
        this.trackedChangesIndex--;
      }
    }
  }

  redo () {
    if (this.trackedChangesIndex + 1 < this.trackedChanges.length) {
      this.trackedChangesIndex++;
      const nextChange = this.trackedChanges[this.trackedChangesIndex];

      if (nextChange.nameOfChangeFunction === 'addKeypoint') {
        const keypointStateObject = nextChange.relatedState.keypointReference;
        keypointStateObject.x = nextChange.relatedState.x;
        keypointStateObject.y = nextChange.relatedState.y;
        const skeleton = nextChange.relatedState.skeleton;
        this.addKeypoint(keypointStateObject, skeleton, false);
      } else if (nextChange.nameOfChangeFunction === 'deleteKeypoint') {
        const keypointStateObject = nextChange.relatedState.keypointReference;
        const skeletonId = nextChange.relatedState.skeleton.id;
        this.deleteKeypoint(keypointStateObject, skeletonId, false);
      } else if (nextChange.nameOfChangeFunction === 'object:modified') {
        const keypointStateObject = nextChange.relatedState.keypointReference;
        const skeleton = nextChange.relatedState.skeleton;
        const newX = nextChange.relatedState.afterX;
        const newY = nextChange.relatedState.afterY;
        this.moveKeypoint(keypointStateObject, skeleton, newX, newY);
      }
    }
  }

  setActiveKeypointClass (keypointClassName) {
    const activeSkeleton = this.getActiveSkeleton();
    if (isNil(activeSkeleton)) return;

    this.keypointIndex = this.keypointClasses.map(kp => kp.label).indexOf(keypointClassName);
    const skeletonId = activeSkeleton.id;

    this.clearKeypointActiveState();

    // Add active state for selected keypoint
    const element = this.shadowRoot.getElementById(`${keypointClassName}-${skeletonId}`);
    element.classList.add('active');

    // If point exists, then lets target it
    const points = this.canvas.getObjects().filter(obj => {
      return obj.keypointClassName === keypointClassName && obj.skeletonId === skeletonId;
    });

    if (points.length) {
      const id = this.canvas.getObjects().indexOf(points[0]);
      this.canvas.setActiveObject(this.canvas.item(id));
      this.keypointSelected = this.canvas.item(id);
    } else {
      this.canvas.discardActiveObject();
    }
    this.canvas.requestRenderAll();
  }

  deleteKeypoint (keypointStateObject, skeletonId, trackChange = true) {
    if (trackChange) {
      const skeleton = this.skeletons[this.getSkeletonIndexForSkeletonId(skeletonId)];
      this.trackChange('deleteKeypoint', {
        x: keypointStateObject.x,
        y: keypointStateObject.y,
        label: keypointStateObject.label,
        keypointReference: keypointStateObject,
        skeleton
      });
    }

    const keypointClassName = keypointStateObject.label;

    const element = this.shadowRoot.getElementById(`${keypointClassName}-check-mark-${skeletonId}`);
    element.classList.add('hidden');

    keypointStateObject.x = null;
    keypointStateObject.y = null;
    const canvasKeypoint = this.getCanvasKeypointForKeypoint(keypointStateObject, skeletonId);
    this.canvas.remove(canvasKeypoint);
    this.setActiveKeypointClass(keypointClassName);
    this.drawRigLinesForSkeleton(skeletonId);
  }

  deleteSelectedKeypoint () {
    this.setActiveActionMode(ACTION_MODES.DELETE_KEYPOINTS);
    const activeSkeleton = this.getActiveSkeleton();
    if (isNil(activeSkeleton)) return;

    if (this.keypointSelected) {
      const skeletonId = activeSkeleton.id;
      const keypointStateObject = this.getKeypointStateObjectForCanvasKeypointObject(this.keypointSelected);
      this.deleteKeypoint(keypointStateObject, skeletonId);
    }
  }

  getActiveSkeleton () {
    if (isNil(this.skeletonIndex)) {
      return null;
    } else {
      return this.skeletons[this.skeletonIndex];
    }
  }

  deleteSkeleton (skeletonId, trackChanges = true) {
    this.trackChange('deleteSkeleton', {});

    // remove skeleton from UI panel
    this.shadowRoot.getElementById(`skeleton-${skeletonId}`).remove();

    // Remove objects belonging to skeleton from canvas
    for (const obj of this.canvas.getObjects()) {
      if (obj.skeletonId === skeletonId) this.canvas.remove(obj);
    }

    // remove skeleton array and reset the array index
    const skeletonIndex = this.skeletons.findIndex(sk => sk.id === skeletonId);
    this.skeletons.splice(skeletonIndex, 1);
    if (this.skeletonIndex === skeletonIndex) {
      if (skeletonIndex === 0) {
        if (this.skeletons.length) {
          this.skeletonIndex = 0;
        } else {
          this.skeletonIndex = null;
        }
      } else {
        this.skeletonIndex--;
      }
      this.setActivateSkeleton(this.skeletonIndex);
    }

    this.updateSkeletonNamesInSkeletonPanel();

    this.canvas.requestRenderAll();
  }

  deleteAllKeypoints (skeletonId) {
    for (const skeleton of this.skeletons) {
      if (!isNull(skeletonId) && skeletonId !== skeleton.id) continue;

      for (const keypoint of skeleton.keypoints) {
        keypoint.x = null;
        keypoint.y = null;
      }

      for (const keypointClass of this.keypointClasses) {
        const element = this.shadowRoot.getElementById(`${keypointClass.label}-check-mark-${skeleton.id}`);
        element.classList.add('hidden');
      }

      this.canvas.forEachObject((object) => {
        if (object.skeletonId === skeleton.id) {
          this.canvas.remove(object);
        }
      });
    }

    this.setActiveKeypointClass(this.keypointClasses[0].label);
    this.canvas.requestRenderAll();
  }

  loadAttributes () {
    const attributes = ['keypointClasses', 'skeletonRig',
      'skeletonBoundingBox', 'initialValues', 'annotationIssues',
      'uniqueSkeletonColors'
    ];

    this.imgSrc = this.getAttribute('imgSrc');

    for (const attribute of attributes) {
      try {
        if (this.getAttribute(attribute)) {
          this[attribute] = JSON.parse(this.getAttribute(attribute));
        }
      } catch (e) {
        this.notifyUserOfError(`Invalid value for crowd-pose component attribute "${attribute}". ${attribute} must be a valid json string.`);
        throw Error('Failed to load attributes. Please fix attribute data before continuing.');
      }
    }
  }

  validateComponentPassedAttributes () {
    const defaultValuesMap = {
      imgSrc: null,
      keypointClasses: null,
      skeletonRig: [],
      initialValues: [],
      annotationIssues: [],
      uniqueSkeletonColors: null
    };
    const ajv = new Ajv();
    const validationMap = {
      imgSrc: { type: 'string' },
      keypointClasses: keypointClassesSchema,
      skeletonRig: skeletonRigSchema,
      initialValues: initialValuesSchema,
      annotationIssues: annotationIssuesSchema,
      uniqueSkeletonColors: uniqueSkeletonColorsSchema
    };
    const required = ['keypointClasses'];

    for (const attribute in validationMap) {
      // We will skip validation if they are not required and null is an option.
      if (!required.includes(attribute) && isEqual(this[attribute], defaultValuesMap[attribute])) {
        continue;
      }

      const validate = ajv.compile(validationMap[attribute]);
      if (!validate(this[attribute])) {
        this.notifyUserOfError(`Input validation failed for component attribute "${attribute}".
                 Make sure the data being passed into the component follows the schema specification. 
                 Details: ${ajv.errorsText(validate.errors)}`);
        throw Error('Failed to load attributes. Please fix attribute data before continuing.');
      }
    }
  }

  notifyUserOfError (msg) {
    console.error(msg);
    const errorBox = this.shadowRoot.getElementById('errorBox');
    errorBox.innerHTML = `
            <crowd-alert type="error" dismissible>
                ${msg}
            </crowd-alert>
        `;
    errorBox.scrollIntoView();
  }

  getNewEmptySkeleton () {
    const skeleton = new SkeletonState();
    skeleton.editable = true;
    skeleton.keypoints = this.keypointClasses.map((keypointClass, index) => {
      const keypointState = new KeypointState();
      keypointState.color = keypointClass.color || COLORS[index % COLORS.length];
      keypointState.drawStyle = KEYPOINT_DRAW_STYLES.SOLID_CIRLCE;
      keypointState.hotkey = KEYPOINT_HOTKEYS[index % KEYPOINT_HOTKEYS.length];
      keypointState.label = keypointClass.label;
      return keypointState;
    });
    skeleton.rig = this.skeletonRig;
    return skeleton;
  }

  hydrateValues () {
    if (isEmpty(this.initialValues)) {
      return [];
    } else {
      const skeletons = [];
      for (const initialValue of this.initialValues) {
        const skeleton = new SkeletonState();
        skeleton.name = initialValue?.name || '';
        skeleton.editable = get(initialValue, 'annotation_options.editable', true);
        skeleton.keypoints = this.keypointClasses.map((keypointClass, index) => {
          const keypointState = new KeypointState();
          keypointState.color = initialValue?.annotation_options?.keypoint_color || COLORS[index % COLORS.length];
          keypointState.drawStyle = get(KEYPOINT_DRAW_STYLES, initialValue?.annotation_options?.keypoint_style, KEYPOINT_DRAW_STYLES.SOLID_CIRLCE);
          keypointState.hotkey = KEYPOINT_HOTKEYS[index % KEYPOINT_HOTKEYS.length];
          keypointState.label = keypointClass.label;

          const annotation = initialValue.annotations.filter((keypoint) => {
            return keypoint.label === keypointClass.label;
          });
          if (annotation.length) {
            keypointState.x = annotation[0].x;
            keypointState.y = annotation[0].y;
          }

          return keypointState;
        });
        skeleton.lineColor = initialValue?.annotation_options?.line_color;
        skeleton.rig = this.skeletonRig;

        skeletons.push(skeleton);
      }
      return skeletons;
    }
  }

  loadUserSettings () {
    if (localStorage && localStorage.getItem('lineSize')) {
      this.lineWidth = Number(localStorage.getItem('lineSize'));
    }
    if (localStorage && localStorage.getItem('keypointSize')) {
      this.drawObjectWidth = Number(localStorage.getItem('keypointSize'));
    }
    if (localStorage && localStorage.getItem('lineColor')) {
      this.lineColor = localStorage.getItem('lineColor');
    }

    if (localStorage && localStorage.getItem('forceUseOfDefaultLineColor')) {
      this.forceUseOfDefaultLineColor = localStorage.getItem('forceUseOfDefaultLineColor') === 'true';
    }
  }

  saveUserSettings () {
    if (localStorage) {
      localStorage.setItem('lineSize', this.lineWidth);
      localStorage.setItem('keypointSize', this.drawObjectWidth);
      localStorage.setItem('lineColor', this.lineColor);
      localStorage.setItem('forceUseOfDefaultLineColor', this.forceUseOfDefaultLineColor);
    }
  }

  getFormDataForAnnotations () {
    this.setActiveActionMode(ACTION_MODES.DRAW_KEYPOINTS);
    this.ungroupSkeletonGroupsInCanvas();
    this.updateKeypointPositionState();
    const annotations = [];

    for (const skeleton of this.skeletons) {
      const skeletonAnnotation = {
        name: skeleton.name,
        annotations: []
      };
      for (const keypoint of skeleton.keypoints) {
        if (keypoint.hasXY) {
          skeletonAnnotation.annotations.push({
            label: keypoint.label,
            x: keypoint.x,
            y: keypoint.y
          });
        }
      }
      annotations.push(skeletonAnnotation);
    }
    return JSON.stringify(annotations);
  }

  constructor () {
    super();

    // Init States
    this.skeletonsAreGrouped = false;
    this.delayRendering = true;
    this.showInstructions = false;
    this.showAnnotationInsights = false;
    this.showShortcuts = false;
    this.showRightPanel = true;
    this.showRightPanelSettings = false;
    this.showSkeletons = true;
    this.keypointIndex = 0;
    this.lineWidth = defaultLineSize;
    this.drawObjectWidth = defaultKeypointSize;
    this.drawObjectWidthPrevious = defaultKeypointSize;
    this.lineColor = defaultLineColor;
    this.forceUseOfDefaultLineColor = defaultForceUseOfDefaultLineColor;
    this.createNewSkeletonAutomatically = false;
    this.noChangesNeeded = false;
    this.trackedChanges = [];
    this.trackedChangesIndex = -1;

    // Set initial zoom level and zoom sensitivity
    this.zoomLevel = this.zoomLevel || 1;
    this.originalZoomLevel = this.zoomLevel;
    this.zoomSensitivity = 0.3;
    this.maxZoomIn = null;
    this.maxZoomOut = null;

    // Track panning variables
    this.mouseDown = false;
    this.isPanning = false;
    this.keypointSelected = false;
    this.lastPosX = 0;
    this.lastPosY = 0;
    this.mouseDownTime = 0;
    this.panDetectionMousePressDuration = 200;

    this.loadUserSettings();

    const shadowRoot = this.attachShadow({ mode: 'open' });
    const clone = template.content.cloneNode(true);
    shadowRoot.append(clone);

    // Load Component Passed Attributes
    this.loadAttributes();

    // Validate Component Passed Attributes
    this.validateComponentPassedAttributes();

    // Hydrate Values
    const skeletons = this.hydrateValues();

    this.setupOnSubmitHandler();
    this.setupObservers();

    this.canvas = new fabric.Canvas(this.shadowRoot.getElementById('canvas'), {
      hoverCursor: 'default',
      moveCursor: 'grabbing'
    });
    this.canvas.selection = false;
    this.canvas.selectionColor = 'rgba(0,0,0,0)';
    this.canvas.selectionBorderColor = 'red';
    this.canvas.selectionLineWidth = 2;

    this.setupCanvasEvents();

    this.initialization = new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => {
        this.imageNaturalWidth = img.naturalWidth;
        this.imageNaturalHeight = img.naturalHeight;

        this.canvasWidth = Math.max(img.naturalWidth, this.getCanvasContainerWidth());
        this.canvasHeight = Math.max(img.naturalHeight, this.getCanvasContainerHeight());

        this.imageScaleX = this.canvasWidth / img.naturalWidth;
        this.imageScaleY = this.canvasHeight / img.naturalHeight;
        this.imageScale = Math.min(this.imageScaleX, this.imageScaleY);

        this.canvas.setHeight(this.canvasWidth);
        this.canvas.setWidth(this.canvasHeight);
        this.canvas.setDimensions({
          width: this.canvasWidth,
          height: this.canvasHeight
        });
        this.canvas.requestRenderAll();
        resolve();
      };

      img.onerror = () => {
        const msg = `Failed to load image: ${img.src}`;
        this.notifyUserOfError(msg);
        reject(new Error(msg));
      };

      img.src = this.imgSrc;
    });

    this.initialization.then(() => {
      this.setupLeftPanelActions();

      this.setupRightPanelActions(skeletons);

      this.fitCanvasToWindow();

      this.setupHotkeys();
      this.setupButtonActions();

      const resizeHandler = () => {
        this.fitCanvasToWindow();
      };

      window.addEventListener('resize', resizeHandler);

      const ctx = this.canvas.getContext();
      ctx.imageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
      ctx.oImageSmoothingEnabled = false;
      fabric.Image.fromURL(this.imgSrc, (img) => {
        const ctx = this.canvas.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.msImageSmoothingEnabled = false;
        ctx.oImageSmoothingEnabled = false;

        img.objectCaching = false;
        img.imageSmoothingEnabled = false;

        this.img = img;

        img.hoverCursor = 'default';

        this.maxZoomIn = (Math.max(img.width, img.height) * 2) / 100;
        const ratio = Math.max(
          this.getCanvasContainerWidth() / this.imageNaturalWidth,
          this.getCanvasContainerHeight() / this.imageNaturalHeight
        );
        if (ratio > 1) {
          this.maxZoomOut = 0.5;
        } else {
          this.maxZoomOut = Math.max(
            this.getCanvasContainerWidth() / this.imageNaturalWidth,
            this.getCanvasContainerHeight() / this.imageNaturalHeight
          ) / 2;
        }

        img.set({
          scaleX: this.imageScale,
          scaleY: this.imageScale,
          top: (this.canvas.height - img.height * this.imageScale) / 2,
          left: (this.canvas.width - img.width * this.imageScale) / 2,
          angle: 0,
          opacity: 1,
          selectable: false
        });

        this.canvas.add(img);
        this.delayRendering = false;

        this.redrawAllItems();
        this.zoomReset();

        this.startTime = new Date();
      });
    }).catch(error => {
      console.error(error);
    });
  }

  updateCoordinates (event) {
    const img = this.img;
    if (!img) return;

    const pointer = this.canvas.getPointer(event.e);
    const canvasPosX = Math.round(pointer.x);
    const canvasPosY = Math.round(pointer.y);
    const posX = Math.max(Math.min(Math.round((pointer.x - img.left) / img.scaleX), img.width), 0);
    const posY = Math.max(Math.min(Math.round((pointer.y - img.top) / img.scaleY), img.height), 0);
    const element = this.shadowRoot.getElementById('canvas-overlay');
    element.innerText = 'Canvas Coordinates: (' + canvasPosX + ', ' + canvasPosY + ') Image Coordinates: (' + posX + ', ' + posY + ')';
  }

  clearKeypointDrawnIndicators () {
    for (const _keypointClass of this.keypointClasses) {
      const element = this.shadowRoot.getElementById(`${_keypointClass.label}-check-mark`);
      element.classList.add('hidden');
    }
  }

  setActivateSkeleton (skeletonIndex, activeKeypointClassLabel = null, activateKeypointClass = true) {
    if (isNil(skeletonIndex) || skeletonIndex === this.skeletonIndex) {
      if (activeKeypointClassLabel && activateKeypointClass) {
        this.setActiveKeypointClass(activeKeypointClassLabel);
      }
      return;
    }

    if (skeletonIndex >= 0 && skeletonIndex < this.skeletons.length) {
      const skeleton = this.skeletons[skeletonIndex];
      const header = this.shadowRoot.getElementById(`skeleton-${skeleton.id}-header`);
      this.shadowRoot.querySelectorAll('.active-skeleton-header').forEach(el => {
        el.classList.remove('active-skeleton-header');
      });
      header.classList.add('active-skeleton-header');
      this.skeletonIndex = skeletonIndex;

      if (activateKeypointClass) {
        if (activeKeypointClassLabel) {
          this.setActiveKeypointClass(activeKeypointClassLabel);
        } else {
          this.setActiveKeypointClass(this.keypointClasses[0].label);
          this.nextUnmarkedKeypoint();
        }
      }

      header.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'start'
      });
    } else {
      this.skeletonIndex = null;
    }
  }

  previousUnmarkedKeypoint () {
    const activeSkeleton = this.getActiveSkeleton();

    if (activeSkeleton) {
      const keypoints = activeSkeleton.keypoints;

      if (this.keypointIndex - 1 >= 0 && !keypoints[this.keypointIndex - 1].hasXY) {
        this.keypointIndex = this.keypointIndex - 1;
      } else {
        for (let i = this.keypointIndex - 1; i >= 0; i--) {
          if (keypoints[i].hasXY) continue;
          this.keypointIndex = i;
          break;
        }
      }

      this.setActiveKeypointClass(this.keypointClasses[this.keypointIndex].label);
    }
  }

  previousKeypoint () {
    const activeSkeleton = this.getActiveSkeleton();

    if (activeSkeleton) {
      this.keypointIndex--;
      if (this.keypointIndex < 0) {
        this.keypointIndex = this.keypointClasses.length - 1;
      }
      this.setActiveKeypointClass(this.keypointClasses[this.keypointIndex].label);
    }
  }

  firstUnmarkedKeypoint () {
    const activeSkeleton = this.getActiveSkeleton();

    if (activeSkeleton) {
      const keypoints = activeSkeleton.keypoints;
      // Search for the first unmarked keypoint
      for (let i = this.keypointIndex; i < keypoints.length; i++) {
        if (keypoints[i].hasXY) continue;
        this.keypointIndex = i;
        break;
      }

      this.setActiveKeypointClass(this.keypointClasses[this.keypointIndex].label);
    }
  }

  nextUnmarkedKeypoint () {
    const activeSkeleton = this.getActiveSkeleton();

    if (activeSkeleton) {
      const keypoints = activeSkeleton.keypoints;
      // Check if the next keypoint is unmarked
      if (this.keypointIndex + 1 < keypoints.length && !keypoints[this.keypointIndex + 1].hasXY) {
        this.keypointIndex = this.keypointIndex + 1;
      } else {
        // Search for the next unmarked keypoint
        for (let i = this.keypointIndex + 1; i < keypoints.length; i++) {
          if (keypoints[i].hasXY) continue;
          this.keypointIndex = i;
          break;
        }
      }
      this.setActiveKeypointClass(this.keypointClasses[this.keypointIndex].label);
    }
  }

  nextKeypoint () {
    const activeSkeleton = this.getActiveSkeleton();
    if (activeSkeleton) {
      this.keypointIndex = (this.keypointIndex + 1) % activeSkeleton.keypoints.length;
      this.setActiveKeypointClass(this.keypointClasses[this.keypointIndex].label);
    }
  }

  drawKeypoint (keypoint, skeleton, updateRigLines = true, hideSkeleton = false) {
    if (!this.img || this.delayRendering) return;

    const skeletonId = skeleton.id;
    const editable = skeleton.editable;
    if (keypoint.hasXY &&
        keypoint.showKeypoint &&
        skeleton.showKeypoints &&
        (this.showSkeletons || this.getSkeletonVisibilityUIState(skeletonId))
    ) {
      const points = this.canvas.getObjects().filter(obj => {
        return obj.keypointClassName === keypoint.label && obj.skeletonId === skeletonId;
      });

      // check if it is already a canvas object
      if (points.length === 0) {
        // Keypoint values are always relative to the image. Let's convert their
        // position relative to the canvas.
        const keypointCanvasPosition =
                    this.convertKeypointPositionRelativeToImageToCanvasPosition(
                      keypoint.x, keypoint.y);

        const radius = this.drawObjectWidth;

        if (keypoint.drawStyle === KEYPOINT_DRAW_STYLES.SOLID_CIRLCE) {
          const circle = new fabric.Circle({
            radius,
            fill: keypoint.color,
            left: keypointCanvasPosition.x,
            top: keypointCanvasPosition.y,
            selectable: editable,
            scalable: false,
            hasControls: false,
            borderColor: 'red',
            hoverCursor: editable ? 'move' : 'not-allowed',
            padding: 0,
            strokeWidth: 0
          });

          circle.keypointClassName = keypoint.label;
          circle.skeletonId = skeletonId;

          // Add the circle to the canvas
          this.canvas.add(circle);
        }

        if (updateRigLines) {
          this.drawRigLinesForSkeletonAndKeypointClassName(
            skeletonId,
            keypoint.label
          );
        }

        const element = this.shadowRoot.getElementById(`${keypoint.label}-check-mark-${skeletonId}`);
        element.classList.remove('hidden');
      }
    }
  }

  _updateKeypointExistsUiState (keypoint, skeleton) {
    if (this.delayRendering) return;
    const element = this.shadowRoot.getElementById(`${keypoint.label}-check-mark-${skeleton.id}`);
    if (keypoint.hasXY) {
      element.classList.remove('hidden');
    } else {
      element.classList.add('hidden');
    }
  }

  drawSkeleton (skeletonId, hideSkeleton = false) {
    if (this.delayRendering) return;

    for (let i = 0; i < this.skeletons.length; i++) {
      const skeleton = this.skeletons[i];
      if (skeletonId !== skeleton.id) continue;
      for (const keypoint of skeleton.keypoints) {
        this.drawKeypoint(keypoint, skeleton, false, hideSkeleton);
        this._updateKeypointExistsUiState(keypoint, skeleton);
      }
      break;
    }
    this.drawRigLinesForSkeleton(skeletonId);
  }

  drawAllSkeletons () {
    if (this.delayRendering) return;

    for (let i = 0; i < this.skeletons.length; i++) {
      const skeleton = this.skeletons[i];
      for (const keypoint of skeleton.keypoints) {
        this.drawKeypoint(keypoint, skeleton, false);
        this._updateKeypointExistsUiState(keypoint, skeleton);
      }
    }
    this.drawRigLines();
  }

  trackChange (nameOfChangeFunction, relatedState) {
    if (nameOfChangeFunction === 'deleteSkeleton') {
      this.trackedChanges = [];
      this.trackedChangesIndex = -1;
      return;
    }

    if (this.trackedChanges.length === 0 || this.trackedChangesIndex + 1 === this.trackedChanges.length) {
      this.trackedChanges.push({
        nameOfChangeFunction,
        relatedState
      });
    } else {
      // A change was made while in the middle of an undo/redo chain. For simplicity, the system does not store a
      // record of the previous states that can be redone (reversed) after the change. In other words, it means that
      // if you make changes during an undo/redo operation, you won't be able to redo to the state that existed before
      // those changes were made.
      this.trackedChanges = this.trackedChanges.splice(0, this.trackedChangesIndex + 1);
      this.trackedChanges.push({
        nameOfChangeFunction,
        relatedState
      });
    }

    this.trackedChangesIndex++;
  }

  addKeypoint (keypointStateObject, skeleton, trackChange = true) {
    const keypointClassName = keypointStateObject.label;
    const skeletonId = skeleton.id;

    if (trackChange) {
      this.trackChange('addKeypoint', {
        x: keypointStateObject.x,
        y: keypointStateObject.y,
        label: keypointStateObject.label,
        keypointReference: keypointStateObject,
        skeleton
      });
    }

    this.drawKeypoint(keypointStateObject, skeleton);

    const element = this.shadowRoot.getElementById(`${keypointClassName}-check-mark-${skeletonId}`);
    element.classList.remove('hidden');

    this.nextUnmarkedKeypoint();
  }

  addKeypointFromMouseEvent (event) {
    const activeSkeleton = this.getActiveSkeleton();

    if (activeSkeleton) {
      const skeletonId = activeSkeleton.id;
      const keypointClassName = this.keypointClasses[this.keypointIndex].label;

      const points = this.canvas.getObjects().filter(obj => {
        return obj.keypointClassName === keypointClassName && obj.skeletonId === skeletonId;
      });

      // check if keypoint already exists
      if (points.length === 0 && activeSkeleton.editable) {
        const canvas = this.canvas;
        const pointer = canvas.getPointer(event);

        // Position relative to image
        const posX = Math.max(Math.min(Math.round((pointer.x - this.img.left) / this.img.scaleX), this.img.width), 0);
        const posY = Math.max(Math.min(Math.round((pointer.y - this.img.top) / this.img.scaleY), this.img.height), 0);

        // get the state data for the keypoint
        const keypoint = activeSkeleton.keypoints.filter(kp => kp.label === keypointClassName)[0];
        keypoint.x = posX;
        keypoint.y = posY;

        this.addKeypoint(keypoint, activeSkeleton);
      }
    }
  }

  drawRigLinesForSkeletonAndKeypointClassName (skeletonId, keypointClassName) {
    this.clearDrawnRigLinesForSkeletonAndKeypointClassName(
      skeletonId,
      keypointClassName
    );

    const keypoints = this.getCanvasKeypoints().filter(obj => {
      return obj.skeletonId === skeletonId;
    });
    if (keypoints.length === 0) return;

    keypoints.sort((a, b) => a.selectable - b.selectable);
    const skeleton = this.skeletons.filter(sk => sk.id === skeletonId)[0];
    let lineColor = skeleton.lineColor || this.lineColor;

    for (let i = 0; i < this.skeletonRig.length; i++) {
      const connections = this.skeletonRig[i];
      if (this.forceUseOfDefaultLineColor) {
        lineColor = this.lineColor;
      } else {
        if (connections.length === 3 && connections[2] !== null) {
          lineColor = connections[2];
        } else {
          lineColor = skeleton.lineColor || this.lineColor;
        }
      }

      // Check if the pair contains the keypoint class we are interested in.
      if (connections.includes(keypointClassName)) {
        const pointa = keypoints.filter(obj => {
          return obj.keypointClassName === connections[0];
        });
        const pointb = keypoints.filter(obj => {
          return obj.keypointClassName === connections[1];
        });

        if (pointa.length && pointb.length) {
          const center1 = pointa[0].getCenterPoint();
          const center2 = pointb[0].getCenterPoint();

          // Create a line between the circles
          const line = new fabric.Line([
            center1.x - this.lineWidth / 2,
            center1.y - this.lineWidth / 2,
            center2.x - this.lineWidth / 2,
            center2.y - this.lineWidth / 2

          ], {
            stroke: lineColor,
            strokeWidth: this.lineWidth,
            selectable: false,
            scalable: false,
            hasControls: false
          });
          line.skeletonId = skeletonId;
          line.keypointClassNames = connections;

          // Add the line to the canvas
          this.canvas.add(line);

          // Ensure line is behind the circles
          this.canvas.bringToFront(pointa[0]);
          this.canvas.bringToFront(pointb[0]);
        }
      }
    }
    this.adjustZIndex();
  }

  drawRigLinesForSkeleton (skeletonId) {
    this.clearDrawnRigLinesForSkeleton(skeletonId);

    const keypoints = this.getCanvasKeypoints().filter(obj => {
      return obj.skeletonId === skeletonId;
    });
    if (keypoints.length === 0) return;

    keypoints.sort((a, b) => a.selectable - b.selectable);
    const skeleton = this.skeletons.filter(sk => sk.id === skeletonId)[0];
    let lineColor = skeleton.lineColor || this.lineColor;

    for (let i = 0; i < this.skeletonRig.length; i++) {
      const connections = this.skeletonRig[i];

      if (this.forceUseOfDefaultLineColor) {
        lineColor = this.lineColor;
      } else {
        if (connections.length === 3 && connections[2] !== null) {
          lineColor = connections[2];
        } else {
          lineColor = skeleton.lineColor || this.lineColor;
        }
      }

      const pointa = keypoints.filter(obj => {
        return obj.keypointClassName === connections[0];
      });
      const pointb = keypoints.filter(obj => {
        return obj.keypointClassName === connections[1];
      });

      if (pointa.length && pointb.length) {
        const center1 = pointa[0].getCenterPoint();
        const center2 = pointb[0].getCenterPoint();

        // Create a line between the circles
        const line = new fabric.Line([
          center1.x - this.lineWidth / 2,
          center1.y - this.lineWidth / 2,
          center2.x - this.lineWidth / 2,
          center2.y - this.lineWidth / 2

        ], {
          stroke: lineColor,
          strokeWidth: this.lineWidth,
          selectable: false,
          scalable: false,
          hasControls: false
        });
        line.skeletonId = skeletonId;
        line.keypointClassNames = connections;

        // Add the line to the canvas
        this.canvas.add(line);

        // Ensure line is behind the circles
        this.canvas.bringToFront(pointa[0]);
        this.canvas.bringToFront(pointb[0]);
      }
    }
    this.adjustZIndex();
  }

  clearDrawnRigLinesForSkeletonAndKeypointClassName (skeletonId, keypointClassName) {
    this.canvas.getObjects().forEach((object) => {
      if (object instanceof fabric.Line && object.skeletonId === skeletonId &&
                object.keypointClassNames.includes(keypointClassName)) {
        this.canvas.remove(object);
      }
    });
  }

  clearDrawnRigLinesForSkeleton (skeletonId) {
    this.canvas.getObjects().forEach((object) => {
      if (object instanceof fabric.Line && object.skeletonId === skeletonId) {
        this.canvas.remove(object);
      }
    });
  }

  clearDrawnRigLines () {
    this.canvas.getObjects().forEach((object) => {
      if (object instanceof fabric.Line) {
        this.canvas.remove(object);
      }
    });
  }

  drawRigLines () {
    if (this.delayRendering) return;

    // remove previous lines because we are going to redraw them
    this.clearDrawnRigLines();

    const skeletonIds = this.skeletons.map(sk => {
      return sk.id;
    });

    for (const skeletonId of skeletonIds) {
      this.drawRigLinesForSkeleton(skeletonId);
    }

    this.adjustZIndex();

    this.canvas.requestRenderAll();
  }

  adjustZIndex () {
    const keypoints = this.getCanvasKeypoints();
    keypoints.forEach(kp => this.canvas.bringToFront(kp));
    const img = this.canvas.getObjects().filter(object => object instanceof fabric.Image)[0];
    this.canvas.sendToBack(img);
  }

  zoomReset () {
    // Reset zoom transformation
    this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset to identity matrix

    const container = this.shadowRoot.getElementById('canvas-container');

    // Image is larger than viewport then we want to zoom out till it fits.
    if (container.offsetWidth < this.canvas.width || container.offsetHeight < this.canvas.height) {
      // Zoom the canvas to fit the container
      const containerWidth = container.offsetWidth;
      const containerHeight = container.offsetHeight;
      const canvasWidth = this.canvas.width;
      const canvasHeight = this.canvas.height;
      const zoom = Math.min(containerWidth / canvasWidth, containerHeight / canvasHeight);
      this.canvas.setZoom(zoom);
      this.zoomLevel = zoom;

      // Center the canvas within the container
      const canvasViewport = this.canvas.viewportTransform;
      if (container.offsetWidth < this.canvas.width) {
        const translateX = (containerWidth - canvasWidth * zoom) / 2;
        const translateY = (containerHeight - canvasHeight * zoom) / 2;
        canvasViewport[4] = translateX;
        canvasViewport[5] = translateY;
      } else if (container.offsetHeight < this.canvas.height) {
        const translateX = (containerWidth - canvasWidth * zoom) / 2;
        canvasViewport[4] = translateX - (containerWidth - canvasWidth) / 2;
      }

      this.canvas.setViewportTransform(canvasViewport);
    }

    this.canvas.requestRenderAll();
  }

  viewPortCenterCoordinate () {
    const canvas = this.canvas;
    const zoom = canvas.getZoom();
    return {
      x: fabric.util.invertTransform(canvas.viewportTransform)[4] + (canvas.width / zoom) / 2,
      y: fabric.util.invertTransform(canvas.viewportTransform)[5] + (canvas.height / zoom) / 2
    };
  }

  zoomIn () {
    const zoom = this.canvas.getZoom() * 1.1;
    if (zoom <= this.maxZoomIn || isNull(this.maxZoomIn)) {
      this.canvas.setZoom(zoom);
      this.canvas.requestRenderAll();
    }
  }

  zoomOut () {
    const zoom = this.canvas.getZoom() / 1.1;
    if (zoom >= this.maxZoomOut || isNull(this.maxZoomOut)) {
      this.canvas.setZoom(zoom);
      this.canvas.requestRenderAll();
    }
  }
}

customElements.define('crowd-2d-skeleton', Crowd2dSkeleton);
