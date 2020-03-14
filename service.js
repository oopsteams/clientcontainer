const http = require('http');
const https = require('https');
const querystring = require('querystring');
const URL = require('url');
const helpers = require("./helper.core.js")
var api = {
	post_server:function(tk, path, params, cb, _options){
		const post_data = querystring.stringify(params);
		var headers = {"SURI-TOKEN": tk, 
			"Content-Type": "application/x-www-form-urlencoded",
			'Content-Length': Buffer.byteLength(post_data)
		};
		var options = URL.parse(helpers.point + path);
		var opt = {
			method: 'POST',
			timeout: 120000,
			insecureHTTPParser: true,
			headers: headers
		};
		helpers.extend(options, opt);
		if(_options && _options.options){
			helpers.extend(options, _options.options);
		}
		// console.log("post_server options:", options);
		// console.log("post_server post_data:", post_data);
		const req = http.request(options, (res)=>{
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => {
				rawData += chunk;
			});
			res.on('end', ()=>{
				if(cb){
					cb(null, rawData);
				}
			});
		});
		req.on('error', (e)=>{
			cb(e, null);
			if(_options && _options.error){
				_options.error(e);
			}
		});
		req.write(post_data);
		req.end();
	},
	server_get_header:function(dlink, cb, _options){
		var ua = "netdisk;2.2.2;pc;pc-mac;10.13.6;macbaiduyunguanjia";
		var headers = {"User-Agent": ua};
		const url = new URL.URL(dlink);
		
		var options = {
			href: url.href,
			origin: url.origin,
			protocol: url.protocol,
			host: url.host,
			hostname: url.hostname,
			path: url.pathname + url.search,
			port: 443
		};
		var opt = {
			method: 'HEAD',
			timeout: 120000,
			insecureHTTPParser: true,
			headers: headers
		};
		helpers.extend(options, opt);
		if(_options && _options.options){
			helpers.extend(options, _options.options);
		}
		console.log("server_get_header options:", options);
		const req = https.request(options, (res)=>{
			
			console.log('状态码:', res.statusCode);
			cb(null, res.statusCode, res.headers);
			if(res.statusCode == 302){
				console.log("location:", res.headers['location'])
				
			} else {
				console.log('请求头:', res.headers);
			}
		});
		req.on('error', (e)=>{
			cb(e, 0, null);
			if(_options && _options.error){
				_options.error(e);
			}
		});
		req.end();
	},
	server_get:function(tk, path, params, cb, _options){
		var headers = {"SURI-TOKEN": tk};
		const url = new URL.URL(helpers.point + path);
		if(params){
			for(var k in params){
				url.searchParams.append(k, params[k]);
			}
		}
		var options = {
			href: url.href,
			origin: url.origin,
			protocol: url.protocol,
			host: url.host,
			hostname: url.hostname,
			path: url.pathname + url.search,
			port: url.port
		};
		var opt = {
			method: 'GET',
			timeout: 120000,
			insecureHTTPParser: true,
			headers: headers
		};
		helpers.extend(options, opt);
		if(_options && _options.options){
			helpers.extend(options, _options.options);
		}
		// console.log("server_get options:", options);
		const req = http.request(options, (res)=>{
			res.setEncoding('utf8');
			let rawData = '';
			res.on('data', (chunk) => {
				rawData += chunk;
			});
			res.on('end', ()=>{
				if(cb){
					// console.log('on end rawData:', rawData);
					cb(null, rawData);
				}
			});
		});
		req.on('error', (e)=>{
			cb(e, null);
			if(_options && _options.error){
				_options.error(e);
			}
		});
		req.end();
	}
}
module.exports = api;