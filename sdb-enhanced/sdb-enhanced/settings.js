var db;
db = openDatabase('sdb', '1.0', 'sdb items', 200 * 1024 * 1024);
db.transaction(function (tx) {
	tx.executeSql('CREATE TABLE IF NOT EXISTS items (obj_info_id INTEGER UNIQUE, name TEXT, desc TEXT, img TEXT, type TEXT, folder TEXT default "None", qty INTEGER, rarity INTEGER, wearable INTEGER)');
});

function getSettings () {
	var defaultSettings = {
		"showRarity":	1,
		"showSort":		1,
		"showFolder":	1,
		"regexSearch":	1,
		"ItemsPerPage":	10
	};

	try {
		settings = JSON.parse(localStorage["settings"]);
	} catch (e) {
		settings = defaultSettings;
		localStorage["settings"] = JSON.stringify(settings);
	}
	
	document.optionsForm.showRarity.checked		= settings.showRarity;
	document.optionsForm.showSort.checked		= settings.showSort;
	document.optionsForm.showFolder.checked		= settings.showFolder;
	document.optionsForm.regexSearch.checked	= settings.regexSearch;
	
	for ( var i = 0; i < document.optionsForm.itemsPerPage.options.length; i++ ) {
		if ( document.optionsForm.itemsPerPage.options[i].value == settings.itemsPerPage ) {
			document.optionsForm.itemsPerPage.options[i].selected = true;
		}
	}
	
	if ( ~~document.optionsForm.itemsPerPage.value > 100 ) {
		$('.itemsPerPageWarning').removeClass('hidden').html('<h3>Warning</h3>Setting items per page to higher than 100 is not recommended.');
	}
}

$(document).ready( function () {
	getSettings();
	updateFolderView();
	
	$(document.optionsForm.empty).bind("click", function (e) {
		e.preventDefault();
		
		if ( confirm('Empty Database?') ) {
			db.transaction(function (tx) {
				tx.executeSql('DROP TABLE items');
			});
		}
	});
	
	$(document.optionsForm.save).bind("click", function (e) {
		e.preventDefault();
	
		settings.showRarity		= ~~document.optionsForm.showRarity.checked;
		settings.showSort		= ~~document.optionsForm.showSort.checked;
		settings.showFolder		= ~~document.optionsForm.showFolder.checked;
		settings.regexSearch	= ~~document.optionsForm.regexSearch.checked;
		settings.itemsPerPage	= parseInt(document.optionsForm.itemsPerPage.value, 10);
		
		localStorage["settings"] = JSON.stringify(settings);
	});
});

function updateFolderView () {
	db.transaction( function (tx) {
		tx.executeSql('SELECT folder, Count(1) AS Count FROM items GROUP BY folder ORDER BY Count DESC', [], showFolders, handleError);
	});
}

function showFolders (tx, results) {
	$('.folder-container tr').has('td').remove()

	// There will always be at least one, since the default "None"
	for (var row = 0; row < results.rows.length; row++) {
		var item = results.rows.item(row);
	
		var tr = document.createElement('tr');
		$('<td>', {"text": item.folder}).appendTo(tr);
		$('<td>', {"text": item.Count}).appendTo(tr);
		$('<td>', {"html": '<select class="input-small"><option>Delete</option><option>Rename</option><option>Move All</option></select>'}).appendTo(tr);
		$('<td>', {"html": '<button class="btn btn-primary" disabled>Go</button>'}).appendTo(tr);
		$('.folder-container').append(tr);
	}
}

function handleError (tx, error) {
	console.log(error.message);
}
