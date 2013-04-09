/*
http://www.neopets.com/search.phtml?selected_type=object&SDB&string=Negg

document.body.querySelector('td.contentModule img[width="80"]')
document.body.innerHTML.match(/Name:[\s\S]+?<b>(.*?)<\/b>/)[1]
document.body.innerHTML.match(/Rarity:[\s\S]+?<b>(.*?)<\/b>/)[1]
document.body.innerHTML.match(/Estimated Value[\S\s]+<i>([\s\S]+)<\/i>/)[1]
*/
$('link, script').remove();
$('img[width!="80"]').remove();

$('body').html( document.body.innerHTML );

try {
	if ( document.body.innerHTML.match(/this item either doesn't exist or is too rare to view/) === null ) {
		var item = {};
		item.name	= document.body.innerHTML.match(/Name:[\s\S]+?<b>(.*?)<\/b>/)[1];
		item.rarity	= document.body.innerHTML.match(/Rarity:[\s\S]+?<b>(.*?)<\/b>/)[1];
		item.desc	= document.body.innerHTML.match(/Estimated Value[\S\s]+<i>([\s\S]+)<\/i>/)[1];
		item.image	= document.body.querySelector('td.contentModule img[width="80"]').getAttribute('src');
		
		chrome.runtime.sendMessage({ "action": "addRarity", "item": item });
	} else {
		chrome.runtime.sendMessage({ "action": "rarityNotFound", "item": decodeURIComponent(window.location.search.match(/string=(.*)/)[1]) });
	}
} catch (e) {
	console.log(e);
}