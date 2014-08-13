var script = document.createElement('script');
script.src = chrome.extension.getURL('captureCalls.js');
(document.head || document.documentElement).appendChild(script);
