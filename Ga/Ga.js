var Ga = function(config) {
	// public properties
	this.extension = null;			// Name of Chrome extension used for.
	this.accounts = {};				// Google Analytics accounts hash.
	this.sendPrefix = null;			// URI prefix.
	this.sendSuffix = null;			// URI suffix.
	this.forceReferrer = false;		// Force Ga to set referrer
	this.intercept = false;			// Intecept Ga requests

	// private properties
	this._messageFrom = 'gaHelper';
	this._trackQueryThread = null;
	this._trackQueryThreadIdle = 3000;
	this._utmr = location.href;
	this._utmcsr = location.hostname.replace(/^www\./, '');

	// constructor
	this.constructor = function(config) {
		try {
			this.extension = chrome.runtime.getManifest().name;
		} catch (e) {
			this.extension = '<unknown_chrome_extension>';
		}
		for (var p in config) {
			if (config.hasOwnProperty(p) && p.indexOf('_') !== 0) {
				// prevent change private properties
				this[p] = config[p];
			}
		}
		this.extension += '.google_analytics:';
		this.account = new this.Account(this);
	};
	this.constructor.call(this, config || {});

	// gatrack query thread 
	if (this.intercept) {
		this._trackQueryThread = setInterval(function() {
			chrome.extension.sendMessage({
				from: this._messageFrom,
				type: 'query',
				data: 'reqStack'
			}, function(response) {
				if (response.from == 'gaTrack' && response.type == 'result' && response.data.length) {
					for (var r = 0; r < response.data.length; r++) {
						var req = response.data[r].replace('utmcsr%3D\(direct\)', 'utmcsr%3D' + this._utmcsr).replace('utmccn%3D\(direct\)', 'utmccn%3D(referral)').replace('utmcmd%3D\(none\)', 'utmcmd%3Dreferral');
						$.ajax({url: req});
					}
				}
			}.bind(this));
		}.bind(this), this._trackQueryThreadIdle);
	}
};

Ga.prototype = {
	Account: function(parent) {
		this._parent = parent;
		
		this.once = null;
		this.current = null;

		this.set = function(alias) {
			this.once = null;
			this.current = this._parent.accounts[alias] || this.getFirst();
		};

		this.setOnce = function(alias) {
			this.set(alias);
			this.once = this.get();
		};

		this.get = function() {
			return this.current || this.getFirst();
		};

		this.getFirst = function() {
			for (var a in this._parent.accounts) {
				if (this._parent.accounts.hasOwnProperty(a)) {
					return this._parent.accounts[a];
				}
			}
			return null;
		};
	},

	setPrefix: function(prefix) {
		this.sendPrefix = prefix;
	},

	setSuffix: function(suffix) {
		this.sendSuffix = suffix;
	},

	setUtmr: function(utmr) {
		this._utmr = utmr;
	},

	setUtmcsr: function(utmcsr) {
		this._utmcsr = utmcsr;
	},

	send: function(config, callback) {
		if (typeof config === 'string') {
			return this.send({message: config, type: 'pageview', callback: callback || null});
		}
		try {
			if (config.account) {
				this.account.setOnce(config.account);
			}
			config.type = config.type || 'pageview';

			config.message = this.sendPrefix ? this.sendPrefix + config.message.toString() : config.message.toString();
			config.message = this.sendSuffix ? config.message.toString() + this.sendSuffix : config.message.toString();

			chrome.runtime.sendMessage({
				from: this._messageFrom,
				type: 'track',
				data: {
					message: config.message,
					type: config.type,
					account: this.account.get(),
					referrer: this.forceReferrer ? this._utmr : null
				}
			});
			if (this.account.once) {
				this.account.current = this.account.once;
				this.account.once = null;
			}
			if (typeof config.callback === 'function') {
				config.callback();
			}
			return true;
		} catch (e) {
			console.log(this.extension, e.message + '.', 'Please update your browser version.');
			return false;
		}
	},

	sendPage: function(message, callback) {
		return this.send({message: message, type: 'pageview', callback: callback || null});
	},

	sendEvent: function(message, callback) {
		return this.send({message: message, type: 'event', callback: callback || null});
	},

	sendSocial: function(network, finger, target, callback) {
		if (typeof finger === 'number') {
			finger = finger > 0 ? 'like' : 'unlike';
		}
		return this.send({
			message: {
				network: network,
				finger: finger,
				target: target
			},
			type: 'social',
			callback: callback || null
		});
	},

	read: function() { return null; }
};