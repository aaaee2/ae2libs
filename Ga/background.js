(function() {
	var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
	ga.src = 'https://ssl.google-analytics.com/ga.js';
	var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
})();


// Google Analytics interception
/*var req_stack = [],	ga_surl = 'google-analytics.com/';
chrome.webRequest.onBeforeRequest.addListener(function(request) {
	if (request.url.indexOf(ga_surl) !== -1 && request.tabId === -1) {
		req_stack.push(request.url);
		return {cancel: true};
	}
	return {cancel: false};
}, {urls: ["<all_urls>"]}, ["blocking"]);*/

// Ga Class listeners
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	if (request.from && request.from == 'gaHelper') {
		if (!request.type) return;
		switch (request.type) {
			/*case 'query':
				if (request.data == 'reqStack') {
					// intercepted requests transfer
					sendResponse({from: 'gaTrack', type: 'result', data: req_stack});
					req_stack = [];
				}
				break;*/
			case 'track':
				// Ga track
				request.data.referrer && _gaq.push(['_setReferrerOverride', request.data.referrer]);
				request.data.account && _gaq.push(['_setAccount', request.data.account]);
				switch (request.data.type) {
					case 'pageview':
						_gaq.push(['_trackPageview', request.data.message]);
						break;
					case 'social':
						_gaq.push(['_trackSocial', request.data.message.network, request.data.message.finger, request.data.message.target]);
						break;
					default: break;
				}
				break;
			default: break;
		}
	}
});