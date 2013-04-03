/* No longer used, included in sdb-enhanced.js */

$(document).ready( function () {
	$('input[type=submit][value=Submit]').click(function (e) {

		// BUG: If user has old quick stock page open, we can't detect errors.
		var depositList = $('form[name=quickstock] input[type=radio][value=deposit]').filter( function () { return this.checked; } );
	
		var items = {};

		function addItem (name) {
			if ( name == "" || name == undefined ) {
				return;
			} 
			if ( typeof items[name] == "undefined" ) {
				 items[name] = 1;
			} else {
				items[name]++;
			}
		}
	
		depositList.each(
			function (index, element) {
				// Neopets only allows 70 items in Quick Stock, index starts at 0
				if ( index > 69 ) { return false; }
			
				addItem( $(element).closest('tr').find('td:first-child').text() );
			}
		);
		
		chrome.runtime.sendMessage({ "action": "addIncomplete", "items": items });
	});
});
