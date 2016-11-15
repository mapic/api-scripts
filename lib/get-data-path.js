#!/usr/bin/env node
var fs = require('fs');
if (!process.argv[2]) {
    console.log('Please provide a .json file. Usage: ./upload_dataset.sh dataset.json');
    process.exit(1);
}
var dataset_file = fs.readFileSync(process.argv[2]);
var data = JSON.parse(dataset_file);
console.log(data.datasets)