//"use strict";
var Controller	= chrome.extension.getBackgroundPage();
/*
 * Show an informative message on errors.
 */
window.onerror = function (type, url, line) {
	setTimeout(
	function () {
		jQuery('<div title="Unexpected Error"><h2>An error has occured.</h2><p>Please reload the extension, or restart your browser.</p>'+
		'<pre>' + type + ' on line ' + line + '</pre></div>').appendTo('body').
		dialog({
			"modal": true,
			"width": "500px",
			"closeOnEscape": false,
			"resizable": false,
			"draggable": false,
			"open": function() { $(".ui-dialog-titlebar-close").hide(); }
		});
		$('input').blur();
	}, 0);
};
var DEBUG			= Controller.DEBUG;
var settingsManager	= Controller.settingsManager;
var settings		= settingsManager.settings();
var db				= Controller.db.getDB();

function getSettings () {
	$('.optionsForm input[type=checkbox]').each(
			function (index, input) {
					// Undefined will be coerced to 0.
					input.checked = ~~settings[input.name];
			});
	
	['itemsPerPage', 'notifications'].forEach( function (setting) {
		for ( var i = 0; i < document.optionsForm[setting].options.length; i++ ) {
			if ( document.optionsForm[setting].options[i].value == settings[setting] ) {
				document.optionsForm[setting].options[i].selected = true;
			}
		}
	});
	
	if ( ~~document.optionsForm.itemsPerPage.value > 100 ) {
		$('.itemsPerPageWarning').removeClass('hidden').html('<h3>Warning</h3>Setting items per page to higher than 100 is not recommended.');
	}
}

$(document).ready( function () {
	getSettings();
	updateFolderView();
	$(document).tooltip();
	$('.regexSearch').tooltip({ items: "div[class~=regexSearch]", content: "Regex must be a complete match.<br/><br/>To find an item with a name that is a single word and 12 characters long, you could use the following search:<br/><br/><pre>\\w{12}" });
	$('.lookupRarities').tooltip({ items: "div[class~=lookupRarities]", content: "Uses the Neopets search to look up specific item rarities, as a logged out user.<br/><br/>If left unchecked, only rarity estimates will be available." });
	$('.notifications').tooltip({ items: "div[class~=notifications]", content: "When you add previously unseen items to your SDB, you need to view them in the normal SDB for them to be added here.<br/<br/><br/><b>Never</b>: you will not be informed when items are missing information, and they will not show up until you view them in your normal SDB.<br/><br/><b>SDB Opened</b>:Shows a list when you open the extension, if applicable.<br/><br/><b>Items Added</b>: Shows a notification immediately when you add the item(s)." });
	
	/*
	MAY implement this as an OPTION in future versions to make retrieving information on new items more user-friendly.
	No data is shared in current versions, and if added in future versions
	the feature will require explicit approval, as seen here.
	
	Currently: Unimplemented.
	
	$('.shareData').tooltip({ items: "div[class~=shareData]", content: "Item data is shared only with explicit permission, and does not include any data that can be used to identify you or your account.<br/><br/>Shared data can be used for obtaining item info when you add items to your SDB via Quick Stock and Inventory.<br/><br/>Limited to: Item IDs, Names, Image urls, Descriptions, Rarities, and Types." });
	
	$('.shareData input[type=checkbox]').click( function (e) {
		this.checked = !this.checked;
		var box = this;
		if ( this.checked ) {
			chrome.permissions.remove(
				{ origins: ['http://neo.regex.be/'] },
				function ( removed ) {
					box.checked = !removed;
				}
			);
		} else {
			chrome.permissions.request(
				{ origins: ['http://neo.regex.be/'] },
				function ( granted ) {
						box.checked = granted;
				}
			);
		}
	});
	*/
	
	$(document.optionsForm.empty).bind("click", function (e) {
		e.preventDefault();
		
		if ( confirm('Empty Database?') ) {
			db.emptyDatabase();
		}
	});
	
	$(document.optionsForm.save).bind("click", function (e) {
		e.preventDefault();
		this.innerText = 'Saving...';
		
		$('.optionsForm input[type=checkbox]').each(
			function (index, input) {
				settings[input.name] = ~~input.checked;
			});
		
		['itemsPerPage', 'notifications'].forEach( function (setting) {
			settings[setting] = parseInt(document.optionsForm[setting].value, 10);
		});
		
		if ( settingsManager.save(settings) ) {
			this.innerText = 'Saved';
			setTimeout( function () {
				document.optionsForm.save.innerText = 'Save';
			}, 775);
		} else {
			$(this).removeClass('btn-primary').addClass('btn-error');
			this.innerText = 'Error: Not Saved.';
			this.setAttribute('disabled', 'disabled');
		}
	});
});

function updateFolderView () {
	db.executeQuery('SELECT folder, Count(1) AS Count FROM items GROUP BY folder ORDER BY Count DESC', [], showFolders, handleError);
}

function showFolders (tx, results) {
	$('.folder-container tr').has('td').remove()

	// There will always be at least one, since the default "None"
	for (var row = 0; row < results.rows.length; row++) {
		var item = results.rows.item(row);
	
		var tr = document.createElement('tr');
		$('<td>', {"text": item.folder}).appendTo(tr);
		$('<td>', {"text": item.Count}).appendTo(tr);
		//$('<td>', {"html": '<select class="input-small"><option>Delete</option><option>Rename</option><option>Move All</option></select>'}).appendTo(tr);
		//$('<td>', {"html": '<button class="btn btn-primary" disabled>Go</button>'}).appendTo(tr);
		$('.folder-container').append(tr);
	}
}

function handleError (tx, error) {
	console.log(error.message);
}
