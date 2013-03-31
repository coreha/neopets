function neoUrl(tabId, changeInfo, tab) {
  if (tab.url.indexOf('neopets.com') > -1) {
    chrome.pageAction.show(tabId);
  }
};

chrome.tabs.onUpdated.addListener(neoUrl);

var db;
db = openDatabase('sdb', '1.0', 'sdb items', 200 * 1024 * 1024);
db.transaction(function (tx) {
	// tx.executeSql('DROP TABLE IF EXISTS items');
	tx.executeSql('CREATE TABLE IF NOT EXISTS items (obj_info_id INTEGER UNIQUE, name TEXT, desc TEXT, img TEXT, type TEXT, folder TEXT default "None", qty INTEGER, rarity INTEGER)');
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    //console.log( request );
    
    $.each( request, function ( index, item ) {
    	(function (item) {
    		db.transaction(function (tx) {
	    		tx.executeSql('INSERT OR REPLACE INTO items VALUES (?, ?, ?, ?, ?, (SELECT folder FROM items WHERE obj_info_id = ?), ?, ?)',
	    			[item.obj_info_id, item.name, item.desc, item.img, item.type, item.obj_info_id, item.qty, item.rarity],
	    			function (tx, results) { console.log(results); },
	    			function (tx, results) { console.log(results); }
	    		);
    		});
    	})(item);
    });
    
  });
  
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
