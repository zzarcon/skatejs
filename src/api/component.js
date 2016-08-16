import {
  connected as $connected,
  created as $created,
  props as $props,
  renderer as $renderer,
  rendererDebounced as $rendererDebounced,
} from '../util/symbols';
import { customElementsV0 } from '../util/support';
import assign from '../util/assign';
import data from '../util/data';
import debounce from '../util/debounce';
import getOwnPropertyDescriptors from '../util/get-own-property-descriptors';

function Component () {
  const elem = HTMLElement.call(this);
  if (!Object.setPrototypeOf) {
    const ctor = this.constructor;
    Object.defineProperty(elem, 'constructor', { configurable: true, value: ctor, writable: false });
    Object.defineProperties(elem, getOwnPropertyDescriptors(this.constructor.prototype));
  }
  elem.createdCallback();
  return elem;
}

Component.prototype = Object.create(HTMLElement.prototype);

assign(Component, {
  observedAttributes: [],
  props: {},

  extend(definition = {}, Base = this) {
    // let Ctor;

    // if (Object.setPrototypeOf) {
    //   Ctor = class extends Base {};
    // } else {
    //   Ctor = function() {
    //     const elem = HTMLElement.call(this);
    //     Object.defineProperty(elem, 'constructor', { configurable: true, value: Ctor, writable: false });
    //     Object.defineProperties(elem, getOwnPropertyDescriptors(Ctor.prototype));
    //     elem.createdCallback();
    //     return elem;
    //   };
    //   Ctor.prototype = Object.create(Base.prototype);
    //   Object.defineProperty(Ctor.prototype, 'constructor', { configurable: true, value: Ctor, writable: false });
    //   Object.defineProperties(Ctor, getOwnPropertyDescriptors(Base));
    //   Object.defineProperties(Ctor.prototype, getOwnPropertyDescriptors(Base.prototype));
    // }

    const Ctor = function () {
      return Base.call(this);
    };
    Ctor.prototype = Object.create(Base.prototype);
    Object.defineProperty(Ctor.prototype, 'constructor', { configurable: true, value: Ctor, writable: false });
    Object.defineProperties(Ctor, getOwnPropertyDescriptors(Base));
    Object.defineProperties(Ctor, getOwnPropertyDescriptors(definition));
    Object.defineProperties(Ctor.prototype, getOwnPropertyDescriptors(Base.prototype));
    Object.defineProperties(Ctor.prototype, getOwnPropertyDescriptors(definition.prototype));

    return Ctor;
  },

  // This is a default implementation that does strict equality copmarison on
  // previous props and next props. It synchronously renders on the first prop
  // that is different and returns immediately.
  updated(elem, prev) {
    if (!prev) {
      return true;
    }

    for (const name in prev) { // eslint-disable-line no-restricted-syntax
      if (prev[name] !== elem[name]) {
        return true;
      }
    }
  },
});

assign(Component.prototype, {
  connectedCallback() {
    const ctor = this.constructor;
    const { attached } = ctor;
    const render = ctor[$renderer];
    this[$connected] = true;
    if (typeof render === 'function') {
      render(this);
    }
    if (typeof attached === 'function') {
      attached(this);
    }
  },

  disconnectedCallback() {
    const { detached } = this.constructor;
    this[$connected] = false;
    if (typeof detached === 'function') {
      detached(this);
    }
  },

  attributeChangedCallback(name, oldValue, newValue) {
    const { attributeChanged, observedAttributes } = this.constructor;
    const propertyName = data(this, 'attributeLinks')[name];

    // In V0 we have to ensure the attribute is being observed.
    if (customElementsV0 && observedAttributes.indexOf(name) === -1) {
      return;
    }

    if (propertyName) {
      const propData = data(this, `api/property/${propertyName}`);

      // This ensures a property set doesn't cause the attribute changed
      // handler to run again once we set this flag. This only ever has a
      // chance to run when you set an attribute, it then sets a property and
      // then that causes the attribute to be set again.
      if (propData.syncingAttribute) {
        propData.syncingAttribute = false;
      } else {
        // Sync up the property.
        const propOpts = this.constructor.props[propertyName];
        propData.settingAttribute = true;
        this[propertyName] = newValue !== null && propOpts.deserialize ? propOpts.deserialize(newValue) : newValue;
      }
    }

    if (attributeChanged) {
      attributeChanged(this, { name, newValue, oldValue });
    }
  },

  createdCallback() {
    const elemData = data(this);
    const readyCallbacks = elemData.readyCallbacks;
    const Ctor = this.constructor;
    const { created, observedAttributes, props } = Ctor;

    // Ensures that this can never be called twice.
    if (this[$created]) return;
    this[$created] = true;

    // Set up a renderer that is debounced for property sets to call directly.
    this[$rendererDebounced] = debounce(Ctor[$renderer]);

    if (props) {
      Ctor[$props](this);
    }

    if (created) {
      created(this);
    }

    this.setAttribute('defined', '');

    if (readyCallbacks) {
      readyCallbacks.forEach(cb => cb(this));
      delete elemData.readyCallbacks;
    }

    // In v0 we must ensure the attributeChangedCallback is called for attrs
    // that aren't linked to props so that the callback behaves the same no
    // matter if v0 or v1 is being used.
    if (customElementsV0) {
      observedAttributes.forEach(name => {
        const propertyName = data(this, 'attributeLinks')[name];
        if (!propertyName) {
          this.attributeChangedCallback(name, null, this.getAttribute(name));
        }
      });
    }
  },

  attachedCallback() {
    this.connectedCallback();
  },

  detachedCallback() {
    this.disconnectedCallback();
  },
});

export default Component;
