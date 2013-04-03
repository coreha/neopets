const VERSION = chrome.app.getDetails().version;
if ( typeof localStorage['version'] == "undefined" ) {
	// New Install, show help page.
	window.open( chrome.extension.getURL('/help.html') );
	localStorage['version'] = VERSION;
} else if ( localStorage['version'] != VERSION ) {
	// Updated
	
	localStorage['version'] = VERSION;
}

var db;
db = openDatabase('sdb', '1.0', 'sdb items', 100 * 1024 * 1024);

db.getDB = function () {
	db.init();
	return db;
}

db.init = function () {
	db.transaction(function (tx) {
		// tx.executeSql('DROP TABLE IF EXISTS items');
		tx.executeSql('CREATE TABLE IF NOT EXISTS items (obj_info_id INTEGER UNIQUE, name TEXT, desc TEXT, img TEXT, type TEXT, folder TEXT default "None", qty INTEGER, rarity INTEGER, wearable INTEGER, raritySet INTEGER)');
		// raritySet = 0 - Rarity has been set from SDB only. (Estimate)
		// raritySet = 1 - Rarity has been lookup up with Neopets search.
		// raritySet = 2 - Attempted lookup, but got no results.
		tx.executeSql('CREATE TABLE IF NOT EXISTS itemFolders ( obj_info_id INTEGER UNIQUE, folderName TEXT )');
		tx.executeSql('CREATE TABLE IF NOT EXISTS incompleteItems ( name TEXT UNIQUE, qty INTEGER )');
	});
}
db.init();

db.updateFolderMap = function () {
	db.transaction(function (tx) {
		tx.executeSql('INSERT OR REPLACE INTO itemFolders ( obj_info_id, folderName ) SELECT obj_info_id, folder FROM items WHERE folder != "None"');
	});
}

var settingsManager = (function () {
	var defaultSettings = {
		"showRarity":	1,
		"showDescriptions": 1,
		"regexSearch":	0,
		"lookupRarities": 0,
		"notifications": 2,
		"itemsPerPage":	10
	};
	
	var settings;
	
	validateSettings = function ( checkSettings ) {
		Object.keys(defaultSettings).forEach(
			function (name) {
				console.log(name, typeof checkSettings[name]);
				if ( typeof checkSettings[name] == "undefined" ) {
					throw "invalidSettingsException";
				}
			});
	};
	
	try {
		settings = JSON.parse(localStorage["settings"]);
		validateSettings( settings );
	} catch (e) {
		//console.log("Caught:", e, defaultSettings);
		settings = defaultSettings;
	}
	
	return {
		get: function ( name ) {
			return settings[name];
		},
		
		set: function ( name, value ) {
			settings[name] = value;
			// True: success; false: fail
			return this.save(settings);
		},
		
		save: function ( newSettings ) {
			try {
				validateSettings ( newSettings );
				settings = newSettings;
				localStorage["settings"] = JSON.stringify(settings);
				return true;
			} catch (e) {
				console.log("Caught:", e, settings);
				return false;
			}
		},
		
		settings: function () {
			return settings;
		}
	};
	
})();

chrome.runtime.onMessage.addListener(
	function(request, sender, sendResponse) {
		console.log(sender.tab ?
		            "from a content script:" + sender.tab.url :
		            "from the extension");
		console.log( request );
		
		switch ( request.action ) {
			case 'add':
				$.each( request.items, function ( index, item ) {
					(function (item) {
						db.transaction(function (tx) {
							tx.executeSql('INSERT OR REPLACE INTO items VALUES (?, ?, ?, ?, ?, coalesce((SELECT folderName FROM itemFolders WHERE obj_info_id = ?), "None"), ?, coalesce((SELECT rarity FROM items WHERE obj_info_id = ?), ?), ?, coalesce((SELECT raritySet FROM items WHERE obj_info_id = ?), 0))',
								[item.obj_info_id, item.name, item.desc, item.img, item.type, item.obj_info_id, item.qty, item.obj_info_id, item.rarity, item.wearable, item.obj_info_id]
								//,function (tx, results) { console.log(results); },
								//function (tx, results) { console.log(results); }
							);
						});
					})(item);
				});
			break;
			
			case 'addIncomplete':
				var itemNames = [];
				var seen = 0;
				
				$.each( request.items, function ( name, qty, items ) {
					db.transaction(function (tx) {
						tx.executeSql('SELECT obj_info_id FROM items WHERE name = ?', [name],
							function ( tx, result ) {
								seen++;
								
								if ( result.rows.length > 0 ) {
									// Add to main items
									tx.executeSql('UPDATE items SET qty = qty + ? WHERE name = ?', [qty, name],
										function (tx, results) { console.log(results); },
										function (tx, results) { console.log(results); });
								} else {
									// Add to Incomplete
									tx.executeSql('INSERT INTO incompleteItems ( name, qty ) VALUES ( ?, ? )', [name, qty],
										function (tx, results) { console.log(results); },
										function (tx, results) { console.log(results); });
									
									itemNames.push( name );
									console.log(itemNames);
								}
								
								if ( seen == Object.keys(request.items).length ) {
									// Looped over all items
									console.log(itemNames.length, itemNames);
									if ( itemNames.length > 0 ) {
										var notification = webkitNotifications.createHTMLNotification( '/notification.html#' + encodeURIComponent(JSON.stringify(itemNames)) );
										notification.show();
									}
								}
							}
						);
					});
				});

			break;
			
			case 'addRarity':
				var item = request.item;
				db.transaction(function (tx) {
					tx.executeSql('UPDATE items SET raritySet = 1, rarity = ?, desc = ?, img = ? WHERE name = ?', [item.rarity, item.desc, item.image, item.name], handleError, handleError);
				});
			break;
			
			case 'rarityNotFound':
				var item = request.item;
				db.transaction(function (tx) {
					tx.executeSql('UPDATE items SET raritySet = 2 WHERE name = ?', [item], handleError, handleError);
				});
			break;
		}
	}
);
  
chrome.webRequest.onBeforeSendHeaders.addListener(
	function (details) {
		console.log(details.requestHeaders);
		details.requestHeaders.push({"name":"Referer", "value":"http://www.neopets.com/safetydeposit.phtml"});
		for (var i = 0; i < details.requestHeaders.length; ++i) {
			if (details.requestHeaders[i].name == 'Origin') {
				details.requestHeaders.splice(i, 1);
				break;
			}
		}
		return {requestHeaders: details.requestHeaders};
	},
	{urls: ["http://www.neopets.com/process_safetydeposit.phtml?checksub=scan"]},
	["blocking", "requestHeaders"]
);

// Logout when looking up item info, to make sure that the extension is not
// performing actions on behalf of the user (i.e. triggering REs)
chrome.webRequest.onBeforeSendHeaders.addListener(
	function (details) {
		console.log(details.requestHeaders);
		for (var i = 0; i < details.requestHeaders.length; ++i) {
			if (details.requestHeaders[i].name == 'Origin' || details.requestHeaders[i].name == 'Cookie') {
				details.requestHeaders.splice(i, 1);
				break;
			}
		}
		return {requestHeaders: details.requestHeaders};
	},
	{urls: ["http://www.neopets.com/search.phtml?selected_type=object&SDB&string=*"]},
	["blocking", "requestHeaders"]
);

// Make pages lighter when loading item info
// Saves a ton of requests/bandwidth
chrome.webRequest.onBeforeSendHeaders.addListener(
	function (details) {
		for (var i = 0; i < details.requestHeaders.length; ++i) {
			if (details.requestHeaders[i].name == 'Referer') {
				if (details.requestHeaders[i].value.indexOf('http://www.neopets.com/search.phtml?selected_type=object&SDB&string=') === 0 ) {
					return {cancel: true}
				}
				break;
			}
		}
	},
	{urls: ["<all_urls>"]},
	["blocking", "requestHeaders"]
);

var lookupInProgress = false;

function lookupRarities () {
	if ( !lookupInProgress ) {
		lookupInProgress = true;
	
		db.transaction(function (tx) {
			tx.executeSql('SELECT name FROM items WHERE rarity < 99 AND raritySet = 0 AND type != "Neocash"', [], doLookupRarities, handleError);
		});
	}
}

var lookupQueue = [];
var frame = document.createElement('iframe');

function doLookupRarities (tx, results) {

	frame.onload = getNext;
	document.body.appendChild(frame);
	
	for ( var row = 0; row < results.rows.length; row++ )
		lookupQueue.push(results.rows.item(row).name);
	
	console.log(lookupQueue);
	getNext();
}

function getNext () {
	if ( lookupQueue.length === 0 ) {
		frame.removeAttribute('src');
		lookupInProgress = false;
		return false;
	}
	setTimeout(
		function () {
			frame.src = 'http://www.neopets.com/search.phtml?selected_type=object&SDB&string=' + encodeURIComponent( lookupQueue.shift() );
		},
		// Delay requests so we do not hammer the server
		// If browser is closed, lookups will continue where they left off when it is started again
		Math.random() * 10000
	);
	// console.log('http://www.neopets.com/search.phtml?selected_type=object&SDB&string=' + encodeURIComponent( lookupQueue.shift() ));
	// return getNext();
}

function handleError (tx, results) {
	console.log(results);
}
