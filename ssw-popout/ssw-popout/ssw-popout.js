if ( window.location.pathname == "/ssw-popout" && document.title != "SSW" ) {
	/* If we're on the popout page and it hasn't been replaced, we need to replace it. */
	document.open();
	
	/* Get the page from template.html */
	var template = new XMLHttpRequest();
	template.open("GET", chrome.extension.getURL('/template.html'), false);
	template.send();
	
	/* Overwrite the Neopets 404 page */
	document.write( template.response );
	
	/* Force a re-render */
	document.close();

} else {
	/* If not running on our page, add a popout link to the SSW */
	
	var p = document.createElement('p');
	var a = document.createElement('a');
	a.setAttribute('onclick', 'javascript: window.open("/ssw-popout", "SSWwindow", "height=284,width=612,status=0,toolbar=0,resizable=0,scrollbars=0,location=0,menubar=0,toolbar=0");');
	a.setAttribute('style', 'cursor: pointer;');
	p.setAttribute('style', 'width: 100%; text-align: center; clear: both;');
	a.textContent = "SSW Popout";

	p.appendChild(a);
	document.getElementById('area').appendChild(p);
}
