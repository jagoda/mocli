"use strict";

process.on("uncaughtException", function () {
	console.log("handled");
});

throw new Error("boom!");
