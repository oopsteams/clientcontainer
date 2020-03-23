const helpers = require("./helper.core.js")
const Base = require("./base.js")
const Dao = require('./dao.js')
const path = require('path');
const fs = require('fs');
const service = require('./service.js');

var app_cfg_db = new Dao({'type':'list', 'name':'app_cfg',
'fields':[{name:"id", type:'VARCHAR', len:20}, 
	{name:"name", type:'VARCHAR', len:64},
	{name:"val", type:'VARCHAR', len:1024},
	{name:"type", type:'VARCHAR', len:10},
	{name:"tm", type:'INT'}
	]
});
const CFG_SYNC_DELAY = 24*60*60*1000;
const CFG_SYNC_TM = 'cfg_sync_tm';
const c_dir = __dirname;
var appcfg = Base.extend({
	constructor:function(options){
		this.points = options?options.points:helpers.points;
		this.cfg = {};
	},
	check_upgrade:function(callback){
		var self = this;
		var old_ver_val = self.get('old_version');
		var new_ver_val = self.get('version');
		console.log('check_upgrade old_ver_val:', old_ver_val, ',new_ver_val:',new_ver_val);
		if(old_ver_val != new_ver_val){
			console.log('need_to_load new lib!!!!');
			var upurl = self.get('upurl');
			if(upurl.substring(upurl.length-1) != '/') upurl+='/';
			// var lib_url = upurl + 'v'+new_ver_val+'.zip';
			var lib_url = upurl + 'v'+new_ver_val+'.tar.gz';
			console.log('need_to_load new lib!!!!', lib_url);
			var new_core_dir = 'prod';
			var tmp_unzip_dir = path.join(c_dir, 'tmp');
			// var new_prod_dir = path.join(c_dir, new_core_dir);
			// var new_prod_dir_lib = path.join(c_dir, 'v'+new_ver_val+'.zip');
			var new_prod_dir_lib = path.join(c_dir, 'v'+new_ver_val+'.tar.gz');
			
			if(fs.existsSync(new_prod_dir_lib)){
				//self.update('old_version', new_ver_val, 'old ver');
				helpers.opengzip(new_prod_dir_lib, tmp_unzip_dir, ()=>{
					if(arguments){
						console.log('opengzip arguments:', arguments);
					} else {
						
					}
				});
			}
			
		   /*
			service.download_lib_file(new_prod_dir_lib, lib_url, (err, fpath)=>{
				console.log('fpath:', fpath);
				if(!err && fpath){
					if(fs.existsSync(fpath)){
						//self.update('old_version', new_ver_val, 'old ver');
						console.log('download ok!!!');
					} else {
						console.log('can not find lib, ', fpath);
					}
					
					if(callback){
						callback();
					}
				}
			});
			*/
		}
		if(callback){
			callback();
		}
	},
	_sync:function(callback){
		var self = this;
		var v = self.get(CFG_SYNC_TM);
		if(!v)v=0;
		var final_call = ()=>{
			if(callback)callback();
		}
		console.log(CFG_SYNC_TM+' v:', v)
		if(helpers.now() - v>CFG_SYNC_DELAY){
			// self.update(CFG_SYNC_TM, helpers.now(), CFG_SYNC_TM);
			//call service
			service.check_service(self.points, (point, app_cfg)=>{
				if(point){
					helpers.point = point;
					console.log('helpers point:', helpers.point);
				}
				if(app_cfg){
					var next_up = (c, cb)=>{
						console.log('update key:', c.key, ',val:', c.val, ',n:', c.name);
						self.update(c.key, c.val, c.name, ()=>{
							cb(true);
						});
					}
					helpers.iterator(app_cfg, (c, idx, cb)=>{
						if(c.key == 'version'){
							var old_ver_val = self.get('version');
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
				}
			});
		} else {
			final_call();
		}
	},
	init:function(cb){
		var self = this;
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
				fs.renameSync(prod_dir, tmp_core_dir);
				fs.renameSync(new_prod_dir, prod_dir);
			}
			if(fs.existsSync(prod_dir)){
				if(fs.existsSync(prod_index_addr)){
					self.update('index', '/_prod/index.html')
				}
				if(cb)cb(self);
				Promise.resolve().then(()=>{self._sync();});
			} else {
				Promise.resolve().then(()=>{self._sync(
					()=>{
						if(cb)cb(self);
					}
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
	update:function(key, val, name, callback){
		var p = this.__update(key, val, name);
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
		if(type){
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
module.exports = appcfg;