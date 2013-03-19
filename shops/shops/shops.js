var e = document.getElementsByClassName('content')[0];
e.innerHTML = e.innerHTML.replace(/<!-- desc start -->[\s\S]*<!-- desc end -->/ig, "");
