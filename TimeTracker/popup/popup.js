chrome.runtime.getBackgroundPage(function(bkg){
    var urls = bkg.urls;
    var domains = bkg.domains;
    var sortedDomains = [];
    for (domain_name of Object.keys(domains)){
        let domain = domains[domain_name];
        sortedDomains.push(domain);
    }
    sortedDomains = sortedDomains.sort((a, b) => (a.duration > b.duration ? 1 : -1));
    var i = 0;
    var tbody = document.getElementById('table-body');
    for(let domain of sortedDomains){
        console.log(i);
        i++;
        let domain_row = document.createElement('tr');
        domain_row.innerHTML = `<th scope="row">${i}</th>
                                 <th>${domain.name}</th>
                                <th>${domain.visit}</th>
                                <th>${domain.duration}</th>`;
        console.log(domain_row);
        tbody.appendChild(domain_row);
    }
});


