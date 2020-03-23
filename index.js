const { app, BrowserWindow, Menu, ipcMain, session} = require('electron');
const unhandled = require('electron-unhandled');
const logger = require('electron-log');
const cfg = require('electron-cfg');
const request = require('request');
const fs = require('fs');
const os =  require('os');
const path = require('path');
const helpers = require("./helper.core.js");
const Base = require("./base.js");
const service = require('./service.js');
const VideoPlayer = require('./videoplayer.js');
const filter = {
  urls: ['https://hm.baidu.com/*']
}
var base_dir = os.homedir();
var app_data_dir = path.join(base_dir, helpers.app_data_dir_name)
if(!fs.existsSync(app_data_dir)){
	fs.mkdirSync(app_data_dir);
}
var download_dir = path.join(app_data_dir, helpers.download_dir_name);
if(!fs.existsSync(download_dir)){
	fs.mkdirSync(download_dir);
}
var patch_data_dir = path.join(app_data_dir, helpers.patch_dir_name);
if(!fs.existsSync(patch_data_dir)){
	fs.mkdirSync(patch_data_dir);
}
var data_dir = path.join(app_data_dir, helpers.data_dir_name);
//var dao = null;// wait data_dir make success
if(!fs.existsSync(data_dir)){
  fs.mkdirSync(data_dir);
  console.log('['+data_dir+']dir make success!');
  // dao = require('./dao.js');// wait data_dir make success
}else{
  // dao = require('./dao.js');// wait data_dir make success
  console.log('['+data_dir+']dir exist!');
}
const Window = require('./window.js')

const dao = require('./dao.js');
unhandled();

function interceptHttp(){
	var self = this;
	session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
	  // callback({cancel: false, requestHeaders: details.requestHeaders})
	  var headers = details.requestHeaders;
	  
	  if(!headers){
			headers = {'Referer': 'http://www.oopsteam.site'}
	  } else {
			headers['Referer'] = 'http://www.oopsteam.site';
	  }
	  details.requestHeaders = headers;
	  // console.log('url:', details.url, ',headers:', headers);
	  callback({requestHeaders: headers});
	})
}
var task_action = function(args){
	var self = this;
	cmd = args.cmd;
	console.log('task_action cmd:', cmd);
	if('resume' == cmd){
		self.options.nsloader.resume(args.id, ()=>{
			console.log('resume reply!!!!!!!!');
			self.send({'tag':'prog', 'id': args.id, 'cmd':args.cmd});
		});
	} else if('pause' == cmd){
		self.options.nsloader.pause(args.id, ()=>{
			console.log('pause reply!!!!!!!!');
			self.send({'tag':'prog', 'id': args.id, 'cmd':args.cmd});
		});
	} else if('move' == cmd){
		self.options.nsloader.move_file(args.id, ()=>{
			console.log('move reply!!!!!!!!');
			self.send({'tag':'prog', 'id': args.id, 'cmd':args.cmd});
		});
	} else if('del' == cmd){
		self.options.nsloader.del(args.id, ()=>{
			console.log('del reply!!!!!!!!');
			self.send({'tag':'prog', 'id': args.id, 'cmd':args.cmd});
		});
	} else if('play' == cmd){
		var data = args.data;
		console.log('play data:', data);
		self.options.vplayer.open(data);
	}
}

var download_action = function(args){
	var self = this;
	cmd = args.cmd;
	if("init" == cmd){
		var datas = self.options.nsloader.checkout_tasks();
		self.send({'tag':'download', 'datas': datas, 'cmd':args.cmd});
	}else if("checkstate" == cmd){
		var task_list = self.options.nsloader.compute_progress();
		// console.log('download_action checkstate.task_list:', task_list);
		self.send({'tag':'download', 'datas': task_list, 'cmd':'checkstate'});
	}
};
var file_action = function(args){
	var self = this;
	var cmd = args.cmd;
	if("info" == cmd){
		setTimeout(()=>{
			nsproxy.fetch_file_info(args.id,(rs)=>{
				// console.log("nsproxy cb rs:", rs);
				self.send({'tag':'tree', 'id':args.id, 'data': rs, 'cmd':args.cmd});
			});
		}, 2000);
	} else if("copy" == cmd){
		var data = args.data;
		console.log("file copy:", data);
		self.account.check_state((isok, rs)=>{
			service.server_get(rs.tk, 'product/checkcopyfile', data, (err, raw)=>{
				if(!err){
					var body = JSON.parse(raw);
					var st = body.state;
					if(st == -2){
						//需要先绑定baidu账号
					}else if(st == -1){
						//弹出异常信息
					}else if(st == 0){
						//success
					}
					console.log("raw:", raw);
				}
			});
		});
	} else if("download" == cmd){
		var data = args.data;
		console.log("file download:", data);
		self.options.nsloader.new_download_ready(data, (fail, rs)=>{
			self.send({'tag':'tree', 'id':args.id, 'data': rs, 'fail': fail, 'cmd':"download"});
		});
	} else if("checkstate" == cmd){
		var id = args.data.id;
		self.options.nsloader.check_ready_state(args.data, (fail, rs)=>{
			self.send({'tag':'tree', 'id':id, 'data': rs, 'cmd':"download_state"});
		});
	}
	
};
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
			// console.log("get file:", args.data, ",node id:", args.id);
			file_action.apply(self, [args]);
		} else if("download" == tag){
			download_action.apply(self, [args]);
		} else if('prog' == tag){
			task_action.apply(self, [args]);
		}
	},
	onDestroy:function(win){
		on_quit_app();
		app.quit();
	}
}
const template = [
	{
	  label: '增值服务',
	  submenu: [
	    { type: 'separator' },
	    {label: '加入会员', click: ()=>{alert("请联系管理员!");}},
	    {label: '申请代理', click: ()=>{alert("代理联系方式!");}}
	  ]
	},
    {
      label: 'Help',
      submenu: [
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ]
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
	menu = Menu.buildFromTemplate(template)
	Menu.setApplicationMenu(menu);
	var looper = helpers.looper;
	console.log('db data_dir:', data_dir);
	dao.initDatabase(data_dir, looper, ()=>{
		const Account = require('./account.js');
		const Nsproxy = require('./nsproxy.js');
		const Nsloader = require('./nsloader.js');
		const AppCfg = require("./appcfg.js");
		console.log("hn:",os.hostname());
		var appcfg = new AppCfg();
		appcfg.init((cfg)=>{
			interceptHttp();
			var final_call = ()=>{
				looper.start();
				var point = appcfg.get('point');
				var account = new Account({'point': point, 'cfg': appcfg, 'looper': looper});
				var nsproxy = new Nsproxy(account,{'point': point, 'cfg': appcfg, 'looper': looper});
				var nsloader = new Nsloader(account, {'point': point, 'cfg': appcfg, 'looper': looper, 'nsproxy':nsproxy});
				var vplayer = new VideoPlayer(account, {'cfg': appcfg});
				vplayer.init();
				var index_addr = cfg.get('index');
				if(!index_addr) index_addr = '/dist/index.html'
				var g_win = new Window("OopsTeam", "renderer.js", `file://${__dirname}${index_addr}`, account, {
					'cfg': appcfg,
					'nsloader':nsloader,
					'vplayer':vplayer,
					'logger': logger,
					win:win_option
				});
				nsloader.parent_win = g_win;
				nsloader.correct(()=>{
					g_win.open();
				});
				var delay_cnt = 60;
				var delay_pos = 0;
				looper.addListener('heart', (context)=>{
					delay_pos++;
					if(delay_pos>=delay_cnt){
						delay_pos = 0;
						console.log('tag:', context.name,',tm:', Date.now());
					}
				}, {'name': 'test'})
				bindonquit(()=>{
					looper.stop();
				});
				cfg.check_upgrade();
			};
			cfg.update('app_data_dir', app_data_dir, '应用根目录', ()=>{
				cfg.update('data_dir', data_dir, '应用数据目录',()=>{
					cfg.update('download_dir', download_dir, '应用资源下载目录',()=>{
						cfg.update('patch_data_dir', patch_data_dir, '补丁下载目录',final_call);
					});
				});
			});
			
		});
	});
});
