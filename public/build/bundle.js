
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.44.1' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    async function getWordMeta(word) {
        let url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`; //FIXME: sanitize
        try {
            const response = await fetch(url);
            return response.json();
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    }
    async function getPronunciation(word) {
        let wordMetadata = (await getWordMeta(word)).shift();
        let phoneticWithAudio = wordMetadata.phonetics.find(x => x.audio && x.audio.length > 0);
        if (phoneticWithAudio) {
            return {
                phonetic: phoneticWithAudio.text,
                audio: `https://api.allorigins.win/raw?url=${encodeURIComponent('https://' + phoneticWithAudio.audio)}`
                //audio: "https://ia800301.us.archive.org/15/items/fire_and_ice_librivox/fire_and_ice_frost_apc_64kb.mp3"
            };
        }
        else {
            return {
                phonetic: wordMetadata.phonetic,
                audio: null
            };
        }
    }

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    /*!
     * wavesurfer.js 5.2.0 (2021-08-16)
     * https://wavesurfer-js.org
     * @license BSD-3-Clause
     */

    var wavesurfer = createCommonjsModule(function (module, exports) {
    (function webpackUniversalModuleDefinition(root, factory) {
    	module.exports = factory();
    })(self, function() {
    return /******/ (() => { // webpackBootstrap
    /******/ 	var __webpack_modules__ = ({

    /***/ "./src/drawer.canvasentry.js":
    /*!***********************************!*\
      !*** ./src/drawer.canvasentry.js ***!
      \***********************************/
    /***/ ((module, exports, __webpack_require__) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    var _style = _interopRequireDefault(__webpack_require__(/*! ./util/style */ "./src/util/style.js"));

    var _getId = _interopRequireDefault(__webpack_require__(/*! ./util/get-id */ "./src/util/get-id.js"));

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    /**
     * The `CanvasEntry` class represents an element consisting of a wave `canvas`
     * and an (optional) progress wave `canvas`.
     *
     * The `MultiCanvas` renderer uses one or more `CanvasEntry` instances to
     * render a waveform, depending on the zoom level.
     */
    var CanvasEntry = /*#__PURE__*/function () {
      function CanvasEntry() {
        _classCallCheck(this, CanvasEntry);

        /**
         * The wave node
         *
         * @type {HTMLCanvasElement}
         */
        this.wave = null;
        /**
         * The wave canvas rendering context
         *
         * @type {CanvasRenderingContext2D}
         */

        this.waveCtx = null;
        /**
         * The (optional) progress wave node
         *
         * @type {HTMLCanvasElement}
         */

        this.progress = null;
        /**
         * The (optional) progress wave canvas rendering context
         *
         * @type {CanvasRenderingContext2D}
         */

        this.progressCtx = null;
        /**
         * Start of the area the canvas should render, between 0 and 1
         *
         * @type {number}
         */

        this.start = 0;
        /**
         * End of the area the canvas should render, between 0 and 1
         *
         * @type {number}
         */

        this.end = 1;
        /**
         * Unique identifier for this entry
         *
         * @type {string}
         */

        this.id = (0, _getId.default)(typeof this.constructor.name !== 'undefined' ? this.constructor.name.toLowerCase() + '_' : 'canvasentry_');
        /**
         * Canvas 2d context attributes
         *
         * @type {object}
         */

        this.canvasContextAttributes = {};
      }
      /**
       * Store the wave canvas element and create the 2D rendering context
       *
       * @param {HTMLCanvasElement} element The wave `canvas` element.
       */


      _createClass(CanvasEntry, [{
        key: "initWave",
        value: function initWave(element) {
          this.wave = element;
          this.waveCtx = this.wave.getContext('2d', this.canvasContextAttributes);
        }
        /**
         * Store the progress wave canvas element and create the 2D rendering
         * context
         *
         * @param {HTMLCanvasElement} element The progress wave `canvas` element.
         */

      }, {
        key: "initProgress",
        value: function initProgress(element) {
          this.progress = element;
          this.progressCtx = this.progress.getContext('2d', this.canvasContextAttributes);
        }
        /**
         * Update the dimensions
         *
         * @param {number} elementWidth Width of the entry
         * @param {number} totalWidth Total width of the multi canvas renderer
         * @param {number} width The new width of the element
         * @param {number} height The new height of the element
         */

      }, {
        key: "updateDimensions",
        value: function updateDimensions(elementWidth, totalWidth, width, height) {
          // where the canvas starts and ends in the waveform, represented as a
          // decimal between 0 and 1
          this.start = this.wave.offsetLeft / totalWidth || 0;
          this.end = this.start + elementWidth / totalWidth; // set wave canvas dimensions

          this.wave.width = width;
          this.wave.height = height;
          var elementSize = {
            width: elementWidth + 'px'
          };
          (0, _style.default)(this.wave, elementSize);

          if (this.hasProgressCanvas) {
            // set progress canvas dimensions
            this.progress.width = width;
            this.progress.height = height;
            (0, _style.default)(this.progress, elementSize);
          }
        }
        /**
         * Clear the wave and progress rendering contexts
         */

      }, {
        key: "clearWave",
        value: function clearWave() {
          // wave
          this.waveCtx.clearRect(0, 0, this.waveCtx.canvas.width, this.waveCtx.canvas.height); // progress

          if (this.hasProgressCanvas) {
            this.progressCtx.clearRect(0, 0, this.progressCtx.canvas.width, this.progressCtx.canvas.height);
          }
        }
        /**
         * Set the fill styles for wave and progress
         *
         * @param {string} waveColor Fill color for the wave canvas
         * @param {?string} progressColor Fill color for the progress canvas
         */

      }, {
        key: "setFillStyles",
        value: function setFillStyles(waveColor, progressColor) {
          this.waveCtx.fillStyle = waveColor;

          if (this.hasProgressCanvas) {
            this.progressCtx.fillStyle = progressColor;
          }
        }
        /**
         * Set the canvas transforms for wave and progress
         *
         * @param {boolean} vertical Whether to render vertically
         */

      }, {
        key: "applyCanvasTransforms",
        value: function applyCanvasTransforms(vertical) {
          if (vertical) {
            // Reflect the waveform across the line y = -x
            this.waveCtx.setTransform(0, 1, 1, 0, 0, 0);

            if (this.hasProgressCanvas) {
              this.progressCtx.setTransform(0, 1, 1, 0, 0, 0);
            }
          }
        }
        /**
         * Draw a rectangle for wave and progress
         *
         * @param {number} x X start position
         * @param {number} y Y start position
         * @param {number} width Width of the rectangle
         * @param {number} height Height of the rectangle
         * @param {number} radius Radius of the rectangle
         */

      }, {
        key: "fillRects",
        value: function fillRects(x, y, width, height, radius) {
          this.fillRectToContext(this.waveCtx, x, y, width, height, radius);

          if (this.hasProgressCanvas) {
            this.fillRectToContext(this.progressCtx, x, y, width, height, radius);
          }
        }
        /**
         * Draw the actual rectangle on a `canvas` element
         *
         * @param {CanvasRenderingContext2D} ctx Rendering context of target canvas
         * @param {number} x X start position
         * @param {number} y Y start position
         * @param {number} width Width of the rectangle
         * @param {number} height Height of the rectangle
         * @param {number} radius Radius of the rectangle
         */

      }, {
        key: "fillRectToContext",
        value: function fillRectToContext(ctx, x, y, width, height, radius) {
          if (!ctx) {
            return;
          }

          if (radius) {
            this.drawRoundedRect(ctx, x, y, width, height, radius);
          } else {
            ctx.fillRect(x, y, width, height);
          }
        }
        /**
         * Draw a rounded rectangle on Canvas
         *
         * @param {CanvasRenderingContext2D} ctx Canvas context
         * @param {number} x X-position of the rectangle
         * @param {number} y Y-position of the rectangle
         * @param {number} width Width of the rectangle
         * @param {number} height Height of the rectangle
         * @param {number} radius Radius of the rectangle
         *
         * @return {void}
         * @example drawRoundedRect(ctx, 50, 50, 5, 10, 3)
         */

      }, {
        key: "drawRoundedRect",
        value: function drawRoundedRect(ctx, x, y, width, height, radius) {
          if (height === 0) {
            return;
          } // peaks are float values from -1 to 1. Use absolute height values in
          // order to correctly calculate rounded rectangle coordinates


          if (height < 0) {
            height *= -1;
            y -= height;
          }

          ctx.beginPath();
          ctx.moveTo(x + radius, y);
          ctx.lineTo(x + width - radius, y);
          ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
          ctx.lineTo(x + width, y + height - radius);
          ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          ctx.lineTo(x + radius, y + height);
          ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
          ctx.lineTo(x, y + radius);
          ctx.quadraticCurveTo(x, y, x + radius, y);
          ctx.closePath();
          ctx.fill();
        }
        /**
         * Render the actual wave and progress lines
         *
         * @param {number[]} peaks Array with peaks data
         * @param {number} absmax Maximum peak value (absolute)
         * @param {number} halfH Half the height of the waveform
         * @param {number} offsetY Offset to the top
         * @param {number} start The x-offset of the beginning of the area that
         * should be rendered
         * @param {number} end The x-offset of the end of the area that
         * should be rendered
         */

      }, {
        key: "drawLines",
        value: function drawLines(peaks, absmax, halfH, offsetY, start, end) {
          this.drawLineToContext(this.waveCtx, peaks, absmax, halfH, offsetY, start, end);

          if (this.hasProgressCanvas) {
            this.drawLineToContext(this.progressCtx, peaks, absmax, halfH, offsetY, start, end);
          }
        }
        /**
         * Render the actual waveform line on a `canvas` element
         *
         * @param {CanvasRenderingContext2D} ctx Rendering context of target canvas
         * @param {number[]} peaks Array with peaks data
         * @param {number} absmax Maximum peak value (absolute)
         * @param {number} halfH Half the height of the waveform
         * @param {number} offsetY Offset to the top
         * @param {number} start The x-offset of the beginning of the area that
         * should be rendered
         * @param {number} end The x-offset of the end of the area that
         * should be rendered
         */

      }, {
        key: "drawLineToContext",
        value: function drawLineToContext(ctx, peaks, absmax, halfH, offsetY, start, end) {
          if (!ctx) {
            return;
          }

          var length = peaks.length / 2;
          var first = Math.round(length * this.start); // use one more peak value to make sure we join peaks at ends -- unless,
          // of course, this is the last canvas

          var last = Math.round(length * this.end) + 1;
          var canvasStart = first;
          var canvasEnd = last;
          var scale = this.wave.width / (canvasEnd - canvasStart - 1); // optimization

          var halfOffset = halfH + offsetY;
          var absmaxHalf = absmax / halfH;
          ctx.beginPath();
          ctx.moveTo((canvasStart - first) * scale, halfOffset);
          ctx.lineTo((canvasStart - first) * scale, halfOffset - Math.round((peaks[2 * canvasStart] || 0) / absmaxHalf));
          var i, peak, h;

          for (i = canvasStart; i < canvasEnd; i++) {
            peak = peaks[2 * i] || 0;
            h = Math.round(peak / absmaxHalf);
            ctx.lineTo((i - first) * scale + this.halfPixel, halfOffset - h);
          } // draw the bottom edge going backwards, to make a single
          // closed hull to fill


          var j = canvasEnd - 1;

          for (j; j >= canvasStart; j--) {
            peak = peaks[2 * j + 1] || 0;
            h = Math.round(peak / absmaxHalf);
            ctx.lineTo((j - first) * scale + this.halfPixel, halfOffset - h);
          }

          ctx.lineTo((canvasStart - first) * scale, halfOffset - Math.round((peaks[2 * canvasStart + 1] || 0) / absmaxHalf));
          ctx.closePath();
          ctx.fill();
        }
        /**
         * Destroys this entry
         */

      }, {
        key: "destroy",
        value: function destroy() {
          this.waveCtx = null;
          this.wave = null;
          this.progressCtx = null;
          this.progress = null;
        }
        /**
         * Return image data of the wave `canvas` element
         *
         * When using a `type` of `'blob'`, this will return a `Promise` that
         * resolves with a `Blob` instance.
         *
         * @param {string} format='image/png' An optional value of a format type.
         * @param {number} quality=0.92 An optional value between 0 and 1.
         * @param {string} type='dataURL' Either 'dataURL' or 'blob'.
         * @return {string|Promise} When using the default `'dataURL'` `type` this
         * returns a data URL. When using the `'blob'` `type` this returns a
         * `Promise` that resolves with a `Blob` instance.
         */

      }, {
        key: "getImage",
        value: function getImage(format, quality, type) {
          var _this = this;

          if (type === 'blob') {
            return new Promise(function (resolve) {
              _this.wave.toBlob(resolve, format, quality);
            });
          } else if (type === 'dataURL') {
            return this.wave.toDataURL(format, quality);
          }
        }
      }]);

      return CanvasEntry;
    }();

    exports.default = CanvasEntry;
    module.exports = exports.default;

    /***/ }),

    /***/ "./src/drawer.js":
    /*!***********************!*\
      !*** ./src/drawer.js ***!
      \***********************/
    /***/ ((module, exports, __webpack_require__) => {


    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    var util = _interopRequireWildcard(__webpack_require__(/*! ./util */ "./src/util/index.js"));

    function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

    function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

    function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

    function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

    function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

    function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

    /**
     * Parent class for renderers
     *
     * @extends {Observer}
     */
    var Drawer = /*#__PURE__*/function (_util$Observer) {
      _inherits(Drawer, _util$Observer);

      var _super = _createSuper(Drawer);

      /**
       * @param {HTMLElement} container The container node of the wavesurfer instance
       * @param {WavesurferParams} params The wavesurfer initialisation options
       */
      function Drawer(container, params) {
        var _this;

        _classCallCheck(this, Drawer);

        _this = _super.call(this);
        _this.container = util.withOrientation(container, params.vertical);
        /**
         * @type {WavesurferParams}
         */

        _this.params = params;
        /**
         * The width of the renderer
         * @type {number}
         */

        _this.width = 0;
        /**
         * The height of the renderer
         * @type {number}
         */

        _this.height = params.height * _this.params.pixelRatio;
        _this.lastPos = 0;
        /**
         * The `<wave>` element which is added to the container
         * @type {HTMLElement}
         */

        _this.wrapper = null;
        return _this;
      }
      /**
       * Alias of `util.style`
       *
       * @param {HTMLElement} el The element that the styles will be applied to
       * @param {Object} styles The map of propName: attribute, both are used as-is
       * @return {HTMLElement} el
       */


      _createClass(Drawer, [{
        key: "style",
        value: function style(el, styles) {
          return util.style(el, styles);
        }
        /**
         * Create the wrapper `<wave>` element, style it and set up the events for
         * interaction
         */

      }, {
        key: "createWrapper",
        value: function createWrapper() {
          this.wrapper = util.withOrientation(this.container.appendChild(document.createElement('wave')), this.params.vertical);
          this.style(this.wrapper, {
            display: 'block',
            position: 'relative',
            userSelect: 'none',
            webkitUserSelect: 'none',
            height: this.params.height + 'px'
          });

          if (this.params.fillParent || this.params.scrollParent) {
            this.style(this.wrapper, {
              width: '100%',
              overflowX: this.params.hideScrollbar ? 'hidden' : 'auto',
              overflowY: 'hidden'
            });
          }

          this.setupWrapperEvents();
        }
        /**
         * Handle click event
         *
         * @param {Event} e Click event
         * @param {?boolean} noPrevent Set to true to not call `e.preventDefault()`
         * @return {number} Playback position from 0 to 1
         */

      }, {
        key: "handleEvent",
        value: function handleEvent(e, noPrevent) {
          !noPrevent && e.preventDefault();
          var clientX = util.withOrientation(e.targetTouches ? e.targetTouches[0] : e, this.params.vertical).clientX;
          var bbox = this.wrapper.getBoundingClientRect();
          var nominalWidth = this.width;
          var parentWidth = this.getWidth();
          var progressPixels = this.getProgressPixels(bbox, clientX);
          var progress;

          if (!this.params.fillParent && nominalWidth < parentWidth) {
            progress = progressPixels * (this.params.pixelRatio / nominalWidth) || 0;
          } else {
            progress = (progressPixels + this.wrapper.scrollLeft) / this.wrapper.scrollWidth || 0;
          }

          return util.clamp(progress, 0, 1);
        }
      }, {
        key: "getProgressPixels",
        value: function getProgressPixels(wrapperBbox, clientX) {
          if (this.params.rtl) {
            return wrapperBbox.right - clientX;
          } else {
            return clientX - wrapperBbox.left;
          }
        }
      }, {
        key: "setupWrapperEvents",
        value: function setupWrapperEvents() {
          var _this2 = this;

          this.wrapper.addEventListener('click', function (e) {
            var orientedEvent = util.withOrientation(e, _this2.params.vertical);
            var scrollbarHeight = _this2.wrapper.offsetHeight - _this2.wrapper.clientHeight;

            if (scrollbarHeight !== 0) {
              // scrollbar is visible.  Check if click was on it
              var bbox = _this2.wrapper.getBoundingClientRect();

              if (orientedEvent.clientY >= bbox.bottom - scrollbarHeight) {
                // ignore mousedown as it was on the scrollbar
                return;
              }
            }

            if (_this2.params.interact) {
              _this2.fireEvent('click', e, _this2.handleEvent(e));
            }
          });
          this.wrapper.addEventListener('dblclick', function (e) {
            if (_this2.params.interact) {
              _this2.fireEvent('dblclick', e, _this2.handleEvent(e));
            }
          });
          this.wrapper.addEventListener('scroll', function (e) {
            return _this2.fireEvent('scroll', e);
          });
        }
        /**
         * Draw peaks on the canvas
         *
         * @param {number[]|Number.<Array[]>} peaks Can also be an array of arrays
         * for split channel rendering
         * @param {number} length The width of the area that should be drawn
         * @param {number} start The x-offset of the beginning of the area that
         * should be rendered
         * @param {number} end The x-offset of the end of the area that should be
         * rendered
         */

      }, {
        key: "drawPeaks",
        value: function drawPeaks(peaks, length, start, end) {
          if (!this.setWidth(length)) {
            this.clearWave();
          }

          this.params.barWidth ? this.drawBars(peaks, 0, start, end) : this.drawWave(peaks, 0, start, end);
        }
        /**
         * Scroll to the beginning
         */

      }, {
        key: "resetScroll",
        value: function resetScroll() {
          if (this.wrapper !== null) {
            this.wrapper.scrollLeft = 0;
          }
        }
        /**
         * Recenter the view-port at a certain percent of the waveform
         *
         * @param {number} percent Value from 0 to 1 on the waveform
         */

      }, {
        key: "recenter",
        value: function recenter(percent) {
          var position = this.wrapper.scrollWidth * percent;
          this.recenterOnPosition(position, true);
        }
        /**
         * Recenter the view-port on a position, either scroll there immediately or
         * in steps of 5 pixels
         *
         * @param {number} position X-offset in pixels
         * @param {boolean} immediate Set to true to immediately scroll somewhere
         */

      }, {
        key: "recenterOnPosition",
        value: function recenterOnPosition(position, immediate) {
          var scrollLeft = this.wrapper.scrollLeft;
          var half = ~~(this.wrapper.clientWidth / 2);
          var maxScroll = this.wrapper.scrollWidth - this.wrapper.clientWidth;
          var target = position - half;
          var offset = target - scrollLeft;

          if (maxScroll == 0) {
            // no need to continue if scrollbar is not there
            return;
          } // if the cursor is currently visible...


          if (!immediate && -half <= offset && offset < half) {
            // set rate at which waveform is centered
            var rate = this.params.autoCenterRate; // make rate depend on width of view and length of waveform

            rate /= half;
            rate *= maxScroll;
            offset = Math.max(-rate, Math.min(rate, offset));
            target = scrollLeft + offset;
          } // limit target to valid range (0 to maxScroll)


          target = Math.max(0, Math.min(maxScroll, target)); // no use attempting to scroll if we're not moving

          if (target != scrollLeft) {
            this.wrapper.scrollLeft = target;
          }
        }
        /**
         * Get the current scroll position in pixels
         *
         * @return {number} Horizontal scroll position in pixels
         */

      }, {
        key: "getScrollX",
        value: function getScrollX() {
          var x = 0;

          if (this.wrapper) {
            var pixelRatio = this.params.pixelRatio;
            x = Math.round(this.wrapper.scrollLeft * pixelRatio); // In cases of elastic scroll (safari with mouse wheel) you can
            // scroll beyond the limits of the container
            // Calculate and floor the scrollable extent to make sure an out
            // of bounds value is not returned
            // Ticket #1312

            if (this.params.scrollParent) {
              var maxScroll = ~~(this.wrapper.scrollWidth * pixelRatio - this.getWidth());
              x = Math.min(maxScroll, Math.max(0, x));
            }
          }

          return x;
        }
        /**
         * Get the width of the container
         *
         * @return {number} The width of the container
         */

      }, {
        key: "getWidth",
        value: function getWidth() {
          return Math.round(this.container.clientWidth * this.params.pixelRatio);
        }
        /**
         * Set the width of the container
         *
         * @param {number} width The new width of the container
         * @return {boolean} Whether the width of the container was updated or not
         */

      }, {
        key: "setWidth",
        value: function setWidth(width) {
          if (this.width == width) {
            return false;
          }

          this.width = width;

          if (this.params.fillParent || this.params.scrollParent) {
            this.style(this.wrapper, {
              width: ''
            });
          } else {
            var newWidth = ~~(this.width / this.params.pixelRatio) + 'px';
            this.style(this.wrapper, {
              width: newWidth
            });
          }

          this.updateSize();
          return true;
        }
        /**
         * Set the height of the container
         *
         * @param {number} height The new height of the container.
         * @return {boolean} Whether the height of the container was updated or not
         */

      }, {
        key: "setHeight",
        value: function setHeight(height) {
          if (height == this.height) {
            return false;
          }

          this.height = height;
          this.style(this.wrapper, {
            height: ~~(this.height / this.params.pixelRatio) + 'px'
          });
          this.updateSize();
          return true;
        }
        /**
         * Called by wavesurfer when progress should be rendered
         *
         * @param {number} progress From 0 to 1
         */

      }, {
        key: "progress",
        value: function progress(_progress) {
          var minPxDelta = 1 / this.params.pixelRatio;
          var pos = Math.round(_progress * this.width) * minPxDelta;

          if (pos < this.lastPos || pos - this.lastPos >= minPxDelta) {
            this.lastPos = pos;

            if (this.params.scrollParent && this.params.autoCenter) {
              var newPos = ~~(this.wrapper.scrollWidth * _progress);
              this.recenterOnPosition(newPos, this.params.autoCenterImmediately);
            }

            this.updateProgress(pos);
          }
        }
        /**
         * This is called when wavesurfer is destroyed
         */

      }, {
        key: "destroy",
        value: function destroy() {
          this.unAll();

          if (this.wrapper) {
            if (this.wrapper.parentNode == this.container.domElement) {
              this.container.removeChild(this.wrapper.domElement);
            }

            this.wrapper = null;
          }
        }
        /* Renderer-specific methods */

        /**
         * Called after cursor related params have changed.
         *
         * @abstract
         */

      }, {
        key: "updateCursor",
        value: function updateCursor() {}
        /**
         * Called when the size of the container changes so the renderer can adjust
         *
         * @abstract
         */

      }, {
        key: "updateSize",
        value: function updateSize() {}
        /**
         * Draw a waveform with bars
         *
         * @abstract
         * @param {number[]|Number.<Array[]>} peaks Can also be an array of arrays for split channel
         * rendering
         * @param {number} channelIndex The index of the current channel. Normally
         * should be 0
         * @param {number} start The x-offset of the beginning of the area that
         * should be rendered
         * @param {number} end The x-offset of the end of the area that should be
         * rendered
         */

      }, {
        key: "drawBars",
        value: function drawBars(peaks, channelIndex, start, end) {}
        /**
         * Draw a waveform
         *
         * @abstract
         * @param {number[]|Number.<Array[]>} peaks Can also be an array of arrays for split channel
         * rendering
         * @param {number} channelIndex The index of the current channel. Normally
         * should be 0
         * @param {number} start The x-offset of the beginning of the area that
         * should be rendered
         * @param {number} end The x-offset of the end of the area that should be
         * rendered
         */

      }, {
        key: "drawWave",
        value: function drawWave(peaks, channelIndex, start, end) {}
        /**
         * Clear the waveform
         *
         * @abstract
         */

      }, {
        key: "clearWave",
        value: function clearWave() {}
        /**
         * Render the new progress
         *
         * @abstract
         * @param {number} position X-Offset of progress position in pixels
         */

      }, {
        key: "updateProgress",
        value: function updateProgress(position) {}
      }]);

      return Drawer;
    }(util.Observer);

    exports.default = Drawer;
    module.exports = exports.default;

    /***/ }),

    /***/ "./src/drawer.multicanvas.js":
    /*!***********************************!*\
      !*** ./src/drawer.multicanvas.js ***!
      \***********************************/
    /***/ ((module, exports, __webpack_require__) => {


    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    var _drawer = _interopRequireDefault(__webpack_require__(/*! ./drawer */ "./src/drawer.js"));

    var util = _interopRequireWildcard(__webpack_require__(/*! ./util */ "./src/util/index.js"));

    var _drawer2 = _interopRequireDefault(__webpack_require__(/*! ./drawer.canvasentry */ "./src/drawer.canvasentry.js"));

    function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

    function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

    function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

    function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

    function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

    function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

    /**
     * MultiCanvas renderer for wavesurfer. Is currently the default and sole
     * builtin renderer.
     *
     * A `MultiCanvas` consists of one or more `CanvasEntry` instances, depending
     * on the zoom level.
     */
    var MultiCanvas = /*#__PURE__*/function (_Drawer) {
      _inherits(MultiCanvas, _Drawer);

      var _super = _createSuper(MultiCanvas);

      /**
       * @param {HTMLElement} container The container node of the wavesurfer instance
       * @param {WavesurferParams} params The wavesurfer initialisation options
       */
      function MultiCanvas(container, params) {
        var _this;

        _classCallCheck(this, MultiCanvas);

        _this = _super.call(this, container, params);
        /**
         * @type {number}
         */

        _this.maxCanvasWidth = params.maxCanvasWidth;
        /**
         * @type {number}
         */

        _this.maxCanvasElementWidth = Math.round(params.maxCanvasWidth / params.pixelRatio);
        /**
         * Whether or not the progress wave is rendered. If the `waveColor`
         * and `progressColor` are the same color it is not.
         *
         * @type {boolean}
         */

        _this.hasProgressCanvas = params.waveColor != params.progressColor;
        /**
         * @type {number}
         */

        _this.halfPixel = 0.5 / params.pixelRatio;
        /**
         * List of `CanvasEntry` instances.
         *
         * @type {Array}
         */

        _this.canvases = [];
        /**
         * @type {HTMLElement}
         */

        _this.progressWave = null;
        /**
         * Class used to generate entries.
         *
         * @type {function}
         */

        _this.EntryClass = _drawer2.default;
        /**
         * Canvas 2d context attributes.
         *
         * @type {object}
         */

        _this.canvasContextAttributes = params.drawingContextAttributes;
        /**
         * Overlap added between entries to prevent vertical white stripes
         * between `canvas` elements.
         *
         * @type {number}
         */

        _this.overlap = 2 * Math.ceil(params.pixelRatio / 2);
        /**
         * The radius of the wave bars. Makes bars rounded
         *
         * @type {number}
         */

        _this.barRadius = params.barRadius || 0;
        /**
         * Whether to render the waveform vertically. Defaults to false.
         *
         * @type {boolean}
         */

        _this.vertical = params.vertical;
        return _this;
      }
      /**
       * Initialize the drawer
       */


      _createClass(MultiCanvas, [{
        key: "init",
        value: function init() {
          this.createWrapper();
          this.createElements();
        }
        /**
         * Create the canvas elements and style them
         *
         */

      }, {
        key: "createElements",
        value: function createElements() {
          this.progressWave = util.withOrientation(this.wrapper.appendChild(document.createElement('wave')), this.params.vertical);
          this.style(this.progressWave, {
            position: 'absolute',
            zIndex: 3,
            left: 0,
            top: 0,
            bottom: 0,
            overflow: 'hidden',
            width: '0',
            display: 'none',
            boxSizing: 'border-box',
            borderRightStyle: 'solid',
            pointerEvents: 'none'
          });
          this.addCanvas();
          this.updateCursor();
        }
        /**
         * Update cursor style
         */

      }, {
        key: "updateCursor",
        value: function updateCursor() {
          this.style(this.progressWave, {
            borderRightWidth: this.params.cursorWidth + 'px',
            borderRightColor: this.params.cursorColor
          });
        }
        /**
         * Adjust to the updated size by adding or removing canvases
         */

      }, {
        key: "updateSize",
        value: function updateSize() {
          var _this2 = this;

          var totalWidth = Math.round(this.width / this.params.pixelRatio);
          var requiredCanvases = Math.ceil(totalWidth / (this.maxCanvasElementWidth + this.overlap)); // add required canvases

          while (this.canvases.length < requiredCanvases) {
            this.addCanvas();
          } // remove older existing canvases, if any


          while (this.canvases.length > requiredCanvases) {
            this.removeCanvas();
          }

          var canvasWidth = this.maxCanvasWidth + this.overlap;
          var lastCanvas = this.canvases.length - 1;
          this.canvases.forEach(function (entry, i) {
            if (i == lastCanvas) {
              canvasWidth = _this2.width - _this2.maxCanvasWidth * lastCanvas;
            }

            _this2.updateDimensions(entry, canvasWidth, _this2.height);

            entry.clearWave();
          });
        }
        /**
         * Add a canvas to the canvas list
         *
         */

      }, {
        key: "addCanvas",
        value: function addCanvas() {
          var entry = new this.EntryClass();
          entry.canvasContextAttributes = this.canvasContextAttributes;
          entry.hasProgressCanvas = this.hasProgressCanvas;
          entry.halfPixel = this.halfPixel;
          var leftOffset = this.maxCanvasElementWidth * this.canvases.length; // wave

          var wave = util.withOrientation(this.wrapper.appendChild(document.createElement('canvas')), this.params.vertical);
          this.style(wave, {
            position: 'absolute',
            zIndex: 2,
            left: leftOffset + 'px',
            top: 0,
            bottom: 0,
            height: '100%',
            pointerEvents: 'none'
          });
          entry.initWave(wave); // progress

          if (this.hasProgressCanvas) {
            var progress = util.withOrientation(this.progressWave.appendChild(document.createElement('canvas')), this.params.vertical);
            this.style(progress, {
              position: 'absolute',
              left: leftOffset + 'px',
              top: 0,
              bottom: 0,
              height: '100%'
            });
            entry.initProgress(progress);
          }

          this.canvases.push(entry);
        }
        /**
         * Pop single canvas from the list
         *
         */

      }, {
        key: "removeCanvas",
        value: function removeCanvas() {
          var lastEntry = this.canvases[this.canvases.length - 1]; // wave

          lastEntry.wave.parentElement.removeChild(lastEntry.wave.domElement); // progress

          if (this.hasProgressCanvas) {
            lastEntry.progress.parentElement.removeChild(lastEntry.progress.domElement);
          } // cleanup


          if (lastEntry) {
            lastEntry.destroy();
            lastEntry = null;
          }

          this.canvases.pop();
        }
        /**
         * Update the dimensions of a canvas element
         *
         * @param {CanvasEntry} entry Target entry
         * @param {number} width The new width of the element
         * @param {number} height The new height of the element
         */

      }, {
        key: "updateDimensions",
        value: function updateDimensions(entry, width, height) {
          var elementWidth = Math.round(width / this.params.pixelRatio);
          var totalWidth = Math.round(this.width / this.params.pixelRatio); // update canvas dimensions

          entry.updateDimensions(elementWidth, totalWidth, width, height); // style element

          this.style(this.progressWave, {
            display: 'block'
          });
        }
        /**
         * Clear the whole multi-canvas
         */

      }, {
        key: "clearWave",
        value: function clearWave() {
          var _this3 = this;

          util.frame(function () {
            _this3.canvases.forEach(function (entry) {
              return entry.clearWave();
            });
          })();
        }
        /**
         * Draw a waveform with bars
         *
         * @param {number[]|Number.<Array[]>} peaks Can also be an array of arrays
         * for split channel rendering
         * @param {number} channelIndex The index of the current channel. Normally
         * should be 0. Must be an integer.
         * @param {number} start The x-offset of the beginning of the area that
         * should be rendered
         * @param {number} end The x-offset of the end of the area that should be
         * rendered
         * @returns {void}
         */

      }, {
        key: "drawBars",
        value: function drawBars(peaks, channelIndex, start, end) {
          var _this4 = this;

          return this.prepareDraw(peaks, channelIndex, start, end, function (_ref) {
            var absmax = _ref.absmax,
                hasMinVals = _ref.hasMinVals;
                _ref.height;
                var offsetY = _ref.offsetY,
                halfH = _ref.halfH,
                peaks = _ref.peaks,
                ch = _ref.channelIndex;

            // if drawBars was called within ws.empty we don't pass a start and
            // don't want anything to happen
            if (start === undefined) {
              return;
            } // Skip every other value if there are negatives.


            var peakIndexScale = hasMinVals ? 2 : 1;
            var length = peaks.length / peakIndexScale;
            var bar = _this4.params.barWidth * _this4.params.pixelRatio;
            var gap = _this4.params.barGap === null ? Math.max(_this4.params.pixelRatio, ~~(bar / 2)) : Math.max(_this4.params.pixelRatio, _this4.params.barGap * _this4.params.pixelRatio);
            var step = bar + gap;
            var scale = length / _this4.width;
            var first = start;
            var last = end;
            var i = first;

            for (i; i < last; i += step) {
              var peak = peaks[Math.floor(i * scale * peakIndexScale)] || 0;
              var h = Math.round(peak / absmax * halfH);
              /* in case of silences, allow the user to specify that we
               * always draw *something* (normally a 1px high bar) */

              if (h == 0 && _this4.params.barMinHeight) {
                h = _this4.params.barMinHeight;
              }

              _this4.fillRect(i + _this4.halfPixel, halfH - h + offsetY, bar + _this4.halfPixel, h * 2, _this4.barRadius, ch);
            }
          });
        }
        /**
         * Draw a waveform
         *
         * @param {number[]|Number.<Array[]>} peaks Can also be an array of arrays
         * for split channel rendering
         * @param {number} channelIndex The index of the current channel. Normally
         * should be 0
         * @param {number?} start The x-offset of the beginning of the area that
         * should be rendered (If this isn't set only a flat line is rendered)
         * @param {number?} end The x-offset of the end of the area that should be
         * rendered
         * @returns {void}
         */

      }, {
        key: "drawWave",
        value: function drawWave(peaks, channelIndex, start, end) {
          var _this5 = this;

          return this.prepareDraw(peaks, channelIndex, start, end, function (_ref2) {
            var absmax = _ref2.absmax,
                hasMinVals = _ref2.hasMinVals;
                _ref2.height;
                var offsetY = _ref2.offsetY,
                halfH = _ref2.halfH,
                peaks = _ref2.peaks,
                channelIndex = _ref2.channelIndex;

            if (!hasMinVals) {
              var reflectedPeaks = [];
              var len = peaks.length;
              var i = 0;

              for (i; i < len; i++) {
                reflectedPeaks[2 * i] = peaks[i];
                reflectedPeaks[2 * i + 1] = -peaks[i];
              }

              peaks = reflectedPeaks;
            } // if drawWave was called within ws.empty we don't pass a start and
            // end and simply want a flat line


            if (start !== undefined) {
              _this5.drawLine(peaks, absmax, halfH, offsetY, start, end, channelIndex);
            } // always draw a median line


            _this5.fillRect(0, halfH + offsetY - _this5.halfPixel, _this5.width, _this5.halfPixel, _this5.barRadius, channelIndex);
          });
        }
        /**
         * Tell the canvas entries to render their portion of the waveform
         *
         * @param {number[]} peaks Peaks data
         * @param {number} absmax Maximum peak value (absolute)
         * @param {number} halfH Half the height of the waveform
         * @param {number} offsetY Offset to the top
         * @param {number} start The x-offset of the beginning of the area that
         * should be rendered
         * @param {number} end The x-offset of the end of the area that
         * should be rendered
         * @param {channelIndex} channelIndex The channel index of the line drawn
         */

      }, {
        key: "drawLine",
        value: function drawLine(peaks, absmax, halfH, offsetY, start, end, channelIndex) {
          var _this6 = this;

          var _ref3 = this.params.splitChannelsOptions.channelColors[channelIndex] || {},
              waveColor = _ref3.waveColor,
              progressColor = _ref3.progressColor;

          this.canvases.forEach(function (entry, i) {
            _this6.setFillStyles(entry, waveColor, progressColor);

            _this6.applyCanvasTransforms(entry, _this6.params.vertical);

            entry.drawLines(peaks, absmax, halfH, offsetY, start, end);
          });
        }
        /**
         * Draw a rectangle on the multi-canvas
         *
         * @param {number} x X-position of the rectangle
         * @param {number} y Y-position of the rectangle
         * @param {number} width Width of the rectangle
         * @param {number} height Height of the rectangle
         * @param {number} radius Radius of the rectangle
         * @param {channelIndex} channelIndex The channel index of the bar drawn
         */

      }, {
        key: "fillRect",
        value: function fillRect(x, y, width, height, radius, channelIndex) {
          var startCanvas = Math.floor(x / this.maxCanvasWidth);
          var endCanvas = Math.min(Math.ceil((x + width) / this.maxCanvasWidth) + 1, this.canvases.length);
          var i = startCanvas;

          for (i; i < endCanvas; i++) {
            var entry = this.canvases[i];
            var leftOffset = i * this.maxCanvasWidth;
            var intersection = {
              x1: Math.max(x, i * this.maxCanvasWidth),
              y1: y,
              x2: Math.min(x + width, i * this.maxCanvasWidth + entry.wave.width),
              y2: y + height
            };

            if (intersection.x1 < intersection.x2) {
              var _ref4 = this.params.splitChannelsOptions.channelColors[channelIndex] || {},
                  waveColor = _ref4.waveColor,
                  progressColor = _ref4.progressColor;

              this.setFillStyles(entry, waveColor, progressColor);
              this.applyCanvasTransforms(entry, this.params.vertical);
              entry.fillRects(intersection.x1 - leftOffset, intersection.y1, intersection.x2 - intersection.x1, intersection.y2 - intersection.y1, radius);
            }
          }
        }
        /**
         * Returns whether to hide the channel from being drawn based on params.
         *
         * @param {number} channelIndex The index of the current channel.
         * @returns {bool} True to hide the channel, false to draw.
         */

      }, {
        key: "hideChannel",
        value: function hideChannel(channelIndex) {
          return this.params.splitChannels && this.params.splitChannelsOptions.filterChannels.includes(channelIndex);
        }
        /**
         * Performs preparation tasks and calculations which are shared by `drawBars`
         * and `drawWave`
         *
         * @param {number[]|Number.<Array[]>} peaks Can also be an array of arrays for
         * split channel rendering
         * @param {number} channelIndex The index of the current channel. Normally
         * should be 0
         * @param {number?} start The x-offset of the beginning of the area that
         * should be rendered. If this isn't set only a flat line is rendered
         * @param {number?} end The x-offset of the end of the area that should be
         * rendered
         * @param {function} fn The render function to call, e.g. `drawWave`
         * @param {number} drawIndex The index of the current channel after filtering.
         * @param {number?} normalizedMax Maximum modulation value across channels for use with relativeNormalization. Ignored when undefined
         * @returns {void}
         */

      }, {
        key: "prepareDraw",
        value: function prepareDraw(peaks, channelIndex, start, end, fn, drawIndex, normalizedMax) {
          var _this7 = this;

          return util.frame(function () {
            // Split channels and call this function with the channelIndex set
            if (peaks[0] instanceof Array) {
              var channels = peaks;

              if (_this7.params.splitChannels) {
                var filteredChannels = channels.filter(function (c, i) {
                  return !_this7.hideChannel(i);
                });

                if (!_this7.params.splitChannelsOptions.overlay) {
                  _this7.setHeight(Math.max(filteredChannels.length, 1) * _this7.params.height * _this7.params.pixelRatio);
                }

                var overallAbsMax;

                if (_this7.params.splitChannelsOptions && _this7.params.splitChannelsOptions.relativeNormalization) {
                  // calculate maximum peak across channels to use for normalization
                  overallAbsMax = util.max(channels.map(function (channelPeaks) {
                    return util.absMax(channelPeaks);
                  }));
                }

                return channels.forEach(function (channelPeaks, i) {
                  return _this7.prepareDraw(channelPeaks, i, start, end, fn, filteredChannels.indexOf(channelPeaks), overallAbsMax);
                });
              }

              peaks = channels[0];
            } // Return and do not draw channel peaks if hidden.


            if (_this7.hideChannel(channelIndex)) {
              return;
            } // calculate maximum modulation value, either from the barHeight
            // parameter or if normalize=true from the largest value in the peak
            // set


            var absmax = 1 / _this7.params.barHeight;

            if (_this7.params.normalize) {
              absmax = normalizedMax === undefined ? util.absMax(peaks) : normalizedMax;
            } // Bar wave draws the bottom only as a reflection of the top,
            // so we don't need negative values


            var hasMinVals = [].some.call(peaks, function (val) {
              return val < 0;
            });
            var height = _this7.params.height * _this7.params.pixelRatio;
            var halfH = height / 2;
            var offsetY = height * drawIndex || 0; // Override offsetY if overlay is true

            if (_this7.params.splitChannelsOptions && _this7.params.splitChannelsOptions.overlay) {
              offsetY = 0;
            }

            return fn({
              absmax: absmax,
              hasMinVals: hasMinVals,
              height: height,
              offsetY: offsetY,
              halfH: halfH,
              peaks: peaks,
              channelIndex: channelIndex
            });
          })();
        }
        /**
         * Set the fill styles for a certain entry (wave and progress)
         *
         * @param {CanvasEntry} entry Target entry
         * @param {string} waveColor Wave color to draw this entry
         * @param {string} progressColor Progress color to draw this entry
         */

      }, {
        key: "setFillStyles",
        value: function setFillStyles(entry) {
          var waveColor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : this.params.waveColor;
          var progressColor = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.params.progressColor;
          entry.setFillStyles(waveColor, progressColor);
        }
        /**
         * Set the canvas transforms for a certain entry (wave and progress)
         *
         * @param {CanvasEntry} entry Target entry
         * @param {boolean} vertical Whether to render the waveform vertically
         */

      }, {
        key: "applyCanvasTransforms",
        value: function applyCanvasTransforms(entry) {
          var vertical = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
          entry.applyCanvasTransforms(vertical);
        }
        /**
         * Return image data of the multi-canvas
         *
         * When using a `type` of `'blob'`, this will return a `Promise`.
         *
         * @param {string} format='image/png' An optional value of a format type.
         * @param {number} quality=0.92 An optional value between 0 and 1.
         * @param {string} type='dataURL' Either 'dataURL' or 'blob'.
         * @return {string|string[]|Promise} When using the default `'dataURL'`
         * `type` this returns a single data URL or an array of data URLs,
         * one for each canvas. When using the `'blob'` `type` this returns a
         * `Promise` that resolves with an array of `Blob` instances, one for each
         * canvas.
         */

      }, {
        key: "getImage",
        value: function getImage(format, quality, type) {
          if (type === 'blob') {
            return Promise.all(this.canvases.map(function (entry) {
              return entry.getImage(format, quality, type);
            }));
          } else if (type === 'dataURL') {
            var images = this.canvases.map(function (entry) {
              return entry.getImage(format, quality, type);
            });
            return images.length > 1 ? images : images[0];
          }
        }
        /**
         * Render the new progress
         *
         * @param {number} position X-offset of progress position in pixels
         */

      }, {
        key: "updateProgress",
        value: function updateProgress(position) {
          this.style(this.progressWave, {
            width: position + 'px'
          });
        }
      }]);

      return MultiCanvas;
    }(_drawer.default);

    exports.default = MultiCanvas;
    module.exports = exports.default;

    /***/ }),

    /***/ "./src/mediaelement-webaudio.js":
    /*!**************************************!*\
      !*** ./src/mediaelement-webaudio.js ***!
      \**************************************/
    /***/ ((module, exports, __webpack_require__) => {


    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    var _mediaelement = _interopRequireDefault(__webpack_require__(/*! ./mediaelement */ "./src/mediaelement.js"));

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

    function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

    function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

    function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

    function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

    function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

    /**
     * MediaElementWebAudio backend: load audio via an HTML5 audio tag, but playback with the WebAudio API.
     * The advantage here is that the html5 <audio> tag can perform range requests on the server and not
     * buffer the entire file in one request, and you still get the filtering and scripting functionality
     * of the webaudio API.
     * Note that in order to use range requests and prevent buffering, you must provide peak data.
     *
     * @since 3.2.0
     */
    var MediaElementWebAudio = /*#__PURE__*/function (_MediaElement) {
      _inherits(MediaElementWebAudio, _MediaElement);

      var _super = _createSuper(MediaElementWebAudio);

      /**
       * Construct the backend
       *
       * @param {WavesurferParams} params Wavesurfer parameters
       */
      function MediaElementWebAudio(params) {
        var _this;

        _classCallCheck(this, MediaElementWebAudio);

        _this = _super.call(this, params);
        /** @private */

        _this.params = params;
        /** @private */

        _this.sourceMediaElement = null;
        return _this;
      }
      /**
       * Initialise the backend, called in `wavesurfer.createBackend()`
       */


      _createClass(MediaElementWebAudio, [{
        key: "init",
        value: function init() {
          this.setPlaybackRate(this.params.audioRate);
          this.createTimer();
          this.createVolumeNode();
          this.createScriptNode();
          this.createAnalyserNode();
        }
        /**
         * Private method called by both `load` (from url)
         * and `loadElt` (existing media element) methods.
         *
         * @param {HTMLMediaElement} media HTML5 Audio or Video element
         * @param {number[]|Number.<Array[]>} peaks Array of peak data
         * @param {string} preload HTML 5 preload attribute value
         * @private
         */

      }, {
        key: "_load",
        value: function _load(media, peaks, preload) {
          _get(_getPrototypeOf(MediaElementWebAudio.prototype), "_load", this).call(this, media, peaks, preload);

          this.createMediaElementSource(media);
        }
        /**
         * Create MediaElementSource node
         *
         * @since 3.2.0
         * @param {HTMLMediaElement} mediaElement HTML5 Audio to load
         */

      }, {
        key: "createMediaElementSource",
        value: function createMediaElementSource(mediaElement) {
          this.sourceMediaElement = this.ac.createMediaElementSource(mediaElement);
          this.sourceMediaElement.connect(this.analyser);
        }
      }, {
        key: "play",
        value: function play(start, end) {
          this.resumeAudioContext();
          return _get(_getPrototypeOf(MediaElementWebAudio.prototype), "play", this).call(this, start, end);
        }
        /**
         * This is called when wavesurfer is destroyed
         *
         */

      }, {
        key: "destroy",
        value: function destroy() {
          _get(_getPrototypeOf(MediaElementWebAudio.prototype), "destroy", this).call(this);

          this.destroyWebAudio();
        }
      }]);

      return MediaElementWebAudio;
    }(_mediaelement.default);

    exports.default = MediaElementWebAudio;
    module.exports = exports.default;

    /***/ }),

    /***/ "./src/mediaelement.js":
    /*!*****************************!*\
      !*** ./src/mediaelement.js ***!
      \*****************************/
    /***/ ((module, exports, __webpack_require__) => {


    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    var _webaudio = _interopRequireDefault(__webpack_require__(/*! ./webaudio */ "./src/webaudio.js"));

    var util = _interopRequireWildcard(__webpack_require__(/*! ./util */ "./src/util/index.js"));

    function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

    function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    function _get(target, property, receiver) { if (typeof Reflect !== "undefined" && Reflect.get) { _get = Reflect.get; } else { _get = function _get(target, property, receiver) { var base = _superPropBase(target, property); if (!base) return; var desc = Object.getOwnPropertyDescriptor(base, property); if (desc.get) { return desc.get.call(receiver); } return desc.value; }; } return _get(target, property, receiver || target); }

    function _superPropBase(object, property) { while (!Object.prototype.hasOwnProperty.call(object, property)) { object = _getPrototypeOf(object); if (object === null) break; } return object; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

    function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

    function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

    function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

    function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

    /**
     * MediaElement backend
     */
    var MediaElement = /*#__PURE__*/function (_WebAudio) {
      _inherits(MediaElement, _WebAudio);

      var _super = _createSuper(MediaElement);

      /**
       * Construct the backend
       *
       * @param {WavesurferParams} params Wavesurfer parameters
       */
      function MediaElement(params) {
        var _this;

        _classCallCheck(this, MediaElement);

        _this = _super.call(this, params);
        /** @private */

        _this.params = params;
        /**
         * Initially a dummy media element to catch errors. Once `_load` is
         * called, this will contain the actual `HTMLMediaElement`.
         * @private
         */

        _this.media = {
          currentTime: 0,
          duration: 0,
          paused: true,
          playbackRate: 1,
          play: function play() {},
          pause: function pause() {},
          volume: 0
        };
        /** @private */

        _this.mediaType = params.mediaType.toLowerCase();
        /** @private */

        _this.elementPosition = params.elementPosition;
        /** @private */

        _this.peaks = null;
        /** @private */

        _this.playbackRate = 1;
        /** @private */

        _this.volume = 1;
        /** @private */

        _this.isMuted = false;
        /** @private */

        _this.buffer = null;
        /** @private */

        _this.onPlayEnd = null;
        /** @private */

        _this.mediaListeners = {};
        return _this;
      }
      /**
       * Initialise the backend, called in `wavesurfer.createBackend()`
       */


      _createClass(MediaElement, [{
        key: "init",
        value: function init() {
          this.setPlaybackRate(this.params.audioRate);
          this.createTimer();
        }
        /**
         * Attach event listeners to media element.
         */

      }, {
        key: "_setupMediaListeners",
        value: function _setupMediaListeners() {
          var _this2 = this;

          this.mediaListeners.error = function () {
            _this2.fireEvent('error', 'Error loading media element');
          };

          this.mediaListeners.canplay = function () {
            _this2.fireEvent('canplay');
          };

          this.mediaListeners.ended = function () {
            _this2.fireEvent('finish');
          }; // listen to and relay play, pause and seeked events to enable
          // playback control from the external media element


          this.mediaListeners.play = function () {
            _this2.fireEvent('play');
          };

          this.mediaListeners.pause = function () {
            _this2.fireEvent('pause');
          };

          this.mediaListeners.seeked = function (event) {
            _this2.fireEvent('seek');
          };

          this.mediaListeners.volumechange = function (event) {
            _this2.isMuted = _this2.media.muted;

            if (_this2.isMuted) {
              _this2.volume = 0;
            } else {
              _this2.volume = _this2.media.volume;
            }

            _this2.fireEvent('volume');
          }; // reset event listeners


          Object.keys(this.mediaListeners).forEach(function (id) {
            _this2.media.removeEventListener(id, _this2.mediaListeners[id]);

            _this2.media.addEventListener(id, _this2.mediaListeners[id]);
          });
        }
        /**
         * Create a timer to provide a more precise `audioprocess` event.
         */

      }, {
        key: "createTimer",
        value: function createTimer() {
          var _this3 = this;

          var onAudioProcess = function onAudioProcess() {
            if (_this3.isPaused()) {
              return;
            }

            _this3.fireEvent('audioprocess', _this3.getCurrentTime()); // Call again in the next frame


            util.frame(onAudioProcess)();
          };

          this.on('play', onAudioProcess); // Update the progress one more time to prevent it from being stuck in
          // case of lower framerates

          this.on('pause', function () {
            _this3.fireEvent('audioprocess', _this3.getCurrentTime());
          });
        }
        /**
         * Create media element with url as its source,
         * and append to container element.
         *
         * @param {string} url Path to media file
         * @param {HTMLElement} container HTML element
         * @param {number[]|Number.<Array[]>} peaks Array of peak data
         * @param {string} preload HTML 5 preload attribute value
         * @throws Will throw an error if the `url` argument is not a valid media
         * element.
         */

      }, {
        key: "load",
        value: function load(url, container, peaks, preload) {
          var media = document.createElement(this.mediaType);
          media.controls = this.params.mediaControls;
          media.autoplay = this.params.autoplay || false;
          media.preload = preload == null ? 'auto' : preload;
          media.src = url;
          media.style.width = '100%';
          var prevMedia = container.querySelector(this.mediaType);

          if (prevMedia) {
            container.removeChild(prevMedia);
          }

          container.appendChild(media);

          this._load(media, peaks, preload);
        }
        /**
         * Load existing media element.
         *
         * @param {HTMLMediaElement} elt HTML5 Audio or Video element
         * @param {number[]|Number.<Array[]>} peaks Array of peak data
         */

      }, {
        key: "loadElt",
        value: function loadElt(elt, peaks) {
          elt.controls = this.params.mediaControls;
          elt.autoplay = this.params.autoplay || false;

          this._load(elt, peaks, elt.preload);
        }
        /**
         * Method called by both `load` (from url)
         * and `loadElt` (existing media element) methods.
         *
         * @param {HTMLMediaElement} media HTML5 Audio or Video element
         * @param {number[]|Number.<Array[]>} peaks Array of peak data
         * @param {string} preload HTML 5 preload attribute value
         * @throws Will throw an error if the `media` argument is not a valid media
         * element.
         * @private
         */

      }, {
        key: "_load",
        value: function _load(media, peaks, preload) {
          // verify media element is valid
          if (!(media instanceof HTMLMediaElement) || typeof media.addEventListener === 'undefined') {
            throw new Error('media parameter is not a valid media element');
          } // load must be called manually on iOS, otherwise peaks won't draw
          // until a user interaction triggers load --> 'ready' event
          //
          // note that we avoid calling media.load here when given peaks and preload == 'none'
          // as this almost always triggers some browser fetch of the media.


          if (typeof media.load == 'function' && !(peaks && preload == 'none')) {
            // Resets the media element and restarts the media resource. Any
            // pending events are discarded. How much media data is fetched is
            // still affected by the preload attribute.
            media.load();
          }

          this.media = media;

          this._setupMediaListeners();

          this.peaks = peaks;
          this.onPlayEnd = null;
          this.buffer = null;
          this.isMuted = media.muted;
          this.setPlaybackRate(this.playbackRate);
          this.setVolume(this.volume);
        }
        /**
         * Used by `wavesurfer.isPlaying()` and `wavesurfer.playPause()`
         *
         * @return {boolean} Media paused or not
         */

      }, {
        key: "isPaused",
        value: function isPaused() {
          return !this.media || this.media.paused;
        }
        /**
         * Used by `wavesurfer.getDuration()`
         *
         * @return {number} Duration
         */

      }, {
        key: "getDuration",
        value: function getDuration() {
          if (this.explicitDuration) {
            return this.explicitDuration;
          }

          var duration = (this.buffer || this.media).duration;

          if (duration >= Infinity) {
            // streaming audio
            duration = this.media.seekable.end(0);
          }

          return duration;
        }
        /**
         * Returns the current time in seconds relative to the audio-clip's
         * duration.
         *
         * @return {number} Current time
         */

      }, {
        key: "getCurrentTime",
        value: function getCurrentTime() {
          return this.media && this.media.currentTime;
        }
        /**
         * Get the position from 0 to 1
         *
         * @return {number} Current position
         */

      }, {
        key: "getPlayedPercents",
        value: function getPlayedPercents() {
          return this.getCurrentTime() / this.getDuration() || 0;
        }
        /**
         * Get the audio source playback rate.
         *
         * @return {number} Playback rate
         */

      }, {
        key: "getPlaybackRate",
        value: function getPlaybackRate() {
          return this.playbackRate || this.media.playbackRate;
        }
        /**
         * Set the audio source playback rate.
         *
         * @param {number} value Playback rate
         */

      }, {
        key: "setPlaybackRate",
        value: function setPlaybackRate(value) {
          this.playbackRate = value || 1;
          this.media.playbackRate = this.playbackRate;
        }
        /**
         * Used by `wavesurfer.seekTo()`
         *
         * @param {number} start Position to start at in seconds
         */

      }, {
        key: "seekTo",
        value: function seekTo(start) {
          if (start != null) {
            this.media.currentTime = start;
          }

          this.clearPlayEnd();
        }
        /**
         * Plays the loaded audio region.
         *
         * @param {number} start Start offset in seconds, relative to the beginning
         * of a clip.
         * @param {number} end When to stop, relative to the beginning of a clip.
         * @emits MediaElement#play
         * @return {Promise} Result
         */

      }, {
        key: "play",
        value: function play(start, end) {
          this.seekTo(start);
          var promise = this.media.play();
          end && this.setPlayEnd(end);
          return promise;
        }
        /**
         * Pauses the loaded audio.
         *
         * @emits MediaElement#pause
         * @return {Promise} Result
         */

      }, {
        key: "pause",
        value: function pause() {
          var promise;

          if (this.media) {
            promise = this.media.pause();
          }

          this.clearPlayEnd();
          return promise;
        }
        /**
         * Set the play end
         *
         * @param {number} end Where to end
         */

      }, {
        key: "setPlayEnd",
        value: function setPlayEnd(end) {
          var _this4 = this;

          this.clearPlayEnd();

          this._onPlayEnd = function (time) {
            if (time >= end) {
              _this4.pause();

              _this4.seekTo(end);
            }
          };

          this.on('audioprocess', this._onPlayEnd);
        }
        /** @private */

      }, {
        key: "clearPlayEnd",
        value: function clearPlayEnd() {
          if (this._onPlayEnd) {
            this.un('audioprocess', this._onPlayEnd);
            this._onPlayEnd = null;
          }
        }
        /**
         * Compute the max and min value of the waveform when broken into
         * <length> subranges.
         *
         * @param {number} length How many subranges to break the waveform into.
         * @param {number} first First sample in the required range.
         * @param {number} last Last sample in the required range.
         * @return {number[]|Number.<Array[]>} Array of 2*<length> peaks or array of
         * arrays of peaks consisting of (max, min) values for each subrange.
         */

      }, {
        key: "getPeaks",
        value: function getPeaks(length, first, last) {
          if (this.buffer) {
            return _get(_getPrototypeOf(MediaElement.prototype), "getPeaks", this).call(this, length, first, last);
          }

          return this.peaks || [];
        }
        /**
         * Set the sink id for the media player
         *
         * @param {string} deviceId String value representing audio device id.
         * @returns {Promise} A Promise that resolves to `undefined` when there
         * are no errors.
         */

      }, {
        key: "setSinkId",
        value: function setSinkId(deviceId) {
          if (deviceId) {
            if (!this.media.setSinkId) {
              return Promise.reject(new Error('setSinkId is not supported in your browser'));
            }

            return this.media.setSinkId(deviceId);
          }

          return Promise.reject(new Error('Invalid deviceId: ' + deviceId));
        }
        /**
         * Get the current volume
         *
         * @return {number} value A floating point value between 0 and 1.
         */

      }, {
        key: "getVolume",
        value: function getVolume() {
          return this.volume;
        }
        /**
         * Set the audio volume
         *
         * @param {number} value A floating point value between 0 and 1.
         */

      }, {
        key: "setVolume",
        value: function setVolume(value) {
          this.volume = value; // no need to change when it's already at that volume

          if (this.media.volume !== this.volume) {
            this.media.volume = this.volume;
          }
        }
        /**
         * Enable or disable muted audio
         *
         * @since 4.0.0
         * @param {boolean} muted Specify `true` to mute audio.
         */

      }, {
        key: "setMute",
        value: function setMute(muted) {
          // This causes a volume change to be emitted too through the
          // volumechange event listener.
          this.isMuted = this.media.muted = muted;
        }
        /**
         * This is called when wavesurfer is destroyed
         *
         */

      }, {
        key: "destroy",
        value: function destroy() {
          var _this5 = this;

          this.pause();
          this.unAll();
          this.destroyed = true; // cleanup media event listeners

          Object.keys(this.mediaListeners).forEach(function (id) {
            if (_this5.media) {
              _this5.media.removeEventListener(id, _this5.mediaListeners[id]);
            }
          });

          if (this.params.removeMediaElementOnDestroy && this.media && this.media.parentNode) {
            this.media.parentNode.removeChild(this.media);
          }

          this.media = null;
        }
      }]);

      return MediaElement;
    }(_webaudio.default);

    exports.default = MediaElement;
    module.exports = exports.default;

    /***/ }),

    /***/ "./src/peakcache.js":
    /*!**************************!*\
      !*** ./src/peakcache.js ***!
      \**************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    /**
     * Caches the decoded peaks data to improve rendering speed for large audio
     *
     * Is used if the option parameter `partialRender` is set to `true`
     */
    var PeakCache = /*#__PURE__*/function () {
      /**
       * Instantiate cache
       */
      function PeakCache() {
        _classCallCheck(this, PeakCache);

        this.clearPeakCache();
      }
      /**
       * Empty the cache
       */


      _createClass(PeakCache, [{
        key: "clearPeakCache",
        value: function clearPeakCache() {
          /**
           * Flat array with entries that are always in pairs to mark the
           * beginning and end of each subrange.  This is a convenience so we can
           * iterate over the pairs for easy set difference operations.
           * @private
           */
          this.peakCacheRanges = [];
          /**
           * Length of the entire cachable region, used for resetting the cache
           * when this changes (zoom events, for instance).
           * @private
           */

          this.peakCacheLength = -1;
        }
        /**
         * Add a range of peaks to the cache
         *
         * @param {number} length The length of the range
         * @param {number} start The x offset of the start of the range
         * @param {number} end The x offset of the end of the range
         * @return {Number.<Array[]>} Array with arrays of numbers
         */

      }, {
        key: "addRangeToPeakCache",
        value: function addRangeToPeakCache(length, start, end) {
          if (length != this.peakCacheLength) {
            this.clearPeakCache();
            this.peakCacheLength = length;
          } // Return ranges that weren't in the cache before the call.


          var uncachedRanges = [];
          var i = 0; // Skip ranges before the current start.

          while (i < this.peakCacheRanges.length && this.peakCacheRanges[i] < start) {
            i++;
          } // If |i| is even, |start| falls after an existing range.  Otherwise,
          // |start| falls between an existing range, and the uncached region
          // starts when we encounter the next node in |peakCacheRanges| or
          // |end|, whichever comes first.


          if (i % 2 == 0) {
            uncachedRanges.push(start);
          }

          while (i < this.peakCacheRanges.length && this.peakCacheRanges[i] <= end) {
            uncachedRanges.push(this.peakCacheRanges[i]);
            i++;
          } // If |i| is even, |end| is after all existing ranges.


          if (i % 2 == 0) {
            uncachedRanges.push(end);
          } // Filter out the 0-length ranges.


          uncachedRanges = uncachedRanges.filter(function (item, pos, arr) {
            if (pos == 0) {
              return item != arr[pos + 1];
            } else if (pos == arr.length - 1) {
              return item != arr[pos - 1];
            }

            return item != arr[pos - 1] && item != arr[pos + 1];
          }); // Merge the two ranges together, uncachedRanges will either contain
          // wholly new points, or duplicates of points in peakCacheRanges.  If
          // duplicates are detected, remove both and extend the range.

          this.peakCacheRanges = this.peakCacheRanges.concat(uncachedRanges);
          this.peakCacheRanges = this.peakCacheRanges.sort(function (a, b) {
            return a - b;
          }).filter(function (item, pos, arr) {
            if (pos == 0) {
              return item != arr[pos + 1];
            } else if (pos == arr.length - 1) {
              return item != arr[pos - 1];
            }

            return item != arr[pos - 1] && item != arr[pos + 1];
          }); // Push the uncached ranges into an array of arrays for ease of
          // iteration in the functions that call this.

          var uncachedRangePairs = [];

          for (i = 0; i < uncachedRanges.length; i += 2) {
            uncachedRangePairs.push([uncachedRanges[i], uncachedRanges[i + 1]]);
          }

          return uncachedRangePairs;
        }
        /**
         * For testing
         *
         * @return {Number.<Array[]>} Array with arrays of numbers
         */

      }, {
        key: "getCacheRanges",
        value: function getCacheRanges() {
          var peakCacheRangePairs = [];
          var i;

          for (i = 0; i < this.peakCacheRanges.length; i += 2) {
            peakCacheRangePairs.push([this.peakCacheRanges[i], this.peakCacheRanges[i + 1]]);
          }

          return peakCacheRangePairs;
        }
      }]);

      return PeakCache;
    }();

    exports.default = PeakCache;
    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/absMax.js":
    /*!****************************!*\
      !*** ./src/util/absMax.js ***!
      \****************************/
    /***/ ((module, exports, __webpack_require__) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = absMax;

    var _max = _interopRequireDefault(__webpack_require__(/*! ./max */ "./src/util/max.js"));

    var _min = _interopRequireDefault(__webpack_require__(/*! ./min */ "./src/util/min.js"));

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * Get the largest absolute value in an array
     *
     * @param   {Array} values Array of numbers
     * @returns {Number} Largest number found
     * @example console.log(max([-3, 2, 1]), max([-3, 2, 4])); // logs 3 4
     * @since 4.3.0
     */
    function absMax(values) {
      var max = (0, _max.default)(values);
      var min = (0, _min.default)(values);
      return -min > max ? -min : max;
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/clamp.js":
    /*!***************************!*\
      !*** ./src/util/clamp.js ***!
      \***************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = clamp;

    /**
     * Returns a number limited to the given range.
     *
     * @param {number} val The number to be limited to a range
     * @param {number} min The lower boundary of the limit range
     * @param {number} max The upper boundary of the limit range
     * @returns {number} A number in the range [min, max]
     */
    function clamp(val, min, max) {
      return Math.min(Math.max(min, val), max);
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/fetch.js":
    /*!***************************!*\
      !*** ./src/util/fetch.js ***!
      \***************************/
    /***/ ((module, exports, __webpack_require__) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = fetchFile;

    var _observer = _interopRequireDefault(__webpack_require__(/*! ./observer */ "./src/util/observer.js"));

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    var ProgressHandler = /*#__PURE__*/function () {
      /**
       * Instantiate ProgressHandler
       *
       * @param {Observer} instance The `fetchFile` observer instance.
       * @param {Number} contentLength Content length.
       * @param {Response} response Response object.
       */
      function ProgressHandler(instance, contentLength, response) {
        _classCallCheck(this, ProgressHandler);

        this.instance = instance;
        this.instance._reader = response.body.getReader();
        this.total = parseInt(contentLength, 10);
        this.loaded = 0;
      }
      /**
       * A method that is called once, immediately after the `ReadableStream``
       * is constructed.
       *
       * @param {ReadableStreamDefaultController} controller Controller instance
       *     used to control the stream.
       */


      _createClass(ProgressHandler, [{
        key: "start",
        value: function start(controller) {
          var _this = this;

          var read = function read() {
            // instance._reader.read() returns a promise that resolves
            // when a value has been received
            _this.instance._reader.read().then(function (_ref) {
              var done = _ref.done,
                  value = _ref.value;

              // result objects contain two properties:
              // done  - true if the stream has already given you all its data.
              // value - some data. Always undefined when done is true.
              if (done) {
                // ensure onProgress called when content-length=0
                if (_this.total === 0) {
                  _this.instance.onProgress.call(_this.instance, {
                    loaded: _this.loaded,
                    total: _this.total,
                    lengthComputable: false
                  });
                } // no more data needs to be consumed, close the stream


                controller.close();
                return;
              }

              _this.loaded += value.byteLength;

              _this.instance.onProgress.call(_this.instance, {
                loaded: _this.loaded,
                total: _this.total,
                lengthComputable: !(_this.total === 0)
              }); // enqueue the next data chunk into our target stream


              controller.enqueue(value);
              read();
            }).catch(function (error) {
              controller.error(error);
            });
          };

          read();
        }
      }]);

      return ProgressHandler;
    }();
    /**
     * Load a file using `fetch`.
     *
     * @param {object} options Request options to use. See example below.
     * @returns {Observer} Observer instance
     * @example
     * // default options
     * let options = {
     *     url: undefined,
     *     method: 'GET',
     *     mode: 'cors',
     *     credentials: 'same-origin',
     *     cache: 'default',
     *     responseType: 'json',
     *     requestHeaders: [],
     *     redirect: 'follow',
     *     referrer: 'client'
     * };
     *
     * // override some options
     * options.url = '../media/demo.wav';

     * // available types: 'arraybuffer', 'blob', 'json' or 'text'
     * options.responseType = 'arraybuffer';
     *
     * // make fetch call
     * let request = util.fetchFile(options);
     *
     * // listen for events
     * request.on('progress', e => {
     *     console.log('progress', e);
     * });
     *
     * request.on('success', data => {
     *     console.log('success!', data);
     * });
     *
     * request.on('error', e => {
     *     console.warn('fetchFile error: ', e);
     * });
     */


    function fetchFile(options) {
      if (!options) {
        throw new Error('fetch options missing');
      } else if (!options.url) {
        throw new Error('fetch url missing');
      }

      var instance = new _observer.default();
      var fetchHeaders = new Headers();
      var fetchRequest = new Request(options.url); // add ability to abort

      instance.controller = new AbortController(); // check if headers have to be added

      if (options && options.requestHeaders) {
        // add custom request headers
        options.requestHeaders.forEach(function (header) {
          fetchHeaders.append(header.key, header.value);
        });
      } // parse fetch options


      var responseType = options.responseType || 'json';
      var fetchOptions = {
        method: options.method || 'GET',
        headers: fetchHeaders,
        mode: options.mode || 'cors',
        credentials: options.credentials || 'same-origin',
        cache: options.cache || 'default',
        redirect: options.redirect || 'follow',
        referrer: options.referrer || 'client',
        signal: instance.controller.signal
      };
      fetch(fetchRequest, fetchOptions).then(function (response) {
        // store response reference
        instance.response = response;
        var progressAvailable = true;

        if (!response.body) {
          // ReadableStream is not yet supported in this browser
          // see https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
          progressAvailable = false;
        } // Server must send CORS header "Access-Control-Expose-Headers: content-length"


        var contentLength = response.headers.get('content-length');

        if (contentLength === null) {
          // Content-Length server response header missing.
          // Don't evaluate download progress if we can't compare against a total size
          // see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS#Access-Control-Expose-Headers
          progressAvailable = false;
        }

        if (!progressAvailable) {
          // not able to check download progress so skip it
          return response;
        } // fire progress event when during load


        instance.onProgress = function (e) {
          instance.fireEvent('progress', e);
        };

        return new Response(new ReadableStream(new ProgressHandler(instance, contentLength, response)), fetchOptions);
      }).then(function (response) {
        var errMsg;

        if (response.ok) {
          switch (responseType) {
            case 'arraybuffer':
              return response.arrayBuffer();

            case 'json':
              return response.json();

            case 'blob':
              return response.blob();

            case 'text':
              return response.text();

            default:
              errMsg = 'Unknown responseType: ' + responseType;
              break;
          }
        }

        if (!errMsg) {
          errMsg = 'HTTP error status: ' + response.status;
        }

        throw new Error(errMsg);
      }).then(function (response) {
        instance.fireEvent('success', response);
      }).catch(function (error) {
        instance.fireEvent('error', error);
      }); // return the fetch request

      instance.fetchRequest = fetchRequest;
      return instance;
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/frame.js":
    /*!***************************!*\
      !*** ./src/util/frame.js ***!
      \***************************/
    /***/ ((module, exports, __webpack_require__) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = frame;

    var _requestAnimationFrame = _interopRequireDefault(__webpack_require__(/*! ./request-animation-frame */ "./src/util/request-animation-frame.js"));

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /**
     * Create a function which will be called at the next requestAnimationFrame
     * cycle
     *
     * @param {function} func The function to call
     *
     * @return {func} The function wrapped within a requestAnimationFrame
     */
    function frame(func) {
      return function () {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return (0, _requestAnimationFrame.default)(function () {
          return func.apply(void 0, args);
        });
      };
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/get-id.js":
    /*!****************************!*\
      !*** ./src/util/get-id.js ***!
      \****************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = getId;

    /**
     * Get a random prefixed ID
     *
     * @param {String} prefix Prefix to use. Default is `'wavesurfer_'`.
     * @returns {String} Random prefixed ID
     * @example
     * console.log(getId()); // logs 'wavesurfer_b5pors4ru6g'
     *
     * let prefix = 'foo-';
     * console.log(getId(prefix)); // logs 'foo-b5pors4ru6g'
     */
    function getId(prefix) {
      if (prefix === undefined) {
        prefix = 'wavesurfer_';
      }

      return prefix + Math.random().toString(32).substring(2);
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/index.js":
    /*!***************************!*\
      !*** ./src/util/index.js ***!
      \***************************/
    /***/ ((__unused_webpack_module, exports, __webpack_require__) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    Object.defineProperty(exports, "getId", ({
      enumerable: true,
      get: function get() {
        return _getId.default;
      }
    }));
    Object.defineProperty(exports, "max", ({
      enumerable: true,
      get: function get() {
        return _max.default;
      }
    }));
    Object.defineProperty(exports, "min", ({
      enumerable: true,
      get: function get() {
        return _min.default;
      }
    }));
    Object.defineProperty(exports, "absMax", ({
      enumerable: true,
      get: function get() {
        return _absMax.default;
      }
    }));
    Object.defineProperty(exports, "Observer", ({
      enumerable: true,
      get: function get() {
        return _observer.default;
      }
    }));
    Object.defineProperty(exports, "style", ({
      enumerable: true,
      get: function get() {
        return _style.default;
      }
    }));
    Object.defineProperty(exports, "requestAnimationFrame", ({
      enumerable: true,
      get: function get() {
        return _requestAnimationFrame.default;
      }
    }));
    Object.defineProperty(exports, "frame", ({
      enumerable: true,
      get: function get() {
        return _frame.default;
      }
    }));
    Object.defineProperty(exports, "debounce", ({
      enumerable: true,
      get: function get() {
        return _debounce.default;
      }
    }));
    Object.defineProperty(exports, "preventClick", ({
      enumerable: true,
      get: function get() {
        return _preventClick.default;
      }
    }));
    Object.defineProperty(exports, "fetchFile", ({
      enumerable: true,
      get: function get() {
        return _fetch.default;
      }
    }));
    Object.defineProperty(exports, "clamp", ({
      enumerable: true,
      get: function get() {
        return _clamp.default;
      }
    }));
    Object.defineProperty(exports, "withOrientation", ({
      enumerable: true,
      get: function get() {
        return _orientation.default;
      }
    }));
    Object.defineProperty(exports, "ignoreSilenceMode", ({
      enumerable: true,
      get: function get() {
        return _silenceMode.default;
      }
    }));

    var _getId = _interopRequireDefault(__webpack_require__(/*! ./get-id */ "./src/util/get-id.js"));

    var _max = _interopRequireDefault(__webpack_require__(/*! ./max */ "./src/util/max.js"));

    var _min = _interopRequireDefault(__webpack_require__(/*! ./min */ "./src/util/min.js"));

    var _absMax = _interopRequireDefault(__webpack_require__(/*! ./absMax */ "./src/util/absMax.js"));

    var _observer = _interopRequireDefault(__webpack_require__(/*! ./observer */ "./src/util/observer.js"));

    var _style = _interopRequireDefault(__webpack_require__(/*! ./style */ "./src/util/style.js"));

    var _requestAnimationFrame = _interopRequireDefault(__webpack_require__(/*! ./request-animation-frame */ "./src/util/request-animation-frame.js"));

    var _frame = _interopRequireDefault(__webpack_require__(/*! ./frame */ "./src/util/frame.js"));

    var _debounce = _interopRequireDefault(__webpack_require__(/*! debounce */ "./node_modules/debounce/index.js"));

    var _preventClick = _interopRequireDefault(__webpack_require__(/*! ./prevent-click */ "./src/util/prevent-click.js"));

    var _fetch = _interopRequireDefault(__webpack_require__(/*! ./fetch */ "./src/util/fetch.js"));

    var _clamp = _interopRequireDefault(__webpack_require__(/*! ./clamp */ "./src/util/clamp.js"));

    var _orientation = _interopRequireDefault(__webpack_require__(/*! ./orientation */ "./src/util/orientation.js"));

    var _silenceMode = _interopRequireDefault(__webpack_require__(/*! ./silence-mode */ "./src/util/silence-mode.js"));

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    /***/ }),

    /***/ "./src/util/max.js":
    /*!*************************!*\
      !*** ./src/util/max.js ***!
      \*************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = max;

    /**
     * Get the largest value
     *
     * @param   {Array} values Array of numbers
     * @returns {Number} Largest number found
     * @example console.log(max([1, 2, 3])); // logs 3
     */
    function max(values) {
      var largest = -Infinity;
      Object.keys(values).forEach(function (i) {
        if (values[i] > largest) {
          largest = values[i];
        }
      });
      return largest;
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/min.js":
    /*!*************************!*\
      !*** ./src/util/min.js ***!
      \*************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = min;

    /**
     * Get the smallest value
     *
     * @param   {Array} values Array of numbers
     * @returns {Number} Smallest number found
     * @example console.log(min([1, 2, 3])); // logs 1
     */
    function min(values) {
      var smallest = Number(Infinity);
      Object.keys(values).forEach(function (i) {
        if (values[i] < smallest) {
          smallest = values[i];
        }
      });
      return smallest;
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/observer.js":
    /*!******************************!*\
      !*** ./src/util/observer.js ***!
      \******************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    /**
     * @typedef {Object} ListenerDescriptor
     * @property {string} name The name of the event
     * @property {function} callback The callback
     * @property {function} un The function to call to remove the listener
     */

    /**
     * Observer class
     */
    var Observer = /*#__PURE__*/function () {
      /**
       * Instantiate Observer
       */
      function Observer() {
        _classCallCheck(this, Observer);

        /**
         * @private
         * @todo Initialise the handlers here already and remove the conditional
         * assignment in `on()`
         */
        this._disabledEventEmissions = [];
        this.handlers = null;
      }
      /**
       * Attach a handler function for an event.
       *
       * @param {string} event Name of the event to listen to
       * @param {function} fn The callback to trigger when the event is fired
       * @return {ListenerDescriptor} The event descriptor
       */


      _createClass(Observer, [{
        key: "on",
        value: function on(event, fn) {
          var _this = this;

          if (!this.handlers) {
            this.handlers = {};
          }

          var handlers = this.handlers[event];

          if (!handlers) {
            handlers = this.handlers[event] = [];
          }

          handlers.push(fn); // Return an event descriptor

          return {
            name: event,
            callback: fn,
            un: function un(e, fn) {
              return _this.un(e, fn);
            }
          };
        }
        /**
         * Remove an event handler.
         *
         * @param {string} event Name of the event the listener that should be
         * removed listens to
         * @param {function} fn The callback that should be removed
         */

      }, {
        key: "un",
        value: function un(event, fn) {
          if (!this.handlers) {
            return;
          }

          var handlers = this.handlers[event];
          var i;

          if (handlers) {
            if (fn) {
              for (i = handlers.length - 1; i >= 0; i--) {
                if (handlers[i] == fn) {
                  handlers.splice(i, 1);
                }
              }
            } else {
              handlers.length = 0;
            }
          }
        }
        /**
         * Remove all event handlers.
         */

      }, {
        key: "unAll",
        value: function unAll() {
          this.handlers = null;
        }
        /**
         * Attach a handler to an event. The handler is executed at most once per
         * event type.
         *
         * @param {string} event The event to listen to
         * @param {function} handler The callback that is only to be called once
         * @return {ListenerDescriptor} The event descriptor
         */

      }, {
        key: "once",
        value: function once(event, handler) {
          var _this2 = this;

          var fn = function fn() {
            for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
              args[_key] = arguments[_key];
            }

            /*  eslint-disable no-invalid-this */
            handler.apply(_this2, args);
            /*  eslint-enable no-invalid-this */

            setTimeout(function () {
              _this2.un(event, fn);
            }, 0);
          };

          return this.on(event, fn);
        }
        /**
         * Disable firing a list of events by name. When specified, event handlers for any event type
         * passed in here will not be called.
         *
         * @since 4.0.0
         * @param {string[]} eventNames an array of event names to disable emissions for
         * @example
         * // disable seek and interaction events
         * wavesurfer.setDisabledEventEmissions(['seek', 'interaction']);
         */

      }, {
        key: "setDisabledEventEmissions",
        value: function setDisabledEventEmissions(eventNames) {
          this._disabledEventEmissions = eventNames;
        }
        /**
         * plugins borrow part of this class without calling the constructor,
         * so we have to be careful about _disabledEventEmissions
         */

      }, {
        key: "_isDisabledEventEmission",
        value: function _isDisabledEventEmission(event) {
          return this._disabledEventEmissions && this._disabledEventEmissions.includes(event);
        }
        /**
         * Manually fire an event
         *
         * @param {string} event The event to fire manually
         * @param {...any} args The arguments with which to call the listeners
         */

      }, {
        key: "fireEvent",
        value: function fireEvent(event) {
          for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            args[_key2 - 1] = arguments[_key2];
          }

          if (!this.handlers || this._isDisabledEventEmission(event)) {
            return;
          }

          var handlers = this.handlers[event];
          handlers && handlers.forEach(function (fn) {
            fn.apply(void 0, args);
          });
        }
      }]);

      return Observer;
    }();

    exports.default = Observer;
    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/orientation.js":
    /*!*********************************!*\
      !*** ./src/util/orientation.js ***!
      \*********************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = withOrientation;
    var verticalPropMap = {
      width: 'height',
      height: 'width',
      overflowX: 'overflowY',
      overflowY: 'overflowX',
      clientWidth: 'clientHeight',
      clientHeight: 'clientWidth',
      clientX: 'clientY',
      clientY: 'clientX',
      scrollWidth: 'scrollHeight',
      scrollLeft: 'scrollTop',
      offsetLeft: 'offsetTop',
      offsetTop: 'offsetLeft',
      offsetHeight: 'offsetWidth',
      offsetWidth: 'offsetHeight',
      left: 'top',
      right: 'bottom',
      top: 'left',
      bottom: 'right',
      borderRightStyle: 'borderBottomStyle',
      borderRightWidth: 'borderBottomWidth',
      borderRightColor: 'borderBottomColor'
    };
    /**
     * Convert a horizontally-oriented property name to a vertical one.
     *
     * @param {string} prop A property name
     * @param {bool} vertical Whether the element is oriented vertically
     * @returns {string} prop, converted appropriately
     */

    function mapProp(prop, vertical) {
      if (Object.prototype.hasOwnProperty.call(verticalPropMap, prop)) {
        return vertical ? verticalPropMap[prop] : prop;
      } else {
        return prop;
      }
    }

    var isProxy = Symbol("isProxy");
    /**
     * Returns an appropriately oriented object based on vertical.
     * If vertical is true, attribute getting and setting will be mapped through
     * verticalPropMap, so that e.g. getting the object's .width will give its
     * .height instead.
     * Certain methods of an oriented object will return oriented objects as well.
     * Oriented objects can't be added to the DOM directly since they are Proxy objects
     * and thus fail typechecks. Use domElement to get the actual element for this.
     *
     * @param {object} target The object to be wrapped and oriented
     * @param {bool} vertical Whether the element is oriented vertically
     * @returns {Proxy} An oriented object with attr translation via verticalAttrMap
     * @since 5.0.0
     */

    function withOrientation(target, vertical) {
      if (target[isProxy]) {
        return target;
      } else {
        return new Proxy(target, {
          get: function get(obj, prop, receiver) {
            if (prop === isProxy) {
              return true;
            } else if (prop === 'domElement') {
              return obj;
            } else if (prop === 'style') {
              return withOrientation(obj.style, vertical);
            } else if (prop === 'canvas') {
              return withOrientation(obj.canvas, vertical);
            } else if (prop === 'getBoundingClientRect') {
              return function () {
                return withOrientation(obj.getBoundingClientRect.apply(obj, arguments), vertical);
              };
            } else if (prop === 'getContext') {
              return function () {
                return withOrientation(obj.getContext.apply(obj, arguments), vertical);
              };
            } else {
              var value = obj[mapProp(prop, vertical)];
              return typeof value == 'function' ? value.bind(obj) : value;
            }
          },
          set: function set(obj, prop, value) {
            obj[mapProp(prop, vertical)] = value;
            return true;
          }
        });
      }
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/prevent-click.js":
    /*!***********************************!*\
      !*** ./src/util/prevent-click.js ***!
      \***********************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = preventClick;

    /**
     * Stops propagation of click event and removes event listener
     *
     * @private
     * @param {object} event The click event
     */
    function preventClickHandler(event) {
      event.stopPropagation();
      document.body.removeEventListener('click', preventClickHandler, true);
    }
    /**
     * Starts listening for click event and prevent propagation
     *
     * @param {object} values Values
     */


    function preventClick(values) {
      document.body.addEventListener('click', preventClickHandler, true);
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/request-animation-frame.js":
    /*!*********************************************!*\
      !*** ./src/util/request-animation-frame.js ***!
      \*********************************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    /* eslint-disable valid-jsdoc */

    /**
     * Returns the `requestAnimationFrame` function for the browser, or a shim with
     * `setTimeout` if the function is not found
     *
     * @return {function} Available `requestAnimationFrame` function for the browser
     */
    var _default = (window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function (callback, element) {
      return setTimeout(callback, 1000 / 60);
    }).bind(window);

    exports.default = _default;
    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/silence-mode.js":
    /*!**********************************!*\
      !*** ./src/util/silence-mode.js ***!
      \**********************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = ignoreSilenceMode;

    /**
     * Ignores device silence mode when using the `WebAudio` backend.
     *
     * Many mobile devices contain a hardware button to mute the ringtone for incoming
     * calls and messages. Unfortunately, on some platforms like iOS, this also mutes
     * wavesurfer's audio when using the `WebAudio` backend. This function creates a
     * temporary `<audio>` element that makes sure the WebAudio backend keeps playing
     * when muting the device ringer.
     *
     * @since 5.2.0
     */
    function ignoreSilenceMode() {
      // Set the src to a short bit of url encoded as a silent mp3
      // NOTE The silence MP3 must be high quality, when web audio sounds are played
      // in parallel the web audio sound is mixed to match the bitrate of the html sound
      // 0.01 seconds of silence VBR220-260 Joint Stereo 859B
      var audioData = "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA//////////////////////////////////////////////////////////////////8AAABhTEFNRTMuMTAwA8MAAAAAAAAAABQgJAUHQQAB9AAAAnGMHkkIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//sQxAADgnABGiAAQBCqgCRMAAgEAH///////////////7+n/9FTuQsQH//////2NG0jWUGlio5gLQTOtIoeR2WX////X4s9Atb/JRVCbBUpeRUq//////////////////9RUi0f2jn/+xDECgPCjAEQAABN4AAANIAAAAQVTEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ=="; // disable iOS Airplay (setting the attribute in js doesn't work)

      var tmp = document.createElement("div");
      tmp.innerHTML = '<audio x-webkit-airplay="deny"></audio>';
      var audioSilentMode = tmp.children.item(0);
      audioSilentMode.src = audioData;
      audioSilentMode.preload = "auto";
      audioSilentMode.type = "audio/mpeg";
      audioSilentMode.disableRemotePlayback = true; // play

      audioSilentMode.play(); // cleanup

      audioSilentMode.remove();
      tmp.remove();
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/util/style.js":
    /*!***************************!*\
      !*** ./src/util/style.js ***!
      \***************************/
    /***/ ((module, exports) => {


    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = style;

    /**
     * Apply a map of styles to an element
     *
     * @param {HTMLElement} el The element that the styles will be applied to
     * @param {Object} styles The map of propName: attribute, both are used as-is
     *
     * @return {HTMLElement} el
     */
    function style(el, styles) {
      Object.keys(styles).forEach(function (prop) {
        if (el.style[prop] !== styles[prop]) {
          el.style[prop] = styles[prop];
        }
      });
      return el;
    }

    module.exports = exports.default;

    /***/ }),

    /***/ "./src/wavesurfer.js":
    /*!***************************!*\
      !*** ./src/wavesurfer.js ***!
      \***************************/
    /***/ ((module, exports, __webpack_require__) => {


    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    var util = _interopRequireWildcard(__webpack_require__(/*! ./util */ "./src/util/index.js"));

    var _drawer = _interopRequireDefault(__webpack_require__(/*! ./drawer.multicanvas */ "./src/drawer.multicanvas.js"));

    var _webaudio = _interopRequireDefault(__webpack_require__(/*! ./webaudio */ "./src/webaudio.js"));

    var _mediaelement = _interopRequireDefault(__webpack_require__(/*! ./mediaelement */ "./src/mediaelement.js"));

    var _peakcache = _interopRequireDefault(__webpack_require__(/*! ./peakcache */ "./src/peakcache.js"));

    var _mediaelementWebaudio = _interopRequireDefault(__webpack_require__(/*! ./mediaelement-webaudio */ "./src/mediaelement-webaudio.js"));

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

    function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

    function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

    function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

    function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

    function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

    function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }
    /**
     * WaveSurfer core library class
     *
     * @extends {Observer}
     * @example
     * const params = {
     *   container: '#waveform',
     *   waveColor: 'violet',
     *   progressColor: 'purple'
     * };
     *
     * // initialise like this
     * const wavesurfer = WaveSurfer.create(params);
     *
     * // or like this ...
     * const wavesurfer = new WaveSurfer(params);
     * wavesurfer.init();
     *
     * // load audio file
     * wavesurfer.load('example/media/demo.wav');
     */


    var WaveSurfer = /*#__PURE__*/function (_util$Observer) {
      _inherits(WaveSurfer, _util$Observer);

      var _super = _createSuper(WaveSurfer);

      /**
       * Initialise wavesurfer instance
       *
       * @param {WavesurferParams} params Instantiation options for wavesurfer
       * @example
       * const wavesurfer = new WaveSurfer(params);
       * @returns {this} Wavesurfer instance
       */
      function WaveSurfer(params) {
        var _this;

        _classCallCheck(this, WaveSurfer);

        _this = _super.call(this);
        /**
         * Extract relevant parameters (or defaults)
         * @private
         */

        _this.defaultParams = {
          audioContext: null,
          audioScriptProcessor: null,
          audioRate: 1,
          autoCenter: true,
          autoCenterRate: 5,
          autoCenterImmediately: false,
          backend: 'WebAudio',
          backgroundColor: null,
          barHeight: 1,
          barRadius: 0,
          barGap: null,
          barMinHeight: null,
          container: null,
          cursorColor: '#333',
          cursorWidth: 1,
          dragSelection: true,
          drawingContextAttributes: {
            // Boolean that hints the user agent to reduce the latency
            // by desynchronizing the canvas paint cycle from the event
            // loop
            desynchronized: false
          },
          duration: null,
          fillParent: true,
          forceDecode: false,
          height: 128,
          hideScrollbar: false,
          ignoreSilenceMode: false,
          interact: true,
          loopSelection: true,
          maxCanvasWidth: 4000,
          mediaContainer: null,
          mediaControls: false,
          mediaType: 'audio',
          minPxPerSec: 20,
          normalize: false,
          partialRender: false,
          pixelRatio: window.devicePixelRatio || screen.deviceXDPI / screen.logicalXDPI,
          plugins: [],
          progressColor: '#555',
          removeMediaElementOnDestroy: true,
          renderer: _drawer.default,
          responsive: false,
          rtl: false,
          scrollParent: false,
          skipLength: 2,
          splitChannels: false,
          splitChannelsOptions: {
            overlay: false,
            channelColors: {},
            filterChannels: [],
            relativeNormalization: false
          },
          vertical: false,
          waveColor: '#999',
          xhr: {}
        };
        _this.backends = {
          MediaElement: _mediaelement.default,
          WebAudio: _webaudio.default,
          MediaElementWebAudio: _mediaelementWebaudio.default
        };
        _this.util = util;
        _this.params = Object.assign({}, _this.defaultParams, params);
        _this.params.splitChannelsOptions = Object.assign({}, _this.defaultParams.splitChannelsOptions, params.splitChannelsOptions);
        /** @private */

        _this.container = 'string' == typeof params.container ? document.querySelector(_this.params.container) : _this.params.container;

        if (!_this.container) {
          throw new Error('Container element not found');
        }

        if (_this.params.mediaContainer == null) {
          /** @private */
          _this.mediaContainer = _this.container;
        } else if (typeof _this.params.mediaContainer == 'string') {
          /** @private */
          _this.mediaContainer = document.querySelector(_this.params.mediaContainer);
        } else {
          /** @private */
          _this.mediaContainer = _this.params.mediaContainer;
        }

        if (!_this.mediaContainer) {
          throw new Error('Media Container element not found');
        }

        if (_this.params.maxCanvasWidth <= 1) {
          throw new Error('maxCanvasWidth must be greater than 1');
        } else if (_this.params.maxCanvasWidth % 2 == 1) {
          throw new Error('maxCanvasWidth must be an even number');
        }

        if (_this.params.rtl === true) {
          if (_this.params.vertical === true) {
            util.style(_this.container, {
              transform: 'rotateX(180deg)'
            });
          } else {
            util.style(_this.container, {
              transform: 'rotateY(180deg)'
            });
          }
        }

        if (_this.params.backgroundColor) {
          _this.setBackgroundColor(_this.params.backgroundColor);
        }
        /**
         * @private Used to save the current volume when muting so we can
         * restore once unmuted
         * @type {number}
         */


        _this.savedVolume = 0;
        /**
         * @private The current muted state
         * @type {boolean}
         */

        _this.isMuted = false;
        /**
         * @private Will hold a list of event descriptors that need to be
         * canceled on subsequent loads of audio
         * @type {Object[]}
         */

        _this.tmpEvents = [];
        /**
         * @private Holds any running audio downloads
         * @type {Observer}
         */

        _this.currentRequest = null;
        /** @private */

        _this.arraybuffer = null;
        /** @private */

        _this.drawer = null;
        /** @private */

        _this.backend = null;
        /** @private */

        _this.peakCache = null; // cache constructor objects

        if (typeof _this.params.renderer !== 'function') {
          throw new Error('Renderer parameter is invalid');
        }
        /**
         * @private The uninitialised Drawer class
         */


        _this.Drawer = _this.params.renderer;
        /**
         * @private The uninitialised Backend class
         */
        // Back compat

        if (_this.params.backend == 'AudioElement') {
          _this.params.backend = 'MediaElement';
        }

        if ((_this.params.backend == 'WebAudio' || _this.params.backend === 'MediaElementWebAudio') && !_webaudio.default.prototype.supportsWebAudio.call(null)) {
          _this.params.backend = 'MediaElement';
        }

        _this.Backend = _this.backends[_this.params.backend];
        /**
         * @private map of plugin names that are currently initialised
         */

        _this.initialisedPluginList = {};
        /** @private */

        _this.isDestroyed = false;
        /**
         * Get the current ready status.
         *
         * @example const isReady = wavesurfer.isReady;
         * @return {boolean}
         */

        _this.isReady = false; // responsive debounced event listener. If this.params.responsive is not
        // set, this is never called. Use 100ms or this.params.responsive as
        // timeout for the debounce function.

        var prevWidth = 0;
        _this._onResize = util.debounce(function () {
          if (prevWidth != _this.drawer.wrapper.clientWidth && !_this.params.scrollParent) {
            prevWidth = _this.drawer.wrapper.clientWidth;

            _this.drawer.fireEvent('redraw');
          }
        }, typeof _this.params.responsive === 'number' ? _this.params.responsive : 100);
        return _possibleConstructorReturn(_this, _assertThisInitialized(_this));
      }
      /**
       * Initialise the wave
       *
       * @example
       * var wavesurfer = new WaveSurfer(params);
       * wavesurfer.init();
       * @return {this} The wavesurfer instance
       */


      _createClass(WaveSurfer, [{
        key: "init",
        value: function init() {
          this.registerPlugins(this.params.plugins);
          this.createDrawer();
          this.createBackend();
          this.createPeakCache();
          return this;
        }
        /**
         * Add and initialise array of plugins (if `plugin.deferInit` is falsey),
         * this function is called in the init function of wavesurfer
         *
         * @param {PluginDefinition[]} plugins An array of plugin definitions
         * @emits {WaveSurfer#plugins-registered} Called with the array of plugin definitions
         * @return {this} The wavesurfer instance
         */

      }, {
        key: "registerPlugins",
        value: function registerPlugins(plugins) {
          var _this2 = this;

          // first instantiate all the plugins
          plugins.forEach(function (plugin) {
            return _this2.addPlugin(plugin);
          }); // now run the init functions

          plugins.forEach(function (plugin) {
            // call init function of the plugin if deferInit is falsey
            // in that case you would manually use initPlugins()
            if (!plugin.deferInit) {
              _this2.initPlugin(plugin.name);
            }
          });
          this.fireEvent('plugins-registered', plugins);
          return this;
        }
        /**
         * Get a map of plugin names that are currently initialised
         *
         * @example wavesurfer.getPlugins();
         * @return {Object} Object with plugin names
         */

      }, {
        key: "getActivePlugins",
        value: function getActivePlugins() {
          return this.initialisedPluginList;
        }
        /**
         * Add a plugin object to wavesurfer
         *
         * @param {PluginDefinition} plugin A plugin definition
         * @emits {WaveSurfer#plugin-added} Called with the name of the plugin that was added
         * @example wavesurfer.addPlugin(WaveSurfer.minimap());
         * @return {this} The wavesurfer instance
         */

      }, {
        key: "addPlugin",
        value: function addPlugin(plugin) {
          var _this3 = this;

          if (!plugin.name) {
            throw new Error('Plugin does not have a name!');
          }

          if (!plugin.instance) {
            throw new Error("Plugin ".concat(plugin.name, " does not have an instance property!"));
          } // staticProps properties are applied to wavesurfer instance


          if (plugin.staticProps) {
            Object.keys(plugin.staticProps).forEach(function (pluginStaticProp) {
              /**
               * Properties defined in a plugin definition's `staticProps` property are added as
               * staticProps properties of the WaveSurfer instance
               */
              _this3[pluginStaticProp] = plugin.staticProps[pluginStaticProp];
            });
          }

          var Instance = plugin.instance; // turn the plugin instance into an observer

          var observerPrototypeKeys = Object.getOwnPropertyNames(util.Observer.prototype);
          observerPrototypeKeys.forEach(function (key) {
            Instance.prototype[key] = util.Observer.prototype[key];
          });
          /**
           * Instantiated plugin classes are added as a property of the wavesurfer
           * instance
           * @type {Object}
           */

          this[plugin.name] = new Instance(plugin.params || {}, this);
          this.fireEvent('plugin-added', plugin.name);
          return this;
        }
        /**
         * Initialise a plugin
         *
         * @param {string} name A plugin name
         * @emits WaveSurfer#plugin-initialised
         * @example wavesurfer.initPlugin('minimap');
         * @return {this} The wavesurfer instance
         */

      }, {
        key: "initPlugin",
        value: function initPlugin(name) {
          if (!this[name]) {
            throw new Error("Plugin ".concat(name, " has not been added yet!"));
          }

          if (this.initialisedPluginList[name]) {
            // destroy any already initialised plugins
            this.destroyPlugin(name);
          }

          this[name].init();
          this.initialisedPluginList[name] = true;
          this.fireEvent('plugin-initialised', name);
          return this;
        }
        /**
         * Destroy a plugin
         *
         * @param {string} name A plugin name
         * @emits WaveSurfer#plugin-destroyed
         * @example wavesurfer.destroyPlugin('minimap');
         * @returns {this} The wavesurfer instance
         */

      }, {
        key: "destroyPlugin",
        value: function destroyPlugin(name) {
          if (!this[name]) {
            throw new Error("Plugin ".concat(name, " has not been added yet and cannot be destroyed!"));
          }

          if (!this.initialisedPluginList[name]) {
            throw new Error("Plugin ".concat(name, " is not active and cannot be destroyed!"));
          }

          if (typeof this[name].destroy !== 'function') {
            throw new Error("Plugin ".concat(name, " does not have a destroy function!"));
          }

          this[name].destroy();
          delete this.initialisedPluginList[name];
          this.fireEvent('plugin-destroyed', name);
          return this;
        }
        /**
         * Destroy all initialised plugins. Convenience function to use when
         * wavesurfer is removed
         *
         * @private
         */

      }, {
        key: "destroyAllPlugins",
        value: function destroyAllPlugins() {
          var _this4 = this;

          Object.keys(this.initialisedPluginList).forEach(function (name) {
            return _this4.destroyPlugin(name);
          });
        }
        /**
         * Create the drawer and draw the waveform
         *
         * @private
         * @emits WaveSurfer#drawer-created
         */

      }, {
        key: "createDrawer",
        value: function createDrawer() {
          var _this5 = this;

          this.drawer = new this.Drawer(this.container, this.params);
          this.drawer.init();
          this.fireEvent('drawer-created', this.drawer);

          if (this.params.responsive !== false) {
            window.addEventListener('resize', this._onResize, true);
            window.addEventListener('orientationchange', this._onResize, true);
          }

          this.drawer.on('redraw', function () {
            _this5.drawBuffer();

            _this5.drawer.progress(_this5.backend.getPlayedPercents());
          }); // Click-to-seek

          this.drawer.on('click', function (e, progress) {
            setTimeout(function () {
              return _this5.seekTo(progress);
            }, 0);
          }); // Relay the scroll event from the drawer

          this.drawer.on('scroll', function (e) {
            if (_this5.params.partialRender) {
              _this5.drawBuffer();
            }

            _this5.fireEvent('scroll', e);
          });
        }
        /**
         * Create the backend
         *
         * @private
         * @emits WaveSurfer#backend-created
         */

      }, {
        key: "createBackend",
        value: function createBackend() {
          var _this6 = this;

          if (this.backend) {
            this.backend.destroy();
          }

          this.backend = new this.Backend(this.params);
          this.backend.init();
          this.fireEvent('backend-created', this.backend);
          this.backend.on('finish', function () {
            _this6.drawer.progress(_this6.backend.getPlayedPercents());

            _this6.fireEvent('finish');
          });
          this.backend.on('play', function () {
            return _this6.fireEvent('play');
          });
          this.backend.on('pause', function () {
            return _this6.fireEvent('pause');
          });
          this.backend.on('audioprocess', function (time) {
            _this6.drawer.progress(_this6.backend.getPlayedPercents());

            _this6.fireEvent('audioprocess', time);
          }); // only needed for MediaElement and MediaElementWebAudio backend

          if (this.params.backend === 'MediaElement' || this.params.backend === 'MediaElementWebAudio') {
            this.backend.on('seek', function () {
              _this6.drawer.progress(_this6.backend.getPlayedPercents());
            });
            this.backend.on('volume', function () {
              var newVolume = _this6.getVolume();

              _this6.fireEvent('volume', newVolume);

              if (_this6.backend.isMuted !== _this6.isMuted) {
                _this6.isMuted = _this6.backend.isMuted;

                _this6.fireEvent('mute', _this6.isMuted);
              }
            });
          }
        }
        /**
         * Create the peak cache
         *
         * @private
         */

      }, {
        key: "createPeakCache",
        value: function createPeakCache() {
          if (this.params.partialRender) {
            this.peakCache = new _peakcache.default();
          }
        }
        /**
         * Get the duration of the audio clip
         *
         * @example const duration = wavesurfer.getDuration();
         * @return {number} Duration in seconds
         */

      }, {
        key: "getDuration",
        value: function getDuration() {
          return this.backend.getDuration();
        }
        /**
         * Get the current playback position
         *
         * @example const currentTime = wavesurfer.getCurrentTime();
         * @return {number} Playback position in seconds
         */

      }, {
        key: "getCurrentTime",
        value: function getCurrentTime() {
          return this.backend.getCurrentTime();
        }
        /**
         * Set the current play time in seconds.
         *
         * @param {number} seconds A positive number in seconds. E.g. 10 means 10
         * seconds, 60 means 1 minute
         */

      }, {
        key: "setCurrentTime",
        value: function setCurrentTime(seconds) {
          if (seconds >= this.getDuration()) {
            this.seekTo(1);
          } else {
            this.seekTo(seconds / this.getDuration());
          }
        }
        /**
         * Starts playback from the current position. Optional start and end
         * measured in seconds can be used to set the range of audio to play.
         *
         * @param {?number} start Position to start at
         * @param {?number} end Position to end at
         * @emits WaveSurfer#interaction
         * @return {Promise} Result of the backend play method
         * @example
         * // play from second 1 to 5
         * wavesurfer.play(1, 5);
         */

      }, {
        key: "play",
        value: function play(start, end) {
          var _this7 = this;

          if (this.params.ignoreSilenceMode) {
            // ignores device hardware silence mode
            util.ignoreSilenceMode();
          }

          this.fireEvent('interaction', function () {
            return _this7.play(start, end);
          });
          return this.backend.play(start, end);
        }
        /**
         * Set a point in seconds for playback to stop at.
         *
         * @param {number} position Position (in seconds) to stop at
         * @version 3.3.0
         */

      }, {
        key: "setPlayEnd",
        value: function setPlayEnd(position) {
          this.backend.setPlayEnd(position);
        }
        /**
         * Stops and pauses playback
         *
         * @example wavesurfer.pause();
         * @return {Promise} Result of the backend pause method
         */

      }, {
        key: "pause",
        value: function pause() {
          if (!this.backend.isPaused()) {
            return this.backend.pause();
          }
        }
        /**
         * Toggle playback
         *
         * @example wavesurfer.playPause();
         * @return {Promise} Result of the backend play or pause method
         */

      }, {
        key: "playPause",
        value: function playPause() {
          return this.backend.isPaused() ? this.play() : this.pause();
        }
        /**
         * Get the current playback state
         *
         * @example const isPlaying = wavesurfer.isPlaying();
         * @return {boolean} False if paused, true if playing
         */

      }, {
        key: "isPlaying",
        value: function isPlaying() {
          return !this.backend.isPaused();
        }
        /**
         * Skip backward
         *
         * @param {?number} seconds Amount to skip back, if not specified `skipLength`
         * is used
         * @example wavesurfer.skipBackward();
         */

      }, {
        key: "skipBackward",
        value: function skipBackward(seconds) {
          this.skip(-seconds || -this.params.skipLength);
        }
        /**
         * Skip forward
         *
         * @param {?number} seconds Amount to skip back, if not specified `skipLength`
         * is used
         * @example wavesurfer.skipForward();
         */

      }, {
        key: "skipForward",
        value: function skipForward(seconds) {
          this.skip(seconds || this.params.skipLength);
        }
        /**
         * Skip a number of seconds from the current position (use a negative value
         * to go backwards).
         *
         * @param {number} offset Amount to skip back or forwards
         * @example
         * // go back 2 seconds
         * wavesurfer.skip(-2);
         */

      }, {
        key: "skip",
        value: function skip(offset) {
          var duration = this.getDuration() || 1;
          var position = this.getCurrentTime() || 0;
          position = Math.max(0, Math.min(duration, position + (offset || 0)));
          this.seekAndCenter(position / duration);
        }
        /**
         * Seeks to a position and centers the view
         *
         * @param {number} progress Between 0 (=beginning) and 1 (=end)
         * @example
         * // seek and go to the middle of the audio
         * wavesurfer.seekTo(0.5);
         */

      }, {
        key: "seekAndCenter",
        value: function seekAndCenter(progress) {
          this.seekTo(progress);
          this.drawer.recenter(progress);
        }
        /**
         * Seeks to a position
         *
         * @param {number} progress Between 0 (=beginning) and 1 (=end)
         * @emits WaveSurfer#interaction
         * @emits WaveSurfer#seek
         * @example
         * // seek to the middle of the audio
         * wavesurfer.seekTo(0.5);
         */

      }, {
        key: "seekTo",
        value: function seekTo(progress) {
          var _this8 = this;

          // return an error if progress is not a number between 0 and 1
          if (typeof progress !== 'number' || !isFinite(progress) || progress < 0 || progress > 1) {
            throw new Error('Error calling wavesurfer.seekTo, parameter must be a number between 0 and 1!');
          }

          this.fireEvent('interaction', function () {
            return _this8.seekTo(progress);
          });
          var isWebAudioBackend = this.params.backend === 'WebAudio';
          var paused = this.backend.isPaused();

          if (isWebAudioBackend && !paused) {
            this.backend.pause();
          } // avoid small scrolls while paused seeking


          var oldScrollParent = this.params.scrollParent;
          this.params.scrollParent = false;
          this.backend.seekTo(progress * this.getDuration());
          this.drawer.progress(progress);

          if (isWebAudioBackend && !paused) {
            this.backend.play();
          }

          this.params.scrollParent = oldScrollParent;
          this.fireEvent('seek', progress);
        }
        /**
         * Stops and goes to the beginning.
         *
         * @example wavesurfer.stop();
         */

      }, {
        key: "stop",
        value: function stop() {
          this.pause();
          this.seekTo(0);
          this.drawer.progress(0);
        }
        /**
         * Sets the ID of the audio device to use for output and returns a Promise.
         *
         * @param {string} deviceId String value representing underlying output
         * device
         * @returns {Promise} `Promise` that resolves to `undefined` when there are
         * no errors detected.
         */

      }, {
        key: "setSinkId",
        value: function setSinkId(deviceId) {
          return this.backend.setSinkId(deviceId);
        }
        /**
         * Set the playback volume.
         *
         * @param {number} newVolume A value between 0 and 1, 0 being no
         * volume and 1 being full volume.
         * @emits WaveSurfer#volume
         */

      }, {
        key: "setVolume",
        value: function setVolume(newVolume) {
          this.backend.setVolume(newVolume);
          this.fireEvent('volume', newVolume);
        }
        /**
         * Get the playback volume.
         *
         * @return {number} A value between 0 and 1, 0 being no
         * volume and 1 being full volume.
         */

      }, {
        key: "getVolume",
        value: function getVolume() {
          return this.backend.getVolume();
        }
        /**
         * Set the playback rate.
         *
         * @param {number} rate A positive number. E.g. 0.5 means half the normal
         * speed, 2 means double speed and so on.
         * @example wavesurfer.setPlaybackRate(2);
         */

      }, {
        key: "setPlaybackRate",
        value: function setPlaybackRate(rate) {
          this.backend.setPlaybackRate(rate);
        }
        /**
         * Get the playback rate.
         *
         * @return {number} The current playback rate.
         */

      }, {
        key: "getPlaybackRate",
        value: function getPlaybackRate() {
          return this.backend.getPlaybackRate();
        }
        /**
         * Toggle the volume on and off. If not currently muted it will save the
         * current volume value and turn the volume off. If currently muted then it
         * will restore the volume to the saved value, and then rest the saved
         * value.
         *
         * @example wavesurfer.toggleMute();
         */

      }, {
        key: "toggleMute",
        value: function toggleMute() {
          this.setMute(!this.isMuted);
        }
        /**
         * Enable or disable muted audio
         *
         * @param {boolean} mute Specify `true` to mute audio.
         * @emits WaveSurfer#volume
         * @emits WaveSurfer#mute
         * @example
         * // unmute
         * wavesurfer.setMute(false);
         * console.log(wavesurfer.getMute()) // logs false
         */

      }, {
        key: "setMute",
        value: function setMute(mute) {
          // ignore all muting requests if the audio is already in that state
          if (mute === this.isMuted) {
            this.fireEvent('mute', this.isMuted);
            return;
          }

          if (this.backend.setMute) {
            // Backends such as the MediaElement backend have their own handling
            // of mute, let them handle it.
            this.backend.setMute(mute);
            this.isMuted = mute;
          } else {
            if (mute) {
              // If currently not muted then save current volume,
              // turn off the volume and update the mute properties
              this.savedVolume = this.backend.getVolume();
              this.backend.setVolume(0);
              this.isMuted = true;
              this.fireEvent('volume', 0);
            } else {
              // If currently muted then restore to the saved volume
              // and update the mute properties
              this.backend.setVolume(this.savedVolume);
              this.isMuted = false;
              this.fireEvent('volume', this.savedVolume);
            }
          }

          this.fireEvent('mute', this.isMuted);
        }
        /**
         * Get the current mute status.
         *
         * @example const isMuted = wavesurfer.getMute();
         * @return {boolean} Current mute status
         */

      }, {
        key: "getMute",
        value: function getMute() {
          return this.isMuted;
        }
        /**
         * Get the list of current set filters as an array.
         *
         * Filters must be set with setFilters method first
         *
         * @return {array} List of enabled filters
         */

      }, {
        key: "getFilters",
        value: function getFilters() {
          return this.backend.filters || [];
        }
        /**
         * Toggles `scrollParent` and redraws
         *
         * @example wavesurfer.toggleScroll();
         */

      }, {
        key: "toggleScroll",
        value: function toggleScroll() {
          this.params.scrollParent = !this.params.scrollParent;
          this.drawBuffer();
        }
        /**
         * Toggle mouse interaction
         *
         * @example wavesurfer.toggleInteraction();
         */

      }, {
        key: "toggleInteraction",
        value: function toggleInteraction() {
          this.params.interact = !this.params.interact;
        }
        /**
         * Get the fill color of the waveform after the cursor.
         *
         * @return {string} A CSS color string.
         */

      }, {
        key: "getWaveColor",
        value: function getWaveColor() {
          return this.params.waveColor;
        }
        /**
         * Set the fill color of the waveform after the cursor.
         *
         * @param {string} color A CSS color string.
         * @example wavesurfer.setWaveColor('#ddd');
         */

      }, {
        key: "setWaveColor",
        value: function setWaveColor(color) {
          this.params.waveColor = color;
          this.drawBuffer();
        }
        /**
         * Get the fill color of the waveform behind the cursor.
         *
         * @return {string} A CSS color string.
         */

      }, {
        key: "getProgressColor",
        value: function getProgressColor() {
          return this.params.progressColor;
        }
        /**
         * Set the fill color of the waveform behind the cursor.
         *
         * @param {string} color A CSS color string.
         * @example wavesurfer.setProgressColor('#400');
         */

      }, {
        key: "setProgressColor",
        value: function setProgressColor(color) {
          this.params.progressColor = color;
          this.drawBuffer();
        }
        /**
         * Get the background color of the waveform container.
         *
         * @return {string} A CSS color string.
         */

      }, {
        key: "getBackgroundColor",
        value: function getBackgroundColor() {
          return this.params.backgroundColor;
        }
        /**
         * Set the background color of the waveform container.
         *
         * @param {string} color A CSS color string.
         * @example wavesurfer.setBackgroundColor('#FF00FF');
         */

      }, {
        key: "setBackgroundColor",
        value: function setBackgroundColor(color) {
          this.params.backgroundColor = color;
          util.style(this.container, {
            background: this.params.backgroundColor
          });
        }
        /**
         * Get the fill color of the cursor indicating the playhead
         * position.
         *
         * @return {string} A CSS color string.
         */

      }, {
        key: "getCursorColor",
        value: function getCursorColor() {
          return this.params.cursorColor;
        }
        /**
         * Set the fill color of the cursor indicating the playhead
         * position.
         *
         * @param {string} color A CSS color string.
         * @example wavesurfer.setCursorColor('#222');
         */

      }, {
        key: "setCursorColor",
        value: function setCursorColor(color) {
          this.params.cursorColor = color;
          this.drawer.updateCursor();
        }
        /**
         * Get the height of the waveform.
         *
         * @return {number} Height measured in pixels.
         */

      }, {
        key: "getHeight",
        value: function getHeight() {
          return this.params.height;
        }
        /**
         * Set the height of the waveform.
         *
         * @param {number} height Height measured in pixels.
         * @example wavesurfer.setHeight(200);
         */

      }, {
        key: "setHeight",
        value: function setHeight(height) {
          this.params.height = height;
          this.drawer.setHeight(height * this.params.pixelRatio);
          this.drawBuffer();
        }
        /**
         * Hide channels from being drawn on the waveform if splitting channels.
         *
         * For example, if we want to draw only the peaks for the right stereo channel:
         *
         * const wavesurfer = new WaveSurfer.create({...splitChannels: true});
         * wavesurfer.load('stereo_audio.mp3');
         *
         * wavesurfer.setFilteredChannel([0]); <-- hide left channel peaks.
         *
         * @param {array} channelIndices Channels to be filtered out from drawing.
         * @version 4.0.0
         */

      }, {
        key: "setFilteredChannels",
        value: function setFilteredChannels(channelIndices) {
          this.params.splitChannelsOptions.filterChannels = channelIndices;
          this.drawBuffer();
        }
        /**
         * Get the correct peaks for current wave view-port and render wave
         *
         * @private
         * @emits WaveSurfer#redraw
         */

      }, {
        key: "drawBuffer",
        value: function drawBuffer() {
          var nominalWidth = Math.round(this.getDuration() * this.params.minPxPerSec * this.params.pixelRatio);
          var parentWidth = this.drawer.getWidth();
          var width = nominalWidth; // always start at 0 after zooming for scrolling : issue redraw left part

          var start = 0;
          var end = Math.max(start + parentWidth, width); // Fill container

          if (this.params.fillParent && (!this.params.scrollParent || nominalWidth < parentWidth)) {
            width = parentWidth;
            start = 0;
            end = width;
          }

          var peaks;

          if (this.params.partialRender) {
            var newRanges = this.peakCache.addRangeToPeakCache(width, start, end);
            var i;

            for (i = 0; i < newRanges.length; i++) {
              peaks = this.backend.getPeaks(width, newRanges[i][0], newRanges[i][1]);
              this.drawer.drawPeaks(peaks, width, newRanges[i][0], newRanges[i][1]);
            }
          } else {
            peaks = this.backend.getPeaks(width, start, end);
            this.drawer.drawPeaks(peaks, width, start, end);
          }

          this.fireEvent('redraw', peaks, width);
        }
        /**
         * Horizontally zooms the waveform in and out. It also changes the parameter
         * `minPxPerSec` and enables the `scrollParent` option. Calling the function
         * with a falsey parameter will reset the zoom state.
         *
         * @param {?number} pxPerSec Number of horizontal pixels per second of
         * audio, if none is set the waveform returns to unzoomed state
         * @emits WaveSurfer#zoom
         * @example wavesurfer.zoom(20);
         */

      }, {
        key: "zoom",
        value: function zoom(pxPerSec) {
          if (!pxPerSec) {
            this.params.minPxPerSec = this.defaultParams.minPxPerSec;
            this.params.scrollParent = false;
          } else {
            this.params.minPxPerSec = pxPerSec;
            this.params.scrollParent = true;
          }

          this.drawBuffer();
          this.drawer.progress(this.backend.getPlayedPercents());
          this.drawer.recenter(this.getCurrentTime() / this.getDuration());
          this.fireEvent('zoom', pxPerSec);
        }
        /**
         * Decode buffer and load
         *
         * @private
         * @param {ArrayBuffer} arraybuffer Buffer to process
         */

      }, {
        key: "loadArrayBuffer",
        value: function loadArrayBuffer(arraybuffer) {
          var _this9 = this;

          this.decodeArrayBuffer(arraybuffer, function (data) {
            if (!_this9.isDestroyed) {
              _this9.loadDecodedBuffer(data);
            }
          });
        }
        /**
         * Directly load an externally decoded AudioBuffer
         *
         * @private
         * @param {AudioBuffer} buffer Buffer to process
         * @emits WaveSurfer#ready
         */

      }, {
        key: "loadDecodedBuffer",
        value: function loadDecodedBuffer(buffer) {
          this.backend.load(buffer);
          this.drawBuffer();
          this.isReady = true;
          this.fireEvent('ready');
        }
        /**
         * Loads audio data from a Blob or File object
         *
         * @param {Blob|File} blob Audio data
         * @example
         */

      }, {
        key: "loadBlob",
        value: function loadBlob(blob) {
          var _this10 = this;

          // Create file reader
          var reader = new FileReader();
          reader.addEventListener('progress', function (e) {
            return _this10.onProgress(e);
          });
          reader.addEventListener('load', function (e) {
            return _this10.loadArrayBuffer(e.target.result);
          });
          reader.addEventListener('error', function () {
            return _this10.fireEvent('error', 'Error reading file');
          });
          reader.readAsArrayBuffer(blob);
          this.empty();
        }
        /**
         * Loads audio and re-renders the waveform.
         *
         * @param {string|HTMLMediaElement} url The url of the audio file or the
         * audio element with the audio
         * @param {number[]|Number.<Array[]>} peaks Wavesurfer does not have to decode
         * the audio to render the waveform if this is specified
         * @param {?string} preload (Use with backend `MediaElement` and `MediaElementWebAudio`)
         * `'none'|'metadata'|'auto'` Preload attribute for the media element
         * @param {?number} duration The duration of the audio. This is used to
         * render the peaks data in the correct size for the audio duration (as
         * befits the current `minPxPerSec` and zoom value) without having to decode
         * the audio.
         * @returns {void}
         * @throws Will throw an error if the `url` argument is empty.
         * @example
         * // uses fetch or media element to load file (depending on backend)
         * wavesurfer.load('http://example.com/demo.wav');
         *
         * // setting preload attribute with media element backend and supplying
         * // peaks
         * wavesurfer.load(
         *   'http://example.com/demo.wav',
         *   [0.0218, 0.0183, 0.0165, 0.0198, 0.2137, 0.2888],
         *   true
         * );
         */

      }, {
        key: "load",
        value: function load(url, peaks, preload, duration) {
          if (!url) {
            throw new Error('url parameter cannot be empty');
          }

          this.empty();

          if (preload) {
            // check whether the preload attribute will be usable and if not log
            // a warning listing the reasons why not and nullify the variable
            var preloadIgnoreReasons = {
              "Preload is not 'auto', 'none' or 'metadata'": ['auto', 'metadata', 'none'].indexOf(preload) === -1,
              'Peaks are not provided': !peaks,
              "Backend is not of type 'MediaElement' or 'MediaElementWebAudio'": ['MediaElement', 'MediaElementWebAudio'].indexOf(this.params.backend) === -1,
              'Url is not of type string': typeof url !== 'string'
            };
            var activeReasons = Object.keys(preloadIgnoreReasons).filter(function (reason) {
              return preloadIgnoreReasons[reason];
            });

            if (activeReasons.length) {
              // eslint-disable-next-line no-console
              console.warn('Preload parameter of wavesurfer.load will be ignored because:\n\t- ' + activeReasons.join('\n\t- ')); // stop invalid values from being used

              preload = null;
            }
          } // loadBuffer(url, peaks, duration) requires that url is a string
          // but users can pass in a HTMLMediaElement to WaveSurfer


          if (this.params.backend === 'WebAudio' && url instanceof HTMLMediaElement) {
            url = url.src;
          }

          switch (this.params.backend) {
            case 'WebAudio':
              return this.loadBuffer(url, peaks, duration);

            case 'MediaElement':
            case 'MediaElementWebAudio':
              return this.loadMediaElement(url, peaks, preload, duration);
          }
        }
        /**
         * Loads audio using Web Audio buffer backend.
         *
         * @private
         * @emits WaveSurfer#waveform-ready
         * @param {string} url URL of audio file
         * @param {number[]|Number.<Array[]>} peaks Peaks data
         * @param {?number} duration Optional duration of audio file
         * @returns {void}
         */

      }, {
        key: "loadBuffer",
        value: function loadBuffer(url, peaks, duration) {
          var _this11 = this;

          var load = function load(action) {
            if (action) {
              _this11.tmpEvents.push(_this11.once('ready', action));
            }

            return _this11.getArrayBuffer(url, function (data) {
              return _this11.loadArrayBuffer(data);
            });
          };

          if (peaks) {
            this.backend.setPeaks(peaks, duration);
            this.drawBuffer();
            this.fireEvent('waveform-ready');
            this.tmpEvents.push(this.once('interaction', load));
          } else {
            return load();
          }
        }
        /**
         * Either create a media element, or load an existing media element.
         *
         * @private
         * @emits WaveSurfer#waveform-ready
         * @param {string|HTMLMediaElement} urlOrElt Either a path to a media file, or an
         * existing HTML5 Audio/Video Element
         * @param {number[]|Number.<Array[]>} peaks Array of peaks. Required to bypass web audio
         * dependency
         * @param {?boolean} preload Set to true if the preload attribute of the
         * audio element should be enabled
         * @param {?number} duration Optional duration of audio file
         */

      }, {
        key: "loadMediaElement",
        value: function loadMediaElement(urlOrElt, peaks, preload, duration) {
          var _this12 = this;

          var url = urlOrElt;

          if (typeof urlOrElt === 'string') {
            this.backend.load(url, this.mediaContainer, peaks, preload);
          } else {
            var elt = urlOrElt;
            this.backend.loadElt(elt, peaks); // If peaks are not provided,
            // url = element.src so we can get peaks with web audio

            url = elt.src;
          }

          this.tmpEvents.push(this.backend.once('canplay', function () {
            // ignore when backend was already destroyed
            if (!_this12.backend.destroyed) {
              _this12.drawBuffer();

              _this12.isReady = true;

              _this12.fireEvent('ready');
            }
          }), this.backend.once('error', function (err) {
            return _this12.fireEvent('error', err);
          })); // If peaks are provided, render them and fire the `waveform-ready` event.

          if (peaks) {
            this.backend.setPeaks(peaks, duration);
            this.drawBuffer();
            this.fireEvent('waveform-ready');
          } // If no pre-decoded peaks are provided, or are provided with
          // forceDecode flag, attempt to download the audio file and decode it
          // with Web Audio.


          if ((!peaks || this.params.forceDecode) && this.backend.supportsWebAudio()) {
            this.getArrayBuffer(url, function (arraybuffer) {
              _this12.decodeArrayBuffer(arraybuffer, function (buffer) {
                _this12.backend.buffer = buffer;

                _this12.backend.setPeaks(null);

                _this12.drawBuffer();

                _this12.fireEvent('waveform-ready');
              });
            });
          }
        }
        /**
         * Decode an array buffer and pass data to a callback
         *
         * @private
         * @param {Object} arraybuffer The array buffer to decode
         * @param {function} callback The function to call on complete
         */

      }, {
        key: "decodeArrayBuffer",
        value: function decodeArrayBuffer(arraybuffer, callback) {
          var _this13 = this;

          if (!this.isDestroyed) {
            this.arraybuffer = arraybuffer;
            this.backend.decodeArrayBuffer(arraybuffer, function (data) {
              // Only use the decoded data if we haven't been destroyed or
              // another decode started in the meantime
              if (!_this13.isDestroyed && _this13.arraybuffer == arraybuffer) {
                callback(data);
                _this13.arraybuffer = null;
              }
            }, function () {
              return _this13.fireEvent('error', 'Error decoding audiobuffer');
            });
          }
        }
        /**
         * Load an array buffer using fetch and pass the result to a callback
         *
         * @param {string} url The URL of the file object
         * @param {function} callback The function to call on complete
         * @returns {util.fetchFile} fetch call
         * @private
         */

      }, {
        key: "getArrayBuffer",
        value: function getArrayBuffer(url, callback) {
          var _this14 = this;

          var options = Object.assign({
            url: url,
            responseType: 'arraybuffer'
          }, this.params.xhr);
          var request = util.fetchFile(options);
          this.currentRequest = request;
          this.tmpEvents.push(request.on('progress', function (e) {
            _this14.onProgress(e);
          }), request.on('success', function (data) {
            callback(data);
            _this14.currentRequest = null;
          }), request.on('error', function (e) {
            _this14.fireEvent('error', e);

            _this14.currentRequest = null;
          }));
          return request;
        }
        /**
         * Called while the audio file is loading
         *
         * @private
         * @param {Event} e Progress event
         * @emits WaveSurfer#loading
         */

      }, {
        key: "onProgress",
        value: function onProgress(e) {
          var percentComplete;

          if (e.lengthComputable) {
            percentComplete = e.loaded / e.total;
          } else {
            // Approximate progress with an asymptotic
            // function, and assume downloads in the 1-3 MB range.
            percentComplete = e.loaded / (e.loaded + 1000000);
          }

          this.fireEvent('loading', Math.round(percentComplete * 100), e.target);
        }
        /**
         * Exports PCM data into a JSON array and optionally opens in a new window
         * as valid JSON Blob instance.
         *
         * @param {number} length=1024 The scale in which to export the peaks
         * @param {number} accuracy=10000
         * @param {?boolean} noWindow Set to true to disable opening a new
         * window with the JSON
         * @param {number} start Start index
         * @param {number} end End index
         * @return {Promise} Promise that resolves with array of peaks
         */

      }, {
        key: "exportPCM",
        value: function exportPCM(length, accuracy, noWindow, start, end) {
          length = length || 1024;
          start = start || 0;
          accuracy = accuracy || 10000;
          noWindow = noWindow || false;
          var peaks = this.backend.getPeaks(length, start, end);
          var arr = [].map.call(peaks, function (val) {
            return Math.round(val * accuracy) / accuracy;
          });
          return new Promise(function (resolve, reject) {
            if (!noWindow) {
              var blobJSON = new Blob([JSON.stringify(arr)], {
                type: 'application/json;charset=utf-8'
              });
              var objURL = URL.createObjectURL(blobJSON);
              window.open(objURL);
              URL.revokeObjectURL(objURL);
            }

            resolve(arr);
          });
        }
        /**
         * Save waveform image as data URI.
         *
         * The default format is `'image/png'`. Other supported types are
         * `'image/jpeg'` and `'image/webp'`.
         *
         * @param {string} format='image/png' A string indicating the image format.
         * The default format type is `'image/png'`.
         * @param {number} quality=1 A number between 0 and 1 indicating the image
         * quality to use for image formats that use lossy compression such as
         * `'image/jpeg'`` and `'image/webp'`.
         * @param {string} type Image data type to return. Either 'dataURL' (default)
         * or 'blob'.
         * @return {string|string[]|Promise} When using `'dataURL'` type this returns
         * a single data URL or an array of data URLs, one for each canvas. When using
         * `'blob'` type this returns a `Promise` resolving with an array of `Blob`
         * instances, one for each canvas.
         */

      }, {
        key: "exportImage",
        value: function exportImage(format, quality, type) {
          if (!format) {
            format = 'image/png';
          }

          if (!quality) {
            quality = 1;
          }

          if (!type) {
            type = 'dataURL';
          }

          return this.drawer.getImage(format, quality, type);
        }
        /**
         * Cancel any fetch request currently in progress
         */

      }, {
        key: "cancelAjax",
        value: function cancelAjax() {
          if (this.currentRequest && this.currentRequest.controller) {
            // If the current request has a ProgressHandler, then its ReadableStream might need to be cancelled too
            // See: Wavesurfer issue #2042
            // See Firefox bug: https://bugzilla.mozilla.org/show_bug.cgi?id=1583815
            if (this.currentRequest._reader) {
              // Ignoring exceptions thrown by call to cancel()
              this.currentRequest._reader.cancel().catch(function (err) {});
            }

            this.currentRequest.controller.abort();
            this.currentRequest = null;
          }
        }
        /**
         * @private
         */

      }, {
        key: "clearTmpEvents",
        value: function clearTmpEvents() {
          this.tmpEvents.forEach(function (e) {
            return e.un();
          });
        }
        /**
         * Display empty waveform.
         */

      }, {
        key: "empty",
        value: function empty() {
          if (!this.backend.isPaused()) {
            this.stop();
            this.backend.disconnectSource();
          }

          this.isReady = false;
          this.cancelAjax();
          this.clearTmpEvents(); // empty drawer

          this.drawer.progress(0);
          this.drawer.setWidth(0);
          this.drawer.drawPeaks({
            length: this.drawer.getWidth()
          }, 0);
        }
        /**
         * Remove events, elements and disconnect WebAudio nodes.
         *
         * @emits WaveSurfer#destroy
         */

      }, {
        key: "destroy",
        value: function destroy() {
          this.destroyAllPlugins();
          this.fireEvent('destroy');
          this.cancelAjax();
          this.clearTmpEvents();
          this.unAll();

          if (this.params.responsive !== false) {
            window.removeEventListener('resize', this._onResize, true);
            window.removeEventListener('orientationchange', this._onResize, true);
          }

          if (this.backend) {
            this.backend.destroy(); // clears memory usage

            this.backend = null;
          }

          if (this.drawer) {
            this.drawer.destroy();
          }

          this.isDestroyed = true;
          this.isReady = false;
          this.arraybuffer = null;
        }
      }], [{
        key: "create",
        value:
        /** @private */

        /** @private */

        /**
         * Instantiate this class, call its `init` function and returns it
         *
         * @param {WavesurferParams} params The wavesurfer parameters
         * @return {Object} WaveSurfer instance
         * @example const wavesurfer = WaveSurfer.create(params);
         */
        function create(params) {
          var wavesurfer = new WaveSurfer(params);
          return wavesurfer.init();
        }
        /**
         * The library version number is available as a static property of the
         * WaveSurfer class
         *
         * @type {String}
         * @example
         * console.log('Using wavesurfer.js ' + WaveSurfer.VERSION);
         */

      }]);

      return WaveSurfer;
    }(util.Observer);

    exports.default = WaveSurfer;
    WaveSurfer.VERSION = "5.2.0";
    WaveSurfer.util = util;
    module.exports = exports.default;

    /***/ }),

    /***/ "./src/webaudio.js":
    /*!*************************!*\
      !*** ./src/webaudio.js ***!
      \*************************/
    /***/ ((module, exports, __webpack_require__) => {


    function _typeof(obj) { "@babel/helpers - typeof"; if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    Object.defineProperty(exports, "__esModule", ({
      value: true
    }));
    exports.default = void 0;

    var util = _interopRequireWildcard(__webpack_require__(/*! ./util */ "./src/util/index.js"));

    function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function _getRequireWildcardCache(nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

    function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || _typeof(obj) !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

    function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

    function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

    function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

    function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

    // using constants to prevent someone writing the string wrong
    var PLAYING = 'playing';
    var PAUSED = 'paused';
    var FINISHED = 'finished';
    /**
     * WebAudio backend
     *
     * @extends {Observer}
     */

    var WebAudio = /*#__PURE__*/function (_util$Observer) {
      _inherits(WebAudio, _util$Observer);

      var _super = _createSuper(WebAudio);

      /**
       * Construct the backend
       *
       * @param {WavesurferParams} params Wavesurfer parameters
       */
      function WebAudio(params) {
        var _this$stateBehaviors, _this$states;

        var _this;

        _classCallCheck(this, WebAudio);

        _this = _super.call(this);
        /** @private */

        _this.audioContext = null;
        _this.offlineAudioContext = null;
        _this.stateBehaviors = (_this$stateBehaviors = {}, _defineProperty(_this$stateBehaviors, PLAYING, {
          init: function init() {
            this.addOnAudioProcess();
          },
          getPlayedPercents: function getPlayedPercents() {
            var duration = this.getDuration();
            return this.getCurrentTime() / duration || 0;
          },
          getCurrentTime: function getCurrentTime() {
            return this.startPosition + this.getPlayedTime();
          }
        }), _defineProperty(_this$stateBehaviors, PAUSED, {
          init: function init() {
            this.removeOnAudioProcess();
          },
          getPlayedPercents: function getPlayedPercents() {
            var duration = this.getDuration();
            return this.getCurrentTime() / duration || 0;
          },
          getCurrentTime: function getCurrentTime() {
            return this.startPosition;
          }
        }), _defineProperty(_this$stateBehaviors, FINISHED, {
          init: function init() {
            this.removeOnAudioProcess();
            this.fireEvent('finish');
          },
          getPlayedPercents: function getPlayedPercents() {
            return 1;
          },
          getCurrentTime: function getCurrentTime() {
            return this.getDuration();
          }
        }), _this$stateBehaviors);
        _this.params = params;
        /** ac: Audio Context instance */

        _this.ac = params.audioContext || (_this.supportsWebAudio() ? _this.getAudioContext() : {});
        /**@private */

        _this.lastPlay = _this.ac.currentTime;
        /** @private */

        _this.startPosition = 0;
        /** @private */

        _this.scheduledPause = null;
        /** @private */

        _this.states = (_this$states = {}, _defineProperty(_this$states, PLAYING, Object.create(_this.stateBehaviors[PLAYING])), _defineProperty(_this$states, PAUSED, Object.create(_this.stateBehaviors[PAUSED])), _defineProperty(_this$states, FINISHED, Object.create(_this.stateBehaviors[FINISHED])), _this$states);
        /** @private */

        _this.buffer = null;
        /** @private */

        _this.filters = [];
        /** gainNode: allows to control audio volume */

        _this.gainNode = null;
        /** @private */

        _this.mergedPeaks = null;
        /** @private */

        _this.offlineAc = null;
        /** @private */

        _this.peaks = null;
        /** @private */

        _this.playbackRate = 1;
        /** analyser: provides audio analysis information */

        _this.analyser = null;
        /** scriptNode: allows processing audio */

        _this.scriptNode = null;
        /** @private */

        _this.source = null;
        /** @private */

        _this.splitPeaks = [];
        /** @private */

        _this.state = null;
        /** @private */

        _this.explicitDuration = params.duration;
        /**
         * Boolean indicating if the backend was destroyed.
         */

        _this.destroyed = false;
        return _this;
      }
      /**
       * Initialise the backend, called in `wavesurfer.createBackend()`
       */


      _createClass(WebAudio, [{
        key: "supportsWebAudio",
        value:
        /** scriptBufferSize: size of the processing buffer */

        /** audioContext: allows to process audio with WebAudio API */

        /** @private */

        /** @private */

        /**
         * Does the browser support this backend
         *
         * @return {boolean} Whether or not this browser supports this backend
         */
        function supportsWebAudio() {
          return !!(window.AudioContext || window.webkitAudioContext);
        }
        /**
         * Get the audio context used by this backend or create one
         *
         * @return {AudioContext} Existing audio context, or creates a new one
         */

      }, {
        key: "getAudioContext",
        value: function getAudioContext() {
          if (!window.WaveSurferAudioContext) {
            window.WaveSurferAudioContext = new (window.AudioContext || window.webkitAudioContext)();
          }

          return window.WaveSurferAudioContext;
        }
        /**
         * Get the offline audio context used by this backend or create one
         *
         * @param {number} sampleRate The sample rate to use
         * @return {OfflineAudioContext} Existing offline audio context, or creates
         * a new one
         */

      }, {
        key: "getOfflineAudioContext",
        value: function getOfflineAudioContext(sampleRate) {
          if (!window.WaveSurferOfflineAudioContext) {
            window.WaveSurferOfflineAudioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 2, sampleRate);
          }

          return window.WaveSurferOfflineAudioContext;
        }
      }, {
        key: "init",
        value: function init() {
          this.createVolumeNode();
          this.createScriptNode();
          this.createAnalyserNode();
          this.setState(PAUSED);
          this.setPlaybackRate(this.params.audioRate);
          this.setLength(0);
        }
        /** @private */

      }, {
        key: "disconnectFilters",
        value: function disconnectFilters() {
          if (this.filters) {
            this.filters.forEach(function (filter) {
              filter && filter.disconnect();
            });
            this.filters = null; // Reconnect direct path

            this.analyser.connect(this.gainNode);
          }
        }
        /**
         * @private
         *
         * @param {string} state The new state
         */

      }, {
        key: "setState",
        value: function setState(state) {
          if (this.state !== this.states[state]) {
            this.state = this.states[state];
            this.state.init.call(this);
          }
        }
        /**
         * Unpacked `setFilters()`
         *
         * @param {...AudioNode} filters One or more filters to set
         */

      }, {
        key: "setFilter",
        value: function setFilter() {
          for (var _len = arguments.length, filters = new Array(_len), _key = 0; _key < _len; _key++) {
            filters[_key] = arguments[_key];
          }

          this.setFilters(filters);
        }
        /**
         * Insert custom Web Audio nodes into the graph
         *
         * @param {AudioNode[]} filters Packed filters array
         * @example
         * const lowpass = wavesurfer.backend.ac.createBiquadFilter();
         * wavesurfer.backend.setFilter(lowpass);
         */

      }, {
        key: "setFilters",
        value: function setFilters(filters) {
          // Remove existing filters
          this.disconnectFilters(); // Insert filters if filter array not empty

          if (filters && filters.length) {
            this.filters = filters; // Disconnect direct path before inserting filters

            this.analyser.disconnect(); // Connect each filter in turn

            filters.reduce(function (prev, curr) {
              prev.connect(curr);
              return curr;
            }, this.analyser).connect(this.gainNode);
          }
        }
        /** Create ScriptProcessorNode to process audio */

      }, {
        key: "createScriptNode",
        value: function createScriptNode() {
          if (this.params.audioScriptProcessor) {
            this.scriptNode = this.params.audioScriptProcessor;
          } else {
            if (this.ac.createScriptProcessor) {
              this.scriptNode = this.ac.createScriptProcessor(WebAudio.scriptBufferSize);
            } else {
              this.scriptNode = this.ac.createJavaScriptNode(WebAudio.scriptBufferSize);
            }
          }

          this.scriptNode.connect(this.ac.destination);
        }
        /** @private */

      }, {
        key: "addOnAudioProcess",
        value: function addOnAudioProcess() {
          var _this2 = this;

          this.scriptNode.onaudioprocess = function () {
            var time = _this2.getCurrentTime();

            if (time >= _this2.getDuration()) {
              _this2.setState(FINISHED);

              _this2.fireEvent('pause');
            } else if (time >= _this2.scheduledPause) {
              _this2.pause();
            } else if (_this2.state === _this2.states[PLAYING]) {
              _this2.fireEvent('audioprocess', time);
            }
          };
        }
        /** @private */

      }, {
        key: "removeOnAudioProcess",
        value: function removeOnAudioProcess() {
          this.scriptNode.onaudioprocess = null;
        }
        /** Create analyser node to perform audio analysis */

      }, {
        key: "createAnalyserNode",
        value: function createAnalyserNode() {
          this.analyser = this.ac.createAnalyser();
          this.analyser.connect(this.gainNode);
        }
        /**
         * Create the gain node needed to control the playback volume.
         *
         */

      }, {
        key: "createVolumeNode",
        value: function createVolumeNode() {
          // Create gain node using the AudioContext
          if (this.ac.createGain) {
            this.gainNode = this.ac.createGain();
          } else {
            this.gainNode = this.ac.createGainNode();
          } // Add the gain node to the graph


          this.gainNode.connect(this.ac.destination);
        }
        /**
         * Set the sink id for the media player
         *
         * @param {string} deviceId String value representing audio device id.
         * @returns {Promise} A Promise that resolves to `undefined` when there
         * are no errors.
         */

      }, {
        key: "setSinkId",
        value: function setSinkId(deviceId) {
          if (deviceId) {
            /**
             * The webaudio API doesn't currently support setting the device
             * output. Here we create an HTMLAudioElement, connect the
             * webaudio stream to that element and setSinkId there.
             */
            var audio = new window.Audio();

            if (!audio.setSinkId) {
              return Promise.reject(new Error('setSinkId is not supported in your browser'));
            }

            audio.autoplay = true;
            var dest = this.ac.createMediaStreamDestination();
            this.gainNode.disconnect();
            this.gainNode.connect(dest);
            audio.srcObject = dest.stream;
            return audio.setSinkId(deviceId);
          } else {
            return Promise.reject(new Error('Invalid deviceId: ' + deviceId));
          }
        }
        /**
         * Set the audio volume
         *
         * @param {number} value A floating point value between 0 and 1.
         */

      }, {
        key: "setVolume",
        value: function setVolume(value) {
          this.gainNode.gain.setValueAtTime(value, this.ac.currentTime);
        }
        /**
         * Get the current volume
         *
         * @return {number} value A floating point value between 0 and 1.
         */

      }, {
        key: "getVolume",
        value: function getVolume() {
          return this.gainNode.gain.value;
        }
        /**
         * Decode an array buffer and pass data to a callback
         *
         * @private
         * @param {ArrayBuffer} arraybuffer The array buffer to decode
         * @param {function} callback The function to call on complete.
         * @param {function} errback The function to call on error.
         */

      }, {
        key: "decodeArrayBuffer",
        value: function decodeArrayBuffer(arraybuffer, callback, errback) {
          if (!this.offlineAc) {
            this.offlineAc = this.getOfflineAudioContext(this.ac && this.ac.sampleRate ? this.ac.sampleRate : 44100);
          }

          if ('webkitAudioContext' in window) {
            // Safari: no support for Promise-based decodeAudioData enabled
            // Enable it in Safari using the Experimental Features > Modern WebAudio API option
            this.offlineAc.decodeAudioData(arraybuffer, function (data) {
              return callback(data);
            }, errback);
          } else {
            this.offlineAc.decodeAudioData(arraybuffer).then(function (data) {
              return callback(data);
            }).catch(function (err) {
              return errback(err);
            });
          }
        }
        /**
         * Set pre-decoded peaks
         *
         * @param {number[]|Number.<Array[]>} peaks Peaks data
         * @param {?number} duration Explicit duration
         */

      }, {
        key: "setPeaks",
        value: function setPeaks(peaks, duration) {
          if (duration != null) {
            this.explicitDuration = duration;
          }

          this.peaks = peaks;
        }
        /**
         * Set the rendered length (different from the length of the audio)
         *
         * @param {number} length The rendered length
         */

      }, {
        key: "setLength",
        value: function setLength(length) {
          // No resize, we can preserve the cached peaks.
          if (this.mergedPeaks && length == 2 * this.mergedPeaks.length - 1 + 2) {
            return;
          }

          this.splitPeaks = [];
          this.mergedPeaks = []; // Set the last element of the sparse array so the peak arrays are
          // appropriately sized for other calculations.

          var channels = this.buffer ? this.buffer.numberOfChannels : 1;
          var c;

          for (c = 0; c < channels; c++) {
            this.splitPeaks[c] = [];
            this.splitPeaks[c][2 * (length - 1)] = 0;
            this.splitPeaks[c][2 * (length - 1) + 1] = 0;
          }

          this.mergedPeaks[2 * (length - 1)] = 0;
          this.mergedPeaks[2 * (length - 1) + 1] = 0;
        }
        /**
         * Compute the max and min value of the waveform when broken into <length> subranges.
         *
         * @param {number} length How many subranges to break the waveform into.
         * @param {number} first First sample in the required range.
         * @param {number} last Last sample in the required range.
         * @return {number[]|Number.<Array[]>} Array of 2*<length> peaks or array of arrays of
         * peaks consisting of (max, min) values for each subrange.
         */

      }, {
        key: "getPeaks",
        value: function getPeaks(length, first, last) {
          if (this.peaks) {
            return this.peaks;
          }

          if (!this.buffer) {
            return [];
          }

          first = first || 0;
          last = last || length - 1;
          this.setLength(length);

          if (!this.buffer) {
            return this.params.splitChannels ? this.splitPeaks : this.mergedPeaks;
          }
          /**
           * The following snippet fixes a buffering data issue on the Safari
           * browser which returned undefined It creates the missing buffer based
           * on 1 channel, 4096 samples and the sampleRate from the current
           * webaudio context 4096 samples seemed to be the best fit for rendering
           * will review this code once a stable version of Safari TP is out
           */


          if (!this.buffer.length) {
            var newBuffer = this.createBuffer(1, 4096, this.sampleRate);
            this.buffer = newBuffer.buffer;
          }

          var sampleSize = this.buffer.length / length;
          var sampleStep = ~~(sampleSize / 10) || 1;
          var channels = this.buffer.numberOfChannels;
          var c;

          for (c = 0; c < channels; c++) {
            var peaks = this.splitPeaks[c];
            var chan = this.buffer.getChannelData(c);
            var i = void 0;

            for (i = first; i <= last; i++) {
              var start = ~~(i * sampleSize);
              var end = ~~(start + sampleSize);
              /**
               * Initialize the max and min to the first sample of this
               * subrange, so that even if the samples are entirely
               * on one side of zero, we still return the true max and
               * min values in the subrange.
               */

              var min = chan[start];
              var max = min;
              var j = void 0;

              for (j = start; j < end; j += sampleStep) {
                var value = chan[j];

                if (value > max) {
                  max = value;
                }

                if (value < min) {
                  min = value;
                }
              }

              peaks[2 * i] = max;
              peaks[2 * i + 1] = min;

              if (c == 0 || max > this.mergedPeaks[2 * i]) {
                this.mergedPeaks[2 * i] = max;
              }

              if (c == 0 || min < this.mergedPeaks[2 * i + 1]) {
                this.mergedPeaks[2 * i + 1] = min;
              }
            }
          }

          return this.params.splitChannels ? this.splitPeaks : this.mergedPeaks;
        }
        /**
         * Get the position from 0 to 1
         *
         * @return {number} Position
         */

      }, {
        key: "getPlayedPercents",
        value: function getPlayedPercents() {
          return this.state.getPlayedPercents.call(this);
        }
        /** @private */

      }, {
        key: "disconnectSource",
        value: function disconnectSource() {
          if (this.source) {
            this.source.disconnect();
          }
        }
        /**
         * Destroy all references with WebAudio, disconnecting audio nodes and closing Audio Context
         */

      }, {
        key: "destroyWebAudio",
        value: function destroyWebAudio() {
          this.disconnectFilters();
          this.disconnectSource();
          this.gainNode.disconnect();
          this.scriptNode.disconnect();
          this.analyser.disconnect(); // close the audioContext if closeAudioContext option is set to true

          if (this.params.closeAudioContext) {
            // check if browser supports AudioContext.close()
            if (typeof this.ac.close === 'function' && this.ac.state != 'closed') {
              this.ac.close();
            } // clear the reference to the audiocontext


            this.ac = null; // clear the actual audiocontext, either passed as param or the
            // global singleton

            if (!this.params.audioContext) {
              window.WaveSurferAudioContext = null;
            } else {
              this.params.audioContext = null;
            } // clear the offlineAudioContext


            window.WaveSurferOfflineAudioContext = null;
          }
        }
        /**
         * This is called when wavesurfer is destroyed
         */

      }, {
        key: "destroy",
        value: function destroy() {
          if (!this.isPaused()) {
            this.pause();
          }

          this.unAll();
          this.buffer = null;
          this.destroyed = true;
          this.destroyWebAudio();
        }
        /**
         * Loaded a decoded audio buffer
         *
         * @param {Object} buffer Decoded audio buffer to load
         */

      }, {
        key: "load",
        value: function load(buffer) {
          this.startPosition = 0;
          this.lastPlay = this.ac.currentTime;
          this.buffer = buffer;
          this.createSource();
        }
        /** @private */

      }, {
        key: "createSource",
        value: function createSource() {
          this.disconnectSource();
          this.source = this.ac.createBufferSource(); // adjust for old browsers

          this.source.start = this.source.start || this.source.noteGrainOn;
          this.source.stop = this.source.stop || this.source.noteOff;
          this.setPlaybackRate(this.playbackRate);
          this.source.buffer = this.buffer;
          this.source.connect(this.analyser);
        }
        /**
         * @private
         *
         * some browsers require an explicit call to #resume before they will play back audio
         */

      }, {
        key: "resumeAudioContext",
        value: function resumeAudioContext() {
          if (this.ac.state == 'suspended') {
            this.ac.resume && this.ac.resume();
          }
        }
        /**
         * Used by `wavesurfer.isPlaying()` and `wavesurfer.playPause()`
         *
         * @return {boolean} Whether or not this backend is currently paused
         */

      }, {
        key: "isPaused",
        value: function isPaused() {
          return this.state !== this.states[PLAYING];
        }
        /**
         * Used by `wavesurfer.getDuration()`
         *
         * @return {number} Duration of loaded buffer
         */

      }, {
        key: "getDuration",
        value: function getDuration() {
          if (this.explicitDuration) {
            return this.explicitDuration;
          }

          if (!this.buffer) {
            return 0;
          }

          return this.buffer.duration;
        }
        /**
         * Used by `wavesurfer.seekTo()`
         *
         * @param {number} start Position to start at in seconds
         * @param {number} end Position to end at in seconds
         * @return {{start: number, end: number}} Object containing start and end
         * positions
         */

      }, {
        key: "seekTo",
        value: function seekTo(start, end) {
          if (!this.buffer) {
            return;
          }

          this.scheduledPause = null;

          if (start == null) {
            start = this.getCurrentTime();

            if (start >= this.getDuration()) {
              start = 0;
            }
          }

          if (end == null) {
            end = this.getDuration();
          }

          this.startPosition = start;
          this.lastPlay = this.ac.currentTime;

          if (this.state === this.states[FINISHED]) {
            this.setState(PAUSED);
          }

          return {
            start: start,
            end: end
          };
        }
        /**
         * Get the playback position in seconds
         *
         * @return {number} The playback position in seconds
         */

      }, {
        key: "getPlayedTime",
        value: function getPlayedTime() {
          return (this.ac.currentTime - this.lastPlay) * this.playbackRate;
        }
        /**
         * Plays the loaded audio region.
         *
         * @param {number} start Start offset in seconds, relative to the beginning
         * of a clip.
         * @param {number} end When to stop relative to the beginning of a clip.
         */

      }, {
        key: "play",
        value: function play(start, end) {
          if (!this.buffer) {
            return;
          } // need to re-create source on each playback


          this.createSource();
          var adjustedTime = this.seekTo(start, end);
          start = adjustedTime.start;
          end = adjustedTime.end;
          this.scheduledPause = end;
          this.source.start(0, start);
          this.resumeAudioContext();
          this.setState(PLAYING);
          this.fireEvent('play');
        }
        /**
         * Pauses the loaded audio.
         */

      }, {
        key: "pause",
        value: function pause() {
          this.scheduledPause = null;
          this.startPosition += this.getPlayedTime();

          try {
            this.source && this.source.stop(0);
          } catch (err) {// Calling stop can throw the following 2 errors:
            // - RangeError (The value specified for when is negative.)
            // - InvalidStateNode (The node has not been started by calling start().)
            // We can safely ignore both errors, because:
            // - The range is surely correct
            // - The node might not have been started yet, in which case we just want to carry on without causing any trouble.
          }

          this.setState(PAUSED);
          this.fireEvent('pause');
        }
        /**
         * Returns the current time in seconds relative to the audio-clip's
         * duration.
         *
         * @return {number} The current time in seconds
         */

      }, {
        key: "getCurrentTime",
        value: function getCurrentTime() {
          return this.state.getCurrentTime.call(this);
        }
        /**
         * Returns the current playback rate. (0=no playback, 1=normal playback)
         *
         * @return {number} The current playback rate
         */

      }, {
        key: "getPlaybackRate",
        value: function getPlaybackRate() {
          return this.playbackRate;
        }
        /**
         * Set the audio source playback rate.
         *
         * @param {number} value The playback rate to use
         */

      }, {
        key: "setPlaybackRate",
        value: function setPlaybackRate(value) {
          this.playbackRate = value || 1;
          this.source && this.source.playbackRate.setValueAtTime(this.playbackRate, this.ac.currentTime);
        }
        /**
         * Set a point in seconds for playback to stop at.
         *
         * @param {number} end Position to end at
         * @version 3.3.0
         */

      }, {
        key: "setPlayEnd",
        value: function setPlayEnd(end) {
          this.scheduledPause = end;
        }
      }]);

      return WebAudio;
    }(util.Observer);

    exports.default = WebAudio;
    WebAudio.scriptBufferSize = 256;
    module.exports = exports.default;

    /***/ }),

    /***/ "./node_modules/debounce/index.js":
    /*!****************************************!*\
      !*** ./node_modules/debounce/index.js ***!
      \****************************************/
    /***/ ((module) => {

    /**
     * Returns a function, that, as long as it continues to be invoked, will not
     * be triggered. The function will be called after it stops being called for
     * N milliseconds. If `immediate` is passed, trigger the function on the
     * leading edge, instead of the trailing. The function also has a property 'clear' 
     * that is a function which will clear the timer to prevent previously scheduled executions. 
     *
     * @source underscore.js
     * @see http://unscriptable.com/2009/03/20/debouncing-javascript-methods/
     * @param {Function} function to wrap
     * @param {Number} timeout in ms (`100`)
     * @param {Boolean} whether to execute at the beginning (`false`)
     * @api public
     */
    function debounce(func, wait, immediate){
      var timeout, args, context, timestamp, result;
      if (null == wait) wait = 100;

      function later() {
        var last = Date.now() - timestamp;

        if (last < wait && last >= 0) {
          timeout = setTimeout(later, wait - last);
        } else {
          timeout = null;
          if (!immediate) {
            result = func.apply(context, args);
            context = args = null;
          }
        }
      }
      var debounced = function(){
        context = this;
        args = arguments;
        timestamp = Date.now();
        var callNow = immediate && !timeout;
        if (!timeout) timeout = setTimeout(later, wait);
        if (callNow) {
          result = func.apply(context, args);
          context = args = null;
        }

        return result;
      };

      debounced.clear = function() {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
      };
      
      debounced.flush = function() {
        if (timeout) {
          result = func.apply(context, args);
          context = args = null;
          
          clearTimeout(timeout);
          timeout = null;
        }
      };

      return debounced;
    }
    // Adds compatibility for ES modules
    debounce.debounce = debounce;

    module.exports = debounce;


    /***/ })

    /******/ 	});
    /************************************************************************/
    /******/ 	// The module cache
    /******/ 	var __webpack_module_cache__ = {};
    /******/ 	
    /******/ 	// The require function
    /******/ 	function __webpack_require__(moduleId) {
    /******/ 		// Check if module is in cache
    /******/ 		var cachedModule = __webpack_module_cache__[moduleId];
    /******/ 		if (cachedModule !== undefined) {
    /******/ 			return cachedModule.exports;
    /******/ 		}
    /******/ 		// Create a new module (and put it into the cache)
    /******/ 		var module = __webpack_module_cache__[moduleId] = {
    /******/ 			// no module.id needed
    /******/ 			// no module.loaded needed
    /******/ 			exports: {}
    /******/ 		};
    /******/ 	
    /******/ 		// Execute the module function
    /******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    /******/ 	
    /******/ 		// Return the exports of the module
    /******/ 		return module.exports;
    /******/ 	}
    /******/ 	
    /************************************************************************/
    /******/ 	
    /******/ 	// startup
    /******/ 	// Load entry module and return exports
    /******/ 	// This entry module is referenced by other modules so it can't be inlined
    /******/ 	var __webpack_exports__ = __webpack_require__("./src/wavesurfer.js");
    /******/ 	
    /******/ 	return __webpack_exports__;
    /******/ })()
    ;
    });

    });

    var WaveSurfer = /*@__PURE__*/getDefaultExportFromCjs(wavesurfer);

    /* src/Waveform.svelte generated by Svelte v3.44.1 */
    const file$2 = "src/Waveform.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let div;
    	let t0;
    	let input0;
    	let t1;
    	let input1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			t0 = space();
    			input0 = element("input");
    			t1 = space();
    			input1 = element("input");
    			add_location(div, file$2, 50, 4, 1280);
    			attr_dev(input0, "type", "button");
    			input0.value = "play";
    			add_location(input0, file$2, 51, 4, 1321);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", /*minZoom*/ ctx[3]);
    			attr_dev(input1, "max", /*maxZoom*/ ctx[4]);
    			set_style(input1, "width", "100%");
    			add_location(input1, file$2, 52, 4, 1399);
    			add_location(main, file$2, 49, 0, 1269);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			/*div_binding*/ ctx[11](div);
    			append_dev(main, t0);
    			append_dev(main, input0);
    			append_dev(main, t1);
    			append_dev(main, input1);
    			set_input_value(input1, /*zoom*/ ctx[0]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "click", /*click_handler*/ ctx[12], false, false, false),
    					listen_dev(input1, "change", /*input1_change_input_handler*/ ctx[13]),
    					listen_dev(input1, "input", /*input1_change_input_handler*/ ctx[13]),
    					listen_dev(input1, "input", /*updateZoom*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*minZoom*/ 8) {
    				attr_dev(input1, "min", /*minZoom*/ ctx[3]);
    			}

    			if (dirty & /*zoom*/ 1) {
    				set_input_value(input1, /*zoom*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*div_binding*/ ctx[11](null);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Waveform', slots, []);
    	let { waveColor = 'pink' } = $$props;
    	let { progressColor = 'lightgreen' } = $$props;
    	let { duration } = $$props;
    	let { zoom } = $$props;
    	let waveform;
    	let domContainer;
    	let maxZoom = 5000;
    	let minZoom = 1;

    	onMount(() => {
    		$$invalidate(1, waveform = WaveSurfer.create({
    			container: domContainer,
    			waveColor,
    			progressColor,
    			scrollParent: true,
    			normalize: true,
    			fillParent: false,
    			responsive: true
    		}));

    		waveform.on('ready', function () {
    			$$invalidate(6, duration = waveform.getDuration());
    			updateZoomLimits();
    		});
    	});

    	function empty() {
    		waveform.empty();
    	}

    	function load(url) {
    		waveform.load(url);
    	}

    	function updateZoom() {
    		waveform === null || waveform === void 0
    		? void 0
    		: waveform.zoom(zoom);
    	}

    	function updateZoomLimits() {
    		if ((duration !== null && duration !== void 0 ? duration : 0) != 0) {
    			let maxWidth = domContainer.getBoundingClientRect().width;
    			$$invalidate(3, minZoom = maxWidth / duration);
    		} else {
    			$$invalidate(3, minZoom = 1);
    		}

    		$$invalidate(0, zoom = Math.min(maxZoom, zoom));
    		$$invalidate(0, zoom = Math.max(minZoom, zoom));
    		updateZoom();
    	}

    	afterUpdate(() => updateZoom());
    	const writable_props = ['waveColor', 'progressColor', 'duration', 'zoom'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Waveform> was created with unknown prop '${key}'`);
    	});

    	function div_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			domContainer = $$value;
    			$$invalidate(2, domContainer);
    		});
    	}

    	const click_handler = _ => waveform.playPause();

    	function input1_change_input_handler() {
    		zoom = to_number(this.value);
    		$$invalidate(0, zoom);
    	}

    	$$self.$$set = $$props => {
    		if ('waveColor' in $$props) $$invalidate(7, waveColor = $$props.waveColor);
    		if ('progressColor' in $$props) $$invalidate(8, progressColor = $$props.progressColor);
    		if ('duration' in $$props) $$invalidate(6, duration = $$props.duration);
    		if ('zoom' in $$props) $$invalidate(0, zoom = $$props.zoom);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		afterUpdate,
    		WaveSurfer,
    		waveColor,
    		progressColor,
    		duration,
    		zoom,
    		waveform,
    		domContainer,
    		maxZoom,
    		minZoom,
    		empty,
    		load,
    		updateZoom,
    		updateZoomLimits
    	});

    	$$self.$inject_state = $$props => {
    		if ('waveColor' in $$props) $$invalidate(7, waveColor = $$props.waveColor);
    		if ('progressColor' in $$props) $$invalidate(8, progressColor = $$props.progressColor);
    		if ('duration' in $$props) $$invalidate(6, duration = $$props.duration);
    		if ('zoom' in $$props) $$invalidate(0, zoom = $$props.zoom);
    		if ('waveform' in $$props) $$invalidate(1, waveform = $$props.waveform);
    		if ('domContainer' in $$props) $$invalidate(2, domContainer = $$props.domContainer);
    		if ('maxZoom' in $$props) $$invalidate(4, maxZoom = $$props.maxZoom);
    		if ('minZoom' in $$props) $$invalidate(3, minZoom = $$props.minZoom);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		zoom,
    		waveform,
    		domContainer,
    		minZoom,
    		maxZoom,
    		updateZoom,
    		duration,
    		waveColor,
    		progressColor,
    		empty,
    		load,
    		div_binding,
    		click_handler,
    		input1_change_input_handler
    	];
    }

    class Waveform extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			waveColor: 7,
    			progressColor: 8,
    			duration: 6,
    			zoom: 0,
    			empty: 9,
    			load: 10
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Waveform",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*duration*/ ctx[6] === undefined && !('duration' in props)) {
    			console.warn("<Waveform> was created without expected prop 'duration'");
    		}

    		if (/*zoom*/ ctx[0] === undefined && !('zoom' in props)) {
    			console.warn("<Waveform> was created without expected prop 'zoom'");
    		}
    	}

    	get waveColor() {
    		throw new Error("<Waveform>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set waveColor(value) {
    		throw new Error("<Waveform>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get progressColor() {
    		throw new Error("<Waveform>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set progressColor(value) {
    		throw new Error("<Waveform>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get duration() {
    		throw new Error("<Waveform>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set duration(value) {
    		throw new Error("<Waveform>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get zoom() {
    		throw new Error("<Waveform>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set zoom(value) {
    		throw new Error("<Waveform>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get empty() {
    		return this.$$.ctx[9];
    	}

    	set empty(value) {
    		throw new Error("<Waveform>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get load() {
    		return this.$$.ctx[10];
    	}

    	set load(value) {
    		throw new Error("<Waveform>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // Copied from https://github.com/chris-rudmin/Recorderjs

    var waveEncoder = () => {
      let BYTES_PER_SAMPLE = 2;

      let recorded = [];

      function encode (buffer) {
        let length = buffer.length;
        let data = new Uint8Array(length * BYTES_PER_SAMPLE);
        for (let i = 0; i < length; i++) {
          let index = i * BYTES_PER_SAMPLE;
          let sample = buffer[i];
          if (sample > 1) {
            sample = 1;
          } else if (sample < -1) {
            sample = -1;
          }
          sample = sample * 32768;
          data[index] = sample;
          data[index + 1] = sample >> 8;
        }
        recorded.push(data);
      }

      function dump (sampleRate) {
        let bufferLength = recorded.length ? recorded[0].length : 0;
        let length = recorded.length * bufferLength;
        let wav = new Uint8Array(44 + length);
        let view = new DataView(wav.buffer);

        // RIFF identifier 'RIFF'
        view.setUint32(0, 1380533830, false);
        // file length minus RIFF identifier length and file description length
        view.setUint32(4, 36 + length, true);
        // RIFF type 'WAVE'
        view.setUint32(8, 1463899717, false);
        // format chunk identifier 'fmt '
        view.setUint32(12, 1718449184, false);
        // format chunk length
        view.setUint32(16, 16, true);
        // sample format (raw)
        view.setUint16(20, 1, true);
        // channel count
        view.setUint16(22, 1, true);
        // sample rate
        view.setUint32(24, sampleRate, true);
        // byte rate (sample rate * block align)
        view.setUint32(28, sampleRate * BYTES_PER_SAMPLE, true);
        // block align (channel count * bytes per sample)
        view.setUint16(32, BYTES_PER_SAMPLE, true);
        // bits per sample
        view.setUint16(34, 8 * BYTES_PER_SAMPLE, true);
        // data chunk identifier 'data'
        view.setUint32(36, 1684108385, false);
        // data chunk length
        view.setUint32(40, length, true);

        // eslint-disable-next-line unicorn/no-for-loop
        for (let i = 0; i < recorded.length; i++) {
          wav.set(recorded[i], i * bufferLength + 44);
        }

        recorded = [];
        postMessage(wav.buffer, [wav.buffer]);
      }

      onmessage = e => {
        if (e.data[0] === 'encode') {
          encode(e.data[1]);
        } else if (e.data[0] === 'dump') {
          dump(e.data[1]);
        }
      };
    };

    let AudioContext = window.AudioContext || window.webkitAudioContext;

    let createWorker = fn => {
      let js = fn
        .toString()
        .replace(/^(\(\)\s*=>|function\s*\(\))\s*{/, '')
        .replace(/}$/, '');
      let blob = new Blob([js]);
      return new Worker(URL.createObjectURL(blob))
    };

    let error = method => {
      let event = new Event('error');
      event.data = new Error('Wrong state for ' + method);
      return event
    };

    let context;

    /**
     * Audio Recorder with MediaRecorder API.
     *
     * @example
     * navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
     *   let recorder = new MediaRecorder(stream)
     * })
     */
    class MediaRecorder$1 {
      /**
       * @param {MediaStream} stream The audio stream to record.
       */
      constructor (stream, config = null) {
        /**
         * The `MediaStream` passed into the constructor.
         * @type {MediaStream}
         */
        this.stream = stream;
        this.config = config;
        /**
         * The current state of recording process.
         * @type {"inactive"|"recording"|"paused"}
         */
        this.state = 'inactive';

        this.em = document.createDocumentFragment();
        this.encoder = createWorker(MediaRecorder$1.encoder);

        let recorder = this;
        this.encoder.addEventListener('message', e => {
          let event = new Event('dataavailable');
          event.data = new Blob([e.data], { type: recorder.mimeType });
          recorder.em.dispatchEvent(event);
          if (recorder.state === 'inactive') {
            recorder.em.dispatchEvent(new Event('stop'));
          }
        });
      }

      /**
       * Begins recording media.
       *
       * @param {number} [timeslice] The milliseconds to record into each `Blob`.
       *                             If this parameter isn’t included, single `Blob`
       *                             will be recorded.
       *
       * @return {undefined}
       *
       * @example
       * recordButton.addEventListener('click', () => {
       *   recorder.start()
       * })
       */
      start (timeslice) {
        if (this.state !== 'inactive') {
          return this.em.dispatchEvent(error('start'))
        }

        this.state = 'recording';

        if (!context) {
          context = new AudioContext(this.config);
        }
        this.clone = this.stream.clone();
        this.input = context.createMediaStreamSource(this.clone);
        this.processor = context.createScriptProcessor(2048, 1, 1);

        this.encoder.postMessage(['init', context.sampleRate]);

        this.processor.onaudioprocess = e => {
          if (this.state === 'recording') {
            this.encoder.postMessage(['encode', e.inputBuffer.getChannelData(0)]);
          }
        };

        this.input.connect(this.processor);
        this.processor.connect(context.destination);

        this.em.dispatchEvent(new Event('start'));

        if (timeslice) {
          this.slicing = setInterval(() => {
            if (this.state === 'recording') this.requestData();
          }, timeslice);
        }

        return undefined
      }

      /**
       * Stop media capture and raise `dataavailable` event with recorded data.
       *
       * @return {undefined}
       *
       * @example
       * finishButton.addEventListener('click', () => {
       *   recorder.stop()
       * })
       */
      stop () {
        if (this.state === 'inactive') {
          return this.em.dispatchEvent(error('stop'))
        }

        this.requestData();
        this.state = 'inactive';
        this.clone.getTracks().forEach(track => {
          track.stop();
        });
        this.processor.disconnect();
        this.input.disconnect();
        return clearInterval(this.slicing)
      }

      /**
       * Pauses recording of media streams.
       *
       * @return {undefined}
       *
       * @example
       * pauseButton.addEventListener('click', () => {
       *   recorder.pause()
       * })
       */
      pause () {
        if (this.state !== 'recording') {
          return this.em.dispatchEvent(error('pause'))
        }

        this.state = 'paused';
        return this.em.dispatchEvent(new Event('pause'))
      }

      /**
       * Resumes media recording when it has been previously paused.
       *
       * @return {undefined}
       *
       * @example
       * resumeButton.addEventListener('click', () => {
       *   recorder.resume()
       * })
       */
      resume () {
        if (this.state !== 'paused') {
          return this.em.dispatchEvent(error('resume'))
        }

        this.state = 'recording';
        return this.em.dispatchEvent(new Event('resume'))
      }

      /**
       * Raise a `dataavailable` event containing the captured media.
       *
       * @return {undefined}
       *
       * @example
       * this.on('nextData', () => {
       *   recorder.requestData()
       * })
       */
      requestData () {
        if (this.state === 'inactive') {
          return this.em.dispatchEvent(error('requestData'))
        }

        return this.encoder.postMessage(['dump', context.sampleRate])
      }

      /**
       * Add listener for specified event type.
       *
       * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"|"error"}
       * type Event type.
       * @param {function} listener The listener function.
       *
       * @return {undefined}
       *
       * @example
       * recorder.addEventListener('dataavailable', e => {
       *   audio.src = URL.createObjectURL(e.data)
       * })
       */
      addEventListener (...args) {
        this.em.addEventListener(...args);
      }

      /**
       * Remove event listener.
       *
       * @param {"start"|"stop"|"pause"|"resume"|"dataavailable"|"error"}
       * type Event type.
       * @param {function} listener The same function used in `addEventListener`.
       *
       * @return {undefined}
       */
      removeEventListener (...args) {
        this.em.removeEventListener(...args);
      }

      /**
       * Calls each of the listeners registered for a given event.
       *
       * @param {Event} event The event object.
       *
       * @return {boolean} Is event was no canceled by any listener.
       */
      dispatchEvent (...args) {
        this.em.dispatchEvent(...args);
      }
    }

    /**
     * The MIME type that is being used for recording.
     * @type {string}
     */
    MediaRecorder$1.prototype.mimeType = 'audio/wav';

    /**
     * Returns `true` if the MIME type specified is one the polyfill can record.
     *
     * This polyfill supports `audio/wav` and `audio/mpeg`.
     *
     * @param {string} mimeType The mimeType to check.
     *
     * @return {boolean} `true` on `audio/wav` and `audio/mpeg` MIME type.
     */
    MediaRecorder$1.isTypeSupported = mimeType => {
      return MediaRecorder$1.prototype.mimeType === mimeType
    };

    /**
     * `true` if MediaRecorder can not be polyfilled in the current browser.
     * @type {boolean}
     *
     * @example
     * if (MediaRecorder.notSupported) {
     *   showWarning('Audio recording is not supported in this browser')
     * }
     */
    MediaRecorder$1.notSupported = !navigator.mediaDevices || !AudioContext;

    /**
     * Converts RAW audio buffer to compressed audio files.
     * It will be loaded to Web Worker.
     * By default, WAVE encoder will be used.
     * @type {function}
     *
     * @example
     * MediaRecorder.prototype.mimeType = 'audio/ogg'
     * MediaRecorder.encoder = oggEncoder
     */
    MediaRecorder$1.encoder = waveEncoder;

    /* src/RecordButton.svelte generated by Svelte v3.44.1 */
    const file$1 = "src/RecordButton.svelte";

    function create_fragment$1(ctx) {
    	let main;
    	let div;
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			main = element("main");
    			div = element("div");
    			span = element("span");
    			span.textContent = "hold to record";
    			attr_dev(span, "class", "button-text svelte-1kfo2d7");
    			add_location(span, file$1, 40, 2, 1356);
    			attr_dev(div, "class", "record svelte-1kfo2d7");
    			toggle_class(div, "active", /*recordingInProgress*/ ctx[0]);
    			add_location(div, file$1, 32, 1, 1086);
    			add_location(main, file$1, 31, 0, 1078);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div);
    			append_dev(div, span);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "touchstart", /*touchstart_handler*/ ctx[3], false, false, false),
    					listen_dev(div, "touchend", /*stopRecording*/ ctx[2], { passive: true }, false, false),
    					listen_dev(div, "mousedown", /*startRecording*/ ctx[1], false, false, false),
    					listen_dev(div, "mouseup", /*stopRecording*/ ctx[2], false, false, false),
    					listen_dev(div, "mouseleave", /*stopRecording*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*recordingInProgress*/ 1) {
    				toggle_class(div, "active", /*recordingInProgress*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    if (!window.MediaRecorder) {
    	//polyfill
    	window.MediaRecorder = MediaRecorder$1;
    }

    async function askRecordingPermission() {
    	let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    	stream.getTracks().forEach(track => track.stop());
    }

    askRecordingPermission();

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('RecordButton', slots, []);
    	const dispatch = createEventDispatcher();
    	var recordingInProgress = false;
    	var currentRecoder;

    	async function startRecording() {
    		let stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    		currentRecoder = new MediaRecorder(stream);

    		currentRecoder.addEventListener('dataavailable', event => {
    			dispatch("recordComplete", URL.createObjectURL(event.data));
    		});

    		currentRecoder.start();
    		$$invalidate(0, recordingInProgress = true);
    	}

    	function stopRecording() {
    		currentRecoder.stream.getTracks().forEach(track => track.stop());
    		currentRecoder.stop();
    		$$invalidate(0, recordingInProgress = false);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<RecordButton> was created with unknown prop '${key}'`);
    	});

    	const touchstart_handler = event => {
    		startRecording();
    		event.preventDefault();
    	};

    	$$self.$capture_state = () => ({
    		AudioRecorder: MediaRecorder$1,
    		askRecordingPermission,
    		createEventDispatcher,
    		dispatch,
    		recordingInProgress,
    		currentRecoder,
    		startRecording,
    		stopRecording
    	});

    	$$self.$inject_state = $$props => {
    		if ('recordingInProgress' in $$props) $$invalidate(0, recordingInProgress = $$props.recordingInProgress);
    		if ('currentRecoder' in $$props) currentRecoder = $$props.currentRecoder;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [recordingInProgress, startRecording, stopRecording, touchstart_handler];
    }

    class RecordButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RecordButton",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.44.1 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let input0;
    	let t2;
    	let input1;
    	let t3;
    	let div2;
    	let div0;
    	let p0;
    	let t4;
    	let t5;
    	let t6;
    	let t7;
    	let waveform0;
    	let updating_zoom;
    	let t8;
    	let recordbutton;
    	let t9;
    	let div1;
    	let waveform1;
    	let updating_zoom_1;
    	let t10;
    	let label;
    	let input2;
    	let t11;
    	let t12;
    	let p1;
    	let t14;
    	let p2;
    	let span;
    	let t16;
    	let a0;
    	let t18;
    	let a1;
    	let t20;
    	let a2;
    	let t22;
    	let a3;
    	let current;
    	let mounted;
    	let dispose;

    	function waveform0_zoom_binding(value) {
    		/*waveform0_zoom_binding*/ ctx[13](value);
    	}

    	let waveform0_props = {
    		waveColor: "pink",
    		progressColor: "lightgreen"
    	};

    	if (/*$referencePronunciationZoom*/ ctx[5] !== void 0) {
    		waveform0_props.zoom = /*$referencePronunciationZoom*/ ctx[5];
    	}

    	waveform0 = new Waveform({ props: waveform0_props, $$inline: true });
    	/*waveform0_binding*/ ctx[12](waveform0);
    	binding_callbacks.push(() => bind(waveform0, 'zoom', waveform0_zoom_binding));
    	recordbutton = new RecordButton({ $$inline: true });
    	recordbutton.$on("recordComplete", /*recordComplete_handler*/ ctx[14]);

    	function waveform1_zoom_binding(value) {
    		/*waveform1_zoom_binding*/ ctx[16](value);
    	}

    	let waveform1_props = {
    		waveColor: "green",
    		progressColor: "blue"
    	};

    	if (/*$userPronunciationZoom*/ ctx[6] !== void 0) {
    		waveform1_props.zoom = /*$userPronunciationZoom*/ ctx[6];
    	}

    	waveform1 = new Waveform({ props: waveform1_props, $$inline: true });
    	/*waveform1_binding*/ ctx[15](waveform1);
    	binding_callbacks.push(() => bind(waveform1, 'zoom', waveform1_zoom_binding));

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Pronunciation of";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			input1 = element("input");
    			t3 = space();
    			div2 = element("div");
    			div0 = element("div");
    			p0 = element("p");
    			t4 = text("[");
    			t5 = text(/*phonetic*/ ctx[1]);
    			t6 = text("]");
    			t7 = space();
    			create_component(waveform0.$$.fragment);
    			t8 = space();
    			create_component(recordbutton.$$.fragment);
    			t9 = space();
    			div1 = element("div");
    			create_component(waveform1.$$.fragment);
    			t10 = space();
    			label = element("label");
    			input2 = element("input");
    			t11 = text("\n\t\t\t\tkeep zoom the same");
    			t12 = space();
    			p1 = element("p");
    			p1.textContent = "NOTE: this is an MVP and works... barely.";
    			t14 = space();
    			p2 = element("p");
    			span = element("span");
    			span.textContent = "Powered by:";
    			t16 = space();
    			a0 = element("a");
    			a0.textContent = "Svelte";
    			t18 = space();
    			a1 = element("a");
    			a1.textContent = "Free Dictionary API";
    			t20 = space();
    			a2 = element("a");
    			a2.textContent = "wavesurfer-js";
    			t22 = space();
    			a3 = element("a");
    			a3.textContent = "allOrigins";
    			add_location(h1, file, 36, 1, 1118);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file, 37, 1, 1145);
    			attr_dev(input1, "type", "button");
    			input1.value = "get";
    			add_location(input1, file, 38, 1, 1186);
    			attr_dev(p0, "contenteditable", "true");
    			add_location(p0, file, 42, 3, 1311);
    			add_location(div0, file, 41, 2, 1302);
    			attr_dev(input2, "type", "checkbox");
    			add_location(input2, file, 52, 4, 1715);
    			add_location(label, file, 51, 3, 1703);
    			add_location(div1, file, 48, 2, 1574);
    			attr_dev(div2, "class", "svelte-r4lo4x");
    			toggle_class(div2, "hidden", !(/*phonetic*/ ctx[1] && /*phonetic*/ ctx[1].length > 0));
    			add_location(div2, file, 40, 1, 1244);
    			add_location(p1, file, 58, 1, 1823);
    			add_location(span, file, 61, 2, 1880);
    			attr_dev(a0, "href", "https://svelte.dev");
    			add_location(a0, file, 62, 2, 1907);
    			attr_dev(a1, "href", "https://dictionaryapi.dev/");
    			add_location(a1, file, 63, 2, 1949);
    			attr_dev(a2, "href", "https://wavesurfer-js.org/");
    			add_location(a2, file, 64, 2, 2012);
    			attr_dev(a3, "href", "http://allorigins.win/");
    			add_location(a3, file, 65, 2, 2069);
    			add_location(p2, file, 60, 1, 1874);
    			attr_dev(main, "class", "svelte-r4lo4x");
    			add_location(main, file, 35, 0, 1110);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, input0);
    			set_input_value(input0, /*word*/ ctx[0]);
    			append_dev(main, t2);
    			append_dev(main, input1);
    			append_dev(main, t3);
    			append_dev(main, div2);
    			append_dev(div2, div0);
    			append_dev(div0, p0);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			append_dev(p0, t6);
    			append_dev(div0, t7);
    			mount_component(waveform0, div0, null);
    			append_dev(div2, t8);
    			mount_component(recordbutton, div2, null);
    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			mount_component(waveform1, div1, null);
    			append_dev(div1, t10);
    			append_dev(div1, label);
    			append_dev(label, input2);
    			input2.checked = /*zoomInSync*/ ctx[4];
    			append_dev(label, t11);
    			append_dev(main, t12);
    			append_dev(main, p1);
    			append_dev(main, t14);
    			append_dev(main, p2);
    			append_dev(p2, span);
    			append_dev(p2, t16);
    			append_dev(p2, a0);
    			append_dev(p2, t18);
    			append_dev(p2, a1);
    			append_dev(p2, t20);
    			append_dev(p2, a2);
    			append_dev(p2, t22);
    			append_dev(p2, a3);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[11]),
    					listen_dev(input1, "click", /*getWord*/ ctx[9], false, false, false),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[17])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*word*/ 1 && input0.value !== /*word*/ ctx[0]) {
    				set_input_value(input0, /*word*/ ctx[0]);
    			}

    			if (!current || dirty & /*phonetic*/ 2) set_data_dev(t5, /*phonetic*/ ctx[1]);
    			const waveform0_changes = {};

    			if (!updating_zoom && dirty & /*$referencePronunciationZoom*/ 32) {
    				updating_zoom = true;
    				waveform0_changes.zoom = /*$referencePronunciationZoom*/ ctx[5];
    				add_flush_callback(() => updating_zoom = false);
    			}

    			waveform0.$set(waveform0_changes);
    			const waveform1_changes = {};

    			if (!updating_zoom_1 && dirty & /*$userPronunciationZoom*/ 64) {
    				updating_zoom_1 = true;
    				waveform1_changes.zoom = /*$userPronunciationZoom*/ ctx[6];
    				add_flush_callback(() => updating_zoom_1 = false);
    			}

    			waveform1.$set(waveform1_changes);

    			if (dirty & /*zoomInSync*/ 16) {
    				input2.checked = /*zoomInSync*/ ctx[4];
    			}

    			if (dirty & /*phonetic*/ 2) {
    				toggle_class(div2, "hidden", !(/*phonetic*/ ctx[1] && /*phonetic*/ ctx[1].length > 0));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(waveform0.$$.fragment, local);
    			transition_in(recordbutton.$$.fragment, local);
    			transition_in(waveform1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(waveform0.$$.fragment, local);
    			transition_out(recordbutton.$$.fragment, local);
    			transition_out(waveform1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			/*waveform0_binding*/ ctx[12](null);
    			destroy_component(waveform0);
    			destroy_component(recordbutton);
    			/*waveform1_binding*/ ctx[15](null);
    			destroy_component(waveform1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $referencePronunciationZoom;
    	let $userPronunciationZoom;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { word } = $$props;
    	var phonetic;
    	var referencePronunciation;
    	var referencePronunciationZoom = writable(1);
    	validate_store(referencePronunciationZoom, 'referencePronunciationZoom');
    	component_subscribe($$self, referencePronunciationZoom, value => $$invalidate(5, $referencePronunciationZoom = value));
    	var userPronunciation;
    	var userPronunciationZoom = writable(1);
    	validate_store(userPronunciationZoom, 'userPronunciationZoom');
    	component_subscribe($$self, userPronunciationZoom, value => $$invalidate(6, $userPronunciationZoom = value));
    	var zoomInSync = true;

    	async function getWord() {
    		let pronunciation = await getPronunciation(word);
    		$$invalidate(1, phonetic = pronunciation.phonetic);
    		referencePronunciation.empty();
    		userPronunciation.empty();

    		if (pronunciation.audio) {
    			referencePronunciation.load(pronunciation.audio);
    		}
    	}

    	function displayRecording(url) {
    		userPronunciation.load(url);
    	}

    	function maybeUpdateZoom(writable, value) {
    		if (zoomInSync) {
    			writable.set(value);
    		}
    	}

    	onMount(() => {
    		referencePronunciationZoom.subscribe(value => maybeUpdateZoom(userPronunciationZoom, value));
    		userPronunciationZoom.subscribe(value => maybeUpdateZoom(referencePronunciationZoom, value));
    	});

    	const writable_props = ['word'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		word = this.value;
    		$$invalidate(0, word);
    	}

    	function waveform0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			referencePronunciation = $$value;
    			$$invalidate(2, referencePronunciation);
    		});
    	}

    	function waveform0_zoom_binding(value) {
    		$referencePronunciationZoom = value;
    		referencePronunciationZoom.set($referencePronunciationZoom);
    	}

    	const recordComplete_handler = e => displayRecording(e.detail);

    	function waveform1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			userPronunciation = $$value;
    			$$invalidate(3, userPronunciation);
    		});
    	}

    	function waveform1_zoom_binding(value) {
    		$userPronunciationZoom = value;
    		userPronunciationZoom.set($userPronunciationZoom);
    	}

    	function input2_change_handler() {
    		zoomInSync = this.checked;
    		$$invalidate(4, zoomInSync);
    	}

    	$$self.$$set = $$props => {
    		if ('word' in $$props) $$invalidate(0, word = $$props.word);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		writable,
    		getPronunciation,
    		Waveform,
    		RecordButton,
    		word,
    		phonetic,
    		referencePronunciation,
    		referencePronunciationZoom,
    		userPronunciation,
    		userPronunciationZoom,
    		zoomInSync,
    		getWord,
    		displayRecording,
    		maybeUpdateZoom,
    		$referencePronunciationZoom,
    		$userPronunciationZoom
    	});

    	$$self.$inject_state = $$props => {
    		if ('word' in $$props) $$invalidate(0, word = $$props.word);
    		if ('phonetic' in $$props) $$invalidate(1, phonetic = $$props.phonetic);
    		if ('referencePronunciation' in $$props) $$invalidate(2, referencePronunciation = $$props.referencePronunciation);
    		if ('referencePronunciationZoom' in $$props) $$invalidate(7, referencePronunciationZoom = $$props.referencePronunciationZoom);
    		if ('userPronunciation' in $$props) $$invalidate(3, userPronunciation = $$props.userPronunciation);
    		if ('userPronunciationZoom' in $$props) $$invalidate(8, userPronunciationZoom = $$props.userPronunciationZoom);
    		if ('zoomInSync' in $$props) $$invalidate(4, zoomInSync = $$props.zoomInSync);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		word,
    		phonetic,
    		referencePronunciation,
    		userPronunciation,
    		zoomInSync,
    		$referencePronunciationZoom,
    		$userPronunciationZoom,
    		referencePronunciationZoom,
    		userPronunciationZoom,
    		getWord,
    		displayRecording,
    		input0_input_handler,
    		waveform0_binding,
    		waveform0_zoom_binding,
    		recordComplete_handler,
    		waveform1_binding,
    		waveform1_zoom_binding,
    		input2_change_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { word: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*word*/ ctx[0] === undefined && !('word' in props)) {
    			console.warn("<App> was created without expected prop 'word'");
    		}
    	}

    	get word() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set word(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
        target: document.body,
        props: {
            word: 'hello'
        }
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
