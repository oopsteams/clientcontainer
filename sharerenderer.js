const { remote, ipcRenderer } = require('electron');
console.log('remote:',remote)
if(remote){
	var triggered_tags = {};
	var dialog_ui = null;
	var helpers = {
		isArray: function(value) {
			if (Array.isArray && Array.isArray(value)) {
				return true;
			}
			var type = Object.prototype.toString.call(value);
			if (type.substr(0, 7) === '[object' && type.substr(-6) === 'Array]') {
				return true;
			}
			return false;
		},
		isObject: function(value) {
			return value !== null && Object.prototype.toString.call(value) === '[object Object]';
		},
		clone: function(source) {
			if (helpers.isArray(source)) {
				return source.map(helpers.clone);
			}
		
			if (helpers.isObject(source)) {
				var target = {};
				var keys = Object.keys(source);
				var klen = keys.length;
				var k = 0;
		
				for (; k < klen; ++k) {
					target[keys[k]] = helpers.clone(source[keys[k]]);
				}
		
				return target;
			}
		
			return source;
		},
		_merger: function(key, target, source, options) {
			var tval = target[key];
			var sval = source[key];
		
			if (helpers.isObject(tval) && helpers.isObject(sval)) {
				helpers.merge(tval, sval, options);
			} else {
				target[key] = helpers.clone(sval);
			}
		},
		merge: function(target, source, options) {
			var sources = helpers.isArray(source) ? source : [source];
			var ilen = sources.length;
			var merge, i, keys, klen, k;
		
			if (!helpers.isObject(target)) {
				return target;
			}
		
			options = options || {};
			merge = options.merger || helpers._merger;
		
			for (i = 0; i < ilen; ++i) {
				source = sources[i];
				if (!helpers.isObject(source)) {
					continue;
				}
		
				keys = Object.keys(source);
				for (k = 0, klen = keys.length; k < klen; ++k) {
					merge(keys[k], target, source, options);
				}
			}
		
			return target;
		},
		extend: Object.assign || function(target) {
			return helpers.merge(target, [].slice.call(arguments, 1), {
				merger: function(key, dst, src) {
					dst[key] = src[key];
				}
			});
		}
	};
	function send_message(payload){
		console.log('send_message:', payload, ',msgPoint:', window.global_context.msgPoint);
		ipcRenderer.send(window.global_context.msgPoint, payload);
	}
	function check_st(v){
		return window.global_context.st == v;
	}
	function update_st(v){
		window.global_context.st = v;
	}
	function loop_check_elem(){
		var elem = document.querySelector('input[id]');
		if(elem){
			//show alert
			// console.log('find elem:', elem);
			if(window.global_context.share_info && window.global_context.share_info.shared){
				elem.setAttribute('type', 'password');
				elem.value = window.global_context.share_info.shared.pass;
				var a_btn = document.querySelector('a.g-button[title="提取文件"]');
				// console.log('a_btn:', a_btn);
				if(a_btn){
					a_btn.click();
				}
				
			} else {
				console.log('can not find share_info:',window.global_context.share_info);
			}
			if(dialog_ui){
				dialog_ui.show("正在进行三方验证,请耐心等候!!!!!", {'onclose':(ctx)=>{},'onready':(ctx)=>{}});
			} else {
				console.log('dialog_ui is null!');
			}
		} else {
			var a_btn = document.querySelector('a.g-button[title="保存到网盘"]');
			if(a_btn){
				console.log('已经打开分享目录!');
				return;
			}
			setTimeout(loop_check_elem, 500);
		}
	}
	function build_header(){
		var header = document.createElement('div');
		header.style.zIndex=9999;
		header.style.webkitAppRegion='drag';
		header.style.pointerEvents='none';
		header.style.top = '0px';
		header.style.position = 'absolute';
		header.style.height = '2.5rem';
		header.style.width = '100%';
		header.style.lineHeight = '2.5rem';
		header.innerHTML='&nbsp;';
		document.body.appendChild(header);
	}
	function init_ui(){
		build_header();
		// console.log('url address:',document.location.href);
		dialog_ui = build_alert_ui();
		send_message({'tag':'ui_ready', 'cmd':'uiok'});
		// dialog_ui.show("正在进行三方验证,请耐心等候!!!!!", {'onclose':(ctx)=>{},'onready':(ctx)=>{}});
		loop_check_elem();
		
	}
	function onMessage(args){
		var self = this;
		var tag = args.tag;
		if("start" == tag){
			if(check_st(1)){
				args.tag = 'started';
				var rs = args.rs;
				window.global_context.share_info = args.share_info;
				var params = [rs];
				var redirect_uri = args.redirect;
				var current_loc = document.location.href;
				if(current_loc.indexOf('file://')>=0 && redirect_uri){
					document.location.href = redirect_uri;
				} else {
					init_ui();
					trigger("start", params);
					trigger("login", params);
					send_message(args);
				}
			}
		} else if("login" == tag){
			var rs = args.rs;
			var logined = rs.logined, tk = rs.tk;
			window.global_context.tk=tk;
			window.global_context.user=rs;
			// console.log('tag login:', rs)
			trigger("login", [rs]);
		} else if("upload" == tag){
			var datas = args.datas;
			
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
	
	/////////////////////////////////////////Alert
	function build_alert_ui(){
		var titleObj=null;
		var MouseL=1;
		var romance=function(){};
		HTMLElement.prototype.css = function(styles) {
		    for (style in styles) {
		        this.style.setProperty(style, styles[style]);
		    }
		};
		function set_css(){
			var linkStyle = document.getElementsByTagName('link')[0];
			var sheet = linkStyle.sheet;
			if(sheet){
				var rules = sheet.cssRules;
				sheet.insertRule('.closeAlt_default{height:22px;line-height:22px;width:22px;float:left;padding-top:1px;cursor:pointer;background-repeat:no-repeat;background-position:center center}',0);
				sheet.insertRule('.strip_zhong_default{height:22px;line-height:22px;text-align:left;color:#FFFFFF;background-color:silver;background-repeat:repeat-x;-moz-user-select:none}',0);
				sheet.insertRule('.borderframe_default{border-top:0px;background-color:white;}',0);			
			}
		}
		function bind_listener(ctx, settings){
			if(settings){
				if(settings.onready){
					settings.onready.apply(null, [settings]);
				}
			}
		}
		function showAlert(contId,width,height,type,infs, settings){
				toSetContext();
				if(!type)type='ad';
				// var alertDiv = document.getElementById(contId);
				// alertDiv.innerHTML='';
				// alertDiv.context = document.body.oncontextmenu;
				var conDiv = document.getElementById(contId);
				if(!conDiv)conDiv = document.createElement("div");
				conDiv.id=contId;
				conDiv.innerHTML="";
				// conDiv.style.display="none";
				var pageW,pageH,pageX,pageY,pageSY,pageSX,pageWW;
				var NS = (navigator.appName=="Netscape")?true:false;
				MouseL = NS?0:1;
				if(NS){
					pageX=window.pageXOffset;
					pageW=window.outerWidth;
					pageY=window.pageYOffset;
					pageH=window.innerHeight;
					pageSY=pageY;pageSX=pageX;pageWH=pageH;pageWW=pageW;
				} else {
				    pageX=window.document.body.scrollLeft;
				    pageW=window.document.body.scrollWidth;
				    pageY=window.document.body.scrollHeight;
					pageSY=window.document.body.scrollTop;
					pageSX=window.document.body.scrollLeft;
					pageWW=window.document.body.offsetWidth;
					pageWH=window.document.body.offsetHeight;
					if(!pageY)pageH=pageWH;
					else {pageH=pageY;pageY=0;}
				}
				var window_name=window.name;
				if(window_name&&window_name.length>0&&window_name.split('_')[0]=='iframe'){
					var iframes = window.parent.document.getElementsByName(window_name);
					if(iframes&&iframes[0]){
						pageWW=parseInt(iframes[0].width,10)-2;
						pageWH=parseInt(iframes[0].height,10)-2;
						pageX=pageY=0;pageSY=pageSX=0;
						pageW=pageWW;pageH=pageWH;
					}
				}
				if(!infs)infs='INFO';
				var clsDiv = document.createElement("div");
				var html_str = "<span style='float:left;padding-left:5px;height:21px;line-height:21px;'>"+infs+"</span>";
				if(settings && settings.hasOwnProperty('closeable')){
					if(settings.closeable){
						html_str += "<a href='javascript:void(0);' id='closeAtId' style='float:right;display:block;' onclick=\"exitAlert();\"><span class='closeAlt_default closeAlt_"+type+"'>X</span></a>";
					}
				}
				clsDiv.innerHTML=html_str;
				//clsDiv.style.border="1px solid yellow";
				clsDiv.style.height="22px";
				clsDiv.style.clear="both";
				clsDiv.style.float="left";
				clsDiv.style.backgroundColor="#FFFFFF";
				clsDiv.onmouseup=alertDragEnd;
				clsDiv.onmousedown=alertDragStart;
				clsDiv.onmousemove=onMouseMove;
				clsDiv.onselectstart=function(){return false;};
				clsDiv.style.cursor="move";
				clsDiv.className="strip_zhong_default strip_zhong_"+type;
				clsDiv.style.width=(width)+"px";
				clsDiv.parent=conDiv;
				titleObj=clsDiv;
				conDiv.appendChild(clsDiv);
				var bodyDiv = document.createElement("div");
				
				//bodyDiv.style.border="1px solid green";
				bodyDiv.parent=conDiv;
				conDiv.style.position="absolute";
				conDiv.style.zIndex="100001";
				conDiv.style.backgroundColor="#fff";
				/////////////////
				document.body.appendChild(conDiv);
				// alertDiv.child=conDiv;
				//alertDiv.appendChild(conDiv);
				////////////////
				conDiv.oncontextmenu=function(){};
				conDiv.onclick=function(){return false;};
				conDiv.style.width=(width)+"px";
				conDiv.style.height=height+"px";
				//conDiv.style.position="absolute";
				conDiv.style.left=((parseInt(pageWW)-width)/2+pageSX)+"px";
				conDiv.style.top=(parseInt(pageWH)/2-(height)/2+parseInt(pageSY))+"px";
				// alertDiv.onmousemove=function(event){if(onMouseMove)onMouseMove(event);};
				if(NS){bodyDiv.style.width=(width-2)+"px";bodyDiv.style.maxWidth=(width-2)+"px";}else {bodyDiv.style.width=width+"px";}
				bodyDiv.style.overflow="hidden";
				conDiv.appendChild(bodyDiv);
				bodyDiv.className="borderframe_default";
				set_css();
				conDiv.settings = settings;
				return bodyDiv;
			}
		function exitAlert(){
			var contId='alertDiv1';
			var alertDiv = document.getElementById(contId);
			alertDiv.style.display="none";
			// alertDiv.child.style.display="none";
			// document.body.onclick=null;
			// document.body.oncontextmenu=alertDiv.context;
			return alertDiv;
		}
		function closeAlert(){
			var alertDiv = exitAlert();
			if(alertDiv.settings){
				if(alertDiv.settings.onclose){
					alertDiv.settings.onclose.apply(null, [alertDiv]);
				}
			}
		}
		function alertPage(width,height,dialogURL,callBack){
				
				var div = document.getElementById('alertDiv1');
				if(!div){
					div=document.createElement('div');
					div.id='alertDiv1';
					document.body.appendChild(div);
				}
				div.callBack=callBack;
				cdiv = showAlert(div.id,width+2,height);
				//cdiv.style.width=width+2;
				cdiv.className="borderframe_default error_box_ad";
				cdiv.innerHTML='<iframe name=iframe_'+curTime()+' src="'+dialogURL+'" frameborder="no" style="filter:alpha(enabled=false);" border="1" width="'+width+'" height="'+height+'"/>';
		
		}
		function alertMdPage(width,height,dialogURL,callBack){
				
				var div = document.getElementById('alertDiv1');
				if(!div){div=document.createElement('div');div.id='alertDiv1';}
				document.body.appendChild(div);
				div.callBack=callBack;
				cdiv = showAlert(div.id,width+2,height,'md');
				cdiv.className="borderframe_default error_box_md";
				cdiv.innerHTML='<iframe name=iframe_'+curTime()+' src="'+dialogURL+'" frameborder="no" style="filter:alpha(enabled=false);" border="0" width="'+width+'" height="'+height+'"/>';
		
		}
		function alertSpPage(width,height,dialogURL,callBack){
				
				var div = document.getElementById('alertDiv1');
				if(!div){div=document.createElement('div');div.id='alertDiv1';}
				document.body.appendChild(div);
				div.callBack=callBack;
				cdiv = showAlert(div.id,width+2,height,'sp');
				cdiv.className="borderframe_default error_box_sp";
				cdiv.innerHTML='<iframe name=iframe_'+rndNum(2)+' src="'+dialogURL+'" frameborder="no" style="filter:alpha(enabled=false);" border="0" width="'+width+'" height="'+height+'"/>';
		
		}
		function alertBaseInfo(info,type,msgtype, settings){
				var width=240,height=120;
				// var dialogURL='/message/info.html?type='+type+'&msgtype='+msgtype+'&width='+(width)+'&height='+height+'&info='+encodeURI(info);
				// var div = document.getElementById('alertDiv1');
				// if(!div){div=document.createElement('div');div.id='alertDiv1';}
				// document.body.appendChild(div);
				// div.callBack=callBack;
				cdiv = showAlert('alertDiv1',width,height,type,"INFO",settings);
				cdiv.className="borderframe_default";
				var NS = (navigator.appName=="Netscape")?true:false;
				if(NS){cdiv.style.width=width+'px';cdiv.style.maxWidth=width+'px';}
				// cdiv.innerHTML='<iframe name=iframe_'+curTime()+' src="'+dialogURL+'" frameborder="no" style="filter:alpha(enabled=false);" scrolling="no" border="0" width="'+width+'" height="'+height+'"/>';
				cdiv.innerHTML='<div name=iframe_'+curTime()+' frameborder="no" style="filter:alpha(enabled=false);" scrolling="no" border="0" width="'+width+'" height="'+height+'"/><p>'+info+'</p></div>';
				if(settings && settings.closeable){
					document.getElementById('closeAtId').onclick=function(){closeAlert(false);};
				}
				bind_listener(cdiv.parent, settings);
		}
		function build_settings(options){
			var settings = {"closeable": false};
			if(options){
				helpers.extend(settings, options);
			}
			return settings;
		}
		function alertAdInfo(info,options){
				alertBaseInfo(info,'ad','alert', build_settings(options));
		}
		function alertSpInfo(info,options){
				alertBaseInfo(info,'sp','alert', build_settings(options));
		}
		function alertMdInfo(info,options){
				alertBaseInfo(info,'md','alert', build_settings(options));
		}
		function confirmAd(info,options){
			alertBaseInfo(info,'ad','confirm', build_settings(options));
		}
		function confirmMd(info,options){
			alertBaseInfo(info,'md','confirm', build_settings(options));
		}
		function confirmSp(info,options){
			alertBaseInfo(info,'sp','confirm', build_settings(options));
		}
		function alertDragEnd(e){
			if(!this.parent)return;
					this.dragFlag=false;
			this.parent.style.cursor='auto';
		}
		function alertDragStart(et){
			if(!this.parent)return;
			et = et?et:window.event;
			this.curLayerX=et.clientX;
			this.curLayerY=et.clientY;
			this.curLayerLeft=parseInt(this.parent.style.left);
			this.curLayerTop=parseInt(this.parent.style.top);
			this.dragFlag=true;
			this.parent.style.cursor='move';
		}
		function onMouseMove(event){
					if(!titleObj||(!titleObj.dragFlag||typeof(titleObj.curLayerLeft)!="number"))return;
					var et = event?event:window.event;
					if(et.button==MouseL){
							//window.setTimeout('moveWin('+parseInt(et.clientX)+','+parseInt(et.clientY)+')',30);
							moveWin(parseInt(et.clientX),parseInt(et.clientY));
					}
		}
		function moveWin(xx,yy){
			titleObj.parent.style.left =(titleObj.curLayerLeft + xx-parseInt(titleObj.curLayerX))+'px';
			titleObj.parent.style.top =(titleObj.curLayerTop + yy-parseInt(titleObj.curLayerY))+'px';
		}
		var isSetContext=false;
		function toSetContext(){
			if(!isSetContext){
				document.addEventListener("mousemove", function(event){if(onMouseMove)onMouseMove(event);})
			}
			isSetContext=true;
		}
		function rndNum(n)
		{
		    var rnd= '';
		    for(var i = 0; i < n; i++)
		        rnd += Math.floor(Math.random() * 10);
		    return rnd;
		}
		function curTime(){
		    return (new Date()).getTime();
		}
		if(!String.prototype.toQueryParams){
			String.prototype.toQueryParams=function() {
				var pairs = this.match(/^\??(.*)$/)[1].split('&');
				return pairs.inject({}, function(params, pairString) {
				  var pair = pairString.split('=');
				  params[pair[0]] = pair[1];
				  return params;
				});
			};
		}
		if(!Array.prototype.inject){
			Array.prototype.inject=function(memo, iterator){
					for(var i=0;i<this.length;i=i+1){
						// Object.extend(memo,iterator({},this[i]));
						helpers.extend(memo, iterator({},this[i]));
					}
					return memo;
			};
		}
		return {"show": alertSpInfo, "close": closeAlert};
	}
}