// ==UserScript==
// @name           Neopets - SSW Highlight on Hover
// @description    Things to help item DB staff and such with price reports.
// @include        http://www.neopets.com/*
// @match          http://www.neopets.com/*
// @version        1.00
// @updated        April 1, 2013
// ==/UserScript==

// For the text in the search box
document.getElementById('ssw-tabs-1').querySelector('input[name=searchstr]').addEventListener("mouseover", function (e) {
	this.focus();	// Focus the element so the user can type
	this.select();	// then select all of it
});

// For the item name
document.getElementById('ssw-tabs-2').querySelector('#search_for').addEventListener("mouseover", function (e) {

	// If the user has already moved the mouse over the box once, no need to re-create the element
	if (!document.getElementById('matchName')) {
		// Use a Regex to get the item name
		var match = e.target.textContent.match(/matching '(.*?)'/)[1];
		// Wrap the item name with an element that we can select
		e.target.innerHTML = e.target.innerHTML.replace(match, '<span id="matchName">' + match + '</span>');
	}
	var selection = window.getSelection();
	var range = document.createRange();
	// Set the selection range to the contents of the element we created
	range.selectNodeContents(document.getElementById('matchName'));
	// De-select anything else if it is selected
	selection.removeAllRanges();
	// Select our range
	selection.addRange(range);
});

// For the item price
document.getElementById('ssw-tabs-2').querySelector('#results').addEventListener("mouseover", function (e) {

	// Same method as above, different regex
	if (!document.getElementById('matchNP')) {
		var match = this.innerHTML.match(/([\d,]+) NP/);
		// Change (+ match[1].replace(',', '') +) TO (+ match[1] +) if you'd like it to keep the ,
		this.innerHTML = this.innerHTML.replace(match[0], '<span id="matchNP">' + match[1].replace(',','') + '</span> NP');
	}
	var selection = window.getSelection();
	var range = document.createRange();
	range.selectNodeContents(document.getElementById('matchNP'));
	selection.removeAllRanges();
	selection.addRange(range);
});
