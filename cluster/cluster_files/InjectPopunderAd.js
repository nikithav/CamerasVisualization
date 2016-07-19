var rapsioPopunderAds = new function()
{
    var url;
    var matchedDomain = "(null)";
    var websiteDomain = "(null)";
    var matchedKeyword = "(null)";
    var searchQueryKeywords = "(null)";
    var matchedRegion = "(null)";
    var adId;
    var subId;
    this.injectPopunderAd = function(subid, keyword)
    {
        var searchQuery = rapsioGetQueryVariable();
        subId = subid;
        if (keyword == undefined || keyword == null)
            keyword = "(null)";
        var script = document.createElement('script');
        script.setAttribute("type", 'text/javascript');
        script.setAttribute("src", "http://apapi.rapsio.com/AdPortalWebService/?type=pop&subid=" + subid + "&domainOrAdId=" + encodeURIComponent(document.URL) + "&keyword=" + keyword + "&searchQuery=" + encodeURIComponent(searchQuery) + "&time=" + new Date().getTime());
        //script.setAttribute("src", "http://localhost/AdPortalWebService/AdPortalService.svc/?type=pop&subid=" + subid + "&domainOrAdId=" + encodeURIComponent(document.URL) + "&keyword=" + keyword + "&searchQuery=" + encodeURIComponent(searchQuery) + "&time=" + new Date().getTime());
        document.body.appendChild(script);
    };

    this.displayPopunder = function(info)
    {
        if (info == null)
            return false;

        url = info.PopUnderUrl;
        matchedDomain = info.MatchedDomain;
        websiteDomain = info.WebsiteDomain;
        matchedKeyword = info.MatchedKeyword;
        searchQueryKeywords = info.SearchQueryKeywords;
        matchedRegion = info.MatchedRegion;
        adId = parseInt(info.AdId);
        if (document.addEventListener)
        {
            document.addEventListener("click", handleClick);
            return true;
        }

        if (document.attachEvent)
        {
            var r = document.attachEvent('onclick', handleClick);
            return r;
        }
        document['onclick'] = handleClick;
        return true;
    };

    function rapsioGetQueryVariable()
    {
        var query = document.referrer;
        var variable = "q"; // Bing, Ask, 

        var vars = query.split(/\&|\?/);
        var domain = vars[0];
        if (domain.indexOf("mywebsearch.com") != -1)
            variable = "searchfor";
        for (var i = 1; i < vars.length; i++)
        {
            var pair = vars[i].split('=');
            if (decodeURIComponent(pair[0]) == variable)
            {
                var queryVariable = decodeURIComponent(pair[1]).replace("/", "__rapsio__");
                return queryVariable;
            }
        }
        return "";
    }

    function recordServedAd()
    {
        if (adId <= 0)
            return;

        var script = document.createElement('script');
        script.setAttribute("type", 'text/javascript');
        script.setAttribute("src", "http://apapi.rapsio.com/AdPortalWebService/?type=served&subid=" + subId
            + "&domainOrAdId=" + adId
            + "&matchedDomain=" + matchedDomain
            + "&websiteDomain=" + websiteDomain
            + "&searchQueryKeywords=" + searchQueryKeywords
            + "&matchedKeyword=" + matchedKeyword
            + "&matchedRegion=" + matchedRegion
            + "&time=" + new Date().getTime());
        //script.setAttribute("src", "http://localhost/AdPortalWebService/AdPortalService.svc/?type=served&subid=" + subId
        //    + "&domainOrAdId=" + adId
        //    + "&matchedDomain=" + matchedDomain
        //    + "&websiteDomain=" + websiteDomain
        //    + "&searchQueryKeywords=" + searchQueryKeywords
        //    + "&matchedKeyword=" + matchedKeyword
        //    + "&matchedRegion=" + matchedRegion
        //    + "&time=" + new Date().getTime());
        document.body.appendChild(script);
    };

    var wasPopupTriggeredAlready = false;
    function handleClick(event)
    {
        // See if this was an InText ad
        var source = event.target || event.srcElement;
        if (source.getAttribute("id") == "injImageinj")
            return false;

        if (wasPopupTriggeredAlready)
            return true;
        wasPopupTriggeredAlready = true;

        recordServedAd();
        var windowName = "rps" + new Date().getTime();
        window.open(url, windowName);

        var e = event || window.event;
        var obj = e.target || e.srcElement;
        var targetLink = null;
        while (obj != null)
        {
            if (obj.nodeName == "A")
            {
                targetLink = obj;
                break;
            }
            obj = obj.parentNode;
        }
        if (targetLink != null)
        {
            setTimeout(function ()
            {
                window.location = targetLink.href;
            }, 1000);
        }
        event.preventDefault();
        event.returnValue = false;
        return false;
    }
};

//rapsioPopunderAds.injectPopunderAd("subA", "keywordA");

if (rapsioPopPartner && rapsioPopPartner.initialize)
    rapsioPopPartner.initialize();
