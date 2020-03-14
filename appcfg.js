const helpers = require("./helper.core.js")
const Base = require("./base.js")
const Dao = require('./dao.js')

var app_cfg_db = new Dao({'type':'list', 'name':'app_cfg',
'fields':[{name:"id", type:'VARCHAR', len:20}, 
	{name:"name", type:'VARCHAR', len:64},
	{name:"val", type:'VARCHAR', len:1024},
	{name:"tm", type:'INT'}
	]
});
const CFG_SYNC_DELAY = 24*60*60*1000;
const CFG_SYNC_TM = 'cfg_sync_tm';
var appcfg = Base.extend({
	constructor:function(options){
		this.points = options?options.points:helpers.points;
		this.cfg = {};
	},
	_sync:function(){
		var self = this;
		var v = self.get(CFG_SYNC_TM);
		if(!v)v=0;
		if(helpers.now() - v>CFG_SYNC_DELAY){
			//call service
		}
	},
	init:function(cb){
		var self = this;
		var final_call = function(){
			if(cb)cb();
			Promise.resolve().then(()=>{self._sync();});
		}
		var wheresql = "where 1=1";
		app_cfg_db.query_by_raw_sql(wheresql,(cfg_list)=>{
			if(cfg_list){
				cfg_list.forEach((p, idx)=>{
					self.__update(p.id, p.val, p.name, p.tm);
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
						callback(p);
					});
				}
			});
			
		} else {
			callback(p);
		}
	},
	__update:function(key, val, name, tm){
		var self = this;
		if(!key || val == null){
			return null;
		}
		if(!key in self.cfg){
			self.cfg[key] = {};
		}
		if(!tm){
			tm = helpers.now();
		}
		var p = self.cfg[key];
		p['id'] = key;
		p['val'] = val;
		p['tm'] = tm;
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