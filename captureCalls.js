(function() {

	/**
	 * @param {Object|Function|string} object
	 * @param {string} methodName
	 */
	window.captureCalls = function captureCalls(object, methodName) {

		var path = '';
		if (typeof methodName == 'undefined') {
			path = object;
			var temp = resolvePath(object);
			object = temp.object;
			methodName = temp.methodName;
		}

		var originalMethod = object[methodName];
		object[methodName] = function patched(/* args */) {
			var result = originalMethod.apply(this, arguments);
			var out = placeArgs(originalMethod, arguments);
			out[0] = '%c' + (path || methodName) + out[0] + ' -> %o';
			out.splice(1, 0, 'color: hsl(146, 84%, 35%)');
			out.push(result);

			if (captureCalls.logDetails) {
				out.push(new details(originalMethod, this));
			}

			if (captureCalls.stacktraces) {
				out.push('\n' + getStacktrace());
			}

			console.info.apply(console, out);

			return result;
		};

		object[methodName].revertToOriginal = function() {
			object[methodName] = originalMethod;
		};

		object[methodName].toString = function() {
			return originalMethod.toString();
		};
	};

	captureCalls.stacktraces = true;
	captureCalls.logFileNames = true;
	captureCalls.logDetails = false;


	/**
	 * @param {string} path
	 * @returns {{object: *, methodName: string}}
	 */
	function resolvePath(path) {
		var object = this;
		var parts = path.split('.');
		for (var i = 0, ii = parts.length - 1; i < ii; i++) {
			object = object[parts[i]];
		}
		return {
			object: object,
			methodName: parts[ii]
		}
	}


	/**
	 * @returns {string}
	 */
	function getStacktrace() {
		var stack;
		try {
			I_am_certain_this_variable_is_undefined++;
		} catch (e) {
			stack = e.stack || e.stacktrace || '';
		}
		return chopOffLines(stack, 3);
	}


	/**
	 * @param {string} string
	 * @param {number} n
	 * @returns {string}
	 */
	function chopOffLines(string, n) {
		var index = 0;
		while (n--) {
			var newIndex = string.indexOf('\n', index);
			if (newIndex === -1) {
				break;
			}
			index = newIndex + 1;
		}
		return string.slice(index);
	}


	/**
	 * @constructor
	 * @param {Function} fn
	 * @param {Object} scope
	 */
	function details(fn, scope) {
		this['function'] = fn;
		this['this'] = scope;
	}


	/**
	 * placeArgs('function plus(a, b) {}', [2, 3])
	 * -> 'plus(a=2, b=3)'
	 * @param {Function} func
	 * @param arguments
	 * @returns {Array.<string>}
	 */
	function placeArgs(func, funcArguments) {
		var fn = func.toString();
		var args = [].slice.call(funcArguments, 0);

		var leftParenthesisIndex = fn.indexOf('(', 'function'.length);
		var rightParenthesisIndex = fn.indexOf(')', leftParenthesisIndex + 1);

		//TODO: fix function(a /*string,number*/) {}
		var argNames = fn.slice(leftParenthesisIndex + 1, rightParenthesisIndex).split(',').map(function(x) {
			return x.trim();
		});
		var buffer = [];
		var argsLength = args.length;
		for (var i = 0, length = Math.max(argsLength, argNames.length); i < length; i++) {
			buffer.push(argNames[i] || '•');
			if (i < argsLength) {
				buffer.push('=%o');
			}
			if (i < argNames.length - 1) {
				buffer.push(', ');
			}
		}
		args.unshift('(' + buffer.join('') + ')');
		return args;
	}

})();
