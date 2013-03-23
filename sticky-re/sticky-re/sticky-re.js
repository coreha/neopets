var normalSHH = {'position': 'fixed', 'top': '10px', 'left': '50%', 'margin-left': '-200px', 'z-index': '10001', 'border-radius': '5px', 'background-color': '#fff'};
var premSHH = {'position': 'fixed', 'top': '10px', 'left': '50%', 'margin-left': '-420px', 'z-index': '10001'};

setTimeout(function () {

	if ( window.pageYOffset > 199 ) {
		// If the normal event is already visible, don't make a copy.
		$('table[align=center][width=400]').clone().appendTo('body').css(normalSHH).fadeOut(4000, function () { $(this).remove(); } );
		// $('table[align=center][width=400] td[width=80] + td[width=320]').closest('table') // More specific if needed.
		$('div#shh_prem_bg').clone().appendTo('body').css(premSHH).fadeOut(4000, function () { $(this).remove(); } );
	}

}, 100);
