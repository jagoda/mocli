"use strict";
var debug        = require("debug")("mocli:Script");
var domain       = require("domain");
var Console      = require("console").Console;
var EventEmitter = require("events").EventEmitter;
var fs           = require("fs");
var path         = require("path");
var stream       = require("stream");

function CaptureStream () {
	var buffer = [];

	stream.Writable.call(this);

	this._write = function (chunk, encoding, done) {
		buffer.push(chunk.toString());
		done();
	};

	this.toString = function () {
		return buffer.join("");
	};
}

CaptureStream.prototype = Object.create(stream.Writable.prototype);

function ExitError (code) {
	Error.call(this);
	this.code    = code;
	this.message = "script called `exit()`";
}

ExitError.prototype = Object.create(Error.prototype);

ExitError.prototype.name = "ExitError";

function Global (file, process) {
	var self = this;

	this.__dirname  = path.dirname(file);
	this.__filename = file;

	this.require = function (id) {
		var modulePath = self.require.resolve(id);
		return require(modulePath);
	};

	this.require.resolve = function (id) {
		var modulePath;

		switch (id[0]) {
			case "/": {
				modulePath = id;
				break;
			}
			case ".": {
				modulePath = path.relative(__dirname, self.__dirname);
				modulePath = path.join(modulePath, id);
				break;
			}
			default: {
				try {
					modulePath = require.resolve(id);
				}
				catch (error) {
					// Do nothing
				}

				if (modulePath !== id) {
					// TODO: traverse file tree
					modulePath = path.relative(__dirname, self.__dirname);
					modulePath = path.join(modulePath, "node_modules", id);
				}
				break;
			}
		}

		return modulePath;
	};

	this.setTimeout = function (fn, delay) {
		debug("setting script timeout");
		setTimeout(process.callback(fn), delay);
	};

}

function Process (name, parameters) {
	var output  = new CaptureStream();
	var refs    = 0;

	EventEmitter.call(this);

	this.argv   = [ name ].concat(parameters);
	this.domain = domain.create();
	this.stderr = new stream.PassThrough();
	this.stdin  = new stream.PassThrough();
	this.stdout = new stream.PassThrough();

	this.stderr.pipe(output, { end : false });
	this.stdout.pipe(output, { end : false });

	this.nextTick = function (fn) {
		process.nextTick(this.callback(fn));
	};

	this.once("exit", function () {
		output.end();
	});

	this.exit = function (code) {
		throw new ExitError(code);
	};

	this.finish = function () {
		this.emit("tick");
		if (refs === 0) {
			this.exit(0);
		}
	};

	this.output = function () {
		return output.toString();
	};

	this.callback = function (fn) {
		var self = this;
		refs += 1;

		return function () {
			refs -= 1;
			fn.apply(null, arguments);
			self.finish();
		};
	};
}

Process.prototype = Object.create(EventEmitter.prototype);

function Script (file) {
	var name   = path.basename(file, ".js");
	/* jshint -W054 */
	var script = new Function(
		"__filename", "__dirname", "console", "process", "require", "setTimeout",
		fs.readFileSync(file)
	);
	/* jshint +W054 */

	this.run = function () {
		var parameters = Array.prototype.slice.call(arguments);

		var scriptProcess = new Process(name, parameters);
		var scriptGlobal  = new Global(file, scriptProcess);
		var scriptConsole = new Console(scriptProcess.stdout, scriptProcess.stderr);

		function exit (code) {
			scriptProcess.emit("exit", code);
			scriptProcess.status = code;
			scriptProcess.domain.dispose();
			debug("script is exiting");
		}

		scriptProcess.domain.on("error", function (error) {
			debug("script error: %s - %s", error.name, error.message);
			if (error instanceof ExitError) {
				exit(error.code);
			}
			else {
				if (EventEmitter.listenerCount(scriptProcess, "uncaughtException") > 0) {
					scriptProcess.emit("uncaughtException", error);
				}
				else {
					scriptConsole.error("Uncaught %s", error.stack);
				}
				exit(8);
			}
		});

		scriptProcess.domain.run(function () {
			process.nextTick(function () {
				script.call(
					scriptGlobal,
					scriptGlobal.__filename, scriptGlobal.__dirname, scriptConsole, scriptProcess,
					scriptGlobal.require, scriptGlobal.setTimeout
				);
				scriptProcess.finish();
			});
		});

		return scriptProcess;
	};
}

module.exports = Script;
