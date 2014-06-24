"use strict";
var expect = require("chai").expect;
var path   = require("path");
var Script = require("../lib/Script");
var sinon  = require("sinon");

var TEST_SCRIPTS = path.join(__dirname, "scripts");

describe("A Script", function () {
	describe("when invoked", function () {
		var child;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "basic.js");
			var script = new Script(file);

			child = script.run("foo", "bar");

			child.on("exit", function () {
				done();
			});
		});

		it("returns the exit status", function () {
			expect(child, "exit status").to.have.property("status", 0);
		});

		it("returns all output", function () {
			expect(child.output(), "output").to.equal("3 basic foo bar\n");
		});
	});

	describe("calling `exit()` synchronously", function () {
		var child;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "exit_sync.js");
			var script = new Script(file);

			child = script.run();

			child.on("exit", function () {
				done();
			});
		});

		it("returns the exit status", function () {
			expect(child, "exit status").to.have.property("status", 42);
		});
	});

	describe("calling `exit()` asynchronously", function () {
		var child;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "exit_async.js");
			var script = new Script(file);

			child = script.run();

			child.on("exit", function () {
				done();
			});
		});

		it("returns the exit status", function () {
			expect(child, "exit status").to.have.property("status", 99);
		});
	});

	describe("throwing an uncaught exception with a handler", function () {
		var child;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "uncaught.js");
			var script = new Script(file);

			child = script.run();

			child.on("exit", function () {
				done();
			});
		});

		it("can handle the exception", function () {
			expect(child.output(), "unexpected output").to.equal("handled\n");
		});

		it("exits with a non-zero exit status", function () {
			expect(child.status, "no exit status").to.exist;
			expect(child.status, "zero exit status").not.to.equal(0);
		});
	});

	describe("throwing an uncaught exception without a handler", function () {
		var child;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "unhandled.js");
			var script = new Script(file);

			child = script.run();

			child.on("exit", function () {
				done();
			});
		});

		it("displays the error", function () {
			expect(child.output(), "no error message").to.match(/Error: boom!/);
		});

		it("exits with a non-zero exit status", function () {
			expect(child.status, "no exit status").to.exist;
			expect(child.status, "zero exit status").not.to.equal(0);
		});
	});

	describe("setting a timeout", function () {
		var child;
		var clock;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "timeout.js");
			var script = new Script(file);

			clock = sinon.useFakeTimers();
			child = script.run();
			child.once("tick", function () {
				clock.tick(1000);
			});

			child.on("exit", function () {
				done();
			});
		});

		after(function () {
			clock.restore();
		});

		it("waits for the timeout to execute", function () {
			expect(child.output(), "no timeout output").to.match(/timed out/i);
		});
	});

	describe("referencing standard globals", function () {
		var file;
		var output;

		before(function (done) {
			var child;
			var script;

			file   = path.join(TEST_SCRIPTS, "globals.js");
			script = new Script(file);

			child = script.run();

			child.on("exit", function () {
				output = child.output();
				done();
			});
		});

		it("can reference __filename", function () {
			expect(output, "__filename").to.contain("__filename: " + file);
		});

		it("can reference __dirname", function () {
			var dirname = path.dirname(file);

			expect(output, "__dirname").to.contain("__dirname: " + dirname);
		});
	});

	describe("loading a local module", function () {
		var child;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "require_local.js");
			var script = new Script(file);

			child = script.run();

			child.on("exit", function () {
				done();
			});
		});

		it("loads the module relative to the script", function () {
			expect(child.output(), "module output").to.match(/i am foo/i);
		});
	});

	describe("loading a built-in module", function () {
		var child;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "require_native.js");
			var script = new Script(file);

			child = script.run();

			child.on("exit", function () {
				done();
			});
		});

		it("loads the module as normal", function () {
			expect(child.output(), "module output").to.match(/ok/i);
		});
	});

	describe("loading a relative module", function () {
		var child;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "require_relative.js");
			var script = new Script(file);

			child = script.run();

			child.on("exit", function () {
				done();
			});
		});

		it("loads the module relative to the script", function () {
			expect(child.output(), "module output").to.match(/i am foo/i);
		});
	});

	describe("loading an absolute module", function () {
		var child;

		before(function (done) {
			var file   = path.join(TEST_SCRIPTS, "require_absolute.js");
			var script = new Script(file);

			child = script.run();

			child.on("exit", function () {
				done();
			});
		});

		it("loads the module as normal", function () {
			expect(child.output(), "module output").to.match(/i am foo/i);
		});
	});
});
