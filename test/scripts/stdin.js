"use strict";
var readline = require("readline");

var read = readline.createInterface({
	input  : process.stdin,
	output : process.stdout
});

read.question("Who are you?", function (answer) {
	console.log("Hello %s", answer);
	read.close();
});
