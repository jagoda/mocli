"use strict";
var path = require("path");
var foo  = path.join(__dirname, "node_modules", "foo.js");

console.log(require(foo));
