'use strict';

/* binding */
const binding_method = window.addEventListener ? 'addEventListener' : 'attachEvent';
const event_prefix = binding_method !== 'addEventListener' ? 'on' : '';

function bind( el, type, fn, capture ) {
    el[ binding_method ]( event_prefix + type, fn, capture || false );
    return fn;
}

/* matching */
const vendor_match = Element.prototype.matches || Element.prototype.webkitMatchesSelector || Element.prototype.mozMatchesSelector || Element.prototype.msMatchesSelector || Element.prototype.oMatchesSelector;

function matches( el, selector ) {
    if ( !el || el.nodeType !== 1 ) {
        return false;
    }
    if ( vendor_match ) {
        return vendor_match.call( el, selector );
    }
    const nodes = document.querySelectorAll( selector, el.parentNode );
    for ( let i = 0; i < nodes.length; ++i ) {
        if ( nodes[ i ] === el ) {
            return true;
        }
    }
    return false;
}

/* closest */

function closest( element, selector, check_self, root ) {
    element = check_self ? {
        parentNode: element
    } : element;

    root = root || document;

    /* Make sure `element !== document` and `element != null`
       otherwise we get an illegal invocation */
    while ( ( element = element.parentNode ) && element !== document ) {
        if ( matches( element, selector ) ) {
            return element;
        }

        /* After `matches` on the edge case that
           the selector matches the root
           (when the root is not the document) */
        if ( element === root ) {
            return;
        }
    }
}

function string_list_to_hash( list, test ) {
    return list.length ? list.split( test || /[,|\s]+/g ).reduce( ( _hash, value ) => {
        _hash[ value ] = true;
        return _hash;
    }, {} ) : {};
}

function get_touch_delta( event, initial ) {
    const delta_x = ( event.touches[ 0 ].pageX - initial.x );
    const delta_y = ( event.touches[ 0 ].pageY - initial.y );
    return Math.sqrt( ( delta_x * delta_x ) + ( delta_y * delta_y ) );
}

const Emit = {
    touch_move_delta: 10,
    default_selector: 'a,button,input,[data-emit]',

    _initial_touch_point: null
};

Emit.monitor = function( element ) {
    this._element = element;
    bind( this._element, 'touchstart', this._handle_event.bind( this ) );
    bind( this._element, 'touchmove', this._handle_event.bind( this ) );
    bind( this._element, 'touchend', this._handle_event.bind( this ) );
    bind( this._element, 'click', this._handle_event.bind( this ) );
    bind( this._element, 'input', this._handle_event.bind( this ) );
    bind( this._element, 'submit', this._handle_event.bind( this ) );
};

Emit.on = Emit.addListener = Emit.addEventListener = Emit.bind = function( event, callback ) {
    this._events = this._events || {};
    this._events[ event ] = this._events[ event ] || [];
    this._events[ event ].push( callback );
    return this;
};

Emit.off = Emit.removeListener = Emit.removeEventListener = Emit.unbind = function( event, callback ) {
    this._events = this._events || {};
    const handlers = this._events[ event ] || [];
    const handler_index = handlers.indexOf( callback );
    if ( handler_index !== -1 ) {
        handlers.splice( handler_index, 1 );
    }
    return this;
};

Emit.emit = Emit.trigger = function( event /* ... args */ ) {
    this._events = this._events || {};
    const handlers = this._events[ event ] || [];
    handlers.forEach( handler => {
        handler.apply( this, Array.prototype.slice.call( arguments, 1 ) );
    } );
};

Emit._handle_event = function( event ) {
    const touches = event.touches;
    let delta = -1;

    if ( typeof event.propagationStoppedAt !== 'number' || isNaN( event.propagationStoppedAt ) ) {
        event.propagationStoppedAt = 100; // highest possible value
    }

    switch ( event.type ) {
        case 'touchstart':
            this._initial_touch_point = this._last_touch_point = {
                x: touches && touches.length ? touches[ 0 ].pageX : 0,
                y: touches && touches.length ? touches[ 0 ].pageY : 0
            };

            break;

        case 'touchmove':
            if ( touches && touches.length && this._initial_touch_point ) {
                delta = get_touch_delta( event, this._initial_touch_point );
                if ( delta > this._touch_move_delta ) {
                    this._initial_touch_point = null;
                }

                this._last_touch_point = {
                    x: touches[ 0 ].pageX,
                    y: touches[ 0 ].pageY
                };
            }

            break;

        case 'click':
        case 'touchend':
        case 'input':
        case 'submit':
            // eat any late-firing click events on touch devices
            if ( event.type === 'click' && this._last_touch_point ) {
                if ( event.touches && event.touches.length ) {
                    delta = get_touch_delta( event, this._last_touch_point );
                    if ( delta < this._touch_move_delta ) {
                        event.preventDefault();
                        event.stopPropagation();
                        return;
                    }
                }
            }

            // handle canceling touches that have moved too much
            if ( event.type === 'touchend' && !this._initial_touch_point ) {
                return;
            }

            let el = event.target || event.srcElement;

            let depth = -1;
            let handled = false;
            while ( el && event.propagationStoppedAt > depth && ++depth < 100 ) {
                event.el = el;
                event.depth = depth;

                if ( !el.hasAttribute( 'data-emit' ) ) {
                    // if it's a link, button or input and it has no emit attribute, allow the event to pass
                    if ( el.tagName === 'A' || el.tagName === 'BUTTON' || el.tagName === 'INPUT' ) {
                        return;
                    }
                    else {
                        el = closest( el, this.default_selector, false, this._element );
                        continue;
                    }
                }

                const force_allow_default = el.tagName === 'INPUT' && ( el.type === 'checkbox' || el.type === 'radio' );

                let validated = true;
                this._validators = this._validators || [];
                for ( let validator_index = 0; validator_index < this._validators.length; ++validator_index ) {
                    if ( !this._validators[ validator_index ].call( this, el, event ) ) {
                        validated = false;
                        break;
                    }
                }

                // eat the event if a validator failed
                if ( !validated ) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.propagationStoppedAt = depth;
                    el = null;
                    continue;
                }

                if ( el.tagName === 'FORM' ) {
                    if ( event.type !== 'submit' ) {
                        el = closest( el, this.default_selector, false, this._element );
                        continue;
                    }
                }
                else if ( el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' ) {
                    if ( !( el.type === 'submit' || el.type === 'checkbox' || el.type === 'radio' || el.type === 'file' ) && event.type !== 'input' ) {
                        el = closest( el, this.default_selector, false, this._element );
                        continue;
                    }
                }
                else if ( el.tagName === 'SELECT' ) {
                    if ( event.type !== 'input' ) {
                        el = closest( el, this.default_selector, false, this._element );
                        continue;
                    }
                }

                handled |= this._emit( el, event, force_allow_default );
                el = closest( el, this.default_selector, false, this._element );
            }

            if ( !handled ) {
                this.emit( 'unhandled', event );
            }
            else if ( depth >= 100 ) {
                throw new Error( 'Exceeded depth limit for Emit calls.' );
            }

            this._initial_touch_point = null;

            break;
    }
};

Emit._emit = function( element, event, force_allow_default ) {
    const options = string_list_to_hash( element.getAttribute( 'data-emit-options' ) || '' );
    const ignored_events = string_list_to_hash( element.getAttribute( 'data-emit-ignore' ) || '' );

    if ( ignored_events[ event.type ] ) {
        return false;
    }

    if ( !force_allow_default && !options.allowdefault ) {
        event.preventDefault();
    }

    if ( !options.allowpropagate ) {
        event.stopPropagation();
        event.propagationStoppedAt = event.depth;
    }

    const emission_list = element.getAttribute( 'data-emit' );
    if ( !emission_list ) {
        // allow for empty behaviors that catch events
        return true;
    }

    const emissions = emission_list.split( /,\s*/g );
    if ( options.debounce ) {
        this._timeouts = this._timeouts || {};
        if ( this._timeouts[ element ] ) {
            clearTimeout( this._timeouts[ element ] );
        }

        ( () => {
            const _element = element;
            const _emissions = emissions;
            const _event = event;
            this._timeouts[ element ] = setTimeout( () => {
                _emissions.forEach( emission => {
                    this.emit( emission, _event );
                } );
                clearTimeout( this._timeouts[ _element ] );
                this._timeouts[ _element ] = null;
            }, 250 );
        } )();

        return true;
    }

    emissions.forEach( emission => {
        this.emit( emission, event );
    } );

    return true;
};

Emit.add_validator = function( validator ) {
    this._validators = this._validators || [];
    let found = false;
    for ( let i = 0; i < this._validators.length; ++i ) {
        if ( this._validators[ i ] === validator ) {
            found = true;
            break;
        }
    }

    if ( found ) {
        return false;
    }

    this._validators.push( validator );

    return true;
};

Emit.remove_validator = function( validator ) {
    this._validators = this._validators || [];
    let found = false;
    for ( let i = 0; i < this._validators.length; ++i ) {
        if ( this._validators[ i ] === validator ) {
            this._validators.splice( i, 1 );
            found = true;
            break;
        }
    }

    return found;
};

module.exports = Emit;