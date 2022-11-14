/*---------------------------------------------------------------------------------
 *
 *   Copyright © 2022 Kraken Networks, Inc. and AppVizo, LLC. All Rights Reserved.
 *   File: C:\Projects\ServiceNow\Apps\SLAMonitor\ServerDevelopment\ScriptInclude\LibreConnection.js
 *   Version 0.0.1
 *
 *   Notes: Original connection code from Sean and Bernie.
 * 
 *----------------------------------------------------------------------------------*/

var testing = false;


var LibreConnection = Class.create();
LibreConnection.prototype = {
    initialize: function() {
		// this.host = "http://10.224.119.19/api/v0";		// Deployment
		this.host = "http://192.168.3.234/api/v0";			// Dev test
		// this.token = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx";	// Sean
		this.host = "https://github.com/thaneplummer/SvcNowLibre";	// tkp github test site

    },
	
	collectPacketRatio: function(c, e){
		if (e < 1){ return 0.000;}
		if (count < 1){ return 100.0;}
		return e / c * 100;
	},
	
	defaultValue: function(variable, value){
		return 	variable = (variable !== undefined) ? variable : value;
	},
	
	sendRequest: function(endpoint, method){
		method = this.defaultValue(method,"get");
				
		var request = new sn_ws.RESTMessageV2();
		var url = endpoint.startsWith(this.host) ? endpoint : this.host+endpoint;
		
		// request.setBasicAuth(this.username,this.password);
		request.setHttpMethod(method);
		request.setEndpoint(url);
		request.setRequestHeader("Content-type","application/json");
		// request.setRequestHeader("X-Auth-Token", this.token);

		if (testing) {
			gs.addInfoMessage("URL: " + url);
			gs.addInfoMessage("Headers: " + JSON.stringify(request.getRequestHeaders()));
		}
		
		var response = request.execute();
		var responseBody = response.haveError() ? response.getErrorMessage() : response.getBody();
		var status = response.getStatusCode();
		if (testing) {
			gs.addInfoMessage("Status: " + status);
			gs.addInfoMessage("Response: " + responseBody);
		}
		return responseBody;
	},
	
	sendGraphRequest: function(endpoint, method){
		method = this.defaultValue(method,"GET");
				
		var request = new sn_ws.RESTMessageV2();
		var url = this.host+endpoint;
		
		request.setHttpMethod(method);
		request.setEndpoint(url);
		request.setRequestHeader('X-Auth-Token', this.token);
		
		var response = request.execute();
		return response.getBody();
	},
	
	getDevices: function(){
		var endpoint = this.host+"/devices";
		var resp = this.sendRequest(endpoint, "get");
		return resp['devices'];
	},
	
	getDeviceInfo: function(deviceId){
		var endpoint = this.host+"/devices/"+deviceId.toString();
		var resp = this.sendRequest(endpoint, "GET");
		var device = resp['devices'][0];
		return {
			'deviceId': device['device_id'],
			'hostname': device['hostname'],
			'ipAddress': device['ip'],
			'hardware': device['hardware'],
			'location': device['location'],
			'serialNum':device['serial'],
			'sysName':device['sysName'],
			'sysDescr': device['sysDescr'],
			'version': device['version']
		};
	},
	
	getDeviceAvailability: function(deviceId){
		var endpoint = this.host+"/devices/"+deviceId.toString()+"/availability";
		var resp = this.sendRequest(endpoint, "GET");
		if (resp['availability'].length > 0){
			return resp['availability'][-1]['availability_perc'];
		}
	},
	
	getDeviceJitterGraph: function(deviceId){
		var endpoint = this.host+"/devices/"+deviceId.toString()+"/device_sla_jitter";
		var resp = this.sendGraphRequest(endpoint, "GET");
		return resp;
	},
	
	getDeviceLatencyGraph: function(deviceId){
		var endpoint = this.host+"/devices/"+deviceId.toString()+"/device_ping_perf";
		var resp = this.sendGraphRequest(endpoint, "GET");
		return resp;
	},
	
	getDeviceDPR: function(deviceId){
		var ports = this.getDevicePorts(deviceId);

		var packets = 0;
		var es = 0;
		
		for(p in ports){
			var endpoint = this.host+"/devices/"+deviceId.toString()+"/ports"+ports[p].toString();
			var resp = this.sendRequest(endpoint, "GET");
			if (resp['status'] == 'ok'){
				packets += resp['port']['ifInUcastPkts'];
				es += resp['port']['ifInErrors'];
				packets += resp['port']['ifOutUcastPkts'];
				es += resp['port']['ifOutErrors'];
			}
		}
		
		return {
			'packets': packets,
			'errors': es,
			'total_ratio': this.collectPacketRatio(packets, es)
		};
		
	},
	
	getDevicePorts: function(deviceId){
		var endpoint = this.host+"/devices/"+deviceId.toString()+"/ports";
		var resp = this.sendRequest(endpoint, "GET");
		portNames = [];
		for (i in resp['ports']){
			portNames.push(resp['ports'][i]['ifName']);
		}
		return portNames;
	},
	
    type: 'LibreConnection'
};

// TEST -----------------------------------

var result;
if (testing) {
	var libre = new LibreConnection();
	var devices = libre.getDevices();
	result = devices;
	// var device_id = devices[0].deviceId;
	// var svg = libre.getDeviceLatencyGraph(device_id);
	// TODO: parse svg to get jitter etc.
}
result
