let url = "https://localhost:9999/";
let links = [];
let collections = [];
let curLink = '';
let elementCollection = document.getElementById('tar_col');
let elementInput = document.getElementById('url_name');
let elementInputCollection = document.getElementById('col_name');
let elementUrlContainer = document.getElementById('urlContainer');
let elementColSuccess = document.getElementById('newColSuccess');
let elementColFail = document.getElementById('newColFail');
//let dColor = ['#ff3300','#ff00ff','#3366ff','#ff9900','#00e68a','#ffff00',' #00ccff','#e67300','#73e600','#0066ff'];
let dColor = ["#2fc32f", "#b0dc0b", "#eab404", "#de672c", "#ec2e2e", "#d5429b", "#6f52b8", "#1c7cd5", "#56b9f7", "#0ae8eb"];

function convertTraffic(value) {
    if (value > Math.pow(1024,4)){
        return (value / Math.pow(1024,4)).toFixed(2) + ' tb';
    }
    else if (value > Math.pow(1024,3)){
        return (value / Math.pow(1024,3)).toFixed(2) + ' gb';
    }
    else if (value > Math.pow(1024,2)){
        return (value / Math.pow(1024,2)).toFixed(2) + ' mb';
    }
    else if (value > Math.pow(1024,1)){
        return (value / Math.pow(1024,1)).toFixed(2) + ' kb';
    }
    else {
        return value + ' byte'
    }
}

function convertDuration(value) {
    if (value > 3600){
        return parseInt(value / 3600) + 'hr' + (value%3600%60) + 'min';
    } 
    else if (value > 60) {
        return parseInt(value / 60) + 'min' + (value%60) + 'sec';
    }
    else if (value >= 0) {
        return value + ' sec';
    }
    
}

function colorTable(url,color) {
    let ChildTable = document.getElementById('table-body').childNodes;
    // console.log(ChildTable);
    for(var i = 1; i < ChildTable.length; i += 1){
        if (ChildTable[i].textContent.indexOf(url) !== -1) {
            // console.log("color");
            ChildTable[i].style.color = color;
        }
    }
}

function resetColorTable() {
    let ChildTable = document.getElementById('table-body').childNodes;
    // console.log(ChildTable);
    for(var i = 1; i < ChildTable.length; i += 1){
        ChildTable[i].style.color = "#000000";
    }
}

function resetNoti() {
    elementColFail.classList.add('d-none');
    elementColSuccess.classList.add('d-none');
}

async function UpdateCollection() {
    while(elementCollection.firstChild){
        elementCollection.removeChild(elementCollection.firstChild);
    }
    var option = document.createElement("option");
    option.text = "Mặc định";
    elementCollection.add(option);

    axios.get(url + "collections").then((response) => {
        collections = response.data.rows;
        // console.log(collections);
        // console.log(curLink);
        for (var i = 1; i < collections.length; i += 1) {
            option = document.createElement("option");
            option.text = collections[i].name;
            elementCollection.add(option);
        }
    })
}
function UpdateLink() {
    axios.get(url + "links").then((response) => {
        links = response.data.rows;
    })
}
function getCollectionName(id) {
    for (var i = 0; i < collections.length; i += 1){
        if (id === collections[i].id)
            return collections[i].name;
    }
    return -1;
}

function getCollectionID(name) {
    if (name === 'Mặc định') return 1;
    for (var i = 0; i < collections.length; i += 1){
        if (name === collections[i].name)
            return collections[i].id;
    }
    return -1;
}
function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
function getUrlID(url) {
    for (var i = 0; i < links.length; i += 1){
        if (url === links[i].url)
            return links[i].id;
    }
    return -1;
}

function LoadCollectOfCurLink() {
    console.log('hello');
}

function Update() {
    UpdateContainer();
}
function UpdateContainer() {
    while(elementUrlContainer.firstChild){
        elementUrlContainer.removeChild(elementUrlContainer.firstChild);
    }
    if (elementCollection.value === 'Mặc định'){
        delColBtn.classList.add('d-none');
        addUrlBtn.classList.add('disabled');
        return;
    } else {
        delColBtn.classList.remove('d-none');
        addUrlBtn.classList.remove('disabled');
    }

    var id = getCollectionID(elementCollection.value);
    axios.get(url + 'collections/all/' + id).then(response =>{
        // console.log(response.data);
        if (response.data.success === true) {
            // console.log('true');
            for (var i = 0; i < response.data.rows.length ; i += 1) {
                var contain = document.createElement("div");
                contain.classList.add("col-12","row");
                contain.onmouseover = function (event) {
                    event.currentTarget.style.backgroundColor = '#f2f2f2';
                }
                contain.onmouseout = function (event) {
                    event.currentTarget.style.backgroundColor = '#ffffff';
                }


                var link = document.createElement("div");
                link.style.cursor = "pointer";
                link.classList.add("col-11");
                // link.classList.add("pl-5");
                link.innerText = response.data.rows[i].title;
                link.title = response.data.rows[i].url + '\n' + response.data.rows[i].description;
                link.href = response.data.rows[i].url;
                link.onclick = function(event) {
                    chrome.tabs.create({ url: event.currentTarget.href });
                };
                link.onmouseover = function (event) {
                    event.currentTarget.classList.add('text-info');
                };
                link.onmouseout = function (event) {
                    event.currentTarget.classList.remove('text-info');
                };


                var tool = document.createElement("div");
                tool.classList.add("col-1");

                var del = document.createElement("i");
                del.href = response.data.rows[i].url;
                del.classList.add("la","la-trash");
                del.style.color = '#99b3ff';
                del.style.cursor = 'pointer';
                del.title = 'Delete URL: ' + response.data.rows[i].url + '\nFrom Collection: ' + elementCollection.value;
                del.onclick = function(event) {
                    axios.delete(url + 'collections/' + getCollectionID(elementCollection.value) +'/'+ getUrlID(event.currentTarget.href)).then(response =>{
                        console.log(response);
                        axios.get(url + "links").then((response) => {
                            links = response.data.rows;
                        })
                        Update();
                    });
                };

                del.onmouseover = function (event) {
                    // event.currentTarget.parentNode.classList.add('text-danger');
                    event.currentTarget.classList.add('text-danger');
                };
                del.onmouseout = function (event) {
                    // event.currentTarget.parentNode.classList.remove('text-danger');
                    event.currentTarget.classList.remove('text-danger');
                };


                tool.append(del);
                contain.append(link);
                contain.append(tool);
                elementUrlContainer.append(contain);
                // elementUrlContainer.append(link);
                // elementUrlContainer.append(tool);
            }
        }
    })
}

//Button Event
let delColBtn = document.getElementById('delColBtn');
delColBtn.title = 'Xóa bộ sưu tập hiện tại';
delColBtn.onclick = function(event) {
    // event.currentTarget.classList.add('text-danger');
    // event.currentTarget.style.cursor = 'default';
    axios.delete(url + 'collections/' + getCollectionID(elementCollection.value)).then(response =>{
        axios.get(url + "links").then((response) => {
            links = response.data.rows;
        })
        elementCollection.selectedIndex = 1;
        UpdateCollection();

    });
};
delColBtn.onmouseover = function (event) {
    if (event.currentTarget.classList.contains('text-danger') === false)
        event.currentTarget.classList.add('text-primary');
};
delColBtn.onmouseout = function (event) {
    if (event.currentTarget.classList.contains('text-danger') === false)
        event.currentTarget.classList.remove('text-primary');
};

let myStatBtn = document.getElementById('myStat');
myStatBtn.onmouseover = function(event){
    event.currentTarget.classList.add('text-info');
}
myStatBtn.onmouseout = function(event){
    event.currentTarget.classList.remove('text-info');
}
myStatBtn.onclick = function(){
    chrome.tabs.create({ url: "localhost:8080/#/stat" });
}

let addUrlBtn = document.getElementById('addUrlBtn');
addUrlBtn.onclick = function(){

    // console.log(url + 'links/' + getUrlID(elementInput.value) + '/' + getCollectionID(elementCollection.value));
    axios({
        method: 'post',
        url: url + 'links/' + getUrlID(elementInput.value) + '/' + getCollectionID(elementCollection.value),
    }).then((response) => {
        // console.log(response);
        UpdateContainer();
    })
};

let addColBtn = document.getElementById('addColBtn');
addColBtn.classList.add('disabled');
addColBtn.onclick = function() {
    // console.log(elementInputCollection.value);
    resetNoti();
    var body = {
        name : elementInputCollection.value,
    };
    axios({
        method: 'post',
        data: body,
        url: url + 'collections/',
    }).then((response) => {
        if (response.data.message) {
            elementColFail.classList.remove('d-none');
            
        }
        else {
            elementInputCollection.value = '';
            elementColSuccess.classList.remove('d-none');
            UpdateCollection();
            UpdateContainer();
        }

    })
}


chrome.tabs.getSelected(null, function(tab) {
    curLink = tab.url;
    elementInput.value = tab.url;
});

chrome.runtime.getBackgroundPage(function (bkg) {
    var urls = bkg.urls;
    var domains = bkg.domains;
    var sortedDomains = [];
    for (domain_name of Object.keys(domains)) {
        let domain = domains[domain_name];
        sortedDomains.push(domain);
    }
    sortedDomains = sortedDomains.sort((a, b) => (a.duration < b.duration ? 1 : -1));
    // console.log(sortedDomains);

    var i = 0;
    var tbody = document.getElementById('table-body');
    for (let domain of sortedDomains) {
        // console.log(domain);
        if (i == 10) break;
        i++;
        let domain_row = document.createElement('tr');
        let traffic = convertTraffic(domain.networkTraffic);
        let duration = convertDuration(domain.duration);
        domain_row.innerHTML = `<th scope="row">${i}</th>
                                 <th>${domain.name}</th>
                                <th>${domain.visit}</th>
                                <th>${duration}</th>
                                <th>${traffic}</th>`;
        tbody.appendChild(domain_row);
    }
    // console.log(tbody);

    //Set Up Doughnut
    var data = {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: [],
                hoverBackgroundColor: []
            }]
        },
        options: {
            legend: {
                display: false
            },
            responsive: true,
            onHover(event,item) {
                resetColorTable();
                if (item[0]) {
                    var label = item[0]['_model'].label;
                    var color = item[0]['_model'].backgroundColor;
                    colorTable(label,color);
                }
            }
        }
    };

    i = 0;
    for (let domain of sortedDomains) {
        if (i === 10) break;
        data.data.labels.push(domain.name);
        data.data.datasets[0].data.push(domain.duration);
        data.data.datasets[0].backgroundColor.push(dColor[i]);
        i += 1;
    }

    //doughnut
    var ctxD = document.getElementById("doughnutChart").getContext('2d');
    var myLineChart = new Chart(ctxD, data);

});


//Mounted
resetNoti();
UpdateLink();
UpdateCollection();
UpdateContainer();

// document.onclick = resetNoti;
elementCollection.onchange = UpdateContainer;
elementInputCollection.oninput = function () {
    if (elementInputCollection.value === '') {
        addColBtn.classList.add('disabled');
    }
    else {
        addColBtn.classList.remove('disabled');
    }
    resetNoti();
};




