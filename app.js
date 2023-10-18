require('dotenv').config();
app_port = process.env.PORT
db_host = process.env.DB_HOST
db_user = process.env.DB_USER
db_pwd = process.env.DB_PWD
db_name = process.env.DB_NAME
const Database = require('./model/database');
// const sqlite = require('./model/sqlitedb');
const db = new Database(db_host, db_user, db_pwd, db_name);

const cors = require('cors');
const cookieParser = require('cookie-parser');
const express = require('express');
const bodyParser = require('body-parser');
const { start } = require('repl');

const app = express();
const path = require('path')

app.use(express.static(path.join(__dirname, 'assets')));
// alloc CORS untuk API
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
// Parse JSON and URL-encoded bodies untuk http POST
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

app.all('/', function (request, response, next) {
    response.header("Access-Control-Allow-Origin", "*");
    response.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});


const viewpath = __dirname+'/static/';
const Page = require('./utils/page_handler');
const Page_handler = new Page(app,express,path,viewpath);

const API = require('./utils/API_handler');
const API_handler = new API(app,db);

const server = app.listen(app_port);

const Mqtt_handler = require('./utils/mqtt_handler');
const mqtt_handler = new Mqtt_handler(server,db);


