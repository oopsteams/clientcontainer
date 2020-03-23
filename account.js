const helpers = require("./helper.core.js")
const request = require('request');
const Base = require("./base.js")
const Dao = require('./dao.js')
const BdClient = require('./bd_client.js')
var path = require('path');
const os =  require('os');
var base_dir = os.homedir();
var data_dir = path.join(base_dir, helpers.data_dir_name);
var accounts_db = new Dao({'type':'object', 'name':'accounts',
'fields':[{name:"id", type:'VARCHAR', len:130},
	{name:"default_save_path", type:'VARCHAR', len:512},
	{name:"username", type:'VARCHAR', len:64},
	{name:"fuzzy_id", type:'VARCHAR', len:64},
	{name:"portrait", type:'VARCHAR', len:128},
	{name:"tm", type:'INT'}
	]
});

function call_pansite_by_post(point, path, params, callback){
	var ithis = this;
	this.query_file_head_running = true;
	headers = {"SURI-TOKEN": "login", "Content-Type": "application/x-www-form-urlencoded"};
	var data = JSON.stringify(params);
	var options = {
		method: 'POST',
		url: point + path,
		followRedirect: false,
		followOriginalHttpMethod: true,
		timeout: 120000,
		strictSSL: false,
		form: params,
		headers: headers
	};
	request(options, function(error, response, body){
		console.log("body:", body)
		var json_obj = JSON.parse(body);
		if(!json_obj){
			callback({"state": -1, "msg":"account not exist!"})
			return;
		}
		callback(json_obj);
		// need_renew_access_token = json_obj['need_renew_access_token'];
		// auth_redirect = json_obj['auth'];
		// token = json_obj['token'];
		
		// if(need_renew_access_token){
		// 	pan_acc_list = json_obj.pan_acc_list;
		// 	pan_acc_list.forEach((pa, idx)=>{pa['token'] = token});
		// 	check_access.loop_check_accounts(token, point, pan_acc_list, auth_redirect, parent_win, (isok)=>{
		// 		if(token){
		// 			accounts_db.put({id: token, tm:helpers.now()}, (params)=>{
		// 				callback(isok);
		// 			});
		// 		} else {
		// 			if(!isok){
		// 				api.check_state(point, parent_win, callback);
		// 			} else {
		// 				callback(isok);
		// 			}
		// 		}
		// 	});
			
		// } else {
		// 	if(token){
		// 		// accounts_db.get('accounts').assign({token: token, tm:helpers.now()}).write();
		// 		accounts_db.put({id: token, tm:helpers.now()}, (params)=>{
		// 				callback(true);
		// 			});
		// 	} else {
		// 		callback(true);
		// 	}
		// }
	})
}
var account = Base.extend({
	constructor:function(options){
		this.parent = options?options.parent:null;
		this.point = options?options.point:null;
		this.user = null;
	},
	check_state:function(callback){
		var self = this;
		console.log("check_state in.");
		var final_call = ()=>{
			if(self.user){
				callback(true,{'logined':true, 'id':self.user.fuzzy_id,
				'tk':self.user.id, 'username':self.user.username, 'portrait':self.user.portrait});
			} else {
				callback(false,{});
			}
		};
		if(self.user){
			final_call();
		} else {
			accounts_db.get(null, null, (user)=>{
				if(!user || !user['id']||helpers.now() - user['tm']>helpers.token_timeout){
					console.log('callback:',callback);
					//createLoginWindow(point, parent_win, callback);
					// var js_str = 'window.open("'+`file://${__dirname}/login.html`+'","modal");';
					// console.log("js_str:",js_str);
					// parent_win.webContents.executeJavaScript(js_str);
					final_call();
				}else{
					self.user = user;
					final_call();
				}
			});
		}
	},
	clear_token:function(cb){
		accounts_db.del_all(cb);
	},
	login:function(user, callback){
		var self = this;
		call_pansite_by_post(this.point, "login/", {"mobile_no": user.username, "password": user.pass}, function(res){
			var json_obj = res;
			need_renew_access_token = json_obj['need_renew_access_token'];
			auth_redirect = json_obj['auth'];
			token = json_obj['token'];
			fuzzy_id = json_obj['id'];
			login_at = json_obj['login_at']
			username = json_obj['username'];
			portrait = json_obj['portrait'];
			console.log('json_obj:', json_obj);
			var final_call = ()=>{
				if(token){
					self.user = {id: token, tm:login_at, "username":username, "portrait":portrait, "fuzzy_id":fuzzy_id};
					// accounts_db.get('accounts').assign({token: token, tm:helpers.now()}).write();
					var msg = {'logined':true, 'id':fuzzy_id, 
					'tk':self.user.id, 'username':self.user.username, 
					'portrait':self.user.portrait, 'tm':helpers.now()};
					accounts_db.put(self.user, (params)=>{
							callback(true, msg);
						});
				} else {
					callback(false, {});
				}
			};
			if(need_renew_access_token){
				pan_acc_list = json_obj.pan_acc_list;
				pan_acc_list.forEach((pa, idx)=>{pa['token'] = token});
				// check_access.loop_check_accounts(token, point, pan_acc_list, auth_redirect, parent_win, (isok)=>{
				// 	if(token){
				// 		accounts_db.put({id: token, tm:helpers.now()}, (params)=>{
				// 			callback(isok);
				// 		});
				// 	} else {
				// 		if(!isok){
				// 			api.check_state(point, parent_win, callback);
				// 		} else {
				// 			callback(isok);
				// 		}
				// 	}
				// });
				final_call();
			} else {
				final_call();
			}
			
			// if(isok){
			// 	callback(true);
			// } else {
			// 	if(res['state'] == -1){
			// 		callback(false);
			// 		api.check_state(point, callback);
			// 	} else if(res['state'] == 0){
			// 		callback(true);
			// 	}
			// }
		});
	},
	update_default_save_path:function(path){
		accounts_db.put({default_save_path: path});
	},
	get_default_save_path:function(cb){
		accounts_db.get(null, null, (user)=>{
			// console.log("user:", user);
			if(cb){
				if(user){
					cb(user.default_save_path);
				}else{
					cb(null);
				}
			}
		});
	},
});
module.exports = account;

