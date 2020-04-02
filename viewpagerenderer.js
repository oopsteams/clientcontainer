const { remote, ipcRenderer } = require('electron');
console.log('remote:',remote)
if(remote){
	var triggered_tags = {};
	function send_message(payload){
		console.log('send_message:', payload, ',msgPoint:', window.global_context.msgPoint);
		ipcRenderer.send(window.global_context.msgPoint, payload);
	}
	
	function build_pdf_viewer(){
		
		Promise.allSettled = Promise.allSettled || function(promises) {
		        return new Promise(function(resolve, reject) {
		            if (!Array.isArray(promises)) {
		                return reject(
		                    new TypeError("arguments must be an array")
		                );
		            }
		            var resolvedCounter = 0;
		            var promiseNum = promises.length;
		            var resolvedValues = new Array(promiseNum);
		            for (var i = 0; i < promiseNum; i++) {
		                (function(i) {
		                    Promise.resolve(promises[i]).then(
		                        function(value) {
		                            resolvedCounter++;
		                            resolvedValues[i] = value;
		                            if (resolvedCounter == promiseNum) {
		                                return resolve(resolvedValues);
		                            }
		                        },
		                        function(reason) {
		                            resolvedCounter++;
		                            resolvedValues[i] = reason;
		                            if (resolvedCounter == promiseNum) {
		                                return reject(reason);
		                            }
		                        }
		                    );
		                })(i);
		            }
		        });
		};
		
	}
	function loop_check_elem(){
		var elem = null;
		try{
			elem = PDFViewerApplicationOptions;
		}catch(e){
		}
		if(elem){
			build_pdf_viewer();
			var src = window.global_context.src;
			var defaultUrl = PDFViewerApplicationOptions.get('defaultUrl');
			// console.log('defaultUrl:', defaultUrl);
			// PDFViewerApplicationOptions.open(src);
			PDFViewerApplication.open(src);
			var viewer = elem;
			
			// if(viewer){
			// 	// console.log('set attr:', src);
			// 	// viewer.setAttribute('src', src);
			// 	window.addEventListener('resize',function(){
			// 		viewer.style.height = document.documentElement.clientHeight - 40*2;
			// 		viewer.style.width = document.documentElement.clientWidth - 40*2; 
			// 	});
			// }
		} else {
			setTimeout(loop_check_elem, 1000);
		}
	}
	function build_header(){
		// var header = document.createElement('div');
		// header.style.zIndex=9999;
		// header.style.webkitAppRegion='drag';
		// header.style.pointerEvents='none';
		// header.style.top = '0px';
		// header.style.position = 'absolute';
		// header.style.height = '2.5rem';
		// header.style.width = '100%';
		// header.style.lineHeight = '2.5rem';
		// header.innerHTML='&nbsp;';
		// document.body.appendChild(header);
		if(window.global_context.platform !== 'darwin'){
			console.log('build close btn!');
		}
		
		loop_check_elem();
	}
	function check_st(v){
		return window.global_context.st == v;
	}
	function update_st(v){
		window.global_context.st = v;
	}
	function onMessage(args){
		var self = this;
		var tag = args.tag;
		if("start" == tag){
			if(check_st(1)){
				window.global_context.platform = args.platform;
				console.log('args:',args);
				var src = args.src;
				window.global_context.src = args.src;
				args.tag = 'started';
				var rs = args.rs;
				window.global_context.point = args.point;
				var params = [rs];
				build_header();
				trigger("start", params);
				trigger("login", params);
				send_message(args);
			}
		} else if("login" == tag){
			var rs = args.rs;
			var logined = rs.logined, tk = rs.tk;
			window.global_context.tk=tk;
			window.global_context.user=rs;
			trigger("login", [rs]);
		} else if("update" == tag){
			var src = args.src;
			var viewer = document.getElementById('viewer');
			viewer.setAttribute('src', src);
		} else {
			trigger(tag, [args]);
		}
	}
	function init(bind_point, bind_front_point){
		if(check_st(0)){
			update_st(1);
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
		'send':send_message,
		'addListener':addListener,
		'player': null
	};
}