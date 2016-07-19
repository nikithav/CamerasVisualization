
visualwww.Retargeting  =
{
	$: spsupport.p.$,
	appDomain: spsupport.p.sfDomain,
	serverLayerFrame: null,
	serverData:
	{
		items: [],
		sessionId: null
	},

	initialize: function()
	{
	    if  (visualwww.utilities.getActiveUnits() != ''){
            visualwww.sfdebugger.log('<b>No need to show retarget - [' + visualwww.utilities.getActiveUnits() + '] Showed</b>');
            return false;
        }

        try{
            spsupport.api.initMessanger();
        }
        catch(ex) {}

		var sb = visualwww.b;
		var serverLayerFrameParams =
		{
			dlsource: sb.dlsource,
			userid: sb.userid,
			CD_CTID: sb.CD_CTID,
			version: sb.appVersion,
			pageUrl: location.href,
			merchantName: this.utils.extractDomainName(location.hostname),
			appDomain: this.appDomain,
			browser : spsupport.api.dtBr(),
            imageDomain: visualwww.b.itemImgUrl,
			country: visualwww.b.userData.uc || '',
			language: visualwww.b.userData.lang || ''
		};

		this.$(window).bind("message", this.utils.serverMessagesRouter.bind(this));

		this.serverLayerFrame = this.$('<iframe />',
		{
			style: 'position:absolute; width:0; height:0; left:-100px; top:-100px;',
			src: this.appDomain + 'retargeting/server_layer.html?' + this.utils.compileQueryString(serverLayerFrameParams)+visualwww.utilities.abTestUtil.getDataString()
		})[0];

		document.body.appendChild(this.serverLayerFrame);
	},

	processServerData: function(data) // This function is called by the "utils.serverMessagesRouter" func via the "fn" param send by the server layer
	{
		this.serverData = data;

	    if  (visualwww.utilities.getActiveUnits() != ''){
            visualwww.sfdebugger.log('<b>No need to show retarget - [' + visualwww.utilities.getActiveUnits() + '] Showed</b>');
            return false;
        }
        this.utils.sendMessageToServerLayer.call(this, 'unitShowed');

        visualwww.utilities.newUnit('retarget');

		spsupport.p.initialSess = data.sessionId;
        visualwww.Template.initialize(data.template);
		visualwww.slider.initialize(data.items, data.slideUp);

		//localStorage.setItem('_sfRetargetShown', new Date().getTime());
	},

	domain_capacity_showed: function(data)
	{
        this.reportAction(
        {
            action: 'Fre3DomShowedMaxDom',
            sessionid: data
        });

	},
	unit_capacity_showed: function(data)
	{
        this.reportAction(
        {
            action: 'Fre3DomShowedMaxUnit',
            sessionid: data
        });

	},

	checkCommunication: function(data)
	{
        this.utils.sendMessageToServerLayer.call(this, 'communicationOK');
	},

	reportAction: function(data)
	{
		var pixel = new Image();

		data.action = data.action;
		data.userid = spsupport.p.userid;
		data.browser = spsupport.api.dtBr();
        data.page_url = window.location.href;
        data.merchantName = spsupport.p.siteDomain;
        data.dlsource = visualwww.b.dlsource;
        data.country = visualwww.b.userData.uc;

		pixel.src = this.appDomain + 'trackSession.action?' + this.utils.compileQueryString(data) + visualwww.utilities.abTestUtil.getDataString();
	}

};


visualwww.Retargeting.utils =
{
	extractDomainName: function(url)
	{
		var slicedUrl = url.toLowerCase().split('.');
        var length = slicedUrl.length;
        var tldRegex = /^(com|net|info|org|gov|co)$/; //TLD regex

        if (length > 2) // i.e. www.google.com.br, google.co.il, test.example.com
        {
            if (tldRegex.test(slicedUrl[length-2])) // Check second to last part if it passes the TLD regex.
            {
                slicedUrl.splice(0, length-3);
            }
            else
            {
                slicedUrl.splice(0, length-2);
            }
        }

        return slicedUrl.join('.');
	},

	compileQueryString: function(obj)
	{
		var result = [];

		for (key in obj)
		{
			if (obj.hasOwnProperty(key))
			{
				result.push(key + '=' + encodeURIComponent(obj[key]));
			}
		}

		return result.join('&');
	},

	serverMessagesRouter: function(event)
	{
		var data = event.originalEvent.data.split('__visualwwwRetargetingNamespaceMarker')[1];

		data = data && JSON.parse(data) || null;

		if (data && typeof this[data.fn] === 'function')
		{
			this[data.fn](data.data);
		}
	},

	sendMessageToServerLayer: function(fn, data)
	{
		var targetWindow = this.serverLayerFrame.contentWindow || this.serverLayerFrame;
		var message =
        {
            fn: fn,
            data: data
        };

        targetWindow.postMessage('__visualwwwRetargetingNamespaceMarker'+JSON.stringify(message), '*');
	}
};

visualwww.util =
{
	sendRequest: function(message) // Old interface to the stupid, stupid method of sending an obscure "cmd" param
	{
		var data = JSON.parse(message);

		visualwww.Retargeting.utils.sendMessageToServerLayer.call(visualwww.Retargeting, 'oldCmdInterface', data);
	}
};


visualwww.Retargeting.initialize();
