
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
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
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
    function empty() {
        return text('');
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
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
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
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
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
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
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
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
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

    /* src/shared/Tabs.svelte generated by Svelte v3.55.1 */
    const file$4 = "src/shared/Tabs.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (10:10) {#each items as item}
    function create_each_block(ctx) {
    	let li;
    	let a;
    	let t0_value = /*item*/ ctx[4] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[3](/*item*/ ctx[4]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			toggle_class(a, "selected", /*item*/ ctx[4] === /*activeItem*/ ctx[1]);
    			add_location(a, file$4, 12, 14, 415);
    			add_location(li, file$4, 11, 12, 351);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a);
    			append_dev(a, t0);
    			append_dev(li, t1);

    			if (!mounted) {
    				dispose = listen_dev(li, "click", click_handler, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*items*/ 1 && t0_value !== (t0_value = /*item*/ ctx[4] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*items, activeItem*/ 3) {
    				toggle_class(a, "selected", /*item*/ ctx[4] === /*activeItem*/ ctx[1]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(10:10) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let ul;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "nav-bottom");
    			add_location(ul, file$4, 8, 8, 214);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*dispatch, items, activeItem*/ 7) {
    				each_value = /*items*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
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

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tabs', slots, []);
    	let dispatch = createEventDispatcher();
    	let { items } = $$props;
    	let { activeItem } = $$props;

    	$$self.$$.on_mount.push(function () {
    		if (items === undefined && !('items' in $$props || $$self.$$.bound[$$self.$$.props['items']])) {
    			console.warn("<Tabs> was created without expected prop 'items'");
    		}

    		if (activeItem === undefined && !('activeItem' in $$props || $$self.$$.bound[$$self.$$.props['activeItem']])) {
    			console.warn("<Tabs> was created without expected prop 'activeItem'");
    		}
    	});

    	const writable_props = ['items', 'activeItem'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tabs> was created with unknown prop '${key}'`);
    	});

    	const click_handler = item => dispatch('tabChange', item);

    	$$self.$$set = $$props => {
    		if ('items' in $$props) $$invalidate(0, items = $$props.items);
    		if ('activeItem' in $$props) $$invalidate(1, activeItem = $$props.activeItem);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		items,
    		activeItem
    	});

    	$$self.$inject_state = $$props => {
    		if ('dispatch' in $$props) $$invalidate(2, dispatch = $$props.dispatch);
    		if ('items' in $$props) $$invalidate(0, items = $$props.items);
    		if ('activeItem' in $$props) $$invalidate(1, activeItem = $$props.activeItem);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [items, activeItem, dispatch, click_handler];
    }

    class Tabs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { items: 0, activeItem: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tabs",
    			options,
    			id: create_fragment$5.name
    		});
    	}

    	get items() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get activeItem() {
    		throw new Error("<Tabs>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set activeItem(value) {
    		throw new Error("<Tabs>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/components/Home-sec.svelte generated by Svelte v3.55.1 */

    const file$3 = "src/components/Home-sec.svelte";

    function create_fragment$4(ctx) {
    	let section0;
    	let div2;
    	let div0;
    	let h10;
    	let t1;
    	let p0;
    	let t3;
    	let br0;
    	let t4;
    	let ul;
    	let li0;
    	let p1;
    	let t6;
    	let li1;
    	let p2;
    	let t8;
    	let li2;
    	let p3;
    	let t10;
    	let li3;
    	let p4;
    	let t12;
    	let li4;
    	let p5;
    	let t14;
    	let li5;
    	let p6;
    	let t16;
    	let br1;
    	let t17;
    	let p7;
    	let t19;
    	let div1;
    	let img0;
    	let img0_src_value;
    	let t20;
    	let section1;
    	let div5;
    	let div3;
    	let h11;
    	let t22;
    	let p8;
    	let t24;
    	let br2;
    	let t25;
    	let p9;
    	let t27;
    	let br3;
    	let t28;
    	let p10;
    	let t29;
    	let span0;
    	let a0;
    	let t31;
    	let t32;
    	let div4;
    	let h12;
    	let t34;
    	let p11;
    	let t36;
    	let br4;
    	let t37;
    	let p12;
    	let t39;
    	let br5;
    	let t40;
    	let p13;
    	let t41;
    	let span1;
    	let a1;
    	let t43;
    	let t44;
    	let section2;
    	let div8;
    	let div6;
    	let img1;
    	let img1_src_value;
    	let t45;
    	let div7;
    	let h13;
    	let t47;
    	let p14;
    	let t49;
    	let br6;
    	let t50;
    	let p15;

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			div2 = element("div");
    			div0 = element("div");
    			h10 = element("h1");
    			h10.textContent = "Zing je graag, maar klink je als een kraai? \n            Neem dan lessen bij Zangschool De Nachtegaal!";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Iedereen kan leren zingen, zolang je het maar veel en enthousiast onder begeleiding van  \n            de Nachtegaal pro’s doet. Zangschool De Nachtegaal is gehuisvest in Tilburg in een \n            voormalige kanarie volière waar al decennia lang muziek werd gemaakt door de \n            gele gevleugelde vrienden.";
    			t3 = space();
    			br0 = element("br");
    			t4 = space();
    			ul = element("ul");
    			li0 = element("li");
    			p1 = element("p");
    			p1.textContent = "Sinds kort worden hier zanglessen gegeven voor mensen die moeite hebben met:";
    			t6 = space();
    			li1 = element("li");
    			p2 = element("p");
    			p2.textContent = "- Ademhaling";
    			t8 = space();
    			li2 = element("li");
    			p3 = element("p");
    			p3.textContent = "- Ritme";
    			t10 = space();
    			li3 = element("li");
    			p4 = element("p");
    			p4.textContent = "- Uitspraak";
    			t12 = space();
    			li4 = element("li");
    			p5 = element("p");
    			p5.textContent = "- Vogels";
    			t14 = space();
    			li5 = element("li");
    			p6 = element("p");
    			p6.textContent = "- Toon";
    			t16 = space();
    			br1 = element("br");
    			t17 = space();
    			p7 = element("p");
    			p7.textContent = "Doe mee! En laat iedereen een poepje ruiken!";
    			t19 = space();
    			div1 = element("div");
    			img0 = element("img");
    			t20 = space();
    			section1 = element("section");
    			div5 = element("div");
    			div3 = element("div");
    			h11 = element("h1");
    			h11.textContent = "Doe de Vlaamse Gaai workshop!\n            Leer zingen als Geike Arnaert.";
    			t22 = space();
    			p8 = element("p");
    			p8.textContent = "Wil jij ook samen met jouw Pascal van Blof Zoutelande zingen? Doe dan \n            mee met de Vlaamse Gaai workshop. In deze workshop leer je in een dag \n            de tekst van Zoutelande en als je het goed doet, ga je zelfs karaoke \n            zingen onder begeleiding van onze nachtegaal pro’s";
    			t24 = space();
    			br2 = element("br");
    			t25 = space();
    			p9 = element("p");
    			p9.textContent = "Prijs: 112 euro";
    			t27 = space();
    			br3 = element("br");
    			t28 = space();
    			p10 = element("p");
    			t29 = text("Klik ");
    			span0 = element("span");
    			a0 = element("a");
    			a0.textContent = "hier";
    			t31 = text(" voor meer informatie.");
    			t32 = space();
    			div4 = element("div");
    			h12 = element("h1");
    			h12.textContent = "Ben jij fan van Heavy Metal en grunten?\n                Ga dan voor de Dode Mus workshop!";
    			t34 = space();
    			p11 = element("p");
    			p11.textContent = "Zijn bands zoals Iron Maiden, Judas Priest en Slayer geen onbekende voor\n                jou? Dan kunnen wij jou blij maken met een Dode Mus (workshop)! Tijdens\n                deze workshops leer je headbangen, een grote koptelefoon opzetten\n                en je haren zwart kleuren. Is dit iets voor jou?";
    			t36 = space();
    			br4 = element("br");
    			t37 = space();
    			p12 = element("p");
    			p12.textContent = "Prijs: 66,6 euro";
    			t39 = space();
    			br5 = element("br");
    			t40 = space();
    			p13 = element("p");
    			t41 = text("Klik ");
    			span1 = element("span");
    			a1 = element("a");
    			a1.textContent = "hier";
    			t43 = text(" voor meer informatie.");
    			t44 = space();
    			section2 = element("section");
    			div8 = element("div");
    			div6 = element("div");
    			img1 = element("img");
    			t45 = space();
    			div7 = element("div");
    			h13 = element("h1");
    			h13.textContent = "Nieuws: helaas lekkage in de volière.";
    			t47 = space();
    			p14 = element("p");
    			p14.textContent = "Door onbekende oorzaak lekt het in de volière. Hierdoor zijn we genoodzaakt om de lessen\n                onder een luxe partytent te doen. Deze partytent heeft een bovenkant waardoor het\n                regenwater niet ons hoofd raakt. Daarnaast kunnen wij de partytent uitbreiden met zijkanten\n                waardoor het regenwater ook niet onze zijkanten raakt.\n                De partytent staat in het grasveld waardoor je alleen maar laarzen mee hoeft te nemen";
    			t49 = space();
    			br6 = element("br");
    			t50 = space();
    			p15 = element("p");
    			p15.textContent = "Hier hoort waarschijnlijk nog tekst ofzo, maar hij is afgesneden dus vandaar deze opvul tekst";
    			add_location(h10, file$3, 8, 8, 155);
    			add_location(p0, file$3, 10, 8, 275);
    			add_location(br0, file$3, 14, 12, 610);
    			add_location(p1, file$3, 16, 20, 652);
    			add_location(li0, file$3, 16, 16, 648);
    			add_location(p2, file$3, 17, 20, 761);
    			add_location(li1, file$3, 17, 16, 757);
    			add_location(p3, file$3, 18, 20, 806);
    			add_location(li2, file$3, 18, 16, 802);
    			add_location(p4, file$3, 19, 20, 846);
    			add_location(li3, file$3, 19, 16, 842);
    			add_location(p5, file$3, 20, 20, 890);
    			add_location(li4, file$3, 20, 16, 886);
    			add_location(p6, file$3, 21, 20, 931);
    			add_location(li5, file$3, 21, 16, 927);
    			add_location(ul, file$3, 15, 12, 627);
    			add_location(br1, file$3, 23, 12, 980);
    			add_location(p7, file$3, 24, 12, 997);
    			attr_dev(div0, "class", "tekst");
    			add_location(div0, file$3, 7, 8, 127);
    			if (!src_url_equal(img0.src, img0_src_value = "img/section1-image.jpeg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "alt", "Zangschool De Nachtegaal");
    			add_location(img0, file$3, 27, 12, 1106);
    			attr_dev(div1, "class", "image");
    			add_location(div1, file$3, 26, 8, 1074);
    			attr_dev(div2, "class", "container");
    			add_location(div2, file$3, 6, 4, 95);
    			attr_dev(section0, "id", "home-section1");
    			attr_dev(section0, "class", "home-sec");
    			add_location(section0, file$3, 5, 0, 45);
    			add_location(h11, file$3, 35, 8, 1346);
    			add_location(p8, file$3, 37, 8, 1436);
    			add_location(br2, file$3, 41, 12, 1754);
    			add_location(p9, file$3, 42, 12, 1791);
    			add_location(br3, file$3, 43, 12, 1826);
    			attr_dev(a0, "href", "https://youtu.be/hWvM6de6mG8");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "class", "selected");
    			add_location(a0, file$3, 44, 26, 1877);
    			add_location(span0, file$3, 44, 20, 1871);
    			add_location(p10, file$3, 44, 12, 1863);
    			attr_dev(div3, "class", "tekst");
    			add_location(div3, file$3, 34, 8, 1318);
    			add_location(h12, file$3, 47, 12, 2047);
    			add_location(p11, file$3, 49, 12, 2158);
    			add_location(br4, file$3, 53, 16, 2490);
    			add_location(p12, file$3, 54, 12, 2527);
    			add_location(br5, file$3, 55, 12, 2563);
    			attr_dev(a1, "href", "https://youtu.be/hWvM6de6mG8");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "class", "selected");
    			add_location(a1, file$3, 56, 26, 2614);
    			add_location(span1, file$3, 56, 20, 2608);
    			add_location(p13, file$3, 56, 12, 2600);
    			attr_dev(div4, "class", "tekst2");
    			add_location(div4, file$3, 46, 8, 2014);
    			attr_dev(div5, "class", "container");
    			add_location(div5, file$3, 33, 4, 1286);
    			attr_dev(section1, "id", "home-section2");
    			attr_dev(section1, "class", "home-sec");
    			add_location(section1, file$3, 32, 0, 1236);
    			if (!src_url_equal(img1.src, img1_src_value = "img/section3-image.jpeg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "alt", "Zangschool De Nachtegaal");
    			add_location(img1, file$3, 64, 12, 2901);
    			attr_dev(div6, "class", "image");
    			add_location(div6, file$3, 63, 8, 2869);
    			add_location(h13, file$3, 67, 12, 3023);
    			add_location(p14, file$3, 68, 12, 3082);
    			add_location(br6, file$3, 73, 16, 3574);
    			add_location(p15, file$3, 74, 16, 3595);
    			attr_dev(div7, "class", "tekst");
    			add_location(div7, file$3, 66, 8, 2991);
    			attr_dev(div8, "class", "container");
    			add_location(div8, file$3, 62, 4, 2837);
    			attr_dev(section2, "id", "home-section3");
    			attr_dev(section2, "class", "home-sec");
    			add_location(section2, file$3, 61, 1, 2787);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div2);
    			append_dev(div2, div0);
    			append_dev(div0, h10);
    			append_dev(div0, t1);
    			append_dev(div0, p0);
    			append_dev(div0, t3);
    			append_dev(div0, br0);
    			append_dev(div0, t4);
    			append_dev(div0, ul);
    			append_dev(ul, li0);
    			append_dev(li0, p1);
    			append_dev(ul, t6);
    			append_dev(ul, li1);
    			append_dev(li1, p2);
    			append_dev(ul, t8);
    			append_dev(ul, li2);
    			append_dev(li2, p3);
    			append_dev(ul, t10);
    			append_dev(ul, li3);
    			append_dev(li3, p4);
    			append_dev(ul, t12);
    			append_dev(ul, li4);
    			append_dev(li4, p5);
    			append_dev(ul, t14);
    			append_dev(ul, li5);
    			append_dev(li5, p6);
    			append_dev(div0, t16);
    			append_dev(div0, br1);
    			append_dev(div0, t17);
    			append_dev(div0, p7);
    			append_dev(div2, t19);
    			append_dev(div2, div1);
    			append_dev(div1, img0);
    			insert_dev(target, t20, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div5);
    			append_dev(div5, div3);
    			append_dev(div3, h11);
    			append_dev(div3, t22);
    			append_dev(div3, p8);
    			append_dev(div3, t24);
    			append_dev(div3, br2);
    			append_dev(div3, t25);
    			append_dev(div3, p9);
    			append_dev(div3, t27);
    			append_dev(div3, br3);
    			append_dev(div3, t28);
    			append_dev(div3, p10);
    			append_dev(p10, t29);
    			append_dev(p10, span0);
    			append_dev(span0, a0);
    			append_dev(p10, t31);
    			append_dev(div5, t32);
    			append_dev(div5, div4);
    			append_dev(div4, h12);
    			append_dev(div4, t34);
    			append_dev(div4, p11);
    			append_dev(div4, t36);
    			append_dev(div4, br4);
    			append_dev(div4, t37);
    			append_dev(div4, p12);
    			append_dev(div4, t39);
    			append_dev(div4, br5);
    			append_dev(div4, t40);
    			append_dev(div4, p13);
    			append_dev(p13, t41);
    			append_dev(p13, span1);
    			append_dev(span1, a1);
    			append_dev(p13, t43);
    			insert_dev(target, t44, anchor);
    			insert_dev(target, section2, anchor);
    			append_dev(section2, div8);
    			append_dev(div8, div6);
    			append_dev(div6, img1);
    			append_dev(div8, t45);
    			append_dev(div8, div7);
    			append_dev(div7, h13);
    			append_dev(div7, t47);
    			append_dev(div7, p14);
    			append_dev(div7, t49);
    			append_dev(div7, br6);
    			append_dev(div7, t50);
    			append_dev(div7, p15);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section0);
    			if (detaching) detach_dev(t20);
    			if (detaching) detach_dev(section1);
    			if (detaching) detach_dev(t44);
    			if (detaching) detach_dev(section2);
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
    	validate_slots('Home_sec', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home_sec> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Home_sec extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home_sec",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/Docenten-sec.svelte generated by Svelte v3.55.1 */

    const file$2 = "src/components/Docenten-sec.svelte";

    function create_fragment$3(ctx) {
    	let section0;
    	let div0;
    	let h1;
    	let t1;
    	let br0;
    	let t2;
    	let p0;
    	let t4;
    	let section1;
    	let div3;
    	let div1;
    	let h30;
    	let t6;
    	let br1;
    	let t7;
    	let p1;
    	let t9;
    	let div2;
    	let iframe0;
    	let iframe0_src_value;
    	let t10;
    	let section2;
    	let div6;
    	let div4;
    	let h31;
    	let t12;
    	let br2;
    	let t13;
    	let p2;
    	let t15;
    	let div5;
    	let iframe1;
    	let iframe1_src_value;
    	let t16;
    	let section3;
    	let div9;
    	let div7;
    	let h32;
    	let t18;
    	let br3;
    	let t19;
    	let p3;
    	let t21;
    	let div8;
    	let iframe2;
    	let iframe2_src_value;

    	const block = {
    		c: function create() {
    			section0 = element("section");
    			div0 = element("div");
    			h1 = element("h1");
    			h1.textContent = "Docenten";
    			t1 = space();
    			br0 = element("br");
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Bij Zangschool De Nachtegaal hechten we veel waarde aan goede\n            begeleiding. Al onze docenten zijn geschoold en hebben een passie\n            voor muziek. Hieronder wordt ons team voorgesteld.";
    			t4 = space();
    			section1 = element("section");
    			div3 = element("div");
    			div1 = element("div");
    			h30 = element("h3");
    			h30.textContent = "Vera Vink";
    			t6 = space();
    			br1 = element("br");
    			t7 = space();
    			p1 = element("p");
    			p1.textContent = "Vera houdt van klassieke muziek en zingt als sopraan mee bij\n            het Brabants koor La Belle Trottoir. Bekijk hier deze Youtube video\n            om haar in actie te zien.";
    			t9 = space();
    			div2 = element("div");
    			iframe0 = element("iframe");
    			t10 = space();
    			section2 = element("section");
    			div6 = element("div");
    			div4 = element("div");
    			h31 = element("h3");
    			h31.textContent = "Karel Kwikstaart";
    			t12 = space();
    			br2 = element("br");
    			t13 = space();
    			p2 = element("p");
    			p2.textContent = "Karel is een echte rapper in hart en nieren en leert je rappen als\n            Extince of Snoop Dogg. Bekijk hier deze Youtube video om\n            Karel in actie te zien.";
    			t15 = space();
    			div5 = element("div");
    			iframe1 = element("iframe");
    			t16 = space();
    			section3 = element("section");
    			div9 = element("div");
    			div7 = element("div");
    			h32 = element("h3");
    			h32.textContent = "Berta Buizerd";
    			t18 = space();
    			br3 = element("br");
    			t19 = space();
    			p3 = element("p");
    			p3.textContent = "Ben jij ook zo fan van Oostenrijkse tiroler muziek?\n            Wil jij leren jodelen op een mooie groene berg? Neem dan lessen\n            bij Berta Buizerd!";
    			t21 = space();
    			div8 = element("div");
    			iframe2 = element("iframe");
    			add_location(h1, file$2, 7, 8, 104);
    			add_location(br0, file$2, 8, 8, 130);
    			add_location(p0, file$2, 9, 8, 143);
    			attr_dev(div0, "class", "tekst");
    			add_location(div0, file$2, 6, 4, 76);
    			attr_dev(section0, "id", "doc-section1");
    			add_location(section0, file$2, 5, 0, 44);
    			add_location(h30, file$2, 19, 8, 495);
    			add_location(br1, file$2, 20, 8, 522);
    			add_location(p1, file$2, 21, 8, 535);
    			attr_dev(div1, "class", "tekst");
    			add_location(div1, file$2, 18, 4, 467);
    			attr_dev(iframe0, "width", "460");
    			attr_dev(iframe0, "height", "250");
    			if (!src_url_equal(iframe0.src, iframe0_src_value = "https://www.youtube.com/embed/hWvM6de6mG8")) attr_dev(iframe0, "src", iframe0_src_value);
    			attr_dev(iframe0, "frameborder", "0");
    			attr_dev(iframe0, "allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture");
    			iframe0.allowFullscreen = true;
    			add_location(iframe0, file$2, 26, 8, 764);
    			attr_dev(div2, "class", "video");
    			add_location(div2, file$2, 25, 4, 736);
    			attr_dev(div3, "class", "container");
    			add_location(div3, file$2, 17, 0, 439);
    			attr_dev(section1, "id", "doc-section2");
    			attr_dev(section1, "class", "doc-sec");
    			add_location(section1, file$2, 16, 0, 395);
    			add_location(h31, file$2, 35, 8, 1116);
    			add_location(br2, file$2, 36, 8, 1150);
    			add_location(p2, file$2, 37, 8, 1163);
    			attr_dev(div4, "class", "tekst");
    			add_location(div4, file$2, 34, 4, 1088);
    			attr_dev(iframe1, "width", "460");
    			attr_dev(iframe1, "height", "250");
    			if (!src_url_equal(iframe1.src, iframe1_src_value = "https://www.youtube.com/embed/hWvM6de6mG8")) attr_dev(iframe1, "src", iframe1_src_value);
    			attr_dev(iframe1, "frameborder", "0");
    			attr_dev(iframe1, "allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture");
    			iframe1.allowFullscreen = true;
    			add_location(iframe1, file$2, 42, 8, 1385);
    			attr_dev(div5, "class", "video");
    			add_location(div5, file$2, 41, 4, 1357);
    			attr_dev(div6, "class", "container");
    			add_location(div6, file$2, 33, 0, 1060);
    			attr_dev(section2, "id", "doc-section3");
    			attr_dev(section2, "class", "doc-sec");
    			add_location(section2, file$2, 32, 0, 1016);
    			add_location(h32, file$2, 50, 8, 1736);
    			add_location(br3, file$2, 51, 8, 1767);
    			add_location(p3, file$2, 52, 8, 1780);
    			attr_dev(div7, "class", "tekst");
    			add_location(div7, file$2, 49, 4, 1708);
    			attr_dev(iframe2, "width", "460");
    			attr_dev(iframe2, "height", "250");
    			if (!src_url_equal(iframe2.src, iframe2_src_value = "https://www.youtube.com/embed/hWvM6de6mG8")) attr_dev(iframe2, "src", iframe2_src_value);
    			attr_dev(iframe2, "frameborder", "0");
    			attr_dev(iframe2, "allow", "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture");
    			iframe2.allowFullscreen = true;
    			add_location(iframe2, file$2, 57, 8, 1989);
    			attr_dev(div8, "class", "video");
    			add_location(div8, file$2, 56, 4, 1961);
    			attr_dev(div9, "class", "container");
    			add_location(div9, file$2, 48, 0, 1680);
    			attr_dev(section3, "id", "doc-section4");
    			attr_dev(section3, "class", "doc-sec");
    			add_location(section3, file$2, 47, 0, 1636);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section0, anchor);
    			append_dev(section0, div0);
    			append_dev(div0, h1);
    			append_dev(div0, t1);
    			append_dev(div0, br0);
    			append_dev(div0, t2);
    			append_dev(div0, p0);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, section1, anchor);
    			append_dev(section1, div3);
    			append_dev(div3, div1);
    			append_dev(div1, h30);
    			append_dev(div1, t6);
    			append_dev(div1, br1);
    			append_dev(div1, t7);
    			append_dev(div1, p1);
    			append_dev(div3, t9);
    			append_dev(div3, div2);
    			append_dev(div2, iframe0);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, section2, anchor);
    			append_dev(section2, div6);
    			append_dev(div6, div4);
    			append_dev(div4, h31);
    			append_dev(div4, t12);
    			append_dev(div4, br2);
    			append_dev(div4, t13);
    			append_dev(div4, p2);
    			append_dev(div6, t15);
    			append_dev(div6, div5);
    			append_dev(div5, iframe1);
    			insert_dev(target, t16, anchor);
    			insert_dev(target, section3, anchor);
    			append_dev(section3, div9);
    			append_dev(div9, div7);
    			append_dev(div7, h32);
    			append_dev(div7, t18);
    			append_dev(div7, br3);
    			append_dev(div7, t19);
    			append_dev(div7, p3);
    			append_dev(div9, t21);
    			append_dev(div9, div8);
    			append_dev(div8, iframe2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section0);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(section1);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(section2);
    			if (detaching) detach_dev(t16);
    			if (detaching) detach_dev(section3);
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
    	validate_slots('Docenten_sec', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Docenten_sec> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Docenten_sec extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Docenten_sec",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Prijzen-sec.svelte generated by Svelte v3.55.1 */

    const file$1 = "src/components/Prijzen-sec.svelte";

    function create_fragment$2(ctx) {
    	let section;
    	let div3;
    	let div0;
    	let h20;
    	let t1;
    	let h50;
    	let t3;
    	let p0;
    	let t5;
    	let a0;
    	let t7;
    	let div1;
    	let h21;
    	let t9;
    	let h51;
    	let t11;
    	let p1;
    	let t13;
    	let a1;
    	let t15;
    	let div2;
    	let h22;
    	let t17;
    	let h52;
    	let t19;
    	let p2;
    	let t21;
    	let a2;

    	const block = {
    		c: function create() {
    			section = element("section");
    			div3 = element("div");
    			div0 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Proefles";
    			t1 = space();
    			h50 = element("h5");
    			h50.textContent = "€ 15,-";
    			t3 = space();
    			p0 = element("p");
    			p0.textContent = "Tijdens de proefles zal de docent uitleg geven over de verschillende technieken die worden gebruikt bij het zingen en krijg je de kans om deze technieken zelf uit te proberen. Je zult ook leren over ademhalingstechnieken en hoe deze belangrijk zijn voor een goede zangstem.";
    			t5 = space();
    			a0 = element("a");
    			a0.textContent = "Bestel";
    			t7 = space();
    			div1 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Groeps les";
    			t9 = space();
    			h51 = element("h5");
    			h51.textContent = "€ 20,-";
    			t11 = space();
    			p1 = element("p");
    			p1.textContent = "De groepslessen zijn voor iedereen die graag in een groep zingt. Je leert samen met andere zangers de basis van het zingen en je zult merken dat je hierdoor sneller vooruit gaat. De groepslessen zijn voor iedereen die graag in een groep zingt. Je leert samen met andere zangers de basis van het zingen en je zult merken dat je hierdoor sneller vooruit gaat.";
    			t13 = space();
    			a1 = element("a");
    			a1.textContent = "Bestel";
    			t15 = space();
    			div2 = element("div");
    			h22 = element("h2");
    			h22.textContent = "Persoonlijke les";
    			t17 = space();
    			h52 = element("h5");
    			h52.textContent = "€ 45,-";
    			t19 = space();
    			p2 = element("p");
    			p2.textContent = "Zangschool de Nachtegaal biedt één-op-één zanglessen voor iedereen die graag persoonlijke begeleiding wil bij het leren zingen. Tijdens deze lessen krijg je alle aandacht van onze ervaren docenten, die je zullen helpen bij het ontwikkelen van de juiste technieken en het verbeteren van jouw zangstem.";
    			t21 = space();
    			a2 = element("a");
    			a2.textContent = "Bestel";
    			add_location(h20, file$1, 7, 12, 108);
    			add_location(h50, file$1, 8, 12, 138);
    			add_location(p0, file$1, 9, 12, 166);
    			attr_dev(a0, "href", "https://youtu.be/hWvM6de6mG8");
    			attr_dev(a0, "target", "_blank");
    			attr_dev(a0, "rel", "noreferrer");
    			add_location(a0, file$1, 10, 12, 459);
    			add_location(div0, file$1, 6, 8, 90);
    			add_location(h21, file$1, 13, 12, 583);
    			add_location(h51, file$1, 14, 12, 615);
    			add_location(p1, file$1, 15, 12, 643);
    			attr_dev(a1, "href", "https://youtu.be/hWvM6de6mG8");
    			attr_dev(a1, "target", "_blank");
    			attr_dev(a1, "rel", "noreferrer");
    			add_location(a1, file$1, 16, 12, 1020);
    			add_location(div1, file$1, 12, 8, 565);
    			add_location(h22, file$1, 19, 8, 1132);
    			add_location(h52, file$1, 20, 8, 1166);
    			add_location(p2, file$1, 21, 8, 1190);
    			attr_dev(a2, "href", "https://youtu.be/hWvM6de6mG8");
    			attr_dev(a2, "target", "_blank");
    			attr_dev(a2, "rel", "noreferrer");
    			add_location(a2, file$1, 22, 8, 1506);
    			add_location(div2, file$1, 18, 4, 1118);
    			attr_dev(div3, "class", "prijzen-wrapper");
    			add_location(div3, file$1, 5, 4, 52);
    			attr_dev(section, "id", "prijzen-sec");
    			add_location(section, file$1, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			append_dev(section, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h20);
    			append_dev(div0, t1);
    			append_dev(div0, h50);
    			append_dev(div0, t3);
    			append_dev(div0, p0);
    			append_dev(div0, t5);
    			append_dev(div0, a0);
    			append_dev(div3, t7);
    			append_dev(div3, div1);
    			append_dev(div1, h21);
    			append_dev(div1, t9);
    			append_dev(div1, h51);
    			append_dev(div1, t11);
    			append_dev(div1, p1);
    			append_dev(div1, t13);
    			append_dev(div1, a1);
    			append_dev(div3, t15);
    			append_dev(div3, div2);
    			append_dev(div2, h22);
    			append_dev(div2, t17);
    			append_dev(div2, h52);
    			append_dev(div2, t19);
    			append_dev(div2, p2);
    			append_dev(div2, t21);
    			append_dev(div2, a2);
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
    	validate_slots('Prijzen_sec', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Prijzen_sec> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Prijzen_sec extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Prijzen_sec",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/components/Navbar.svelte generated by Svelte v3.55.1 */
    const file = "src/components/Navbar.svelte";

    // (29:38) 
    function create_if_block_4(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Contact";
    			add_location(h1, file, 29, 1, 861);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(29:38) ",
    		ctx
    	});

    	return block;
    }

    // (27:38) 
    function create_if_block_3(ctx) {
    	let prijzensec;
    	let current;
    	prijzensec = new Prijzen_sec({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(prijzensec.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(prijzensec, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(prijzensec.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(prijzensec.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(prijzensec, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(27:38) ",
    		ctx
    	});

    	return block;
    }

    // (25:41) 
    function create_if_block_2(ctx) {
    	let h1;

    	const block = {
    		c: function create() {
    			h1 = element("h1");
    			h1.textContent = "Zanglessen";
    			add_location(h1, file, 25, 1, 743);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h1, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(25:41) ",
    		ctx
    	});

    	return block;
    }

    // (23:38) 
    function create_if_block_1(ctx) {
    	let docentensec;
    	let current;
    	docentensec = new Docenten_sec({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(docentensec.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(docentensec, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(docentensec.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(docentensec.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(docentensec, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(23:38) ",
    		ctx
    	});

    	return block;
    }

    // (21:2) {#if activeItem === 'Home'}
    function create_if_block(ctx) {
    	let homesec;
    	let current;
    	homesec = new Home_sec({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(homesec.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(homesec, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(homesec.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(homesec.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(homesec, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(21:2) {#if activeItem === 'Home'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let nav;
    	let div;
    	let img;
    	let img_src_value;
    	let t0;
    	let h1;
    	let t2;
    	let tabs;
    	let t3;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;

    	tabs = new Tabs({
    			props: {
    				activeItem: /*activeItem*/ ctx[0],
    				items: /*items*/ ctx[1]
    			},
    			$$inline: true
    		});

    	tabs.$on("tabChange", /*tabChange*/ ctx[2]);

    	const if_block_creators = [
    		create_if_block,
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_if_block_4
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*activeItem*/ ctx[0] === 'Home') return 0;
    		if (/*activeItem*/ ctx[0] === 'Docenten') return 1;
    		if (/*activeItem*/ ctx[0] === 'Zanglessen') return 2;
    		if (/*activeItem*/ ctx[0] === 'Prijzen') return 3;
    		if (/*activeItem*/ ctx[0] === 'Contact') return 4;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div = element("div");
    			img = element("img");
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "Zangschool De Nachtegaal";
    			t2 = space();
    			create_component(tabs.$$.fragment);
    			t3 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			if (!src_url_equal(img.src, img_src_value = "img/logo.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "Zangschool De Nachtegaal");
    			add_location(img, file, 14, 8, 416);
    			add_location(h1, file, 15, 8, 480);
    			attr_dev(div, "class", "top-nav");
    			add_location(div, file, 13, 4, 386);
    			add_location(nav, file, 12, 0, 376);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div);
    			append_dev(div, img);
    			append_dev(div, t0);
    			append_dev(div, h1);
    			append_dev(nav, t2);
    			mount_component(tabs, nav, null);
    			insert_dev(target, t3, anchor);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const tabs_changes = {};
    			if (dirty & /*activeItem*/ 1) tabs_changes.activeItem = /*activeItem*/ ctx[0];
    			tabs.$set(tabs_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tabs.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tabs.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_component(tabs);
    			if (detaching) detach_dev(t3);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Navbar', slots, []);
    	let items = ['Home', 'Docenten', 'Zanglessen', 'Prijzen', 'Contact'];
    	let activeItem = 'Home';
    	const tabChange = e => $$invalidate(0, activeItem = e.detail);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Tabs,
    		HomeSec: Home_sec,
    		DocentenSec: Docenten_sec,
    		PrijzenSec: Prijzen_sec,
    		items,
    		activeItem,
    		tabChange
    	});

    	$$self.$inject_state = $$props => {
    		if ('items' in $$props) $$invalidate(1, items = $$props.items);
    		if ('activeItem' in $$props) $$invalidate(0, activeItem = $$props.activeItem);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [activeItem, items, tabChange];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.55.1 */

    function create_fragment(ctx) {
    	let navbar;
    	let current;
    	navbar = new Navbar({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(navbar.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(navbar, detaching);
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

    	$$self.$capture_state = () => ({ Navbar });
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
