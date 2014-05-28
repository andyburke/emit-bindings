# Emit

Emit events on DOM element interaction using data-emit attributes.

# Examples

```html
<a data-emit='foo'>Emit 'foo'</a>

<a data-emit='bar'>Emit 'bar'</a>

<div data-emit='baz.wrapper'>
    <a data-emit='baz' data-emit-options="allowpropagate">Emit 'baz' and, due to propagation, 'baz.wrapper'.</a>
</div>

<a data-emit='yak' href="#yak" data-emit-options="allowdefault">Emit 'yak' and allow default navigation to #yak.</a>

<form data-emit="submitted"> <!-- emits 'submitted' on form submit -->
    <input type="text" data-emit="input.changed" /> <!-- emits 'input.changed' on input -->
    <input type="checkbox" data-emit="checked" data-emit-options="allowdefault">This is a checkbox.</input> <!-- allowdefault will let the checkbox check -->
    <input type="radio" data-emit="selected" data-emit-options="allowdefault">This is a radio button.</input> <!-- allowdefault will let the radio button select -->
    <input type="submit" value="Submit" data-emit="submit.clicked" data-emit-options="allowdefault" /> <!-- allowdefault will let the form submission event fire -->
</form>

<div style="border: 1px solid black; padding: 30px; text-align: center;" data-emit=""> <!-- catch click/touch event -->
    <a data-emit='floog'>Emit 'floog' but clicking elsewhere in this div should *not* produce an 'unhandled' event.</a>
</div>

```

Using [component](http://component.io):

```javascript
var emit = require( 'emit' );

emit.on( 'foo', function( event ) {
    // do something fun, like logging to the console
    console.log( 'got a foo event' );
} );
```

# Install

For [component](http://component.io) do:

```
component install honeinc/emit
```

To include a prebuilt version directly in your page, use built/emit.js or built/emit.min.js:

```
<script type="text/javascript" src="emit.min.js"></script> <!-- injects window.Emit -->

<script>
    Emit.on( 'foo', function( event ) {
        console.log( 'got a foo event' );
    } );
</script>

```

## Why don't you have bower/npm/etc support?

I don't use bower and I don't see how this would be used in node. However, send a tested PR adding support and I
will accept it.

# Why would I need this?

Emit is a simple, small (~9kb minified, ~3kb minified+gzipped) way to bind javascript actions to DOM nodes without
using the more classic selector style favored by jQuery. It allows for better separation of concerns: no longer
are element classes how you find and bind to actions in your UI. Instead, you mark up your DOM with the events
you'd like various elements to emit when they are clicked (or touched, Emit also helps eliminate the 300ms click
delay on mobile devices).

It is similar to Google's [JsAction](https://github.com/google/jsaction), except it is simpler and smaller (but, of
course, less robust).

# Advanced Usage

## Ignoring events

Sometimes you don't want to listen to all the normal events (click, touchend, input, submit):

```html
<a data-emit="foo" data-ignore="click">foo</a> <!- will not emit 'foo' when clicked -->
```


# License

MIT

# Changelog
0.0.3
-----
* Add data-emit-ignore support
* Fix submit/input handling to only emit on appropriate events

0.0.2
-----
* Make sure events have a currentTarget that points to the current element

0.0.1
-----
* Initial release
