class Domain {
  constructor(url, visit, duration, dateString, weekDay, networkTraffic) {
    //get domain from url
    this.name = getDomain(url);
    this.visit = visit;
    this.duration = duration;    //number of seconds
    this.date = dateString;
    this.weekDay = weekDay;
    this.networkTraffic = networkTraffic;
  }

  getDuration() {
    return this.duration;
  }

  //increase duration by 1 second
  increaseTime() {
    this.duration += 1;
  }

  increaseTraffic(traffic) {
    this.networkTraffic += traffic;
  }

  //increase visit time
  increaseVisit() {
    this.visit += 1;
  }
}

var urls = [];      //array of urls
var domains = {};   //dictionary of domains
var currentTabId = null;
var currentUrl = null;
var currentDomainString;
var currentDomainObject;
var intervals = [];
var midnightReset;
var firstOpen = true;
var attached = false;

//load data from localStorage
chrome.windows.onCreated.addListener(function (window) {
  //if midnight reset exists, clear it
  if (midnightReset != undefined) {
    clearTimeout(midnightReset);
  }

  //'midnight reset' not exist, create it
  var nextMidnight = getNextMidnight(new Date());
  midnightReset = setTimeout(async function () {
    //stop counting time of domains
    await clearAllIntervals(intervals);
    //update domains to db and clear local storage
    await midnightUpdateAndReset();
    //recounting
    chrome.tabs.get(currentTabId, function (tab) {
      startCounting(tab);
    });
  }, nextMidnight.getTime() - (new Date()).getTime());
  // }, 5 * 1000);
});

//handle when user create new tab or switching between tabs
chrome.tabs.onActivated.addListener(async function (activeInfo) {
  console.log('on activated at', activeInfo.tabId);
  currentTabId = activeInfo.tabId;
  attachTab(activeInfo.tabId);
  //if new day, update daily_domain to db and reset urls, domains, else load from storage
  await chrome.storage.local.get(['date'], function (result) {
    //if result == null, create 'date'
    if (!result['date']) {
      chrome.storage.local.set({ date: getDateString(new Date()) }, function () {
        console.log('Initialize date property');
      });
    }
    //if different dates
    else if (!compareTimeByDateString(getDateString(new Date()), result.date)) {
      console.log('Different day');
      updateToDBAndReset();
    }
    //else, if it's the first open, load urls and domains from local storage
    else {
      if (firstOpen) {
        console.log('First open');
        localLoad();
        firstOpen = false;
      }
    }
  });
  await chrome.tabs.get(activeInfo.tabId, function (tab) {
    startCounting(tab);
  });
});

//handle when user redirect to new URL
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  //if user change the url
  if (changeInfo.url != null && currentUrl != null && changeInfo.url != currentUrl) {
    attachTab(currentTabId);
    //if currentTabId != null, avoid case when updating run before activate
    console.log('Update');
    if (currentTabId) {
      chrome.tabs.get(currentTabId, function (tab) {
        startCounting(tab);
      });
    }
  }
});

//handle when closing single tabs
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  clearAllIntervals(intervals);
  localUpdate();
});

//when close window, reset all properties to origin for the next session
chrome.windows.onRemoved.addListener(function (windowId) {
  firstOpen = true;
  currentTabId = null;
  currentUrl = null;
});

chrome.debugger.onEvent.addListener(function (source, method, params) {
  var localTraffic = 0;
  if(!attached){
    console.log('not attached');
    return;
  }

  if (method == "Network.loadingFinished") {
    chrome.debugger.sendCommand({
      tabId: currentTabId
    }, "Network.getResponseBody", { requestId: params.requestId }, function (result) {
      // console.log(result);
      if (result.body.length) {
        var traffic = Math.floor(result.body.length * 4 / 3) ? result.body.length * 2 : result.base64Encoded; //traffic in bytes
        if (!domains[currentDomainString]) {
          localTraffic += traffic;
        } else {
          domains[currentDomainString].increaseTraffic(localTraffic + traffic);
          localTraffic = 0;
        }
      }
    });
  }
});

chrome.debugger.onDetach.addListener(function(){
  console.log('on detach');
});

function getDomain(urlString) {
  var arr = urlString.split('/');
  return (arr[0] + '//' + arr[2]);
}

function clearAllIntervals(intervals) {
  for (var interval of intervals) {
    clearInterval(interval);
    intervals.pop(interval);
  }
}

//compare 2 date string, with accuracy of date
function compareTimeByDateString(dateString1, dateString2) {
  return dateString1 == dateString2;
}

//get next midnight moment
function getNextMidnight(today) {
  var tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  var midnight = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 0, 0, 0, 0);
  return midnight;
}

//load urls and domains from local storage
async function localLoad() {
  console.log('Load urls and domains from local storage');
  await chrome.storage.local.get(['urls'], function (result) {
    if (result.urls.length == 0)
      urls = [];
    else {
      urls = result.urls;
    }
  });
  //domains in the storage don't have class Domain, so need to be convert to class Domain
  await chrome.storage.local.get(['domains'], function (result) {
    domains = {};
    var domainsInStorage = result.domains;
    if (Object.keys(domainsInStorage).length != 0) {
      console.log('Load', Object.keys(domainsInStorage).length, 'domains from local storage');
      for (domain_name of Object.keys(domainsInStorage)) {
        domain = domainsInStorage[domain_name];
        domains[domain_name] = new Domain(domain.name, domain.visit, domain.duration, domain.date, domain.weekDay, domain.networkTraffic);
      }
    }
  });
}

async function localUpdate() {
  await chrome.storage.local.set({ urls: urls }, function () {
    console.log(`Update urls`);
  });
  await chrome.storage.local.set({ domains: domains }, function () {
    console.log(`Update domains`);
  });
}

//convert seconds to minutes and hours
function showTime(seconds) {
  if (seconds >= 0 && seconds < 60) {
    return seconds.toString() + 's';
  } else if (seconds >= 60 && seconds < 3600) {
    return Math.floor(seconds / 60).toString() + 'm';
  } else {
    return Math.floor(seconds / 3600).toString() + 'h' + Math.floor((seconds % 3600) / 60).toString();
  }
}

function getDateString(date) {
  return date.getDate() + '/' + (date.getMonth() + 1) + '/' + date.getFullYear();
}

function getTimeString(time) {
  return time.getDate() + '/' + time.getMonth() + '/' + time.getFullYear() + ' ' +
    time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
}

async function addDomainToDict(domainString) {
  var domainObj = new Domain(currentUrl, 0, 0, getDateString(new Date()), new Date().getDay(), 0);
  domains[domainString] = domainObj;
}

//start counting when activate
async function startCounting(tab) {
  await clearAllIntervals(intervals);
  currentUrl = tab.url;
  currentDomainString = getDomain(currentUrl);
  console.log('current Url:', currentUrl, 'currentDomain:', currentDomainString);
  //if url is not in the dict, add it
  if (!urls.includes(currentUrl)) {
    await urls.push(currentUrl);
    await postUrlToDB(currentUrl);
  }
  //if domain not in the dict, add it
  if (!Object.keys(domains).includes(currentDomainString)) {
    await addDomainToDict(currentDomainString);
    await postDomainToDB(currentDomainString);
  }
  //get the current domain obj
  currentDomainObject = domains[currentDomainString];
  currentDomainObject.increaseVisit();
  var oneSecondInterval = setInterval(function () {
    currentDomainObject.increaseTime();
    chrome.browserAction.setBadgeText({ text: showTime(currentDomainObject.getDuration()) }, function () { });
  }, 1000);
  intervals.push(oneSecondInterval);
}

function postUrlToDB(url) {
  var oReq = new XMLHttpRequest();
  oReq.addEventListener("load", function () {
    console.log(this.responseText);
  });
  oReq.open("POST", "https://localhost:9999/links");
  oReq.setRequestHeader('Content-type', 'application/json');
  oReq.send(JSON.stringify({ url: url }));
}

function postDomainToDB(domain) {
  var oReq = new XMLHttpRequest();
  oReq.addEventListener("load", function () {
    console.log(this.responseText);
  });
  oReq.open("POST", "https://localhost:9999/domains");
  oReq.setRequestHeader('Content-type', 'application/json');
  oReq.send(JSON.stringify({ domain: domain }));
}

function postDailyDomainToDB(domain) {
  var oReq = new XMLHttpRequest();
  oReq.addEventListener("load", function () {
    console.log(this.responseText);
  });
  oReq.open("POST", "https://localhost:9999/daily_domains");
  oReq.setRequestHeader('Content-type', 'application/json');
  oReq.send(JSON.stringify({ domain: domain }));
}

async function updateToDBAndReset() {
  //update all data from local storage to db
  await chrome.storage.local.get(['domains'], async function (result) {
    let localStorageDomains = result.domains;
    for (domain_name of Object.keys(localStorageDomains)) {
      let domain = localStorageDomains[domain_name];
      await postDailyDomainToDB(domain);
      await console.log(`Posting ${domain.name} to daily domain db`);
    }
  });
  await chrome.storage.local.set({ domains: {}, date: getDateString(new Date()) }, function () {
    console.log('Day pass, reset all');
  });
}

async function midnightUpdateAndReset() {
  for (domain_name of Object.keys(domains)) {
    await postDailyDomainToDB(domains[domain_name]);
    await console.log(`Posting ${domain_name} to daily domain db`);
  }
  domains = {};
  await chrome.storage.local.set({ domains: {}, date: getDateString(new Date()) }, function () {
    console.log('Day pass, reset all');
  });
}

function attachTab(tabId) {
  var protocolVersion = '1.0';
  chrome.debugger.attach({
    tabId: tabId
  }, protocolVersion, function () {
    if (chrome.runtime.lastError) {
      console.log('error when attach', chrome.runtime.lastError.message);
      return;
    }
    chrome.debugger.sendCommand({ tabId: tabId }, "Network.enable");
    console.log('attach to tab:', tabId);
    attached = true;
  });
}

chrome.runtime.onMessageExternal.addListener(
    function(request, sender, sendResponse) {
      var res;
      var sortedDomains = [];
      for (domain_name of Object.keys(domains)) {
        let domain = domains[domain_name];
        sortedDomains.push(domain);
      }
      sortedDomains = sortedDomains.sort((a, b) => (a.duration < b.duration ? 1 : -1));
      // console.log(sortedDomains);
      res = sortedDomains;
      sendResponse(res);        
});


