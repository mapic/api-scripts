#!/usr/bin/env node
var fs = require('fs');
var dataset_file = fs.readFileSync(process.argv[2]);
var data = JSON.parse(dataset_file);
console.log(data.datasets)