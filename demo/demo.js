if (!Error.captureStackTrace) {
	console.warn('stopBefore uses V8 stack traces API to get arguments\' values. Your browser does not support it.');
	console.warn('https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi');
}


function a(x) {
	return b(x * 2);
}

function b(x) {
	return c(x + 1);
}

function c(x) {
	return x + 9;
}

function A() {
	new B(1)
}

function B(x) {}


captureCalls('c');
captureCalls('B');

window.onload = function loaded() {
	a(3);
	new A('foo');
	eval('a(2)');
};
