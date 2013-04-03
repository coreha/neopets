/* No longer used, included in sdb-enhanced.js */

$(document).ready( function () {
	$('input#submit').click(function (e) {
		// BUG: If user has old inventory page open, we can't detect errors.
		if ( document.querySelector('select[name=action]').value == "safetydeposit" ) {
			try {
				var itemName = $('td:nth-child(2)', 'table:eq(0)').text().match(/Item\s+:\s+(.*)/)[1];
				var items = {};
				items[itemName] = 1;
				
				chrome.runtime.sendMessage({ "action": "addIncomplete", "items": items });
			} catch (e) {
				// Make it obvious that there was an error.
				alert("[SDB-Enhanced] Unexpected Error\n\nItem not added.\n" + e);
			}
		}
	});
});
