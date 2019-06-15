const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const https = require('https');
const utils = require('./utils/server_utils');
const cors = require('cors');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const urlExists = require('url-exists');
// const dotenv = require('dotenv');

var certOptions = {
    key: fs.readFileSync(path.resolve('./server.key')),
    cert: fs.readFileSync(path.resolve('./server.crt'))
}

var app = express();

app.use(bodyParser.json());
app.use(cors());

//de day cho do trong trang chu
app.get('/', (req, res) => {
    console.log('ok');
    res.send('work ok');
    //utils.getAll('url_info', res);
});

//get all links
app.get('/links', (req, res) => {
    utils.getAll('url_info', res);
});

//add new link
app.post('/links', (req, res) => {
    var targetUrl = req.body.url;
    urlExists(targetUrl, (err, exists) => {
        if (exists) {
            utils.postLink(targetUrl, 'url_info', res);
        }
    });
});

//info about 1 link
app.get('/links/:id', (req, res) => {
    var id = req.params.id;
    utils.getById('url_info', id, res);
});

//delete 1 link
app.delete('/links/:id', (req, res) => {
    var id = req.params.id;
    utils.deleteById('url_info', id, res);
});

//add 1 link to collection
app.post('/links/:id/:collection_id', (req, res) => {
    var link_id = req.params.id;
    var collection_id = req.params.collection_id;
    utils.updateCollectionOfALink('url_info', link_id, collection_id, res);
});

//get all collections
app.get('/collections', (req, res) => {
    utils.getAll('collection', res);
});

//add new collection
app.post('/collections', (req, res) => {
    var name = req.body.name;
    utils.postCollection('collection', name, res);
});

//get info of 1 collection
app.get('/collections/:id', (req, res) => {
    var id = req.params.id;
    utils.getById('collection', id, res);
});

//update info of 1 collection
app.put('/collections/:id', (req, res) => {
    var id = req.params.id;
    var new_name = req.body.name;
    utils.updateCollection('collection', id, new_name, res);
});

//delete collection
app.delete('/collections/:id', (req, res) => {
    var id = req.params.id;
    utils.deleteById('collection', id, res);
});

//get all links in 1 collection
app.get('/collections/all/:collection_id', (req, res) => {
    var collection_id = req.params.collection_id;
    utils.getAllLinksOfCollection('url_info', collection_id, res);
});

//remove 1 link from a collection by set its collection_id to 1
app.delete('/collections/:collection_id/:link_id', (req, res) => {
    var collection_id = req.params.collection_id;
    var link_id = req.params.link_id;
    //set collection_id to 1
    utils.updateCollectionOfALink('url_info', link_id, 1, res);
});

//attribute: duration, visit, network traffic
//display by: day of week, interval: 1 day, 1 week, 1 month
//click to a domain: show diagram for the chosen attribute

//post domain to domain_info
app.post('/domains', (req, res) => {
    var domain = req.body.domain;
    urlExists(domain, (err, exists) => {
        if (exists) {
            utils.addDomain(domain, 'domain_info', res);
        } else {
            res.send({
                success: false,
                message: 'url is not exists'
            });
        }
    })
});

//post daily domain to daily_domain table
app.post('/daily_domains', (req, res) => {
    var domain = req.body.domain;
    utils.addDailyDomain(domain, 'daily_domain', res);
});

//get daily domain by attribute and duraion
app.get('/daily_domains/:attribute/:duration', (req, res) => {
    var attr_list = ['duration', 'visitCount', 'networkTraffic'];
    var duration_list = ['week', 'month'];
    var attribute = req.params.attribute, duration = req.params.duration;
    if (!attr_list.includes(attribute) || !duration_list.includes(duration)) {
        res.send({
            success: false,
            message: 'Bad request'
        });
    } else {
        utils.getDailyDomainByDuration(duration, attribute, 'daily_domain', res);
    }
});

//get info of daily_domain divided by day of week
app.get('/daily_domains/group_by/week_day/:attribute', (req, res) => {
    var attr_list = ['visitCount', 'duration', 'networkTraffic'];
    var attr = req.params.attribute;
    if (!attr_list.includes(attr)) {
        res.send({
            success: false,
            message: 'Bad request'
        });
    } else {
        utils.getDailyDomainByWeekDay(attr, 'daily_domain', res);
    }
})

//actually to get the domain_info
app.post('/domains/get_info', (req, res) => {
    var domain = req.body.domain;
    utils.getDomainByName(domain, 'domain_info', res);
})

//get info of a link in 1 week, post body {domain: domain, attribure: attribute}
app.post('/daily_domains/weekly', (req, res) => {
    var domain = req.body.domain;
    var attr = req.body.attribute;
    var attr_list = ['visitCount', 'duration', 'networkTraffic'];
    if (!attr_list.includes(attr)) {
        res.send({
            success: false,
            message: 'Bad request'
        });
    } else {
        utils.getWeeklyInfo(domain, 'daily_domain', attr, res);
    }
})

var server = https.createServer(certOptions, app, () => {
    console.log('Listening on port 9999');
}).listen(9999);