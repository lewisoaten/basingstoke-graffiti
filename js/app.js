(function() {
	/* Canvas */

	var plane = document.getElementById('plane');
	var canvas = document.getElementById('drawCanvas');
	var ctx = canvas.getContext('2d');
	var color = document.querySelector(':checked').getAttribute('data-color');
	var archiveButton = document.getElementById('clear');
	var previousButton = document.getElementById('previous');
	var liveButton = document.getElementById('live');

	var keepUpdated = true;
	var imageId = 0;

	canvas.width = Math.min(document.documentElement.clientWidth, window.innerWidth || 300);
	canvas.height = Math.min(document.documentElement.clientHeight, window.innerHeight || 300);

	ctx.strokeStyle = color;
	ctx.lineWidth = '8';
	ctx.lineCap = ctx.lineJoin = 'round';

	/* Mouse and touch events */

	document.getElementById('colorSwatch').addEventListener('click', function() {
		color = document.querySelector(':checked').getAttribute('data-color');
	}, false);

	var isTouchSupported = 'ontouchstart' in window;
	var isPointerSupported = navigator.pointerEnabled;
	var isMSPointerSupported =  navigator.msPointerEnabled;

	var downEvent = isTouchSupported ? 'touchstart' : (isPointerSupported ? 'pointerdown' : (isMSPointerSupported ? 'MSPointerDown' : 'mousedown'));
	var moveEvent = isTouchSupported ? 'touchmove' : (isPointerSupported ? 'pointermove' : (isMSPointerSupported ? 'MSPointerMove' : 'mousemove'));
	var upEvent = isTouchSupported ? 'touchend' : (isPointerSupported ? 'pointerup' : (isMSPointerSupported ? 'MSPointerUp' : 'mouseup'));

	canvas.addEventListener(downEvent, startDraw, false);
	canvas.addEventListener(moveEvent, draw, false);
	canvas.addEventListener(upEvent, endDraw, false);

	function imageUpload(){
	  var dataURL = canvas.toDataURL('image/png')
	  var blob = dataURItoBlob(dataURL)
	  var formData = new FormData()
		formData.append('location', 1)
	  formData.append('myFile', blob)

	  var xhr = new XMLHttpRequest();
	  xhr.open( 'POST', '/archiveimage', true )
	  xhr.onload = xhr.onerror = function() {
	    console.log( xhr.responseText )
	  };
	  xhr.send( formData )
	}

	function dataURItoBlob(dataURI) {
	  var byteString = atob(dataURI.split(',')[1]);
	  var ab = new ArrayBuffer(byteString.length);
	  var ia = new Uint8Array(ab);
	  for (var i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
	  return new Blob([ab], { type: 'image/jpeg' });
	}

	function archive() {

		imageUpload()
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		var plts = []
		plts[0] = {x: 0, y: 0}

		for(var i=1; i<50; i++) {
			publish({
				color: "gold",
				plots: plts
			});
		}
	}

	archiveButton.addEventListener("click", archive, false);

	function updateFromHistory() {
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		pubnub.history({
			channel  : channel,
			count    : 50,
			callback : function(messages) {
				pubnub.each( messages[0], drawFromStream );
			}
		});
	}

	function backToLive() {
		imageId = 0;
		keepUpdated = true;
		updateFromHistory();
	}

	if(liveButton) {
		liveButton.addEventListener("click", backToLive, false);
	}

	function setImage(id) {
		base_image = new Image();
		base_image.src = '/getarchiveimage?location=1&version='+id.toString();

		base_image.onload = function(){
			keepUpdated = false;
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.drawImage(base_image, 0, 0, base_image.width, base_image.height);
		}
	}

	function previous() {
		if(imageId<1) {
	    var xmlHttp = new XMLHttpRequest();
	    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200) {
					imageId = xmlHttp.responseText;
          setImage(imageId);
				}
	    }
	    xmlHttp.open("GET", "/countimages/1", true); // true for asynchronous
	    xmlHttp.send(null);
		} else if(imageId==1) {
			backToLive()
		} else {
			imageId--;
			setImage(imageId)
		}
	}

	if(previousButton) {
		previousButton.addEventListener("click", previous, false);
	}

	/* PubNub */

	var channel = 'draw';

	var pubnub = PUBNUB.init({
		publish_key     : 'pub-c-079ef4c8-c037-40ab-b588-cf85a4195645',
		subscribe_key   : 'sub-c-f641651e-d201-11e7-b689-fe280ced9411',
		leave_on_unload : true,
		ssl		: document.location.protocol === "https:"
	});

	pubnub.subscribe({
		channel: channel,
		callback: drawFromStream,
		presence: function(m){
			if(m.occupancy > 1){
				document.getElementById('unit').textContent = 'graffiti artists';
			} else {
				document.getElementById('unit').textContent = 'graffiti artist';
			}
   			document.getElementById('occupancy').textContent = m.occupancy;
   			var p = document.getElementById('occupancy').parentNode;
   			p.classList.add('anim');
   			p.addEventListener('transitionend', function(){p.classList.remove('anim');}, false);
   		}
	});


	function publish(data) {
		pubnub.publish({
			channel: channel,
			message: data
		});
   }

  /* Draw on canvas */

  function drawOnCanvas(color, plots) {
  	ctx.strokeStyle = color;
		ctx.beginPath();
		ctx.moveTo(plots[0].x, plots[0].y);

  	for(var i=1; i<plots.length; i++) {
    	ctx.lineTo(plots[i].x, plots[i].y);
    }
    ctx.stroke();
  }

  function drawFromStream(message) {
	if(!keepUpdated || !message || message.plots.length < 1) return;
	drawOnCanvas(message.color, message.plots);
  }

  // Get Older and Past Drawings!
  if(drawHistory) {
    updateFromHistory();
	}
    var isActive = false;
    var plots = [];

	function draw(e) {
		e.preventDefault(); // prevent continuous touch event process e.g. scrolling!
	  	if(!isActive) return;

    	var x = isTouchSupported ? (e.targetTouches[0].pageX - canvas.offsetLeft) : (e.offsetX || e.layerX - canvas.offsetLeft);
    	var y = isTouchSupported ? (e.targetTouches[0].pageY - canvas.offsetTop) : (e.offsetY || e.layerY - canvas.offsetTop);

    	plots.push({x: (x << 0), y: (y << 0)}); // round numbers for touch screens

    	drawOnCanvas(color, plots);
	}

	function startDraw(e) {
	  	e.preventDefault();
	  	isActive = true;
	}

	function endDraw(e) {
	  	e.preventDefault();
	  	isActive = false;

	  	publish({
	  		color: color,
	  		plots: plots
	  	});

	  	plots = [];
	}
})();
