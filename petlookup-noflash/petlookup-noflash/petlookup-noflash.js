// ==UserScript==
// @name           Neopets - Petlookups without flash
// @description    Replaces the flash embed on petlookups with an image.
// @include        http://www.neopets.com/petlookup*
// @match          http://www.neopets.com/petlookup*
// @version        1.00
// @updated        23.03.2013
// ==/UserScript==

var petName = window.location.href.match(/pet=([^&]*)/)[1];
var e = document.getElementById('CustomNeopetView');
e.setAttribute('src', 'http://pets.neopets.com/cpn/' + petName + '/1/5.png');
e.removeAttribute('type');
e.outerHTML = e.outerHTML.replace('embed', 'img');
