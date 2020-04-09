# clientcontainer
clientcontainer
### Log Dir
* Macos:~/Library/Logs/{app name}/{process type}.log
* Windows:%USERPROFILE%\AppData\Roaming\{app name}\logs\{process type}.log
* Linux:~/.config/{app name}/logs/{process type}.log
---
### Test Log
const compressing = require('compressing');
const fs = require('fs');
const path = require('path');
var zippath = path.join('.', 'v1.0.6.zip');
var tmppath = path.join('.', 'tmp');
fs.existsSync(zippath);

compressing.zip.uncompress(zippath, tmppath).then(()=>{
		console.log('ok');
	}).catch((err)=>{
		console.log(err);
	});