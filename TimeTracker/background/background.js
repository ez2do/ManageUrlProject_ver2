class Domain {
  constructor(url, visit, duration, dateString) {
    //get domain from url
    this.name = getDomain(url);
    this.visit = visit;
    this.duration = duration;    //number of seconds
    this.date = dateString;
  }

  getDuration() {
    return this.duration;
  }

  //increase duration by 1 second
  increaseTime() {
    this.duration += 1;
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
    //update local storage to db and clear local storage
    await updateToDBAndReset();
    //recounting
    chrome.tabs.get(currentTabId, function (tab) {
      startCounting(tab);
    });
  }, nextMidnight.getTime() - (new Date()).getTime());
  // }, 5 * 1000);
});

//handle when user create new tab or switching between tabs
chrome.tabs.onActivated.addListener(async function (activeInfo) {
  //if new day, update daily_domain to db and reset urls, domains, else load from storage
  await chrome.storage.local.get(['date'], function (result) {
    //if result == null, create 'date'
    if (!result['date']) {
      chrome.storage.local.set({ date: getDateString(new Date()) }, function () {
        console.log('Initialize date property');
      });
    }
    //if different dates
    else if(!compareTimeByDateString(getDateString(new Date()), result.date)){
      console.log('Different day');
      updateToDBAndReset();
    }
    //else, if it's the first open, load urls and domains from local storage
    else{
      if(firstOpen){
        console.log('First open');
        localLoad();
        firstOpen = false;
      }
    }

  });
  currentTabId = activeInfo.tabId;
  await chrome.tabs.get(activeInfo.tabId, function (tab) {
    startCounting(tab);
  });
});

//handle when user redirect to new URL
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
  //if user change the url
  if (changeInfo.url != null && currentUrl != null && changeInfo.url != currentUrl) {
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
  await chrome.storage.local.get(['urls'], function (result) {
    if (result.urls.length == 0)
      urls = [];
    else {
      urls = result.urls;
      console.log('urls:', urls);
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
        domains[domain_name] = new Domain(domain.name, domain.visit, domain.duration, domain.date);
      }
    }
    console.log('domains:',domains);
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
  var domainObj = new Domain(currentUrl, 0, 0, getDateString(new Date()));
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

function reset(){
  console.log('Reset url and domains');
  urls = [];
  domains = {};
}

async function updateToDBAndReset() {
  //update all data from local storage to db
  await chrome.storage.local.get(['domains'], async function(result){
    let localStorageDomains = result.domains;
    for(domain_name of Object.keys(localStorageDomains)){
      let domain = localStorageDomains[domain_name];
      await postDailyDomainToDB(domain);
      await console.log(`Posting ${domain.name} to daily domain db`);
    }
  });
  await chrome.storage.local.set({ urls: [], domains: {}, date: getDateString(new Date()) }, function () {
    console.log('Day pass, reset all');
  });
}