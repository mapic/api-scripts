

var JSFtp = require("jsftp");

var ftp = new JSFtp({
  host: "globesar.itek.norut.no",
  port: 21, // defaults to 21
  user: "norut", // defaults to "anonymous"
  pass: "NorutAnsatt42" // defaults to "@anonymous"
});

// ftp.ls("systemapic/", function(err, res) {
//   if (err) console.log('err');
//   res.forEach(function(file) {
//     console.log(file);
//   });
// });

ftp.get('systemapic/SCF_MOD_20161031.tif', 'SCF_MOD_20161031.tif', function(err) {
    if (err) console.error('There was an error retrieving the file.');
    console.log('File copied successfully!');
});