var RetargetingServerLayer =
{
    urlParams: {},
    testBucket: '',
    storedSearchRecords: [],
    slideUp: 14,
    constantSearchParams: null,
    offerLifetime: 30 * 24 * 60 * 60 * 1000, // 30 days
    globalTimeCapRange: 3 * 60 * 60 * 1000, // 3 hours
    results: {},

    checkCommunication: function()
    {
        if (window.addEventListener)
        {
            window.addEventListener("message", this.clientMessagesRouter.bind(this), false);
        }
        else
        {
            window.attachEvent("message", this.clientMessagesRouter.bind(this));
        }
        var message =
        {
            fn: 'checkCommunication',
            data: ''
        };

        top.postMessage('__visualwwwRetargetingNamespaceMarker'+JSON.stringify(message), '*');
    },

    communicationOK: function()
    {
        this.initialize();
    },

    initialize: function()
    {
        this.fixOldBrowsers();

        this.urlParams = this.parseUrlParams(location.search.substring(1));
        this.testBucket = this.urlParams['tier1_bucket'] || this.urlParams['tier2_bucket'] || '';
        this.sessionId = this.generateSessionId();

		this.frequency_3domains = this.removeOldRecords(JSON.parse(localStorage.getItem('frequency_3domains') || null)) || [];
		var domainExistsInd = -1;
		for(var i=0 ; i < this.frequency_3domains.length ; i++){
			if(this.frequency_3domains[i].merchant === this.urlParams.merchantName){
				domainExistsInd = i;
				break;
			}
		}
		if(this.frequency_3domains.length >= 3){
			if(domainExistsInd === -1){
				var message =
				{
					fn: 'domain_capacity_showed',
					data: this.sessionId
				};

				top.postMessage('__visualwwwRetargetingNamespaceMarker'+JSON.stringify(message), '*');
				return;
			}
		}

		if(domainExistsInd > -1){
			if(this.frequency_3domains[domainExistsInd].retarget >= 3 && this.frequency_3domains[domainExistsInd].pop >= 3){
				var message =
				{
					fn: 'unit_capacity_showed',
					data: this.sessionId
				};

				top.postMessage('__visualwwwRetargetingNamespaceMarker'+JSON.stringify(message), '*');
				return;
			}
		}

		this.domain = {};
		this.retargetCount = 0;
		this.popCount = 0;
		this.globalTimeCapRange = 0;


        if (this.isUnitActive() || this.urlParams.dlsource === 'retargettest')
        {
            //localStorage.removeItem('_sfRetargetShownGlobal');

            this.storedSearchRecords = this.sortSearchRecords(JSON.parse(localStorage.getItem('retargetingData') || null)) || [];

            this.constantSearchParams = this.filterObject(this.urlParams, ['userid', 'dlsource', 'CD_CTID', 'merchantName', 'tier1_bucket', 'tier1_curr_group', 'tier1_next_group', 'tier1_prev_group', 'tier2_bucket', 'tier2_curr_group', 'tier2_next_group', 'tier2_prev_group']);

            if (window.addEventListener)
            {
                window.addEventListener("message", this.clientMessagesRouter.bind(this), false);
            }
            else
            {
                window.attachEvent("message", this.clientMessagesRouter.bind(this));
            }

            this.getOffers();
        }
	},

	removeOldRecords: function(frequency_3domains) {
		var returned_frequency_3domains = [];
		for(var i=0 ; frequency_3domains && i<frequency_3domains.length ; i++){
			if(this.isTimestampInRange(frequency_3domains[i].timestamp,3 * 60 * 60 * 1000)){
				returned_frequency_3domains.push(frequency_3domains[i]);
			}
		}
		return  returned_frequency_3domains;
	},

	isUnitActive: function()
    {
        var disabled = localStorage.getItem('sf_uninstall_retargeting') || localStorage.getItem('sf_uninstall_pop');
        var globalTimeCap = parseInt(localStorage.getItem('_sfRetargetShownGlobal') || 0);
        var closedTimestamp = parseInt(localStorage.getItem('retargetingBannerClosed') || 0);

        return (!disabled && !this.isTimestampInRange(globalTimeCap, this.globalTimeCapRange) && !this.isTimestampInRange(closedTimestamp, 86400000)); // 24 hours
    },

    sortSearchRecords: function(searchRecords)
    {
        var searchRecordParams, weight;

        if (searchRecords && searchRecords.length)
        {
            for (var i=0, l=searchRecords.length; i<l; i++)
            {
                if(!this.isTimestampInRange(searchRecords[i].timestamp, this.offerLifetime)){
                    weight = 7;
                } else {
                    searchRecordParams = searchRecords[i].searchParams;

                    switch (searchRecordParams.siteType)
                    {
                        case 'wl':
                            weight = (searchRecordParams.pageType === 'PP') ? 1 : 3;
                            break;
                        case 'st':
                            weight = (searchRecordParams.pageType === 'PP') ? 2 : 4;
                            break;
                        case 'pip':
                            weight = 5;
                            break;
                        default:
                            weight = 6;
                    }
                }
                searchRecords[i].weight = weight;
            }

            return searchRecords.sort(function(a, b)
            {
                return a.weight - b.weight;
            });
        }
    },

    getOffers: function()
    {
        var searchRecord = this.storedSearchRecords.shift();
        var searchParams;


        if(this.frequency_3domains){
        	var merchantExists = false;
			for(var i=0 ; i < this.frequency_3domains.length ; i++){
				if(this.frequency_3domains[i].merchant === this.urlParams.merchantName){
					this.retargetCount = this.frequency_3domains[i].retarget;
					this.popCount = this.frequency_3domains[i].pop;
					merchantExists = true;
				}
			}

			if(!merchantExists){
				this.domain = {
					timestamp: new Date().getTime(),
					merchant: this.urlParams.merchantName,
					retarget: 0,
					pop:0
				}
				this.frequency_3domains.push(this.domain);
				this.retargetCount = 0;
				this.popCount = 0;
			}
		}

        if (
        		searchRecord && this.isTimestampInRange(searchRecord.timestamp,this.offerLifetime)
        		&& (!this.retargetCount || (this.retargetCount && this.retargetCount < 3))
        	)
        {
            searchParams = this.concatObjects(this.filterObject(searchRecord.searchParams, ['matchedBrand','br', 'documentTitle', 'imageRelatedText', 'imageTitle', 'imageURL', 'ip', 'language', 'overrideClientCountry', 'pageType', 'pageUrl', 'productUrl', 'searchType', 'siteType']), this.constantSearchParams,
            {
                slideUp: this.slideUp,
                sessionid: this.sessionId,
                dscr: searchRecord.searchParams.sessionid
            });

            this.ajax(
            {
                url: '../findByUrl.action',
                method: 'POST',
                data: searchParams,
                success: this.processOffers.bind(this, searchParams)
            });
        }
        else if (
        			this.urlParams['country'] === 'US'
					&& (!this.popCount || (this.popCount && this.popCount < 3))
				)
        {
            this.slideUp = 15;

            searchParams = this.concatObjects(this.constantSearchParams,
            {
                slideUp: this.slideUp,
                sessionid: this.sessionId,
                pageUrl: this.urlParams['pageUrl'],
                language: this.urlParams['language'],
                imageURL: 'http://www.similarproducts.net/',
                br: this.urlParams['browser']
            });

            this.ajax(
            {
                url: '../findByUrl.action',
                method: 'POST',
                data: searchParams,
                success: this.processOffers.bind(this, searchParams)
            });
        }
    },

    processOffers: function(searchParams, data)
    {
        var sharedParams = this.filterObject(searchParams, ['slideUp', 'sessionid', 'br', 'language', 'pageType', 'searchType', 'dscr']);
        var items, item, merchUrlParams;

        data = JSON.parse(data.replace(/^\(([\s\S]+)\)$/m, '$1'));
        items = data.cards && data.cards[0];

        if (items && items.length)
        {
            for (var i=0, l=items.length; i<l; i++)
            {
                item = items[i];
                item.imagePath = this.calculateImagePath(item.imagePath, i);

                merchUrlParams = this.concatObjects(this.filterObject(item, ['resType', 'price']), sharedParams, this.constantSearchParams,
                {
                    itemId: item.internalId,
                    firstCardType: items[0].resType || '',
                    categoryId: data.sCatId,
                    identical: data.hasIdentical ? 1 : 0,
                    position: '0.'+(i+1),
                    imageURL: item.imagePath
                });

                item.merchURL = this.urlParams.appDomain+'offerURL.action?'+this.compileQueryString(merchUrlParams);

                items[i] = item;
            }

            this.results['sessionId'] = this.sessionId;
            this.results['slideUp'] = this.slideUp;
            this.results['items'] = items;

            if(this.frequency_3domains){
				for(var i=0 ; i < this.frequency_3domains.length ; i++){
					if(this.frequency_3domains[i].merchant === this.urlParams.merchantName){
						if(this.slideUp == 14){
							this.frequency_3domains[i].retarget = this.retargetCount+1;
						} else {
							this.frequency_3domains[i].pop = this.popCount+1;
						}
						localStorage.setItem('frequency_3domains',JSON.stringify(this.frequency_3domains));
						break;
					}
				}
			}

            this.getTemplate();
        }
        else
        {
            if (this.slideUp == 14)
            {
                this.getOffers();
            }
        }
    },

    getTemplate: function()
    {
        this.ajax(
        {
            url: '../tpl/main.tpl',
            data: {version: this.urlParams.version},
            success: function(data)
            {
                this.results['template'] = data;

                this.sendDataToClient.call(this);

            }.bind(this)
        });
    },

    oldCmdInterface: function(data)
    {
        switch (data.cmd)
        {
            case 11:
                this.retargetingResetCounter();
                break;
            case 12:
                this.closeUnit(data);
                break;
        }
    },

    retargetingResetCounter: function()
    {
        localStorage.removeItem('retargetingInactiveCount');
    },

    closeUnit: function(data)
    {
        localStorage.setItem(data.closeKey, new Date().getTime());
    },

    isTimestampInRange: function(timestamp, range)
    {
        var now = new Date().getTime();

        return (timestamp + range > now);
    },

    calculateImagePath: function(imagePath, itemIndex)
    {
        if (imagePath.indexOf('http') == -1)
        {
            imagePath = this.urlParams.imageDomain.replace('*', 7+itemIndex%3) + imagePath;
        }

        if (location.protocol === 'https:')
        {
            imagePath = imagePath.replace("http:", "https:")
        }

        return imagePath;
    },

    clientMessagesRouter: function(event)
    {
        var data = event.data.split('__visualwwwRetargetingNamespaceMarker')[1];

        data = data && JSON.parse(data) || null;

        if (data && typeof this[data.fn] === 'function')
        {
            this[data.fn](data.data);
        }
    },

    sendDataToClient: function()
    {
        /*var shownCounter = parseInt(localStorage.getItem('_sfRetargetShownGlobalCounter') || 0) + 1;

        if (shownCounter > 5)
        {
            localStorage.setItem('_sfRetargetShownGlobal', new Date().getTime());
            localStorage.removeItem('_sfRetargetShownGlobalCounter');
        }
        else
        {
            localStorage.setItem('_sfRetargetShownGlobalCounter', shownCounter);
        }
        localStorage.setItem('_sfRetargetShownGlobal', new Date().getTime());
        */
        var message =
        {
            fn: 'processServerData',
            data: this.results
        };

        top.postMessage('__visualwwwRetargetingNamespaceMarker'+JSON.stringify(message), '*');
    },

    generateSessionId : function()
    {
        var d = new Date();

        return [this.urlParams.userid.substr(0, 5), d.getDate(), d.getMonth() + 1, d.getFullYear(), d.getHours(), d.getMinutes(), d.getSeconds(), '-', d.getMilliseconds(), '-', Math.floor(Math.random() * 10001)].join('');
    },

    parseUrlParams: function(urlParams)
    {
        var result = {};
        var param;

        urlParams = urlParams.split('&');

        for (var i=0, l=urlParams.length; i<l; i++)
        {
            param = urlParams[i].split('=');

            result[param[0]] = decodeURIComponent(param[1]);
        }

        return result;
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

    filterObject: function(sourceObject, keys)
    {
        var result = {};
        var key;

        for (var i=0, l=keys.length; i<l; i++)
        {
            key = keys[i];

            sourceObject.hasOwnProperty(key) && (result[key] = sourceObject[key]);
        }

        return result;
    },

    unitShowed: function(prefix)
    {
        localStorage.setItem('_sfRetargetShownGlobal', new Date().getTime());
    },

    concatObjects: function()
    {
        var result = {};
        var obj;

        for (var i=0, l=arguments.length; i<l; i++)
        {
            obj = arguments[i];

            for (var key in obj)
            {
                obj.hasOwnProperty(key) && (result[key] = obj[key]);
            }
        }

        return result;
    },

    ajax: function(params)
    {
        var httpRequest;
        var _this = this;

        if (window.XMLHttpRequest)
        {
            httpRequest = new XMLHttpRequest();
        }
        else if (window.ActiveXObject)
        {
            httpRequest = new ActiveXObject("Microsoft.XMLHTTP");
        }

        if (params.success || params.error)
        {
            httpRequest.onreadystatechange = function()
            {
                if (this.readyState === 4)
                {
                    if (this.status === 200)
                    {
                        params.success && params.success.call(_this, this.responseText);
                    }
                    else
                    {
                        params.error && params.error.call(_this, this.responseText);
                    }
                }
            }
        }

        if (params.data)
        {
            params.url += '?' + this.compileQueryString(params.data);
        }

        httpRequest.open(params.method && params.method.toUpperCase() || 'GET', params.url);
        httpRequest.send();
    },

    fixOldBrowsers: function()
    {
        if (!Function.prototype.bind)
        {
            Function.prototype.bind = function(oThis)
            {
                var aArgs = Array.prototype.slice.call(arguments, 1),
                    fToBind = this,
                    fNOP = function () {},
                    fBound = function ()
                    {
                        return fToBind.apply(this instanceof fNOP ? this : oThis || window, aArgs.concat(Array.prototype.slice.call(arguments)));
                    };

                fNOP.prototype = this.prototype;
                fBound.prototype = new fNOP();

                return fBound;
            };
        }
    }
};

//RetargetingServerLayer.checkCommunication();
RetargetingServerLayer.initialize();
