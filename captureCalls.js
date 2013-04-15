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
			out[0] = (path || methodName) + out[0] + ' -> %o';
			out.push(result);
			if (captureCalls.logDetails) {
				out.push(new details(originalMethod, this));
			}
			logList(out);
			logStack(patched);
			log('');
			return result;
		};

		object[methodName].revertToOriginal = function() {
			object[methodName] = originalMethod;
		};

		object[methodName].toString = function() {
			return originalMethod.toString();
		};
	};

	captureCalls.logFileNames = true;
	captureCalls.logDetails = false;


	// Don't show URL for the message
	var log = new Function('message', 'console.log(message)');
	var logList = new Function('result', 'result[0] = "%c" + result[0];\n'
		+ 'result.splice(1, 0, "color: hsl(146, 84%, 35%)");\n'
		+ 'console.log.apply(console, result);');


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
	 * @param {Function} constructor
	 */
	function logStack(constructor) {
		var callSites = generateCallSites(constructor);
		logCallSites(callSites);
	}


	var _Error_prepareStackTrace = Error.prepareStackTrace;

	/**
	 * @see https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi
	 * @param {Function} constructor
	 * @return Array.<CallSite>
	 */
	function generateCallSites(constructor) {
		Error.prepareStackTrace = function(error, stack) {
			return stack;
		};
		var error = new Error();
		Error.captureStackTrace(error, constructor);
		Error.prepareStackTrace = _Error_prepareStackTrace;
		return error.stack;
	}


	/**
	 * @param {Array.<CallSite>} stack
	 */
	function logCallSites(stack) {
		var length = stack.length;
		for (var i = 0; i < length; i++) {
			var item = stack[i];
			var functionName = item.getFunctionName() || '';
			if (i == length - 1 && item.isToplevel() && !functionName) {
				continue; // don't print the whole JS file
			}
			var func = item.getFunction() || '';
			var result = [''];
			if (item.isEval()) {
				result = ['eval(%s)', JSON.stringify(stripFunction(func.toString()))];
			} else {
				if (func && func.arguments) {
					result = placeArgs(func, func.arguments);
				}
				if (functionName) {
					result[0] = functionName + result[0];
				}
				if (item.isConstructor()) {
					result[0] = 'new ' + result[0];
				}
				if (captureCalls.logFileNames) {
					addFileNames(result, item);
				}
				if (captureCalls.logDetails) {
					result.push(new details(func, item.getThis()));
				}
			}
			logList(result);
		}
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
	 * @param {Array} result
	 * @param {CallSite.<string>} item
	 */
	function addFileNames(result, item) {
		result[0] += ' %s'; // https://code.google.com/p/chromium/issues/detail?id=231074
		result.push(
		item.getFileName() + ':' +
		(item.getLineNumber() - 1) // https://code.google.com/p/chromium/issues/detail?id=231077
		);
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


	/**
	 * @param {string} fn
	 * @return {string}
	 */
	function stripFunction(fn) {
		return fn.replace(/^\s*function\s+/, '')
	}

})();
