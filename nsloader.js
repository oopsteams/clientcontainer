const helpers = require("./helper.core.js")
const Base = require("./base.js")
const Dao = require('./dao.js')
const request = require('request');

const created_at_field = {name:"created_at", type:'CHAR', len:19};
const updated_at_field = {name:"updated_at", type:'CHAR', len:19};
const char_id_field = {name:"id", type:'VARCHAR', len:20};
const fs_id_field = {name:"fs_id", type:'VARCHAR', len:20};
const path_field = {name:"path", type:'VARCHAR', len:1024};
const item_id_field = {name:"id", type:'VARCHAR', len:16};
const md5_val_field = {name:"md5_val", type:'VARCHAR', len:64};

var download_loader_db = new Dao({'type':'list', 'name':'token_loader', 
'fields':[char_id_field, created_at_field,
	updated_at_field, fs_id_field,md5_val_field, 
	{name:"share_log_id", type:'INT'}, path_field,
	{name:"size", type:'INT'}, {name:"category", type:'INT'},
	{name:"pin", type:'INT'},
	{name:"dlink", type:'VARCHAR', len:1024}, {name:"filename", type:'VARCHAR', len:512},
	{name:"expired_at", type:'CHAR', len:19}, {name:"pan_account_id", type:'INT'},
	{name:"transfer_log_id", type:'INT'},
	{name:"source_id", type:'VARCHAR', len:20},
	{name:"used", type:'INT'}
	]
});
var download_task_db = new Dao({'type':'list', 'name':'tasks',
'fields':[char_id_field, item_id_field, md5_val_field,
	{name:"state", type:'INT', index:true},
	{name:"filename", type:'VARCHAR', len:512},
	{name:"total_length", type:'INT'},
	{name:"type", type:'VARCHAR', len:10},
	{name:"tm", type:'INT'}
	]
});
var download_sub_task_db = new Dao({'type':'list', 'name':'sub_tasks',
'fields':[{name:"id", type:'VARCHAR', len:40},
	{name:"source_id", type:'VARCHAR', len:20},
	{name:"start", type:'INT'},
	{name:"end", type:'INT'},
	{name:"over", type:'INT'},
	{name:"idx", type:'INT'},
	{name:"loader_id", type:'VARCHAR', len:20},
	{name:"state", type:'INT'},
	{name:"get_size", type:'INT'},
	{name:"exhaust", type:'VARCHAR', len:10},
	{name:"speed", type:'VARCHAR', len:10},
	{name:"drain", type:'INT'},
	{name:"tm", type:'INT'}
	]
});


var nstask = Base.extend({
	constructor:function(task, options){
		if(options){
			this.point = options.point;
			this.nsloader = options.context;
		}
		this.account = account;
		this.tasks = [];
		this.task = task;
		if(options && options.onReady){
			options.onReady(this);
		}
	},
	update_state:function(state, cb){
		this.task['state'] = state;
		download_task_db.update_by_id(this.task['id'], {'state': state}, (_id, _params)=>{
			if(cb){cb(_id, _params)}
		});
	},
	get_state:function(){
		this.task['state'];
	},
	is_loading:function(){
		return this.task['state'] == 1;
	},
});
var nsloader = Base.extend({
	constructor:function(account, options){
		if(options){
			this.context = options.context;
			this.point = options.point;
			this.cfg = options.cfg;
			this.looper = options.looper;
		}
		this.account = account;
		this.token = null;
		this.tasks = [];
		this.task_map = {};
	},
	new_download_nstask:function(item, callback){
		var task = {'id': item['fs_id'],
		'item_id': item['id'], 
		'md5_val': item['md5_val'], 
		'state': 0, 
		'filename': item['filename'], 
		'type':item['type'], 
		'tm': get_now_timestamp()};
		var id = task.id;
		this.recover_nstask(task, callback);
	},
	recover_nstask:function(task, callback){
		var self = this;
		var id = task.id;
		if(self.task_map.hasOwnProperty(id)){
			callback(false, self.task_map[id]);
		}
		new nstask(task, {onReady:(nst)=>{
			self.tasks.push(task);
			self.task_map[id] = task;
			callback(true, nst);
		}});
	},
	correct:function(callback){
		var self = this;
		self.account.check_state((isok, rs)=>{
			if(isok){
				var tk = rs.tk;
				self.token = tk;
				var wheresql = "where state >= 0 and state <= 3 order by tm desc ";
				download_task_db.query_by_raw_sql(wheresql, (task_list)=>{
					var init_task_list = [], pause_task_list = [], running_task_list = [], over_task_list = [];
					helpers.iterator(task_list, (t, idx, cb)=>{
						if(t.state == 0 && nst){
							init_task_list.push(nst);
						}else if(t.state == 3 && nst){
							pause_task_list.push(nst);
						}else if(t.state == 2 && nst){
							over_task_list.push(nst);
						}else if(t.state == 1 && nst){
							running_task_list.push(nst);
						}
						self.recover_nstask(t,(ok, nst)=>{
							var st = nst.get_state();
							if(st == 1){
								nst.update_state(3, (_id, _p)=>{
									cb(true);
								});
							} else {
								cb(true);
							}
						});
					}, (isover, l)=>{
						if(isover){
							callback({});
						}
					});
					
				});
			} else {
				callback({"error_code":1});
			}
		});
	}
});
module.exports = nsloader;