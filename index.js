
import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/theme-light.js';
import '@spectrum-web-components/theme/scale-medium.js';
import '@spectrum-web-components/textfield/sp-textfield.js';
import '@spectrum-web-components/number-field/sp-number-field.js';
import '@spectrum-web-components/search/sp-search.js';
import "@spectrum-web-components/checkbox/sp-checkbox.js";
import "@spectrum-web-components/radio/sp-radio.js";
import "@spectrum-web-components/slider/sp-slider.js";
import "@spectrum-web-components/switch/sp-switch.js";

let nextDebugId = 0;
  
  export class SubtreeWatcher {
      constructor(root, outputEle) {
          this._timerId = 0;
          this._outputEle = outputEle;
          this._buildSnapshot(root);
          this._outputEle.innerHTML = this.getSubtreeString(this._entries[0]).join("");
      }
  
      stop() {
          if (this._timerId) {
              clearInterval(this._timerId);
              this._timerId = 0;
          }
      }
  
      start() {
          this.stop();
          this._timerId = setInterval(this._handleUpdate, 1000);
      }
  
      _handleUpdate = () => {
          this.update();
      };
  
      ensureDebugId(node) {
          if (node._debugId === undefined) {
              Object.defineProperty(node, "_debugId", {value: nextDebugId++});
          }
          return node;
      }
  
      getNodeLabel(node, includeHandlers, includeDescendantCount) {
          let label = node.nodeName.toLowerCase();
          switch(label) {
              case "#document-fragment":
                  if (!node.parentNode && node.host) {
                      label = "#shadow-root"
                  }
                  break;
              default:
                  break;
          }
  
          if (node.id) {
              label += "#" + node.id;
          }
  
          if (typeof node.className === "string") {
              let classes = node.className.replace(/^ +| +$/g, "").replace(/ +/g, " ");
              if (classes) {
                label += "." + classes.split(/ +/).join(".");
              }
          }
  
          if (node.getAttribute) {
              let slotAttr = node.getAttribute("slot");
              if (slotAttr) {
                  label += "[slot=" + slotAttr + "]";
              }
          }
  
          if (includeHandlers && window.getEventListeners) {
              let eventNames = Object.keys(window.getEventListeners(node));
              if (eventNames && eventNames.length) {
                  label += "  activeListeners(" + eventNames.join(", ") + ")";
              }
          }
          return label;
      }
  
      getPathToNodeAsString(node, includeHandlers, includeDescendantCount) {
          let path = [];
          while(node) {
              path.push(this.getNodeLabel(node, includeHandlers, includeDescendantCount));
              node = node.parentNode || node.host;
          }
  
          let indentStr = "";
  
          path = path.reverse().map((label) => {
              label = indentStr + label;
              indentStr += "|  ";
              return label;
          });
  
          return path.join("\n");
      }
  
      getSubtreeNodeCount = function(root) {
          let count = 0;
          this.traverseSubtree(root, function(node, scopeData) { ++count; });
          return count;
      };
  
      traverseSubtree(node, preCallback, postCallback) {
          let scopeData = {};
  
          if (preCallback) {
              preCallback(node, scopeData);
          }
  
          if (node.shadowRoot) {
              this.traverseSubtree(node.shadowRoot, preCallback, postCallback);
          }
  
          let child = node.firstChild;
          while (child) {
              // Save next child just in case the current child is removed from subtree.
              let nextChild = child.nextSibling;
              this.traverseSubtree(child, preCallback, postCallback);
              child = nextChild;
          }
  
          if (postCallback) {
              postCallback(node, scopeData);
          }
      }
  
      _getSnapshotPreCallback(stack) {
          return (node, scopeData) => {
              this.ensureDebugId(node);
              let label = this.getNodeLabel(node, true, true);
              let entry = {
                      id: node._debugId,
                      label,
                      ref: new WeakRef(node),
                      path: this.getPathToNodeAsString(node),
                      parent: !node.parentNode ? undefined : this._entryDict[node.parentNode._debugId],
                      children: []
                  };
  
              this._entries.push(entry);
              this._entryDict[entry.id] = entry;
  
              if (stack.length) {
                  stack[stack.length - 1].push(entry);
              }
  
              stack.push(entry.children);
          };
      }
  
      _getSnapshotPostCallback(stack) {
          return function() { stack.pop() };
      }
  
      _buildSnapshot(root) {
          this._entries = [];
          this._entryDict = {};
  
          let stack = [];
  
          this.traverseSubtree(root,
              this._getSnapshotPreCallback(stack),
              this._getSnapshotPostCallback(stack));
      }
  
      getSubtreeString(entry, output=[], indent="") {
          let isActive = !!entry.ref.deref();
          let className = isActive ? "active" : "garbage-collected";
          let status = isActive ? "" : "[GC] ";
          output.push(`<div id="node-${entry.id}" class="entry ${className}">${indent}${status}${entry.label}</div>`);
          let children = entry.children;
          for (let i = 0; i < children.length; i++) {
              this.getSubtreeString(children[i], output, (indent || "") + "|--- ");
          }
          return output;
      }
  
      isShadowRoot(node) {
          return !!node && node.nodeName.toLowerCase() === "#document-fragment";
      }
  
      unparent() {
          let entries = this._entries;
          for (let i = 0; i < entries.length; i++) {
              let node = entries[i].ref.deref();
              if (node && !this.isShadowRoot(node)) {
                  if (node.parentNode) {
                      node.parentNode.removeChild(node);
                  } else if (node.host && node.host.shadowRoot) {
                      node.host.shadowRoot.removeChild(node);
                  }
              }
          }
      }
  
      update() {
          let entries = this._entries;
          let activeCount = entries.length;
  
          for (let i = 0; i < entries.length; i++) {
              let entry = entries[i];
              let isActive = !!entry.ref.deref();
              if (!isActive) {
                  --activeCount;
                  let entryEle = document.getElementById(`node-${entry.id}`);
                  if (entryEle && entryEle.classList.contains("active")) {
                      entryEle.classList.remove("active");
                      entryEle.classList.add("garbage-collected");
                  }
              }
          }
  
          if (activeCount <= 0) {
              this.stop();
              this._outputEle.classList.add("garbage-collected");
          }
      }
  }
  
  let nextSampleId = 0;
  let sampleTemplate = document.createElement("template");
  sampleTemplate.innerHTML = `
      <div class="controls">
          <button type="button" class="remove-btn">Remove</button>
          <button type="button" class="unparent-btn">Unparent Children</button>
      </div>
      <div class="subtree-view"></div>
  `;
  
  function getRemoveHandler(id, watcher) {
      return function(e) {
              let sampleEle = document.getElementById(id);
  
              // Remove the sample subtree.
  
              if (sampleEle) {
                  sampleEle.remove();
  
                  // Disable the button so the user
                  // can't press it again!
  
                  this.disabled = true;
  
                  // Start the watcher so we can watch
                  // garbage-collection realtime.
  
                  watcher.start();
              }
          };
  }
  
  function getUnparentHandler(watcher) {
      return function() {
  
              // Disable the button so the user
              // can't press it again!
  
              this.disabled = true;
  
              // Unparent the nodes in the sample subtree.
  
              watcher.unparent();
  
              // Start the watcher so we can watch
              // garbage-collection realtime.
  
              watcher.start();
          };
  }

  function updatePatchHeading() {
    const textfield = document.querySelector("sp-textfield");
    const inputEl = textfield?.shadowRoot?.querySelector("input");
    const isPatchedVersion = inputEl?.getAttribute("data-test-id") === "patched" ? true : false;

    const heading = document.querySelector("h1");
    heading.textContent = `${heading.textContent} ${isPatchedVersion? "(Patched)" : "(without patch)" }`;
}
  
  // For each sample on the page, inject a subtree-view controller.
  // We need to wait for some time after document load to give any samples
  // that use LitHTML/LitElement a chance to render.
  
  self.addEventListener("load", function() {
      setTimeout(function() {
      updatePatchHeading();

          document.querySelectorAll(".sample").forEach(function(sample) {
                  let controllerContainer = document.createElement("div");
                  controllerContainer.className = "subtree-view-controller";
                  controllerContainer.appendChild(sampleTemplate.content.cloneNode(true));
                  sample.insertAdjacentElement("afterend", controllerContainer);
  
                  let subtreeView = controllerContainer.querySelector(".subtree-view");
                  let watcher = new SubtreeWatcher(sample, subtreeView);
  
                  // Make sure the sample has an id on it!
  
                  if (!sample.id) {
                      sample.setAttribute("id", `sample-id-${nextSampleId++}`);
                  }
  
                  controllerContainer.querySelector(".remove-btn")
                      .addEventListener("click", getRemoveHandler(sample.id, watcher));
  
                  controllerContainer.querySelector(".unparent-btn")
                      .addEventListener("click", getUnparentHandler(watcher));
  
                  sample._watcher = watcher;
              });
      }, 10);
  });
  