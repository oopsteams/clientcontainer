const { remote, ipcRenderer, shell} = require('electron');
console.log('remote:',remote)
if(remote){
	var triggered_tags = {};
	function send_message(payload){
		ipcRenderer.send(window.global_context.msgPoint, payload);
	}
	function check_st(v){
		return window.global_context.st == v;
	}
	function update_st(v){
		window.global_context.st = v;
	}
	function init_ui(){
		// var linkStyle = document.getElementsByTagName('link')[0];
		// var sheet = linkStyle.sheet;
		// var rules = sheet.cssRules;
		// sheet.insertRule('.el-button--mini{padding: 0.125rem, 0.5625rem;}',0);
	}
	function onMessage(args){
		var self = this;
		var tag = args.tag;
		if("start" == tag){
			if(check_st(1)){
				update_st(2);
				args.tag = 'started';
				var rs = args.rs;
				window.global_context.point = args.point;
				window.global_context.lg_rs=args.lg_rs;
				window.global_context.user=rs;
				window.global_context.version = args.version;
				window.global_context.os = args.os;
				var params = [rs];
				// console.log('trigger start:', params);
				trigger("start", params);
				trigger("login", params);
				send_message(args);
			}
		} else if("login" == tag){
			var rs = args.rs;
			var logined = rs.logined, tk = rs.tk;
			window.global_context.tk=tk;
			window.global_context.user=rs;
			console.log('tag login:', rs)
			trigger("login", [rs]);
		} else {
			trigger(tag, [args]);
		}
	}
	function init(bind_point, bind_front_point){
		if(check_st(0)){
			update_st(1);
			init_ui();
			window.global_context.msgPoint = bind_point;
			window.global_context.msgPointFront = bind_front_point;
			ipcRenderer.on(window.global_context.msgPointFront, function(event, args){
				// console.log('renderer args:', args);
				onMessage(args);
			});
			send_message({'tag':'inited'});
		}
	}
	function addListener(t, fn, trigger_history){
		var listener_list = window.global_context.listeners[t];
		if(!listener_list){
			listener_list = [];
			window.global_context.listeners[t] = listener_list;
		}
		if(listener_list.indexOf(fn)<0){
			listener_list.push(fn);
		}
		if(typeof(trigger_history)==="undefined")trigger_history = true;
		// console.log('add listener:', t,',params:', triggered_tags[t]);
		if(trigger_history && triggered_tags.hasOwnProperty(t)){
			fn.apply(null, triggered_tags[t]);
		}
	}
	function trigger(t,params){
		var listener_list = window.global_context.listeners[t];
		// console.log('trigger listener:', t, ",params:", params);
		triggered_tags[t] = params;
		if(listener_list){
			listener_list.forEach(function(l, idx){
				l.apply(null, params);
			});
		}
	}
	window.global_context = {
		'st':0,
		'lg_rs':false,
		'user':{},
		'msgPoint':'asyn-win',
		'msgPointFront':'asyn-win-front',
		'init':init,
		'listeners':{},
		'version':'0.0.0',
		'send':send_message,
		'addListener':addListener,
		'openbrowser':function(url){if(url)shell.openExternal(url);}
	};
}