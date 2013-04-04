$(document).ready(function () {
	// Item name is passed in the hash
	try {
		var itemNames = JSON.parse( decodeURIComponent(window.location.hash.substr(1)) );
	} catch (e) {
		window.close();
	}

	itemNames.forEach( function (name) {
		$('<li><a target="_blank" href="http://www.neopets.com/safetydeposit.phtml?obj_name=' +
		encodeURIComponent(name) + '&category=0">' + name + '</a></li>').appendTo('ul:eq(0)');
	});
	
	$('a').click( function (e) {
		//e.preventDefault();
		// Would have been nice, but can't re-use a window due to CORS bug
		//window.open( this.href, "SDBwindow" );
		
		$(this).closest('li').remove();
		
		// User clicked them all? Dismiss notification.
		if ( $('li').length == 0 ) {
			window.close();
		}
	});
});
