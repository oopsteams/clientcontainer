module.exports = {
	"packagerConfig": {
	"icon": "Icon",
	"titlebarAppearsTransparent": "YES",
	"asar": false,
	"overwrite": true,
	// "ignore": "src|out|.oopsteam|.eslintrc.js|LICENSE|README.md|.*/clientcontainer/package-lock.js|.*/clientcontainer/package.json|[^.]+.sh|[^.]+.log"
	"ignore": function(path){
			if(path.startsWith('/src')||
			path.startsWith('/.git')||
			path.startsWith('/out')||
			path.startsWith('/build')||
			path.startsWith('/node_modules/.bin')||
			path.startsWith('/node_modules/.cache')||
			path.startsWith('/node_modules/electron')||
			path.startsWith('/node_modules/electron-prebuilt')||
			path.startsWith('/node_modules/electron-prebuilt-compile')
			){
				return true;
			}
			if(path.match(/^\/yarn[^\.]+\.log$/)){
				return true;
			}
			if(path.match(/^\/[^\.]+\.sh/)){
				return true;
			}
			if(path.match(/.*.md|LICENSE|.oopsteam|.eslintrc.js|DS_Store/i)){
				return true;
			}
			console.log("copy:", path);
			return false;
		}
	},
	"startConfig": {
	"icon": "Icon"
	},
	"makers": [
	{
	  "name": "@electron-forge/maker-squirrel"
	},
	{
	  "name": "@electron-forge/maker-zip",
	  "platforms": [
		"darwin"
	  ]
	},
	{
	  "name": "@electron-forge/maker-deb",
	  "config": {}
	},
	{
	  "name": "@electron-forge/maker-rpm",
	  "config": {}
	}
	]
}