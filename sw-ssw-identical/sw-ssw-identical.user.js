// ==UserScript==
// @name           Neopets - Set SW/SSW to "Identical to my phrase"
// @description    Neopets - Set SW/SSW to "Identical to my phrase"
// @include        http://www.neopets.com/*
// @match	       http://www.neopets.com/*
// @updated        18.03.2013
// ==/UserScript==

e = document.createElement("script");
e.textContent = "$('select[name$=criteria]').val('exact');";
document.head.appendChild(e);
