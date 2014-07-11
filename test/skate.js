(function () {
  'use strict';


  // Setup
  // -----

  function add(name) {
    return document.body.appendChild(document.createElement(name));
  }

  function remove (element) {
    element.parentNode.removeChild(element);
    return element;
  }

  function dispatchEvent (name, element) {
    var e = document.createEvent('CustomEvent');
    e.initCustomEvent(name, true, true, {});
    element.dispatchEvent(e);
  }

  afterEach(function () {
    skate.destroy();
    document.querySelector('body').innerHTML = '';
  });


  // Specs
  // -----

  describe('Registration', function () {
    it('Should not allow you to register the same component more than once.', function () {
      var multiple = false;

      skate('div');

      try {
        skate('div');
        multiple = true;
      } catch (e) {}

      assert(!multiple, 'Multiple "div" components were registered.');
    });

    it('should destroy all listeners when destroy() called', function () {
      skate('div', function (element) {
        element.test = true;
      });

      skate.destroy();
      assert(skate.init(add('div')).test === undefined);
    });

    it('should unregister the specified listener when unregister() called', function () {
      skate('div', function (element) {
        element.test = true;
      });

      skate.unregister('div');
      assert(skate.init(add('div')).test === undefined);
    });
  });

  describe('Using components', function () {
    function assertType (type, shouldEqual) {
      it('type: ' + type, function () {
        var calls = 0;

        skate('my-element', {
          type: type,
          ready: function (el) {
            ++calls;
          }
        });

        var el1 = document.createElement('my-element');
        skate.init(el1);

        var el2 = document.createElement('div');
        el2.setAttribute('my-element', '');
        skate.init(el2);

        var el3 = document.createElement('div');
        el3.className = 'my-element';
        skate.init(el3);

        calls.should.equal(shouldEqual);
      });
    }

    describe('tags, attributes and classes', function () {
      assertType(skate.types.ANY, 3);
      assertType(skate.types.TAG, 1);
      assertType(skate.types.ATTR, 1);
      assertType(skate.types.CLASS, 1);
      assertType(skate.types.NOTAG, 2);
      assertType(skate.types.NOATTR, 2);
      assertType(skate.types.NOCLASS, 2);

      it('should not initialise a single component more than once on a single element', function () {
        var calls = 0;

        skate('my-element', {
          ready: function () {
            ++calls;
          }
        });

        var el = document.createElement('my-element');
        el.setAttribute('my-element', '');
        el.className = 'my-element';
        skate.init(el);

        calls.should.equal(1);
      });
    });
  });

  describe('Lifecycle Callbacks', function () {
    it('Should trigger ready before the element is shown.', function (done) {
      skate('div', {
        ready: function (element) {
          assert(element.className.split(' ').indexOf('__skate') === -1, 'Class found');
          done();
        }
      });

      add('div');
    });

    it('Should trigger insert after the element is shown.', function (done) {
      skate('div', {
        insert: function (element) {
          assert(element.className.split(' ').indexOf('__skate') > -1, 'Class not found');
          done();
        }
      });

      add('div');
    });

    it('Should trigger removed when the element is removed.', function (done) {
      skate('div', {
        remove: function () {
          assert(true);
          done();
        }
      });

      var el = add('div');
      skate.init(el);
      remove(el);
    });
  });


  describe('DOM node interaction.', function () {
    it('Modules should pick up nodes already in the DOM.', function (done) {
      add('div');

      skate('div', {
        insert: function (element) {
          assert(true);
          done();
        }
      });
    });

    it('Modules should pick up nodes inserted into the DOM after they are defined.', function (done) {
      skate('div', {
        insert: function (element) {
          assert(true);
          done();
        }
      });

      add('div');
    });

    it('Should pick up descendants that are inserted as part of an HTML block.', function (done) {
      skate('sub-element', {
        insert: function () {
          assert(true);
          done();
        }
      });

      document.body.innerHTML = '<div><child><sub-element></sub-element></child></div>';
    });

    it('Should pick up descendants that are removed as part of an HTML block.', function (done) {
      skate('sub-element', {
        remove: function () {
          assert(true);
          done();
        }
      });

      document.body.innerHTML = '<div><child><sub-element></sub-element></child></div>';
      var div = document.querySelector('div');
      div.parentNode.removeChild(div);
    });
  });

  describe('Async ready callback.', function () {
    it('Ready event should be async and provide a done callback.', function (done) {
      var ok = false;

      skate('div', {
        ready: function (element, next) {
          setTimeout(function () {
            ok = true;
            next();
          }, 100);
        },

        insert: function () {
          assert(ok, 'Ready not called before insert.');
          done();
        }
      });

      add('div');
    });
  });

  describe('Synchronous initialisation', function () {
    it('Should take traversable items', function () {
      var initialised = false;

      skate('div', {
        insert: function () {
          ++initialised;
        }
      });

      add('div');
      add('div');

      skate.init(document.querySelectorAll('div'));
      initialised.should.equal(2);
    });

    it('Should take an element', function () {
      var initialised = 0;

      skate('div', {
        insert: function () {
          ++initialised;
        }
      });

      skate.init(add('div'));
      assert(initialised);
    });
  });

  describe('Attribute listeners', function () {
    it('Should listen to changes in specified attributes', function (done) {
      skate('div', {
        attributes: {
          open: {
            insert: function (element, data) {
              data.newValue.should.equal('insert');
              element.setAttribute('open', 'update');
            },
            update: function (element, data) {
              data.oldValue.should.equal('insert');
              data.newValue.should.equal('update');
              element.removeAttribute('open');
            },
            remove: function (element, data) {
              data.oldValue.should.equal('update');
              done();
            }
          }
        }
      });

      add('div').setAttribute('open', 'insert');
    });

    it('Should accept a function insead of an object for a particular attribute definition.', function (done) {
      var init = false;

      skate('div', {
        attributes: {
          open: function (element, data) {
            if (data.type === 'insert') {
              setTimeout(function () {
                element.setAttribute('open', 'update');
              });
            } else if (data.type === 'update') {
              setTimeout(function () {
                element.removeAttribute('open');
              });
            } else if (data.type === 'remove') {
              assert(true);
              done();
            }
          }
        }
      });

      document.body.innerHTML = '<div id="attrtest" open="init"></div>';
    });

    it('Should accept a function insead of an object for the entire attribute definition.', function (done) {
      var init = false;

      skate('div', {
        attributes: function (element, data) {
          if (data.type === 'insert') {
            setTimeout(function () {
              element.setAttribute('open', 'update');
            });
          } else if (data.type === 'update') {
            setTimeout(function () {
              element.removeAttribute('open');
            });
          } else if (data.type === 'remove') {
            assert(true);
            done();
          }
        }
      });

      document.body.innerHTML = '<div id="attrtest" open="init"></div>';
    });
  });

  describe('Extending', function () {
    it('Instead of using a custom tag, an attribute can be used to signify behaviour.', function () {
      var init = false;

      skate('datepicker', function () {
        init = true;
      });

      var div = document.createElement('div');
      div.setAttribute('datepicker', 'true');
      document.body.appendChild(div);
      skate.init(div);

      init.should.equal(true);
    });
  });

  describe('Instantiation', function () {
    it('Should return a constructor', function () {
      skate('div').should.be.a('function');
    });

    it('Should return a new element when constructed.', function () {
      var Div = skate('div');
      var div = new Div();
      div.nodeName.should.equal('DIV');
    });

    it('Should synchronously initialise the new element.', function () {
      var called = false;
      var Div = skate('div', {
        prototype: {
          someMethod: function () {
            called = true;
          }
        }
      });

      new Div().someMethod();
      called.should.equal(true);
    });

    it('Should call lifecycle callbacks at appropriate times.', function (done) {
      var ready = false;
      var insert = false;
      var remove = false;
      var Div = skate('div', {
        ready: function () {
          ready = true;
        },
        insert: function () {
          insert = true;
        },
        remove: function () {
          remove = true;
        }
      });

      var div = new Div();
      ready.should.equal(true, 'Should call ready');
      insert.should.equal(false, 'Should not call insert');
      remove.should.equal(false, 'Should not call remove');

      document.body.appendChild(div);
      skate.init(div);
      insert.should.equal(true, 'Should call insert');
      remove.should.equal(false, 'Should not call remove');

      div.parentNode.removeChild(div);

      // Mutation Observers are async.
      setTimeout(function () {
        remove.should.equal(true, 'Should call remove');
        done();
      });
    });

    it('Should initialise multiple instances of the same type of element (possible bug).', function (done) {
      var numReady = 0;
      var numInsert = 0;
      var numRemove = 0;
      var Div = skate('div', {
        ready: function () {
          ++numReady;
        },
        insert: function () {
          ++numInsert;
        },
        remove: function () {
          ++numRemove;
        }
      });

      var div1 = new Div();
      var div2 = new Div();

      document.body.appendChild(div1);
      document.body.appendChild(div2);

      skate.init([div1, div2]);

      div1.parentNode.removeChild(div1);
      div2.parentNode.removeChild(div2);

      assert(numReady === 2, 'Ready not called');
      assert(numInsert === 2, 'Insert not called');

      // Mutation Observers are async.
      setTimeout(function () {
        assert(numRemove === 2, 'Remove not called');
        done();
      });
    });

    it('shouldn not allow ids that may have the same names as functions / properties on the object prototype', function () {
      var idsToSkate = ['hasOwnProperty', 'watch'];
      var idsToCheck = {};

      var div = document.createElement('div');
      div.className = idsToSkate.join(' ');

      idsToSkate.forEach(function (id) {
        skate(id, {
          ready: function () {
            idsToCheck[id] = true;
          }
        });
      });

      skate.init(div);

      idsToSkate.forEach(function (id) {
        idsToCheck[id].should.equal(true);
      });
    });
  });

  describe('Returning a constructor', function () {
    it('Should return a constructor that extends a native element.', function () {
      var Div = skate('div', {
        prototype: {
          func1: function () {}
        }
      });

      Div.prototype.func2 = function () {};

      expect(Div.prototype.func1).to.be.a('function');
      expect(Div.prototype.func2).to.be.a('function');

      var div = new Div();

      expect(div.func1).to.be.a('function');
      expect(div.func2).to.be.a('function');

      div.func1.should.equal(Div.prototype.func1);
      div.func2.should.equal(Div.prototype.func2);
    });

    it('Should not allow the constructor property to be enumerated.', function () {
      var Div = skate('div');

      for (var prop in Div.prototype) {
        if (prop === 'constructor') {
          throw new Error('The constructor property should not be enumerable.');
        }
      }
    });

    it('Should affect the element prototype even if it was not constructed using the constructor.', function () {
      var Div = skate('div', {
        prototype: {
          func1: function () {}
        }
      });

      Div.prototype.func2 = function () {};

      var div = new Div();

      div.func1.should.be.a('function');
      div.func2.should.be.a('function');
    });

    it('should allow the overwriting of the prototype', function () {
      var Div = skate('div');

      Div.prototype = {
        func: function () {}
      };

      var div = new Div();

      div.func.should.be.a('function');
    });
  });

  describe('Doing something when an element is augmented by a particular component.', function () {
    it('Should execute a callback if an element is already augmented.', function (done) {
      var Div = skate('div', {
        prototype: {
          test: function () {}
        }
      });

      var div = new Div();
      document.body.appendChild(div);
      skate.init(div);

      skate.when(div).is('div').then(function (element) {
        expect(element.test).to.be.a('function');
        done();
      });
    });

    it('Should execute a callback when an element will be augmented.', function (done) {
      var Div = skate('div', {
        prototype: {
          test: function () {}
        }
      });

      var div = new Div();

      skate.when(div).is('div').then(function (element) {
        expect(element.test).to.be.a('function');
        done();
      });

      document.body.appendChild(div);
    });

    // Safety net to ensure this never happens.
    it('Should not execute when callbacks that were previously executed.', function () {
      var Div = skate('div');
      var div = new Div();
      var executions = 0;
      var callbacks = skate.when(div).is('div').then(incrementExecutions);

      document.body.appendChild(div);
      callbacks.then(incrementExecutions);
      executions.should.equal(2);

      function incrementExecutions () {
        ++executions;
      }
    });
  });

  describe('Events', function () {
    it('Should bind events', function () {
      var numTriggered = 0;
      var Div = skate('div', {
        events: {
          test: function (element, e) {
            ++numTriggered;
          }
        }
      });

      var div = new Div();

      dispatchEvent('test', div);
      numTriggered.should.equal(1);
    });

    it('Should allow you to re-add the element back into the DOM', function () {
      var numTriggered = 0;
      var Div = skate('div', {
        events: {
          test: function (element, e) {
            ++numTriggered;
          }
        }
      });

      var div = new Div();
      document.body.appendChild(div);
      var par = div.parentNode;

      par.removeChild(div);
      par.appendChild(div);
      dispatchEvent('test', div);
      numTriggered.should.equal(1);
    });

    it('should support delegate events', function () {
      var dispatched = 0;
      var MyComponent = skate('my-component', {
        ready: function (element) {
          var a = document.createElement('a');
          element.appendChild(a);
        },
        events: {
          'click a': function (element, e) {
            element.tagName.should.equal('MY-COMPONENT');
            e.target.tagName.should.equal('A');
            ++dispatched;
          }
        }
      });

      var inst = add('my-component');
      skate.init(inst);
      dispatchEvent('click', inst);
      dispatchEvent('click', inst.querySelector('a'));
      dispatched.should.equal(1);
    });
  });

  describe('SVG', function () {
    it('should work for any SVG element', function () {
      var div = document.createElement('div');
      div.innerHTML = '<svg width="100" height="100">' +
          '<circle my-circle="true" cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />' +
          '<circle my-circle="true" class="my-circle" cx="50" cy="50" r="40" stroke="green" stroke-width="4" fill="yellow" />' +
        '</svg>';

      skate('my-circle', {
        ready: function (element) {
          element.getAttribute('my-circle').should.equal('true');
        }
      });

      skate.init(div);
    });
  });

  describe('Templates', function () {
    it('should not replacing existing content if there is no template', function () {
      var El = skate('my-element');

      document.body.innerHTML = '<my-element>my content</my-element>';

      var el = document.querySelector('my-element');
      skate.init(el);
      el.innerHTML.should.equal('my content');
    });

    it('should allow a string', function () {
      var El = skate('my-element', {
        template: 'my template'
      });

      var el = new El();
      el.innerHTML.should.equal('my template');
    });

    it('should allowa function that is assumed that it will do the templating', function () {
      var El = skate('my-element', {
        template: function (element) {
          element.innerHTML = 'my template';
        }
      });

      var el = new El();
      el.innerHTML.should.equal('my template');
    });

    it('should replace the first matched <content> tag with the content passed to the custom element', function () {
      var El = skate('my-element', {
        template: '<span><content></content><content></content></span>'
      });

      document.body.innerHTML = '<my-element>my content</my-element>';

      var el = document.querySelector('my-element');
      skate.init(el);
      el.innerHTML.should.equal('<span>my content</span>');
    });

    it('should allow first children of the main element to be selected by the <content> tags', function () {
      var El = skate('my-element', {
        template: '<content select="some descendant"></content>'
      });

      document.body.innerHTML = '<my-element><some><descendant></descendant></some></my-element>';

      var el = document.querySelector('my-element');
      skate.init(el);
      el.innerHTML.should.equal('');
    });
  });
})();
