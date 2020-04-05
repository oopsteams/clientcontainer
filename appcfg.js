const helpers = require("./helper.core.js")
const Base = require("./base.js")
const Dao = require('./dao.js')
const path = require('path');
const fs = require('fs');
const service = require('./service.js');

var app_cfg_db = null;
// new Dao({'type':'list', 'name':'app_cfg',
// 'fields':[{name:"id", type:'VARCHAR', len:20}, 
// 	{name:"name", type:'VARCHAR', len:64},
// 	{name:"val", type:'VARCHAR', len:1024},
// 	{name:"type", type:'VARCHAR', len:10},
// 	{name:"tm", type:'INT'}
// 	]
// }, onInit:function(){
	
// });
const CFG_SYNC_DELAY = 8*60*60*1000;
// const CFG_SYNC_DELAY = 2*60*1000;
const CFG_SYNC_TM = 'cfg_sync_tm';
var appcfg = Base.extend({
	constructor:function(download_dir, options){
		this.points = options&&options.points?options.points:helpers.points;
		this.options = options;
		this.base_dir = download_dir;
		this.core_loading = false;
		this.upgrade_task = {'libpath':null, 'size':0, 'end': false, 'st':0, 'errmsg':null, 'err':null};
		this.infos = [];
		this.cfg = {};
	},
	random_ua:function(){
		var os_ver = this.get('sysversion');
		var devices = this.cfg.get('devices');//['pc;pc-mac;10.13.6;macbaiduyunguanjia','pc;macos1;10.13.6;macbaiduyunguanjia','pc;cccone;10.13.6;macbaiduyunguanjia','pc;levis;10.13.6;macbaiduyunguanjia'];
		var ver = '2.2';
		var suf = ~~(Math.random() * 4);
		ver = ver + '.' + suf;
		var devices_idx = ~~(Math.random() * devices.length);
		var ua = "Netdisk;"+ver+";pc;"+devices[devices_idx]+";"+os_ver+";baiduyunguanjia";
		return ua;
	},
	get_ua:function(){
		var platform = this.get('platform');
		var sysversion = this.get('sysversion');
		var netdiskversion = this.get('netdiskversion');
		var ua = "Netdisk;"+netdiskversion+";pc;"+platform+";"+sysversion+";baiduyunguanjia";
		return ua;
	},
	check_upgrade_info:function(callback){
		var self = this;
		var rs = [];
		
		var final_call = (rs)=>{
			var appver = self.get('appver');
			var appupurl = self.get('appupurl');
			var current_app_versions = self.options.version;
			if(current_app_versions < appver){
				var prefix_msg = '';
				if(rs.length>0){
					prefix_msg = rs[0].msg + '|';
				}
				var info = rs[0]
				rs[0] = {'msg':prefix_msg+'发现新版本App,请通过链接下载更新!', 'url':appupurl, 'type':'a'};
			}
			if(callback){
				callback(rs);
			}
		}
		// console.log('upgrade_task:', self.upgrade_task);
		if(self.upgrade_task.st == 1){
			var msg = "正在下载最新系统UI,请不要退出应用![0.1%]";
			var new_prod_dir_lib = self.upgrade_task.libpath;
			var size = self.upgrade_task.size;
			if(fs.existsSync(new_prod_dir_lib)){
				fs.stat(new_prod_dir_lib,(err, stats)=>{
					var get_size = stats.size;
					var prog_val = helpers.build_percentage(get_size/1024, size);
					msg = "正在下载最新系统UI,请不要退出应用!["+prog_val+"%]";
					rs.push({'msg':msg, 'task':self.upgrade_task});
					final_call(rs);
				});
			} else {
				rs.push({'msg':msg, 'task':self.upgrade_task});
				final_call(rs);
			}
		} else if(self.upgrade_task.st == 2){
			var msg = null;
			var err = self.upgrade_task.err;
			if(err){
				msg = self.upgrade_task.errmsg;
			} else {
				msg = "最新系统UI下载完成!";
			}
			rs.push({'msg':msg, 'task':self.upgrade_task});
			final_call(rs);
		} else {
			final_call(rs);
		}
		return rs;
	},
	check_upgrade:function(callback){
		var self = this;
		var c_dir = this.base_dir;
		var old_ver_val = self.get('old_version');
		var new_ver_val = self.get('version');
		console.log('check_upgrade old_ver_val:', old_ver_val, ',new_ver_val:',new_ver_val);
		if(old_ver_val < new_ver_val){
			var upurl = self.get('upurl');
			if(upurl.substring(upurl.length-1) != '/') upurl+='/';
			var lib_url = upurl + 'v'+new_ver_val+'.tar.gz';
			console.log('need_to_load new lib!!!!', lib_url);
			var new_core_dir = 'prod';
			var tmp_unzip_dir = path.join(c_dir, 'tmp');
			var new_prod_dir = path.join(c_dir, new_core_dir);
			var new_prod_dir_lib = path.join(c_dir, 'v'+new_ver_val+'.tar.gz');
			var final_call = ()=>{
				self.infos = [];
				if(callback){
					callback();
				}
			};
			var final_deal = ()=>{
				if(fs.existsSync(tmp_unzip_dir)){
					helpers.remove_dir(tmp_unzip_dir);
				}
				if(!fs.existsSync(tmp_unzip_dir)){
					fs.mkdirSync(tmp_unzip_dir);
				}
				if(fs.existsSync(new_prod_dir_lib)){
					//self.update('old_version', new_ver_val, 'old ver');
					helpers.opengzip(new_prod_dir_lib, tmp_unzip_dir, (rs)=>{
						console.log('opengzip rs:', rs);
						var prod_index_fp = path.join(tmp_unzip_dir, 'prod/index.html');
						if(fs.existsSync(prod_index_fp)){
							fs.renameSync(path.join(tmp_unzip_dir, 'prod'), new_prod_dir);
							if(fs.existsSync(path.join(new_prod_dir, 'index.html'))){
								self.update('old_version', new_ver_val, 'old ver');
								fs.unlinkSync(new_prod_dir_lib);
								final_call();
							} else {
								final_call();
							}
						} else {
							final_call();
						}
					});
				} else {
					final_call();
				}
			}
		   var ver_obj = self.cfg['version'];
		   this.core_loading = true;
		   var size = 526;
		   var t = ver_obj.type;
		   if(t){
			   var _size = parseInt(t);
			   if(_size && _size>0){
				   size = _size;
			   }
		   }
		   self.upgrade_task.st = 1;
		   self.upgrade_task.libpath = new_prod_dir_lib;
		   self.upgrade_task.size = size;
		   self.upgrade_task.errmsg = null;
		   self.upgrade_task.err = null;
			service.download_lib_file(new_prod_dir_lib, lib_url, (err, fpath)=>{
				console.log('fpath:', fpath);
				if(!err && fpath){
					self.core_loading_err = null;
					if(fs.existsSync(fpath)){
						//self.update('old_version', new_ver_val, 'old ver');
						console.log('download ok!!!');
						setTimeout(()=>{final_deal();},1000);
					} else {
						console.log('can not find lib, ', fpath);
					}
				} else {
					self.upgrade_task.errmsg = 'UI下载失败!';
					self.upgrade_task.err = err;
				}
				self.upgrade_task.st = 2;
				this.core_loading = false;
			});
			
		} else {
			if(callback){
				callback();
			}
		}
		
	},
	_sync:function(callback){
		var self = this;
		var v = self.get(CFG_SYNC_TM);
		if(!v)v=0;
		var final_call = ()=>{
			if(callback)callback();
		}
		// console.log(CFG_SYNC_TM+' v:', v)
		if(helpers.now() - v>CFG_SYNC_DELAY){
			self.update(CFG_SYNC_TM, helpers.now(), CFG_SYNC_TM);
			// console.log('will call service! self.points:', self.points);
			//call service
			service.check_service(self.points, {'platform': process.platform}, (point, app_cfg)=>{
				if(point){
					helpers.point = point;
				}
				// console.log('_sync helpers point:', helpers.point, ',remote app_cfg:', app_cfg);
				if(app_cfg){
					var next_up = (c, cb)=>{
						console.log('update key:', c.key, ',val:', c.val, ',n:', c.name);
						self.update(c.key, c.val, c.name, ()=>{
							cb(true);
						}, c.type);
					}
					helpers.iterator(app_cfg, (c, idx, cb)=>{
						if(c.key == 'version'){
							var old_ver_val = self.get('version');
							if(!old_ver_val){
								old_ver_val = self.options.version;
							}
							console.log('关键参数 不存在则使用app version, old_ver_val:', old_ver_val);
							if(old_ver_val != c.val){
								self.update('old_version', old_ver_val, 'old ver', ()=>{
									//skip
									next_up(c,cb);
								});
							} else {
								next_up(c,cb);
							}
						} else {
							next_up(c,cb);
						}
					}, (iscomplete, idx)=>{
						final_call();
					});
				} else {
					final_call();
				}
			});
		} else {
			final_call();
		}
	},
	init:function(cb){
		var self = this;
		var c_dir = this.base_dir;
		var final_call = function(){
			var core_dir = '_prod';
			var new_core_dir = 'prod';
			var tmp_core_dir = '_prod_';
			var prod_dir = path.join(c_dir, core_dir);
			var tmp_prod_dir = path.join(c_dir, tmp_core_dir);
			var new_prod_dir = path.join(c_dir, new_core_dir);
			var prod_index_addr = path.join(prod_dir, '/index.html')
			console.log('prod_dir:', prod_dir);
			if(fs.existsSync(new_prod_dir)){
				//upgrade core files
				if(fs.existsSync(tmp_prod_dir)){
					//del tmp_prod_dir
					helpers.remove_dir(tmp_prod_dir);
				}
				if(fs.existsSync(prod_dir)){
					fs.renameSync(prod_dir, tmp_prod_dir);
				}
				if(fs.existsSync(path.join(new_prod_dir, 'index.html'))){
					fs.renameSync(new_prod_dir, prod_dir);
				}
			}
			if(fs.existsSync(prod_dir)){
				if(fs.existsSync(prod_index_addr)){
					self.update('index', '/_prod/index.html')
				}
				if(cb)cb(self);
				Promise.resolve().then(()=>{self._sync();});
			} else {
				if(cb)cb(self);
				Promise.resolve().then(()=>{self._sync(
					// ()=>{
					// 	if(cb)cb(self);
					// }
				);});
			}
			// if(cb)cb(self);
			
		}
		var wheresql = "where 1=1";
		app_cfg_db.query_by_raw_sql(wheresql,(cfg_list)=>{
			if(cfg_list){
				cfg_list.forEach((p, idx)=>{
					self.__update(p.id, p.val, p.name, p.tm, p.type);
				});
			}
			final_call();
		});
	},
	update:function(key, val, name, callback, type){
		var p = this.__update(key, val, name, null, type);
		if(p){
			app_cfg_db.get('id', key, (_p)=>{
				if(_p){
					app_cfg_db.update_by_id(key, p, ()=>{
						if(callback){
							callback(p);
						}
					});
				} else {
					app_cfg_db.put(p, ()=>{
						if(callback){
							callback(p);
						}
					});
				}
			});
			
		} else {
			if(callback){
				callback(p);
			}
		}
	},
	__update:function(key, val, name, tm, type){
		var self = this;
		if(!key || val == null){
			return null;
		}
		if(!self.cfg.hasOwnProperty(key)){
			self.cfg[key] = {};
		}
		if(!tm){
			tm = helpers.now();
		}
		var p = self.cfg[key];
		p['id'] = key;
		p['val'] = val;
		p['tm'] = tm;
		if(type && 'null' !== type){
			p['type'] = type;
		}
		if(name){
			p['name'] = name;
		}
		return p;
	},
	get:function(key){
		if(this.cfg.hasOwnProperty(key)){
			return this.cfg[key]['val'];
		} else if(helpers.hasOwnProperty(key)){
			return helpers[key];
		}
		return null;
	},
	getObj:function(key){
		if(this.cfg.hasOwnProperty(key)){
			return this.cfg[key];
		}
		return null;
	},
	desc:function(key){
		if(this.cfg.hasOwnProperty(key)){
			return this.cfg[key]['name']
		}
		return null;
	},
	tostring:function(){
		return JSON.stringify(this.cfg);
	}
});
appcfg.newtable=function(callback){
	app_cfg_db = new Dao({
		'type':'list', 'name':'app_cfg',
		'fields':[{name:"id", type:'VARCHAR', len:20}, 
			{name:"name", type:'VARCHAR', len:64},
			{name:"val", type:'VARCHAR', len:1024},
			{name:"type", type:'VARCHAR', len:10},
			{name:"tm", type:'INT'}
		],
		onInited:function(){
			if(callback){
				callback();
			}
		}
	});
};
module.exports = appcfg;