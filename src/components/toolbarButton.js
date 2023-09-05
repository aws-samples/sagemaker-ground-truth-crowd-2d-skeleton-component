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
import { ICONOIR_CSS } from '../iconoir';

class ToolbarButton extends HTMLElement {
  constructor () {
    super();
    const icon = this.getAttribute('icon');
    const hotkey = this.getAttribute('hotkey');
    const fontSize = this.getAttribute('fontSize') || '20px;';
    const tooltip = this.getAttribute('tooltip') || null;

    const hotkeyDiv = hotkey ? `<div class="label-hotkey">${hotkey}</div>` : '';
    const template = document.createElement('template');
    template.innerHTML = `
        <style>
            :root{
                display: block;
            }
            .label-hotkey {
                min-width: 12px;
                text-align: center;
                border-radius: 2px;
                border: 1px solid #d5dbdb;
                font-size: 14px;
                line-height: 13px;
                color: #879596;
                padding: 2px;
                margin-top: 5px;
            }
            .button{
                display: flex;
                flex-direction: column;
                justify-items: center;
                align-items: center;
                cursor: pointer;
                width: 45px;      
            }
            .icon{
                font-size: ${fontSize};
                padding: 5px;
                color: var(--icon-color, black);
                font-weight: var(--icon-font-weight, initial);
                border: var(--icon-border-style, solid) 1px var(--icon-color, grey);
                background: var(--icon-background, transparent);
                display: flex;
                justify-content: center;
                align-items: center;
                cursor: pointer;
            }
            ${ICONOIR_CSS}
        </style>
        <div class="button" role="button" title="${tooltip}">
            <i  class="icon ${icon}"></i>
            ${hotkeyDiv}
        </div>
        `;
    const clone = template.content.cloneNode(true);

    const shadowRoot = this.attachShadow({ mode: 'open' });

    shadowRoot.append(clone);
  }
}

customElements.define('toolbar-button', ToolbarButton);
