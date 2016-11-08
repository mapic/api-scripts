

var JSFtp = require("jsftp");

var ftp = new JSFtp({
  host: "host",
  port: 21, // defaults to 21
  user: "user", // defaults to "anonymous"
  pass: "pass" // defaults to "@anonymous"
});

ftp.get('systemapic/SCF_MOD_20161031.tif', 'SCF_MOD_20161031.tif', function(err) {
    if (err) console.error('There was an error retrieving the file.');
    console.log('File copied successfully!');
});