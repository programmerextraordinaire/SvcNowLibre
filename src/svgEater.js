/*---------------------------------------------------------------------------------
 *
 *   Copyright © 2022 Kraken Networks, Inc. and AppVizo, LLC. All Rights Reserved.
 *   File: C:\Projects\ServiceNow\Apps\SLAMonitor\ServerDevelopment\ScriptInclude\svgEater.js
 *   Version 0.0.1
 *
 *   Notes: SVG parser from: https://github.com/Rich-Harris/svg-parser
 *----------------------------------------------------------------------------------*/

var testing = false;
var validNameCharacters = /[a-zA-Z0-9:_-]/;
var whitespace = /[\s\t\r\n]/;
var quotemark = /['"]/;

function repeat(str, i) {
	var result = '';
	while (i--) result += str;
	return result;
}

function parse(source) {
	var header = '';
	var stack = [];

	var state = metadata;
	var currentElement = null;
	var root = null;

	function error(message) {
		
		throw new Error(
			// `${message} (${line}:${column}). If this is valid SVG, it's probably a bug in svg-parser. Please raise an issue at https://github.com/Rich-Harris/svg-parser/issues – thanks!\n\n${snippet}`
			message + "  If this is valid SVG, it's probably a bug in svg-parser. Please raise an issue at https://github.com/Rich-Harris/svg-parser/issues – thanks!\n\n${snippet}"
		);
	}

	function metadata() {
		while ((i < source.length && source[i] !== '<') || !validNameCharacters.test(source[i + 1])) {
			header += source[i++];
		}

		return neutral();
	}

	function neutral() {
		var text = '';
		while (i < source.length && source[i] !== '<') text += source[i++];

		if (/\S/.test(text)) {
			currentElement.children.push({ type: 'text', value: text });
		}

		if (source[i] === '<') {
			return tag;
		}

		return neutral;
	}

	function tag() {
		var _char = source[i];

		if (_char === '?') return neutral; // <?xml...

		if (_char === '!') {
			if (source.slice(i + 1, i + 3) === '--') return comment;
			if (source.slice(i + 1, i + 8) === '[CDATA[') return cdata;
			if (/doctype/i.test(source.slice(i + 1, i + 8))) return neutral;
		}

		if (_char === '/') return closingTag;

		var tagName = getName();

		var element = {
			type: 'element',
			tagName: tagName,
			properties: {},
			children: []
		};

		if (currentElement) {
			currentElement.children.push(element);
		} else {
			root = element;
		}

		var attribute;
		while (i < source.length && (attribute = getAttribute())) {
			element.properties[attribute.name] = attribute.value;
		}

		var selfClosing = false;

		if (source[i] === '/') {
			i += 1;
			selfClosing = true;
		}

		if (source[i] !== '>') {
			error('Expected >');
		}

		if (!selfClosing) {
			currentElement = element;
			stack.push(element);
		}

		return neutral;
	}

	function comment() {
		var index = source.indexOf('-->', i);
		if (!~index) error('expected -->');

		i = index + 2;
		return neutral;
	}

	function cdata() {
		var index = source.indexOf(']]>', i);
		if (!~index) error('expected ]]>');

		currentElement.children.push(source.slice(i + 7, index));

		i = index + 2;
		return neutral;
	}

	function closingTag() {
		var tagName = getName();

		if (!tagName) error('Expected tag name');

		if (tagName !== currentElement.tagName) {
			error('Expected closing tag </' + tagName + '> to match opening tag <' + currentElement.tagName+'>');
		}

		allowSpaces();

		if (source[i] !== '>') {
			error('Expected >');
		}

		stack.pop();
		currentElement = stack[stack.length - 1];

		return neutral;
	}

	function getName() {
		var name = '';
		while (i < source.length && validNameCharacters.test(source[i])) name += source[i++];

		return name;
	}

	function getAttribute() {
		if (!whitespace.test(source[i])) return null;
		allowSpaces();

		var name = getName();
		if (!name) return null;

		var value = true;

		allowSpaces();
		if (source[i] === '=') {
			i += 1;
			allowSpaces();

			value = getAttributeValue();
			if (!isNaN(value) && value.trim() !== '') value = +value; // TODO whitelist numeric attributes?
		}

		return { name: name, value: value };
	}

	function getAttributeValue() {
		return quotemark.test(source[i]) ? getQuotedAttributeValue() : getUnquotedAttributeValue();
	}

	function getUnquotedAttributeValue() {
		var value = '';
		do {
			var _char = source[i];
			if (_char === ' ' || _char === '>' || _char === '/') {
				return value;
			}

			value += _char;
			i += 1;
		} while (i < source.length);

		return value;
	}

	function getQuotedAttributeValue() {
		var quotemark = source[i++];

		var value = '';
		var escaped = false;

		while (i < source.length) {
			var _char = source[i++];
			if (_char === quotemark && !escaped) {
				return value;
			}

			if (_char === '\\' && !escaped) {
				escaped = true;
			}

			value += escaped ? '\\' + _char : _char;
			escaped = false;
		}
	}

	function allowSpaces() {
		while (i < source.length && whitespace.test(source[i])) i += 1;
	}

	var i = metadata.length;
	while (i < source.length) {
		if (!state) error('Unexpected character');
		state = state();
		i += 1;
	}

	if (state !== neutral) {
		error('Unexpected end of input');
	}

	if (root.tagName === 'svg') root.metadata = header;
	return {
		type: 'root',
		children: [root]
	};
}

/*   Other functions needed to translate Python to JS */
// linspace function is a Python function in the numpy library.
// var foo = linspace(0, 1, 5); => [ 0, 0.25, 0.5, 0.75, 1 ]
function linspace(start, stop, count) {
	var retval = [];
	var inc = (stop - start) / (count-1);
	for (var i=start; i<=stop; i += inc) {
	  retval.push(i);
	}
	return retval;
 }

/* ==============================   T E S T  ============================== */

var svg = '<svg>\n' +
'<defs>\n' +
'<style type="text/css">\n' +
'<![CDATA[ rect { fill: red; stroke: blue; stroke-width: 3 } ]]>\n' +
'</style>\n' +
'</defs>\n' +
'</svg>';


var result;
if (testing) {
	result = parse(svg);
	gs.info(result);
	// Open SVG file and parse.
	// var url = 'https://www.yahoo.com'
}
result
