const Window = require('./window.js')
const helpers = require("./helper.core.js")
const Base = require("./base.js")
var shared_action = function(args){
	var self = this;
	cmd = args.cmd;
	var shared = self.options.ctx;
	if("uiok" == cmd){
		if(shared.callback){
			shared.callback();
		}
	}
};
var win_option = {
	width:750, height:400,
	onReady:function(win){
	},
	onMessage:function(win, args){
		var self = this;
		var tag = args.tag;
		var inst = self.options.ctx;
		if("inited" == tag){
			args.tag = 'start';
			args['share_info'] = inst.share_info;
			self.account.check_state((isok, rs)=>{
				args['lg_rs'] = isok
				args['rs'] = rs
				args['point'] = helpers.point;
				self.send(args);
			});
		} else if("started" == tag){
			
		} else if("player" == tag){
			player_action.apply(self, [args]);
		} else if("ui_ready" == tag){
			shared_action.apply(self, [args]);
		}
	}
};
var shared = Base.extend({
	constructor:function(account, options){
		this.options = options;
		this.account = account;
		if(options){
			this.cfg = options.cfg?options.cfg:{};
		}
		
		this.win = null;
		this.callback = null;
	},
	init:function(){
		var self = this;
		if(!this.win){
			
			this.win = new Window("BdShared", "sharerenderer.js", '#',
				this.account, {
				'cookies':self.options.cookies,
				'ctx':self,
				'cfg': self.cfg,
				win:win_option
			});
			// interceptHttp();
		}
	},
	open:function(share_info, callback){
		var self = this;
		this.share_info = share_info;
		this.callback = callback;
		if(this.win){
			var link = self.share_info.shared.link;
			var pass = self.share_info.shared.pass;
			this.win.update_url(link);
			this.win.open();
			// gparams={'params':{}};
			// send_msg = function(payload){
			// 	self.win.send(payload);
			// }
		}
	}
});

module.exports = shared;