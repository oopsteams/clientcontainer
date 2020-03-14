const { app, BrowserWindow, Menu, ipcMain, dialog, session} = require('electron');
const unhandled = require('electron-unhandled');
const logger = require('electron-log');
const cfg = require('electron-cfg');
const request = require('request');
const fs = require('fs');
const os =  require('os');
const path = require('path');
const helpers = require("./helper.core.js");
const Base = require("./base.js")
const AppCfg = require("./appcfg.js");
var base_dir = os.homedir();
var data_dir = path.join(base_dir, helpers.data_dir_name);
var dao = null;// wait data_dir make success
if(!fs.existsSync(data_dir)){
  fs.mkdirSync(data_dir);
  console.log('['+data_dir+']dir make success!');
  dao = require('./dao.js');// wait data_dir make success
}else{
  dao = require('./dao.js');// wait data_dir make success
  console.log('['+data_dir+']dir exist!');
}
const Account = require('./account.js');
const Window = require('./window.js')
const Nsproxy = require('./nsproxy.js');
unhandled();
var appcfg = new AppCfg();

var win_option = {
	minWidth:500, minHeight:500,
	onMessage:function(win, args){
		var self = this;
		var tag = args.tag;
		if("inited" == tag){
			args.tag = 'start';
			self.account.check_state((isok, rs)=>{
				args['lg_rs'] = isok
				args['rs'] = rs
				args['point'] = helpers.point;
				self.send(args);
			});
		} else if("started" == tag){
			
		} else if("login" == tag){
			var user = args.user;
			console.log("onMessage user:", user);
			self.account.login(user, (logined, rs)=>{
				args.rs = rs
				self.send(args);
			});
		} else if("logout" == tag){
			self.account.clear_token(()=>{
				self.send(args);
			});
		} else if("file" == tag){
			console.log("get file:", args.data, ",node id:", args.id);
			setTimeout(()=>{
				nsproxy.fetch_file_info(args.id,(rs)=>{
					// console.log("nsproxy cb rs:", rs);
					self.send({'tag':'tree', 'id':args.id, 'data': rs, 'cmd':args.cmd});
				});
			}, 2000);
			
		}
	},
	onDestroy:function(win){
		on_quit_app();
		app.quit();
	}
}

var on_quit_listener_list = [];
var bindonquit = (listener) => {
	on_quit_listener_list.push(listener);
};
function on_quit_app(){
	if(on_quit_listener_list && on_quit_listener_list.length>0){
		on_quit_listener_list.forEach((l, idx)=>{
			l();
		});
	}
	if(dao){
		dao.close();
	}
}
app.on('window-all-closed', () => {
  on_quit_app();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
app.on('ready', ()=>{
	appcfg.init(()=>{
		var looper = helpers.looper;
		looper.start();
		var point = appcfg.get('point');
		var account = new Account({'point': point, 'cfg': appcfg, 'looper': looper});
		var nsproxy = new Nsproxy(account,{'point': point, 'cfg': appcfg, 'looper': looper});
		var g_win = new Window("OopsTeam", "renderer.js", `file://${__dirname}/dist/index.html`, account, {
			'cfg': appcfg,
			win:win_option
		});
		g_win.open();
		looper.addListener('test', (context)=>{
			console.log('tag:', context.name,',tm:', Date.now());
		}, {'name': 'test'})
		bindonquit(()=>{
			looper.stop();
		});
	});
});
