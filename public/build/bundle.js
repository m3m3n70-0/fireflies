
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
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
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
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
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
        seen_callbacks.clear();
        set_current_component(saved_component);
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
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
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
            ctx: [],
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
            if (!is_function(callback)) {
                return noop;
            }
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
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.55.1' }, detail), { bubbles: true }));
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
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
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

    /* src/components/Dogtag.svelte generated by Svelte v3.55.1 */

    const file$5 = "src/components/Dogtag.svelte";

    function create_fragment$6(ctx) {
    	let section;
    	let div1;
    	let div0;
    	let h10;
    	let t1;
    	let h11;
    	let t3;
    	let video;
    	let source;
    	let source_src_value;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div1 = element("div");
    			div0 = element("div");
    			h10 = element("h1");
    			h10.textContent = "When you're lost in the darkness";
    			t1 = space();
    			h11 = element("h1");
    			h11.textContent = "look for the light";
    			t3 = space();
    			video = element("video");
    			source = element("source");
    			attr_dev(h10, "class", "svelte-zv40u7");
    			add_location(h10, file$5, 8, 4, 104);
    			attr_dev(h11, "id", "porp");
    			attr_dev(h11, "class", "svelte-zv40u7");
    			add_location(h11, file$5, 9, 4, 150);
    			attr_dev(div0, "class", "dogtag-text");
    			add_location(div0, file$5, 7, 2, 74);
    			if (!src_url_equal(source.src, source_src_value = "img/dogtag-loop.mp4")) attr_dev(source, "src", source_src_value);
    			attr_dev(source, "type", "video/mp4");
    			add_location(source, file$5, 13, 6, 245);
    			video.autoplay = true;
    			video.muted = true;
    			video.loop = true;
    			attr_dev(video, "id", "video");
    			attr_dev(video, "class", "svelte-zv40u7");
    			add_location(video, file$5, 12, 2, 200);
    			attr_dev(div1, "class", "dog-wrapper svelte-zv40u7");
    			add_location(div1, file$5, 6, 2, 46);
    			attr_dev(section, "id", "dogtag");
    			attr_dev(section, "class", "svelte-zv40u7");
    			add_location(section, file$5, 5, 0, 22);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h10);
    			append_dev(div0, t1);
    			append_dev(div0, h11);
    			append_dev(div1, t3);
    			append_dev(div1, video);
    			append_dev(video, source);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Dogtag', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Dogtag> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Dogtag extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Dogtag",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/Starting.svelte generated by Svelte v3.55.1 */

    const file$4 = "src/components/Starting.svelte";

    function create_fragment$5(ctx) {
    	let section;
    	let div;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div = element("div");
    			attr_dev(div, "class", "background svelte-otzuii");
    			add_location(div, file$4, 5, 4, 47);
    			attr_dev(section, "id", "start");
    			attr_dev(section, "class", "svelte-otzuii");
    			add_location(section, file$4, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Starting', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Starting> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Starting extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Starting",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/Arrow.svelte generated by Svelte v3.55.1 */

    const file$3 = "src/components/Arrow.svelte";

    function create_fragment$4(ctx) {
    	let div;
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			img = element("img");
    			if (!src_url_equal(img.src, img_src_value = "img/arrow.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "arrow");
    			attr_dev(img, "class", "svelte-1sobo7n");
    			add_location(img, file$3, 5, 4, 45);
    			attr_dev(div, "class", "arrow svelte-1sobo7n");
    			add_location(div, file$3, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, img);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Arrow', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Arrow> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Arrow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Arrow",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Info.svelte generated by Svelte v3.55.1 */

    const file$2 = "src/components/Info.svelte";

    function create_fragment$3(ctx) {
    	let section;
    	let div5;
    	let div1;
    	let div0;
    	let h10;
    	let t1;
    	let p0;
    	let t3;
    	let div2;
    	let img;
    	let img_src_value;
    	let t4;
    	let div4;
    	let div3;
    	let h11;
    	let t6;
    	let p1;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div5 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h10 = element("h1");
    			h10.textContent = "You Are";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Are you tired of living in fear of the infected, scavengers, and other dangers lurking in the post-apocalyptic world? Do you believe in the importance of finding a cure for the Cordyceps fungus that has devastated humanity? Then the Fireflies group may be for you.";
    			t3 = space();
    			div2 = element("div");
    			img = element("img");
    			t4 = space();
    			div4 = element("div");
    			div3 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Not Alone";
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "As a member of the Fireflies, you???ll be part of a dedicated team of scientists, soldiers, and civilians who are working tirelessly to find a way to reverse the effects of the fungus and restore humanity. You???ll have access to advanced technology and resources, as well as the opportunity to work with some of the brightest minds in the world.";
    			attr_dev(h10, "class", "svelte-149f3rs");
    			add_location(h10, file$2, 9, 14, 149);
    			add_location(p0, file$2, 10, 14, 180);
    			attr_dev(div0, "class", "col-wrapper svelte-149f3rs");
    			add_location(div0, file$2, 8, 8, 109);
    			attr_dev(div1, "class", "col1 svelte-149f3rs");
    			add_location(div1, file$2, 7, 7, 82);
    			if (!src_url_equal(img.src, img_src_value = "../img/marlene.jpeg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "placeholder");
    			attr_dev(img, "class", "svelte-149f3rs");
    			add_location(img, file$2, 14, 12, 524);
    			attr_dev(div2, "class", "col2 svelte-149f3rs");
    			add_location(div2, file$2, 13, 7, 493);
    			attr_dev(h11, "class", "svelte-149f3rs");
    			add_location(h11, file$2, 18, 12, 660);
    			add_location(p1, file$2, 19, 12, 691);
    			attr_dev(div3, "class", "col-wrapper svelte-149f3rs");
    			add_location(div3, file$2, 17, 8, 622);
    			attr_dev(div4, "class", "col3 svelte-149f3rs");
    			add_location(div4, file$2, 16, 7, 595);
    			attr_dev(div5, "class", "info-container svelte-149f3rs");
    			add_location(div5, file$2, 5, 4, 45);
    			attr_dev(section, "id", "info");
    			attr_dev(section, "class", "svelte-149f3rs");
    			add_location(section, file$2, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div5);
    			append_dev(div5, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h10);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div5, t3);
    			append_dev(div5, div2);
    			append_dev(div2, img);
    			append_dev(div5, t4);
    			append_dev(div5, div4);
    			append_dev(div4, div3);
    			append_dev(div3, h11);
    			append_dev(div3, t6);
    			append_dev(div3, p1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Info', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Info> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Info extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Info",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Cure.svelte generated by Svelte v3.55.1 */

    const file$1 = "src/components/Cure.svelte";

    function create_fragment$2(ctx) {
    	let section;
    	let div4;
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let div3;
    	let div2;
    	let h1;
    	let t2;
    	let p;
    	let t3;
    	let br0;
    	let br1;
    	let t4;
    	let br2;
    	let br3;
    	let t5;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "A Cure";
    			t2 = space();
    			p = element("p");
    			t3 = text("The Fireflies have made significant progress in their search for a cure to the Cordyceps fungus that has ravaged humanity. Through years of research and experimentation, the group has uncovered new knowledge about the fungus and its effects on the human body.");
    			br0 = element("br");
    			br1 = element("br");
    			t4 = text("\n\n                    While a vaccine or cure has not yet been developed, the Fireflies are optimistic about the potential for a breakthrough in the near future. Recent discoveries have shown that the fungus has unique properties that could be leveraged to develop a vaccine that would protect individuals from the disease.");
    			br2 = element("br");
    			br3 = element("br");
    			t5 = text("\n                    \n                    The Fireflies are hard at work on developing a new vaccine, testing various combinations of compounds and studying the effects on infected subjects. The process is long and arduous, but the group is committed to finding a solution that can help save humanity from the ravages of the Cordyceps fungus.");
    			if (!src_url_equal(img.src, img_src_value = "../img/cure.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "placeholder");
    			attr_dev(img, "class", "svelte-i9i8se");
    			add_location(img, file$1, 8, 16, 156);
    			attr_dev(div0, "class", "col-wrapper svelte-i9i8se");
    			add_location(div0, file$1, 7, 12, 114);
    			attr_dev(div1, "class", "col1 svelte-i9i8se");
    			add_location(div1, file$1, 6, 8, 83);
    			attr_dev(h1, "class", "svelte-i9i8se");
    			add_location(h1, file$1, 13, 16, 317);
    			add_location(br0, file$1, 14, 278, 611);
    			add_location(br1, file$1, 14, 282, 615);
    			add_location(br2, file$1, 16, 321, 942);
    			add_location(br3, file$1, 16, 325, 946);
    			add_location(p, file$1, 14, 16, 349);
    			attr_dev(div2, "class", "col-wrapper svelte-i9i8se");
    			add_location(div2, file$1, 12, 12, 275);
    			attr_dev(div3, "class", "col2 svelte-i9i8se");
    			add_location(div3, file$1, 11, 8, 244);
    			attr_dev(div4, "class", "cure-container svelte-i9i8se");
    			add_location(div4, file$1, 5, 4, 46);
    			attr_dev(section, "id", "cure");
    			attr_dev(section, "class", "svelte-i9i8se");
    			add_location(section, file$1, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div4);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t2);
    			append_dev(div2, p);
    			append_dev(p, t3);
    			append_dev(p, br0);
    			append_dev(p, br1);
    			append_dev(p, t4);
    			append_dev(p, br2);
    			append_dev(p, br3);
    			append_dev(p, t5);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
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

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Cure', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Cure> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Cure extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Cure",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Contact.svelte generated by Svelte v3.55.1 */

    const file = "src/components/Contact.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let div4;
    	let div1;
    	let div0;
    	let form;
    	let input0;
    	let t0;
    	let input1;
    	let t1;
    	let input2;
    	let t2;
    	let input3;
    	let t3;
    	let a;
    	let t5;
    	let div3;
    	let div2;
    	let h1;
    	let t7;
    	let p;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div4 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			form = element("form");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			input2 = element("input");
    			t2 = space();
    			input3 = element("input");
    			t3 = space();
    			a = element("a");
    			a.textContent = "Send";
    			t5 = space();
    			div3 = element("div");
    			div2 = element("div");
    			h1 = element("h1");
    			h1.textContent = "How To Join Us";
    			t7 = space();
    			p = element("p");
    			p.textContent = "If you???re ready to join a cause that is greater than yourself, and if you believe that humanity can rise above even the most dire of circumstances, then the Fireflies are waiting for you.";
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "name", "first");
    			attr_dev(input0, "placeholder", "First Name");
    			attr_dev(input0, "class", "svelte-cotd7q");
    			add_location(input0, file, 9, 20, 188);
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "name", "last");
    			attr_dev(input1, "placeholder", "Last Name");
    			attr_dev(input1, "class", "svelte-cotd7q");
    			add_location(input1, file, 10, 20, 270);
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "name", "email");
    			attr_dev(input2, "placeholder", "Email");
    			attr_dev(input2, "class", "svelte-cotd7q");
    			add_location(input2, file, 11, 20, 350);
    			attr_dev(input3, "type", "date");
    			attr_dev(input3, "name", "birth");
    			attr_dev(input3, "placeholder", "Date Of Birth");
    			attr_dev(input3, "class", "svelte-cotd7q");
    			add_location(input3, file, 12, 20, 427);
    			attr_dev(form, "class", "svelte-cotd7q");
    			add_location(form, file, 8, 16, 161);
    			attr_dev(a, "href", "#");
    			attr_dev(a, "class", "svelte-cotd7q");
    			add_location(a, file, 15, 16, 529);
    			attr_dev(div0, "class", "col-wrapper svelte-cotd7q");
    			add_location(div0, file, 7, 12, 119);
    			attr_dev(div1, "class", "col1 svelte-cotd7q");
    			add_location(div1, file, 6, 8, 88);
    			attr_dev(h1, "class", "svelte-cotd7q");
    			add_location(h1, file, 20, 16, 665);
    			add_location(p, file, 21, 16, 705);
    			attr_dev(div2, "class", "col-wrapper svelte-cotd7q");
    			add_location(div2, file, 19, 12, 623);
    			attr_dev(div3, "class", "col2 svelte-cotd7q");
    			add_location(div3, file, 18, 8, 592);
    			attr_dev(div4, "class", "contact-container svelte-cotd7q");
    			add_location(div4, file, 5, 4, 48);
    			attr_dev(section, "id", "contact");
    			attr_dev(section, "class", "svelte-cotd7q");
    			add_location(section, file, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div4);
    			append_dev(div4, div1);
    			append_dev(div1, div0);
    			append_dev(div0, form);
    			append_dev(form, input0);
    			append_dev(form, t0);
    			append_dev(form, input1);
    			append_dev(form, t1);
    			append_dev(form, input2);
    			append_dev(form, t2);
    			append_dev(form, input3);
    			append_dev(div0, t3);
    			append_dev(div0, a);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, h1);
    			append_dev(div2, t7);
    			append_dev(div2, p);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
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

    function instance$1($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Contact', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Contact> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Contact extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Contact",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.55.1 */

    function create_fragment(ctx) {
    	let starting;
    	let t0;
    	let dogtag;
    	let t1;
    	let info;
    	let t2;
    	let cure;
    	let t3;
    	let contact;
    	let t4;
    	let arrow;
    	let current;
    	starting = new Starting({ $$inline: true });
    	dogtag = new Dogtag({ $$inline: true });
    	info = new Info({ $$inline: true });
    	cure = new Cure({ $$inline: true });
    	contact = new Contact({ $$inline: true });
    	arrow = new Arrow({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(starting.$$.fragment);
    			t0 = space();
    			create_component(dogtag.$$.fragment);
    			t1 = space();
    			create_component(info.$$.fragment);
    			t2 = space();
    			create_component(cure.$$.fragment);
    			t3 = space();
    			create_component(contact.$$.fragment);
    			t4 = space();
    			create_component(arrow.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(starting, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(dogtag, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(info, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(cure, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(contact, target, anchor);
    			insert_dev(target, t4, anchor);
    			mount_component(arrow, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(starting.$$.fragment, local);
    			transition_in(dogtag.$$.fragment, local);
    			transition_in(info.$$.fragment, local);
    			transition_in(cure.$$.fragment, local);
    			transition_in(contact.$$.fragment, local);
    			transition_in(arrow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(starting.$$.fragment, local);
    			transition_out(dogtag.$$.fragment, local);
    			transition_out(info.$$.fragment, local);
    			transition_out(cure.$$.fragment, local);
    			transition_out(contact.$$.fragment, local);
    			transition_out(arrow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(starting, detaching);
    			if (detaching) detach_dev(t0);
    			destroy_component(dogtag, detaching);
    			if (detaching) detach_dev(t1);
    			destroy_component(info, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(cure, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(contact, detaching);
    			if (detaching) detach_dev(t4);
    			destroy_component(arrow, detaching);
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
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Dogtag,
    		Starting,
    		Arrow,
    		Info,
    		Cure,
    		Contact
    	});

    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
